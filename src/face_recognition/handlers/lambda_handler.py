"""
Lambda handler for the face recognition application.
"""
import json
import os
import time
import logging
import tempfile
from typing import Dict, Any, List

# Import core components
from ..core.face_detector import FaceDetector
from ..core.face_encoder import FaceEncoder
from ..core.vector_store import VectorStore
from ..core.person_manager import PersonManager

# Import utilities
from ..utils.s3_utils import S3Utils
from ..utils.logging_config import configure_json_logging

# Configure logging
configure_json_logging(os.environ.get("LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

# Initialize global variables
output_folder = "/tmp/detected_faces"

# Initialize AWS services
try:
    # Get environment variables
    pinecone_api_key = os.environ["PINECONE_API_KEY"]
    pinecone_api_env = os.environ["PINECONE_API_ENV"]
    pinecone_index_name = os.environ["PINECONE_INDEX_NAME"]
    table_name = os.environ["DDB_TABLE_NAME"]
    bucket_name = os.environ["S3_BUCKET_NAME"]
    
    # Initialize components
    vector_store = VectorStore(pinecone_api_key, pinecone_api_env, pinecone_index_name)
    person_manager = PersonManager(table_name)
    s3_utils = S3Utils(bucket_name)
    face_detector = FaceDetector()
    face_encoder = FaceEncoder()
    
    logger.info("Successfully initialized all components")
except Exception as e:
    logger.error(f"Error initializing components: {str(e)}")
    raise

def process_image(bucket_name: str, object_key: str) -> Dict[str, Any]:
    """
    Process an image for face recognition.
    
    Args:
        bucket_name (str): S3 bucket name
        object_key (str): S3 object key
        
    Returns:
        Dict[str, Any]: Processing result
    """
    try:
        start_time = time.time()
        
        # Download file from S3
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(object_key)[1]) as temp_file:
            file_name = temp_file.name
        
        s3_utils.download_file(object_key, file_name)
        logger.info(f"Downloaded image from S3: {object_key}")
        
        # Detect faces in the image
        face_paths = face_detector.detect_faces(file_name, output_folder)
        logger.info(f"Detected {len(face_paths)} faces in image")
        
        # Generate embeddings for detected faces
        generated_embeddings = face_encoder.generate_embeddings(output_folder)
        logger.info(f"Generated {len(generated_embeddings)} face embeddings")
        
        face_found = []
        persons_not_found = []
        
        # Query Pinecone and check if person is already in the index
        for i, embedding in enumerate(generated_embeddings):
            found_match = False
            
            # Query Pinecone for similar faces
            query_result = vector_store.query(
                vector=embedding["encoding"].tolist(),
                top_k=2,
                include_values=True
            )
            
            # Check if any match is found
            matches = query_result["matches"]
            for match in matches:
                known_face_encodings = match["values"]
                is_matched = face_encoder.compare_faces(known_face_encodings, embedding["encoding"])
                
                if is_matched:
                    found_match = True
                    face_found.append(match["id"])
                    logger.info(f"Found match for face {i+1}: {match['id']}")
                    break
            
            # If no match is found, add the person to the database
            if not found_match:
                logger.info(f"No match found for face {i+1}, adding as new person")
                
                # Get new person ID
                person_id = person_manager.get_new_person_id()
                
                # Upload face to S3
                person_file_name = os.path.join(output_folder, embedding["filename"])
                file_extension = embedding["filename"].split(".")[-1]
                s3_key = f"persons/person{person_id}.{file_extension}"
                s3_utils.upload_file(person_file_name, s3_key)
                
                # Insert to DynamoDB
                person_manager.insert_new_person(person_id, s3_key)
                
                # Add to Pinecone
                person_tag_name = f"person{person_id}"
                face_found.append(person_tag_name)
                
                # Prepare vector for upsert
                vector_obj = {
                    "id": person_tag_name,
                    "values": embedding["encoding"].tolist(),
                    "metadata": {"app": "photo"}
                }
                persons_not_found.append(vector_obj)
        
        # Upsert new persons to Pinecone
        if persons_not_found:
            upsert_response = vector_store.upsert(persons_not_found)
            logger.info(f"Upserted {len(persons_not_found)} new persons to Pinecone")
        
        # Insert all persons to DynamoDB
        image_id = os.path.splitext(os.path.basename(file_name))[0]
        for person in face_found:
            person_manager.insert_person_tagging(image_id, person, object_key)
        
        # Clean up
        os.remove(file_name)
        
        time_taken = time.time() - start_time
        logger.info(f"Image processing completed in {time_taken:.2f} seconds")
        
        return {
            "persons_found": face_found,
            "time_taken": time_taken
        }
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        return {
            "message": "Error occurred",
            "error": str(e),
            "status": 500
        }

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Lambda handler function.
    
    Args:
        event (Dict[str, Any]): Lambda event
        context (Any): Lambda context
        
    Returns:
        Dict[str, Any]: Lambda response
    """
    logger.info(f"Received event: {json.dumps(event)}")
    
    try:
        # Check if UNKNOWN_PERSONS key exists in DynamoDB
        person_manager.check_unknown_persons_key()
        
        # Process each record in the event
        results = []
        for record in event.get("Records", []):
            # Parse the SQS message body
            body = json.loads(record.get("body", "{}"))
            bucket_name = body.get("bucketName")
            object_key = body.get("objectKey")
            
            if bucket_name and object_key:
                logger.info(f"Processing image from bucket: {bucket_name}, key: {object_key}")
                result = process_image(bucket_name, object_key)
                results.append(result)
            else:
                logger.warning(f"Invalid record format: {record}")
        
        if results:
            return results[0] if len(results) == 1 else results
        else:
            return {"message": "No valid records to process"}
    except Exception as e:
        logger.error(f"Error in handler: {str(e)}")
        return {
            "message": "Error occurred",
            "error": str(e),
            "status": 500
        }
