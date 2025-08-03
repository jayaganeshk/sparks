import json
import boto3
import os
import time
import logging
from datetime import datetime

from boto3.dynamodb.conditions import Key

from pinecone import Pinecone, ServerlessSpec

import cv2
import face_recognition

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


# Configuration class for better parameter management
class FaceRecognitionConfig:
    def __init__(self):
        # Optimized thresholds based on test results
        self.PINECONE_SIMILARITY_THRESHOLD = float(
            os.environ.get("PINECONE_SIMILARITY_THRESHOLD", "0.85")
        )
        self.FACE_RECOGNITION_TOLERANCE = float(
            os.environ.get("FACE_RECOGNITION_TOLERANCE", "0.4")
        )
        self.MIN_FACE_SIZE = int(os.environ.get("MIN_FACE_SIZE", "50"))

        # Face detection settings
        self.FACE_DETECTION_MODEL = os.environ.get(
            "FACE_DETECTION_MODEL", "hog"
        )  # 'hog' or 'cnn'
        self.UPSAMPLE_TIMES = int(
            os.environ.get("UPSAMPLE_TIMES", "1")
        )  # For detecting smaller faces

        # Performance settings
        self.PINECONE_TOP_K = int(os.environ.get("PINECONE_TOP_K", "5"))
        self.MAX_FACES_PER_IMAGE = int(os.environ.get("MAX_FACES_PER_IMAGE", "10"))
        self.FACE_PADDING = int(os.environ.get("FACE_PADDING", "20"))

        # Feature flags
        self.ENABLE_SIZE_FILTERING = (
            os.environ.get("ENABLE_SIZE_FILTERING", "true").lower() == "true"
        )
        self.ENABLE_MULTI_STAGE_MATCHING = (
            os.environ.get("ENABLE_MULTI_STAGE_MATCHING", "true").lower() == "true"
        )
        self.ENABLE_DUPLICATE_DETECTION = (
            os.environ.get("ENABLE_DUPLICATE_DETECTION", "false").lower() == "true"
        )
        self.SAVE_DETECTED_FACES = (
            os.environ.get("SAVE_DETECTED_FACES", "true").lower() == "true"
        )


# Initialize configuration
config = FaceRecognitionConfig()

# Output folder for temporary face crops
output_folder = "/tmp/detected_faces"

# Environment variables
pinecone_index_name = os.environ["PINECONE_INDEX_NAME"]
pinecone_ssm_parameter_name = os.environ.get(
    "PINECONE_SSM_PARAMETER_NAME", "/pinecone/sparks"
)

# Initialize SSM client
ssm_client = boto3.client("ssm")


# Custom exceptions for better error handling
class FaceRecognitionError(Exception):
    """Base exception for face recognition errors"""

    pass


class FaceDetectionError(FaceRecognitionError):
    """Error in face detection phase"""

    pass


class EmbeddingGenerationError(FaceRecognitionError):
    """Error in embedding generation phase"""

    pass


class PersonMatchingError(FaceRecognitionError):
    """Error in person matching phase"""

    pass


def get_pinecone_api_key():
    """Retrieve Pinecone API key from SSM Parameter Store"""
    try:
        response = ssm_client.get_parameter(
            Name=pinecone_ssm_parameter_name, WithDecryption=True
        )
        return response["Parameter"]["Value"]
    except Exception as e:
        logger.error(
            f"Error retrieving Pinecone API key from SSM parameter '{pinecone_ssm_parameter_name}': {str(e)}"
        )
        raise


# Get Pinecone API key from SSM
pinecone_api_key = get_pinecone_api_key()

# Setup Pinecone with latest SDK
pc = Pinecone(api_key=pinecone_api_key)

# Get or create index
try:
    index = pc.Index(pinecone_index_name)
except Exception as e:
    logger.info(f"Index {pinecone_index_name} not found, creating it...")
    pc.create_index(
        name=pinecone_index_name,
        dimension=128,  # face_recognition encoding dimension
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1",  # Adjust based on your region
        ),
    )
    index = pc.Index(pinecone_index_name)

# DynamoDB setup
dynamodb = boto3.resource("dynamodb")
table_name = os.environ["DDB_TABLE_NAME"]
table = dynamodb.Table(table_name)

# S3 setup
s3 = boto3.client("s3")
bucket_name = os.environ["S3_BUCKET_NAME"]


def log_processing_metrics(
    start_time,
    faces_detected,
    encodings_generated,
    matches_found,
    detection_time=0,
    encoding_time=0,
):
    """Log detailed processing metrics"""
    processing_time = time.time() - start_time

    metrics = {
        "timestamp": datetime.utcnow().isoformat(),
        "processing_time_seconds": round(processing_time, 2),
        "detection_time_seconds": round(detection_time, 2),
        "encoding_time_seconds": round(encoding_time, 2),
        "faces_detected": faces_detected,
        "encodings_generated": encodings_generated,
        "matches_found": matches_found,
        "faces_per_second": round(faces_detected / processing_time, 2)
        if processing_time > 0
        else 0,
        "detection_model": config.FACE_DETECTION_MODEL,
        "size_filtering_enabled": config.ENABLE_SIZE_FILTERING,
        "multi_stage_matching_enabled": config.ENABLE_MULTI_STAGE_MATCHING,
    }

    logger.info(f"Face recognition metrics: {json.dumps(metrics)}")
    return metrics


def detect_and_encode_faces_unified(image_path, output_folder):
    """
    Unified face detection and encoding using face_recognition library
    Replaces the previous MTCNN + face_recognition approach
    """
    try:
        detection_start = time.time()

        # Load image using face_recognition
        image = face_recognition.load_image_file(image_path)
        if image is None:
            raise FaceDetectionError(f"Could not load image from {image_path}")

        # Detect face locations using face_recognition
        face_locations = face_recognition.face_locations(
            image,
            model=config.FACE_DETECTION_MODEL,  # 'hog' (fast) or 'cnn' (accurate)
            number_of_times_to_upsample=config.UPSAMPLE_TIMES,
        )

        detection_time = time.time() - detection_start

        if not face_locations:
            logger.info("No faces detected in the image")
            return [], [], detection_time, 0

        logger.info(
            f"Detected {len(face_locations)} faces using {config.FACE_DETECTION_MODEL} model"
        )

        # Create output directory for face crops
        if config.SAVE_DETECTED_FACES:
            os.makedirs(output_folder, exist_ok=True)

            # Clean output folder
            for filename in os.listdir(output_folder):
                file_path = os.path.join(output_folder, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)

        # Filter faces by size if enabled
        filtered_locations = []
        detected_faces = []

        for i, (top, right, bottom, left) in enumerate(face_locations):
            width = right - left
            height = bottom - top

            # Size filtering
            if config.ENABLE_SIZE_FILTERING:
                if width < config.MIN_FACE_SIZE or height < config.MIN_FACE_SIZE:
                    logger.info(
                        f"Skipping face {i + 1} due to small size: {width}x{height}"
                    )
                    continue

            filtered_locations.append((top, right, bottom, left))

            # Save face crop if enabled
            if config.SAVE_DETECTED_FACES:
                # Add padding around the face
                padding = config.FACE_PADDING
                img_height, img_width = image.shape[:2]

                top_padded = max(0, top - padding)
                right_padded = min(img_width, right + padding)
                bottom_padded = min(img_height, bottom + padding)
                left_padded = max(0, left - padding)

                # Crop face with padding
                face_crop = image[top_padded:bottom_padded, left_padded:right_padded]

                # Convert RGB to BGR for OpenCV saving
                face_bgr = cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR)
                face_filename = os.path.join(output_folder, f"face_{i + 1}.jpg")

                success = cv2.imwrite(face_filename, face_bgr)
                if success:
                    detected_faces.append(face_filename)
                    logger.info(
                        f"Saved face {i + 1} to {face_filename} (size: {width}x{height})"
                    )
                else:
                    logger.warning(f"Failed to save face {i + 1}")

            # Limit number of faces processed per image
            if len(filtered_locations) >= config.MAX_FACES_PER_IMAGE:
                logger.info(
                    f"Reached maximum faces per image limit: {config.MAX_FACES_PER_IMAGE}"
                )
                break

        if not filtered_locations:
            logger.info("No faces passed size filtering")
            return [], [], detection_time, 0

        # Generate encodings for filtered face locations
        encoding_start = time.time()
        face_encodings = face_recognition.face_encodings(image, filtered_locations)
        encoding_time = time.time() - encoding_start

        logger.info(
            f"Generated {len(face_encodings)} face encodings in {encoding_time:.3f}s"
        )

        # Prepare embeddings data structure (compatible with existing code)
        embeddings = []
        for i, encoding in enumerate(face_encodings):
            embeddings.append(
                {
                    "encoding": encoding,
                    "filename": f"face_{i + 1}.jpg",
                    "location": filtered_locations[i],
                    "size": {
                        "width": filtered_locations[i][1] - filtered_locations[i][3],
                        "height": filtered_locations[i][2] - filtered_locations[i][0],
                    },
                }
            )

        logger.info(
            f"Total {len(detected_faces)} face images saved, {len(embeddings)} embeddings generated"
        )

        return detected_faces, embeddings, detection_time, encoding_time

    except Exception as e:
        raise FaceDetectionError(
            f"Error in unified face detection and encoding: {str(e)}"
        )


def enhanced_face_matching(
    embedding, index, tolerance_strict=None, tolerance_relaxed=None
):
    """
    Multi-stage face matching with strict and relaxed thresholds
    """
    if tolerance_strict is None:
        tolerance_strict = config.FACE_RECOGNITION_TOLERANCE
    if tolerance_relaxed is None:
        tolerance_relaxed = 0.6  # Fallback to more relaxed tolerance

    found_match = False
    match_confidence = 0.0
    matched_person = None
    matching_stage = None

    try:
        # Query Pinecone with higher top_k for better coverage
        query_result = index.query(
            vector=embedding["encoding"].tolist(),
            top_k=config.PINECONE_TOP_K,
            include_values=True,
            include_metadata=True,
        )

        matches = query_result.get("matches", [])

        if config.ENABLE_MULTI_STAGE_MATCHING:
            # Stage 1: Strict matching first
            for match in matches:
                if match["score"] > config.PINECONE_SIMILARITY_THRESHOLD:
                    known_face_encodings = match["values"]

                    # Strict tolerance check
                    results = face_recognition.compare_faces(
                        [known_face_encodings],
                        embedding["encoding"],
                        tolerance=tolerance_strict,
                    )

                    if results[0]:
                        found_match = True
                        match_confidence = match["score"]
                        matched_person = match["id"]
                        matching_stage = "strict"
                        logger.info(
                            f"Strict match found: {matched_person} (score: {match_confidence:.3f})"
                        )
                        break

            # Stage 2: Relaxed matching if no strict match found
            if not found_match:
                for match in matches:
                    if match["score"] > 0.75:  # Lower similarity threshold
                        known_face_encodings = match["values"]

                        # Relaxed tolerance check
                        results = face_recognition.compare_faces(
                            [known_face_encodings],
                            embedding["encoding"],
                            tolerance=tolerance_relaxed,
                        )

                        if results[0]:
                            found_match = True
                            match_confidence = match["score"]
                            matched_person = match["id"]
                            matching_stage = "relaxed"
                            logger.info(
                                f"Relaxed match found: {matched_person} (score: {match_confidence:.3f})"
                            )
                            break
        else:
            # Original single-stage matching
            for match in matches:
                if match["score"] > config.PINECONE_SIMILARITY_THRESHOLD:
                    known_face_encodings = match["values"]

                    results = face_recognition.compare_faces(
                        [known_face_encodings],
                        embedding["encoding"],
                        tolerance=tolerance_strict,
                    )

                    if results[0]:
                        found_match = True
                        match_confidence = match["score"]
                        matched_person = match["id"]
                        matching_stage = "single"
                        logger.info(
                            f"Match found: {matched_person} (score: {match_confidence:.3f})"
                        )
                        break

        return found_match, matched_person, match_confidence, matching_stage

    except Exception as e:
        raise PersonMatchingError(f"Error in enhanced matching: {str(e)}")


def check_for_duplicate_persons(new_embedding, existing_persons_sample=10):
    """
    Check if a new person might be a duplicate of existing persons
    """
    if not config.ENABLE_DUPLICATE_DETECTION:
        return []

    try:
        # Query for similar persons with broader search
        query_result = index.query(
            vector=new_embedding.tolist(),
            top_k=existing_persons_sample,
            include_values=True,
            include_metadata=True,
        )

        potential_duplicates = []
        for match in query_result.get("matches", []):
            # Check with very strict threshold for potential duplicates
            if match["score"] > 0.9:  # Very high similarity
                results = face_recognition.compare_faces(
                    [match["values"]],
                    new_embedding,
                    tolerance=0.3,  # Very strict tolerance
                )

                if results[0]:
                    potential_duplicates.append(
                        {"person_id": match["id"], "similarity": match["score"]}
                    )

        if potential_duplicates:
            logger.warning(
                f"Potential duplicate persons detected: {potential_duplicates}"
            )

        return potential_duplicates

    except Exception as e:
        logger.error(f"Error checking for duplicates: {str(e)}")
        return []


def get_new_person_id_for_insert(table):
    """Get a new person ID by incrementing the counter"""
    try:
        response = table.update_item(
            Key={
                "PK": "UNKNOWN_PERSONS",
                "SK": "UNKNOWN_PERSONS",
            },
            UpdateExpression="SET #attrName = if_not_exists(#attrName, :start) + :val",
            ExpressionAttributeNames={"#attrName": "limit"},
            ExpressionAttributeValues={":val": 1, ":start": 0},
            ReturnValues="ALL_NEW",
        )
        return response["Attributes"]["limit"]
    except Exception as e:
        logger.error(f"Error getting new person ID: {str(e)}")
        raise


def insert_new_person_to_ddb(table, person_id, s3_key):
    """Insert a new person record to DynamoDB"""
    name = f"person{person_id}"
    try:
        response = table.put_item(
            Item={
                "PK": f"PERSON#{name}",
                "SK": name,
                "displayName": name,
                "entityType": "PERSON",
                "s3Key": s3_key,
                "createdAt": int(time.time()),
            }
        )
        logger.info(f"Inserted new person: {name}")
        return response
    except Exception as e:
        logger.error(f"Error inserting person to DDB: {str(e)}")
        raise


def download_file(bucket_name, object_key, file_name):
    """Download file from S3"""
    try:
        s3.download_file(bucket_name, object_key, file_name)
        return file_name
    except Exception as e:
        logger.error(f"Error downloading file {object_key}: {str(e)}")
        raise


def get_original_s3_key(ksuid):
    """Get the original S3 key from the KSUID"""
    try:
        response = table.query(
            IndexName="entityType-PK-index",
            KeyConditionExpression=Key("PK").eq(ksuid) & Key("entityType").eq("IMAGE"),
        )
        if "Items" in response and response["Items"]:
            return response["Items"][0].get("s3Key")
        else:
            logger.warning(f"No item found for KSUID: {ksuid}")
            return None

    except Exception as e:
        logger.error(f"Error retrieving original S3 key for KSUID {ksuid}: {str(e)}")
        raise


def check_if_unknown_persons_key_available():
    """Ensure the UNKNOWN_PERSONS counter exists"""
    try:
        response = table.get_item(
            Key={"PK": "UNKNOWN_PERSONS", "SK": "UNKNOWN_PERSONS"}
        )

        if "Item" not in response:
            table.put_item(
                Item={
                    "PK": "UNKNOWN_PERSONS",
                    "SK": "UNKNOWN_PERSONS",
                    "entityType": "UNKNOWN_PERSONS",
                    "limit": 0,
                }
            )
            logger.info("Created UNKNOWN_PERSONS counter")
    except Exception as e:
        logger.error(f"Error checking/creating UNKNOWN_PERSONS key: {str(e)}")
        raise


def handler(event, context):
    """Main Lambda handler function with unified face_recognition approach"""
    logger.info(f"Event: {json.dumps(event)}")
    logger.info(
        f"Configuration: DETECTION_MODEL={config.FACE_DETECTION_MODEL}, "
        f"PINECONE_THRESHOLD={config.PINECONE_SIMILARITY_THRESHOLD}, "
        f"FACE_RECOGNITION_TOLERANCE={config.FACE_RECOGNITION_TOLERANCE}, "
        f"SIZE_FILTERING={config.ENABLE_SIZE_FILTERING}"
    )

    try:
        check_if_unknown_persons_key_available()
        results = []

        # Process each record in the event
        for record in event["Records"]:
            try:
                body = json.loads(record["body"])

                # Handle the new message format from thumbnail completion
                if "largeImageKey" in body:
                    bucket_name = body["bucketName"]
                    large_image_key = body["largeImageKey"]
                    file_name_without_ext = body["fileNameWithoutExt"]
                    object_key = large_image_key
                    logger.info(
                        f"Processing large image: {bucket_name}/{large_image_key}"
                    )
                else:
                    bucket_name = body["bucketName"]
                    object_key = body["objectKey"]
                    file_name_without_ext = object_key.split("/")[-1].split(".")[0]
                    logger.info(
                        f"Processing original image (legacy): {bucket_name}/{object_key}"
                    )

                start_time = time.time()

                # Download file from S3
                file_name = f"/tmp/{object_key.split('/')[-1]}"
                download_file(bucket_name, object_key, file_name)

                # Unified face detection and encoding using face_recognition
                detected_faces, generated_embeddings, detection_time, encoding_time = (
                    detect_and_encode_faces_unified(file_name, output_folder)
                )

                if not generated_embeddings:
                    logger.info("No face encodings generated")
                    continue

                face_found = []
                persons_not_found = []
                matching_details = []

                # Query Pinecone for each face encoding with enhanced matching
                for i, embedding in enumerate(generated_embeddings):
                    try:
                        (
                            found_match,
                            matched_person,
                            match_confidence,
                            matching_stage,
                        ) = enhanced_face_matching(embedding, index)

                        if found_match:
                            face_found.append(matched_person)
                            matching_details.append(
                                {
                                    "person": matched_person,
                                    "confidence": match_confidence,
                                    "stage": matching_stage,
                                    "face_size": embedding.get("size", {}),
                                }
                            )
                            logger.info(
                                f"Found match: {matched_person} with score: {match_confidence:.3f} (stage: {matching_stage})"
                            )
                        else:
                            logger.info(
                                f"Person not found in index. Adding new person for face {i + 1}"
                            )

                            # Get new person ID
                            person_id = get_new_person_id_for_insert(table)
                            person_name = f"person{person_id}"

                            # Check for potential duplicates
                            potential_duplicates = check_for_duplicate_persons(
                                embedding["encoding"]
                            )

                            # Upload face to S3
                            if config.SAVE_DETECTED_FACES and detected_faces:
                                person_file_name = os.path.join(
                                    output_folder, embedding["filename"]
                                )
                                file_extension = embedding["filename"].split(".")[-1]
                                s3_key = f"persons/{person_name}.{file_extension}"

                                if os.path.exists(person_file_name):
                                    s3.upload_file(
                                        person_file_name, bucket_name, s3_key
                                    )
                                    logger.info(f"Uploaded face to S3: {s3_key}")
                                else:
                                    # Create a temporary face crop if file doesn't exist
                                    s3_key = f"persons/{person_name}.jpg"
                                    logger.warning(
                                        f"Face file not found, using placeholder for S3 key: {s3_key}"
                                    )
                            else:
                                s3_key = f"persons/{person_name}.jpg"

                            # Insert to DynamoDB
                            insert_new_person_to_ddb(table, person_id, s3_key)

                            face_found.append(person_name)

                            # Prepare for Pinecone upsert
                            persons_not_found.append(
                                {
                                    "id": person_name,
                                    "values": embedding["encoding"].tolist(),
                                    # "metadata": {
                                    #     "app": "photo",
                                    #     "s3_key": s3_key,
                                    #     "created_at": int(time.time()),
                                    #     "detection_model": config.FACE_DETECTION_MODEL,
                                    #     "face_size": embedding.get("size", {}),
                                    #     "potential_duplicates": len(
                                    #         potential_duplicates
                                    #     ),
                                    # },
                                }
                            )

                    except PersonMatchingError as e:
                        logger.error(f"Error processing embedding {i}: {str(e)}")
                        continue

                # Upsert new persons to Pinecone
                if persons_not_found:
                    try:
                        upsert_response = index.upsert(vectors=persons_not_found)
                        logger.info(
                            f"Upserted {len(persons_not_found)} new persons to Pinecone"
                        )
                        logger.info(f"Upsert response: {upsert_response}")
                    except Exception as e:
                        logger.error(f"Error upserting to Pinecone: {str(e)}")

                # Clean up temporary files
                if os.path.exists(file_name):
                    os.remove(file_name)

                # Insert tagging records to DynamoDB
                kusid = file_name_without_ext
                # get original S3 key if available
                original_s3_key = get_original_s3_key(kusid)

                for person in face_found:
                    try:
                        table.put_item(
                            Item={
                                "PK": kusid,
                                "SK": f"PERSON#{person}",
                                "entityType": f"TAGGING#{person}",
                                "s3Key": original_s3_key,
                                "createdAt": int(time.time()),
                                "images": {
                                    "large": f"processed/{kusid}_large.webp",
                                    "medium": f"processed/{kusid}_medium.webp",
                                },
                            }
                        )
                    except Exception as e:
                        logger.error(f"Error inserting tagging record: {str(e)}")

                # Log processing metrics
                metrics = log_processing_metrics(
                    start_time,
                    len(detected_faces),
                    len(generated_embeddings),
                    len(face_found),
                    detection_time,
                    encoding_time,
                )

                result = {
                    "object_key": object_key,
                    "persons_found": face_found,
                    "time_taken": metrics["processing_time_seconds"],
                    "detection_time": detection_time,
                    "encoding_time": encoding_time,
                    "faces_detected": len(detected_faces),
                    "encodings_generated": len(generated_embeddings),
                    "matching_details": matching_details,
                    "processed_image_type": "large"
                    if "largeImageKey" in body
                    else "original",
                    "detection_model": config.FACE_DETECTION_MODEL,
                    "size_filtering_enabled": config.ENABLE_SIZE_FILTERING,
                    "multi_stage_matching_enabled": config.ENABLE_MULTI_STAGE_MATCHING,
                }
                results.append(result)

                logger.info(f"Processing completed for {object_key}: {result}")

            except (
                FaceDetectionError,
                EmbeddingGenerationError,
                PersonMatchingError,
            ) as e:
                logger.error(f"Face recognition error processing record: {str(e)}")
                results.append(
                    {
                        "error": str(e),
                        "status": "failed",
                        "error_type": type(e).__name__,
                    }
                )
                continue
            except Exception as e:
                logger.error(f"Unexpected error processing record: {str(e)}")
                results.append(
                    {
                        "error": str(e),
                        "status": "failed",
                        "error_type": "UnexpectedError",
                    }
                )
                continue

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "Face recognition processing completed",
                    "results": results,
                    "configuration": {
                        "detection_model": config.FACE_DETECTION_MODEL,
                        "pinecone_similarity_threshold": config.PINECONE_SIMILARITY_THRESHOLD,
                        "face_recognition_tolerance": config.FACE_RECOGNITION_TOLERANCE,
                        "size_filtering_enabled": config.ENABLE_SIZE_FILTERING,
                        "multi_stage_matching_enabled": config.ENABLE_MULTI_STAGE_MATCHING,
                        "unified_detection_encoding": True,
                    },
                }
            ),
        }

    except Exception as e:
        logger.error(f"Handler error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "message": "Error occurred during face recognition processing",
                    "error": str(e),
                    "error_type": type(e).__name__,
                }
            ),
        }
