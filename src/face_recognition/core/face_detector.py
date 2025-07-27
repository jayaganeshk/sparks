"""
Face detection module using MTCNN for the face recognition system.
"""
import os
import cv2
from mtcnn import MTCNN
import logging

logger = logging.getLogger(__name__)

class FaceDetector:
    """
    Class for detecting faces in images using MTCNN.
    """
    def __init__(self):
        """
        Initialize the MTCNN face detector.
        """
        self.detector = MTCNN()
        logger.info("MTCNN face detector initialized")
    
    def detect_faces(self, image_path, output_folder):
        """
        Detect faces in an image and save them to the output folder.
        
        Args:
            image_path (str): Path to the input image
            output_folder (str): Path to save detected faces
            
        Returns:
            list: List of paths to the saved face images
        """
        logger.info(f"Detecting faces in image: {image_path}")
        
        # Read the image
        image = cv2.imread(image_path)
        if image is None:
            logger.error(f"Failed to read image: {image_path}")
            return []
        
        # Detect faces in the image
        faces = self.detector.detect_faces(image)
        logger.info(f"Detected {len(faces)} faces in image")
        
        # Create output folder if it doesn't exist
        os.makedirs(output_folder, exist_ok=True)
        
        # Clear existing files in output folder
        for filename in os.listdir(output_folder):
            file_path = os.path.join(output_folder, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
        
        face_paths = []
        # Extract and save each detected face
        for i, face_info in enumerate(faces):
            x, y, width, height = face_info["box"]
            # Ensure coordinates are not negative
            x, y = max(x, 0), max(y, 0)
            # Extract the face region
            face = image[y:y + height, x:x + width]
            # Save the face image
            face_filename = os.path.join(output_folder, f"face_{i + 1}.jpg")
            cv2.imwrite(face_filename, face)
            face_paths.append(face_filename)
            logger.info(f"Saved face {i + 1} to {face_filename}")
        
        return face_paths
