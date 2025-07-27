"""
Face encoding module for generating embeddings from face images.
"""
import os
import face_recognition
import logging

logger = logging.getLogger(__name__)

class FaceEncoder:
    """
    Class for generating face embeddings using face_recognition library.
    """
    def __init__(self):
        """
        Initialize the face encoder.
        """
        logger.info("Face encoder initialized")
    
    def generate_embeddings(self, faces_folder):
        """
        Generate embeddings for all face images in the specified folder.
        
        Args:
            faces_folder (str): Path to folder containing face images
            
        Returns:
            list: List of dictionaries containing face embeddings and filenames
        """
        logger.info(f"Generating embeddings for faces in folder: {faces_folder}")
        
        # List all face image files in the folder
        face_image_files = [f for f in os.listdir(faces_folder) if f.endswith(".jpg")]
        logger.info(f"Found {len(face_image_files)} face images")
        
        # Load and compute embeddings for each face
        embeddings = []
        for face_file in face_image_files:
            # Load the face image
            face_image_path = os.path.join(faces_folder, face_file)
            face_image = face_recognition.load_image_file(face_image_path)
            
            # Compute the face embeddings
            face_embedding = face_recognition.face_encodings(face_image)
            
            if len(face_embedding) > 0:
                embeddings.append({
                    "encoding": face_embedding[0],
                    "filename": face_file
                })
                logger.debug(f"Generated embedding for face: {face_file}")
            else:
                logger.warning(f"No face found in image: {face_file}")
        
        logger.info(f"Generated {len(embeddings)} embeddings")
        return embeddings
    
    def compare_faces(self, known_encoding, unknown_encoding, tolerance=0.6):
        """
        Compare a known face encoding with an unknown face encoding.
        
        Args:
            known_encoding: Face encoding of the known face
            unknown_encoding: Face encoding of the unknown face
            tolerance (float): Tolerance for face comparison (lower is stricter)
            
        Returns:
            bool: True if faces match, False otherwise
        """
        results = face_recognition.compare_faces([known_encoding], unknown_encoding, tolerance=tolerance)
        return results[0]
