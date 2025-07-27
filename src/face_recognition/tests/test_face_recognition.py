"""
Test module for face recognition system.
"""
import unittest
import os
import tempfile
import shutil
from unittest.mock import patch, MagicMock

import numpy as np
import cv2

# Import modules to test
from src.face_recognition.core.face_detector import FaceDetector
from src.face_recognition.core.face_encoder import FaceEncoder
from src.face_recognition.core.vector_store import VectorStore
from src.face_recognition.core.person_manager import PersonManager
from src.face_recognition.utils.s3_utils import S3Utils


class TestFaceDetector(unittest.TestCase):
    """Test cases for FaceDetector class."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.output_dir = os.path.join(self.temp_dir, "faces")
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Create a simple test image with a face-like pattern
        self.test_image_path = os.path.join(self.temp_dir, "test_face.jpg")
        img = np.ones((300, 300, 3), dtype=np.uint8) * 255
        cv2.rectangle(img, (100, 100), (200, 200), (0, 0, 0), -1)  # Simple face-like shape
        cv2.imwrite(self.test_image_path, img)
        
        self.detector = FaceDetector()
    
    def tearDown(self):
        """Clean up test environment."""
        shutil.rmtree(self.temp_dir)
    
    @patch('mtcnn.MTCNN.detect_faces')
    def test_detect_faces(self, mock_detect_faces):
        """Test face detection."""
        # Mock MTCNN detection result
        mock_detect_faces.return_value = [{'box': (100, 100, 100, 100), 'confidence': 0.99}]
        
        # Call the method
        face_paths = self.detector.detect_faces(self.test_image_path, self.output_dir)
        
        # Assertions
        self.assertEqual(len(face_paths), 1)
        self.assertTrue(os.path.exists(face_paths[0]))
        self.assertTrue(face_paths[0].endswith("face_1.jpg"))


class TestFaceEncoder(unittest.TestCase):
    """Test cases for FaceEncoder class."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        
        # Create a test face image
        self.test_face_path = os.path.join(self.temp_dir, "face_1.jpg")
        img = np.ones((150, 150, 3), dtype=np.uint8) * 255
        cv2.imwrite(self.test_face_path, img)
        
        self.encoder = FaceEncoder()
    
    def tearDown(self):
        """Clean up test environment."""
        shutil.rmtree(self.temp_dir)
    
    @patch('face_recognition.face_encodings')
    @patch('face_recognition.load_image_file')
    def test_generate_embeddings(self, mock_load_image, mock_face_encodings):
        """Test embedding generation."""
        # Mock face_recognition functions
        mock_load_image.return_value = np.ones((150, 150, 3), dtype=np.uint8) * 255
        mock_face_encodings.return_value = [np.random.rand(128)]
        
        # Call the method
        embeddings = self.encoder.generate_embeddings(self.temp_dir)
        
        # Assertions
        self.assertEqual(len(embeddings), 1)
        self.assertEqual(embeddings[0]["filename"], "face_1.jpg")
        self.assertEqual(len(embeddings[0]["encoding"]), 128)


class TestVectorStore(unittest.TestCase):
    """Test cases for VectorStore class."""
    
    @patch('pinecone.Pinecone')
    def test_query(self, mock_pinecone):
        """Test vector store query."""
        # Mock Pinecone client and index
        mock_index = MagicMock()
        mock_index.query.return_value = {
            "matches": [
                {"id": "person1", "score": 0.95, "values": [0.1] * 128},
                {"id": "person2", "score": 0.85, "values": [0.2] * 128}
            ]
        }
        mock_pinecone.return_value.Index.return_value = mock_index
        
        # Create VectorStore instance
        vector_store = VectorStore("fake_api_key", "fake_index")
        
        # Call the method
        result = vector_store.query([0.3] * 128, top_k=2, include_values=True)
        
        # Assertions
        self.assertEqual(len(result["matches"]), 2)
        self.assertEqual(result["matches"][0]["id"], "person1")
        self.assertEqual(result["matches"][1]["id"], "person2")


class TestPersonManager(unittest.TestCase):
    """Test cases for PersonManager class."""
    
    @patch('boto3.resource')
    def test_get_new_person_id(self, mock_boto3_resource):
        """Test getting new person ID."""
        # Mock DynamoDB table and response
        mock_table = MagicMock()
        mock_table.update_item.return_value = {"Attributes": {"limit": 42}}
        mock_boto3_resource.return_value.Table.return_value = mock_table
        
        # Create PersonManager instance
        person_manager = PersonManager("fake_table")
        
        # Call the method
        person_id = person_manager.get_new_person_id()
        
        # Assertions
        self.assertEqual(person_id, 42)
        mock_table.update_item.assert_called_once()


class TestS3Utils(unittest.TestCase):
    """Test cases for S3Utils class."""
    
    @patch('boto3.client')
    def test_download_file(self, mock_boto3_client):
        """Test downloading a file from S3."""
        # Mock S3 client
        mock_s3 = MagicMock()
        mock_boto3_client.return_value = mock_s3
        
        # Create S3Utils instance
        s3_utils = S3Utils("fake_bucket")
        
        # Call the method
        result = s3_utils.download_file("test/image.jpg", "/tmp/image.jpg")
        
        # Assertions
        self.assertEqual(result, "/tmp/image.jpg")
        mock_s3.download_file.assert_called_once_with("fake_bucket", "test/image.jpg", "/tmp/image.jpg")


if __name__ == '__main__':
    unittest.main()
