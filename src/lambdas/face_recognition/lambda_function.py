import json
import boto3
import os
import time
import requests
import random

from pinecone import Pinecone, ServerlessSpec

import cv2
from mtcnn import MTCNN
import face_recognition

detector = MTCNN()
output_folder = "/tmp/detected_faces"

# Environment variables
pinecone_api_key = os.environ["PINECONE_API_KEY"]
pinecone_index_name = os.environ["PINECONE_INDEX_NAME"]

# Setup Pinecone with latest SDK
pc = Pinecone(api_key=pinecone_api_key)

# Get or create index
try:
    index = pc.Index(pinecone_index_name)
except Exception as e:
    print(f"Index {pinecone_index_name} not found, creating it...")
    # Create index if it doesn't exist (for development)
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


def detect_face(image_path, output_folder):
    """Detect faces in an image and save them to output folder"""
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError(f"Could not load image from {image_path}")

    # Detect faces in the image
    faces = detector.detect_faces(image)
    os.makedirs(output_folder, exist_ok=True)

    # Clean output folder
    for filename in os.listdir(output_folder):
        file_path = os.path.join(output_folder, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)

    detected_faces = []
    for i, face_info in enumerate(faces):
        x, y, width, height = face_info["box"]
        x, y = max(x, 0), max(y, 0)

        # Extract face region
        face = image[y : y + height, x : x + width]
        face_filename = os.path.join(output_folder, f"face_{i + 1}.jpg")

        # Save face image
        success = cv2.imwrite(face_filename, face)
        if success:
            detected_faces.append(face_filename)
            print(f"Saved face {i + 1} to {face_filename}")
        else:
            print(f"Failed to save face {i + 1}")

    print(f"Total {len(detected_faces)} faces detected and saved in {output_folder}")
    return detected_faces


def generate_face_encodings(faces_folder):
    """Generate face encodings for all face images in the folder"""
    face_image_files = [
        f
        for f in os.listdir(faces_folder)
        if f.lower().endswith((".jpg", ".jpeg", ".png"))
    ]

    embeddings = []
    for face_file in face_image_files:
        face_image_path = os.path.join(faces_folder, face_file)

        try:
            # Load the face image
            face_image = face_recognition.load_image_file(face_image_path)

            # Compute the face embeddings
            face_encodings = face_recognition.face_encodings(face_image)

            if len(face_encodings) > 0:
                embeddings.append(
                    {"encoding": face_encodings[0], "filename": face_file}
                )
                print(f"Generated encoding for {face_file}")
            else:
                print(f"No face encoding found for {face_file}")

        except Exception as e:
            print(f"Error processing {face_file}: {str(e)}")
            continue

    return embeddings


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
        print(f"Error getting new person ID: {str(e)}")
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
        print(f"Inserted new person: {name}")
        return response
    except Exception as e:
        print(f"Error inserting person to DDB: {str(e)}")
        raise


def download_file(bucket_name, object_key, file_name):
    """Download file from S3"""
    try:
        s3.download_file(bucket_name, object_key, file_name)
        return file_name
    except Exception as e:
        print(f"Error downloading file {object_key}: {str(e)}")
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
            print("Created UNKNOWN_PERSONS counter")
    except Exception as e:
        print(f"Error checking/creating UNKNOWN_PERSONS key: {str(e)}")
        raise


def handler(event, context):
    """Main Lambda handler function"""
    print(f"Event: {json.dumps(event)}")

    try:
        check_if_unknown_persons_key_available()

        results = []

        # Process each record in the event
        for record in event["Records"]:
            try:
                body = json.loads(record["body"])
                bucket_name = body["bucketName"]
                object_key = body["objectKey"]

                print(f"Processing: {bucket_name}/{object_key}")

                start_time = time.time()

                # Download file from S3
                file_name = f"/tmp/{object_key.split('/')[-1]}"
                download_file(bucket_name, object_key, file_name)

                # Detect faces and generate encodings
                detected_faces = detect_face(file_name, output_folder)
                if not detected_faces:
                    print("No faces detected in the image")
                    continue

                generated_embeddings = generate_face_encodings(output_folder)
                if not generated_embeddings:
                    print("No face encodings generated")
                    continue

                face_found = []
                persons_not_found = []

                # Query Pinecone for each face encoding
                for i, embedding in enumerate(generated_embeddings):
                    found_match = False

                    try:
                        # Query Pinecone with the latest SDK
                        query_result = index.query(
                            vector=embedding["encoding"].tolist(),
                            top_k=2,
                            include_values=True,
                            include_metadata=True,
                        )

                        matches = query_result.get("matches", [])

                        for match in matches:
                            if match["score"] > 0.8:  # Similarity threshold
                                known_face_encodings = match["values"]

                                # Double-check with face_recognition library
                                results = face_recognition.compare_faces(
                                    [known_face_encodings],
                                    embedding["encoding"],
                                    tolerance=0.6,
                                )

                                if results[0]:
                                    found_match = True
                                    face_found.append(match["id"])
                                    print(
                                        f"Found match: {match['id']} with score: {match['score']}"
                                    )
                                    break

                        if not found_match:
                            print(
                                f"Person not found in index. Adding new person for face {i + 1}"
                            )

                            # Get new person ID
                            person_id = get_new_person_id_for_insert(table)
                            person_name = f"person{person_id}"

                            # Upload face to S3
                            person_file_name = os.path.join(
                                output_folder, embedding["filename"]
                            )
                            file_extension = embedding["filename"].split(".")[-1]
                            s3_key = f"persons/{person_name}.{file_extension}"

                            s3.upload_file(person_file_name, bucket_name, s3_key)
                            print(f"Uploaded face to S3: {s3_key}")

                            # Insert to DynamoDB
                            insert_new_person_to_ddb(table, person_id, s3_key)

                            face_found.append(person_name)

                            # Prepare for Pinecone upsert
                            persons_not_found.append(
                                {
                                    "id": person_name,
                                    "values": embedding["encoding"].tolist(),
                                    "metadata": {
                                        "app": "photo",
                                        "s3_key": s3_key,
                                        "created_at": int(time.time()),
                                    },
                                }
                            )

                    except Exception as e:
                        print(f"Error processing embedding {i}: {str(e)}")
                        continue

                # Upsert new persons to Pinecone
                if persons_not_found:
                    try:
                        upsert_response = index.upsert(vectors=persons_not_found)
                        print(
                            f"Upserted {len(persons_not_found)} new persons to Pinecone"
                        )
                        print(f"Upsert response: {upsert_response}")
                    except Exception as e:
                        print(f"Error upserting to Pinecone: {str(e)}")

                # Clean up temporary files
                if os.path.exists(file_name):
                    os.remove(file_name)

                # Insert tagging records to DynamoDB
                kusid = file_name.split("/")[-1].split(".")[0]
                for person in face_found:
                    try:
                        table.put_item(
                            Item={
                                "PK": kusid,
                                "SK": f"PERSON#{person}",
                                "entityType": f"TAGGING#{person}",
                                "s3Key": object_key,
                                "createdAt": int(time.time()),
                            }
                        )
                    except Exception as e:
                        print(f"Error inserting tagging record: {str(e)}")

                time_taken = time.time() - start_time

                result = {
                    "object_key": object_key,
                    "persons_found": face_found,
                    "time_taken": time_taken,
                    "faces_detected": len(detected_faces),
                    "encodings_generated": len(generated_embeddings),
                }
                results.append(result)

                print(f"Processing completed for {object_key}: {result}")

            except Exception as e:
                print(f"Error processing record: {str(e)}")
                results.append({"error": str(e), "status": "failed"})
                continue

        return {
            "statusCode": 200,
            "body": json.dumps(
                {"message": "Face recognition processing completed", "results": results}
            ),
        }

    except Exception as e:
        print(f"Handler error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps(
                {
                    "message": "Error occurred during face recognition processing",
                    "error": str(e),
                }
            ),
        }
