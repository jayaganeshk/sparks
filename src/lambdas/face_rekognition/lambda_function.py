import json
import os
import time
import logging
import io
from datetime import datetime

import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
from PIL import Image

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)


class RekognitionConfig:
    def __init__(self):
        # Rekognition
        self.REKOGNITION_COLLECTION_ID = os.environ.get(
            "REKOGNITION_COLLECTION_ID", "sparks-face-collection"
        )
        self.REKOGNITION_MATCH_THRESHOLD = float(
            os.environ.get("REKOGNITION_MATCH_THRESHOLD", "90.0")
        )
        self.REKOGNITION_MAX_FACES = int(os.environ.get("REKOGNITION_MAX_FACES", "5"))

        # Processing
        self.MAX_FACES_PER_IMAGE = int(os.environ.get("MAX_FACES_PER_IMAGE", "10"))
        self.FACE_PADDING = int(os.environ.get("FACE_PADDING", "20"))  # pixels
        self.SAVE_DETECTED_FACES = (
            os.environ.get("SAVE_DETECTED_FACES", "true").lower() == "true"
        )

        # Env resources
        self.DDB_TABLE_NAME = os.environ["DDB_TABLE_NAME"]
        self.S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME")  # fallback if not in event


config = RekognitionConfig()

# AWS clients/resources
rekognition = boto3.client("rekognition")
dynamodb = boto3.resource("dynamodb")
s3 = boto3.client("s3")

table = dynamodb.Table(config.DDB_TABLE_NAME)


# -------- Collection management --------

def ensure_collection_exists(collection_id: str):
    try:
        rekognition.describe_collection(CollectionId=collection_id)
        logger.info(f"Rekognition collection exists: {collection_id}")
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code == "ResourceNotFoundException":
            logger.info(f"Creating Rekognition collection: {collection_id}")
            rekognition.create_collection(CollectionId=collection_id)
        else:
            logger.error(f"Error describing collection: {str(e)}")
            raise


def bytes_from_s3(bucket: str, key: str) -> bytes:
    resp = s3.get_object(Bucket=bucket, Key=key)
    return resp["Body"].read()


def pil_from_bytes(b: bytes) -> Image.Image:
    return Image.open(io.BytesIO(b)).convert("RGB")


def clamp(n, min_n, max_n):
    return max(min(n, max_n), min_n)


def crop_face(image: Image.Image, bbox: dict, padding_px: int = 0) -> Image.Image:
    width, height = image.size
    left = int(bbox["Left"] * width)
    top = int(bbox["Top"] * height)
    w = int(bbox["Width"] * width)
    h = int(bbox["Height"] * height)

    x1 = clamp(left - padding_px, 0, width - 1)
    y1 = clamp(top - padding_px, 0, height - 1)
    x2 = clamp(left + w + padding_px, 0, width - 1)
    y2 = clamp(top + h + padding_px, 0, height - 1)

    return image.crop((x1, y1, x2, y2))


def image_to_jpeg_bytes(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


# -------- DDB helpers (kept compatible with existing lambda) --------

def check_if_unknown_persons_key_available():
    try:
        response = table.get_item(Key={"PK": "UNKNOWN_PERSONS", "SK": "UNKNOWN_PERSONS"})
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


def get_new_person_id_for_insert(table_ref):
    try:
        response = table_ref.update_item(
            Key={"PK": "UNKNOWN_PERSONS", "SK": "UNKNOWN_PERSONS"},
            UpdateExpression="SET #attrName = if_not_exists(#attrName, :start) + :val",
            ExpressionAttributeNames={"#attrName": "limit"},
            ExpressionAttributeValues={":val": 1, ":start": 0},
            ReturnValues="ALL_NEW",
        )
        return response["Attributes"]["limit"]
    except Exception as e:
        logger.error(f"Error getting new person ID: {str(e)}")
        raise


def insert_new_person_to_ddb(table_ref, person_id: int, s3_key: str):
    name = f"person{person_id}"
    try:
        table_ref.put_item(
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
    except Exception as e:
        logger.error(f"Error inserting person to DDB: {str(e)}")
        raise


def get_original_s3_key(ksuid: str):
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


# -------- Rekognition helpers --------

def detect_faces_with_rekognition_bytes(image_bytes: bytes):
    """Run DetectFaces on JPEG/PNG bytes. Use this to support inputs like WEBP by re-encoding."""
    start = time.time()
    resp = rekognition.detect_faces(Image={"Bytes": image_bytes}, Attributes=[])
    detection_time = time.time() - start
    faces = resp.get("FaceDetails", [])
    # Only return bounding boxes
    bboxes = [f["BoundingBox"] for f in faces][: config.MAX_FACES_PER_IMAGE]
    return bboxes, detection_time


def search_face_by_image(face_bytes: bytes):
    start = time.time()
    resp = rekognition.search_faces_by_image(
        CollectionId=config.REKOGNITION_COLLECTION_ID,
        Image={"Bytes": face_bytes},
        FaceMatchThreshold=config.REKOGNITION_MATCH_THRESHOLD,
        MaxFaces=config.REKOGNITION_MAX_FACES,
    )
    search_time = time.time() - start
    matches = resp.get("FaceMatches", [])
    if matches:
        top = matches[0]
        face = top.get("Face", {})
        external_id = face.get("ExternalImageId")  # Will be present if indexed with it
        similarity = top.get("Similarity", 0.0)
        return True, external_id, similarity, search_time
    return False, None, 0.0, search_time


def index_face(face_bytes: bytes, external_image_id: str):
    resp = rekognition.index_faces(
        CollectionId=config.REKOGNITION_COLLECTION_ID,
        Image={"Bytes": face_bytes},
        ExternalImageId=external_image_id,
        DetectionAttributes=[],
        QualityFilter="AUTO",
    )
    records = resp.get("FaceRecords", [])
    if records:
        logger.info(
            f"Indexed face for {external_image_id}, FaceId={records[0]['Face']['FaceId']}"
        )


# -------- Metrics --------

def log_processing_metrics(start_time, faces_detected, faces_processed, matches_found, detection_time=0, search_time=0):
    processing_time = time.time() - start_time
    metrics = {
        "timestamp": datetime.utcnow().isoformat(),
        "processing_time_seconds": round(processing_time, 2),
        "detection_time_seconds": round(detection_time, 2),
        "encoding_time_seconds": round(search_time, 2),  # kept name for compatibility
        "faces_detected": faces_detected,
        "encodings_generated": faces_processed,  # compatibility with old schema
        "matches_found": matches_found,
        "detection_model": "rekognition",
    }
    logger.info(f"Face processing metrics: {json.dumps(metrics)}")
    return metrics


# Ensure Rekognition collection exists at cold start
ensure_collection_exists(config.REKOGNITION_COLLECTION_ID)


def handler(event, context):
    logger.info(f"Event: {json.dumps(event)}")

    try:
        check_if_unknown_persons_key_available()
        results = []

        for record in event["Records"]:
            try:
                body = json.loads(record["body"])

                is_profile_picture = body.get("isProfilePicture", False)
                user_email = body.get("userEmail", None)

                if "largeImageKey" in body:
                    bucket_name = body["bucketName"]
                    object_key = body["largeImageKey"]
                    file_name_without_ext = body["fileNameWithoutExt"]
                    logger.info(f"Processing large image: {bucket_name}/{object_key}")
                else:
                    bucket_name = body.get("bucketName", config.S3_BUCKET_NAME)
                    object_key = body["objectKey"]
                    file_name_without_ext = object_key.split("/")[-1].split(".")[0]
                    logger.info(
                        f"Processing {'profile picture' if is_profile_picture else 'original image'}: {bucket_name}/{object_key}"
                    )

                if not bucket_name:
                    raise ValueError("bucketName not provided and S3_BUCKET_NAME not set")

                start_time = time.time()

                # Load image from S3 for cropping (once)
                image_bytes = bytes_from_s3(bucket_name, object_key)
                pil_image = pil_from_bytes(image_bytes)

                # Detect faces (re-encode to JPEG bytes to support formats like WEBP)
                jpeg_bytes = image_to_jpeg_bytes(pil_image)
                bboxes, detection_time = detect_faces_with_rekognition_bytes(jpeg_bytes)
                faces_detected = len(bboxes)
                if faces_detected == 0:
                    logger.info("No faces detected in image")
                    continue

                face_found = []
                matching_details = []
                persons_created = []
                total_search_time = 0.0

                for i, bbox in enumerate(bboxes):
                    # Crop each detected face with padding
                    face_img = crop_face(pil_image, bbox, config.FACE_PADDING)
                    face_bytes = image_to_jpeg_bytes(face_img)

                    # Search in collection
                    found, person_id, similarity, search_time = search_face_by_image(face_bytes)
                    total_search_time += search_time

                    if found and person_id:
                        face_found.append(person_id)
                        width = int(bbox["Width"] * pil_image.size[0])
                        height = int(bbox["Height"] * pil_image.size[1])
                        matching_details.append(
                            {
                                "person": person_id,
                                "confidence": similarity,
                                "stage": "rekognition",
                                "face_size": {"width": width, "height": height},
                            }
                        )
                        logger.info(f"Found match: {person_id} (similarity: {similarity:.2f})")
                    else:
                        # Unknown -> create new person and index
                        new_id = get_new_person_id_for_insert(table)
                        person_name = f"person{new_id}"

                        # Save cropped face to S3 (optional)
                        if config.SAVE_DETECTED_FACES:
                            s3_key = f"persons/{person_name}.jpg"
                            s3.put_object(
                                Bucket=bucket_name,
                                Key=s3_key,
                                Body=face_bytes,
                                ContentType="image/jpeg",
                            )
                            logger.info(f"Uploaded face to S3: {s3_key}")
                        else:
                            s3_key = f"persons/{person_name}.jpg"

                        # Insert to DDB
                        insert_new_person_to_ddb(table, new_id, s3_key)

                        # Index in Rekognition with ExternalImageId = personN
                        index_face(face_bytes, person_name)

                        face_found.append(person_name)
                        persons_created.append(person_name)

                # Profile picture association vs tagging
                if is_profile_picture and user_email and face_found:
                    matched_person = face_found[0]
                    try:
                        table.update_item(
                            Key={"PK": user_email, "SK": user_email},
                            UpdateExpression="SET personId = :personId, updatedAt = :updatedAt",
                            ExpressionAttributeValues={
                                ":personId": matched_person,
                                ":updatedAt": datetime.now().isoformat(),
                            },
                        )
                        logger.info(f"Associated user {user_email} with person {matched_person}")
                    except Exception as e:
                        logger.error(
                            f"Error associating user {user_email} with person {matched_person}: {str(e)}"
                        )
                elif not is_profile_picture:
                    kusid = file_name_without_ext
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

                # Metrics and result
                metrics = log_processing_metrics(
                    start_time,
                    faces_detected,
                    faces_detected,
                    len(face_found),
                    detection_time,
                    total_search_time,
                )

                result = {
                    "object_key": object_key,
                    "persons_found": face_found,
                    "time_taken": metrics["processing_time_seconds"],
                    "detection_time": detection_time,
                    "encoding_time": total_search_time,
                    "faces_detected": faces_detected,
                    "encodings_generated": faces_detected,
                    "matching_details": matching_details,
                    "processed_image_type": "large" if "largeImageKey" in body else "original",
                    "detection_model": "rekognition",
                    "size_filtering_enabled": False,
                    "multi_stage_matching_enabled": False,
                }
                results.append(result)
                logger.info(f"Processing completed for {object_key}: {result}")

            except Exception as e:
                logger.error(f"Error processing record: {str(e)}")
                results.append(
                    {"error": str(e), "status": "failed", "error_type": type(e).__name__}
                )
                continue

        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "message": "Face rekognition processing completed",
                    "results": results,
                    "configuration": {
                        "rekognition_collection_id": config.REKOGNITION_COLLECTION_ID,
                        "rekognition_match_threshold": config.REKOGNITION_MATCH_THRESHOLD,
                        "rekognition_max_faces": config.REKOGNITION_MAX_FACES,
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
                    "message": "Error occurred during face rekognition processing",
                    "error": str(e),
                    "error_type": type(e).__name__,
                }
            ),
        }
