"""
S3 utility module for handling file operations.
"""
import boto3
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class S3Utils:
    """
    Class for handling S3 operations.
    """
    def __init__(self, bucket_name: str):
        """
        Initialize the S3 utility.
        
        Args:
            bucket_name (str): S3 bucket name
        """
        self.s3 = boto3.client("s3")
        self.bucket_name = bucket_name
        
        logger.info(f"S3 utility initialized with bucket: {bucket_name}")
    
    def download_file(self, object_key: str, file_path: str) -> str:
        """
        Download a file from S3.
        
        Args:
            object_key (str): S3 object key
            file_path (str): Local file path to save the downloaded file
            
        Returns:
            str: Path to the downloaded file
        """
        try:
            logger.info(f"Downloading file from S3: {object_key} to {file_path}")
            self.s3.download_file(self.bucket_name, object_key, file_path)
            logger.info(f"File downloaded successfully: {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Error downloading file from S3: {str(e)}")
            raise
    
    def upload_file(self, file_path: str, object_key: str) -> None:
        """
        Upload a file to S3.
        
        Args:
            file_path (str): Local file path
            object_key (str): S3 object key
        """
        try:
            logger.info(f"Uploading file to S3: {file_path} as {object_key}")
            self.s3.upload_file(file_path, self.bucket_name, object_key)
            logger.info(f"File uploaded successfully: {object_key}")
        except Exception as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            raise
    
    def delete_file(self, object_key: str) -> None:
        """
        Delete a file from S3.
        
        Args:
            object_key (str): S3 object key
        """
        try:
            logger.info(f"Deleting file from S3: {object_key}")
            self.s3.delete_object(Bucket=self.bucket_name, Key=object_key)
            logger.info(f"File deleted successfully: {object_key}")
        except Exception as e:
            logger.error(f"Error deleting file from S3: {str(e)}")
            raise
    
    def list_files(self, prefix: Optional[str] = None) -> list:
        """
        List files in the S3 bucket.
        
        Args:
            prefix (Optional[str]): Prefix to filter files
            
        Returns:
            list: List of file keys
        """
        try:
            if prefix:
                response = self.s3.list_objects_v2(Bucket=self.bucket_name, Prefix=prefix)
            else:
                response = self.s3.list_objects_v2(Bucket=self.bucket_name)
            
            if 'Contents' in response:
                files = [item['Key'] for item in response['Contents']]
                logger.info(f"Listed {len(files)} files from S3")
                return files
            else:
                logger.info("No files found in S3")
                return []
        except Exception as e:
            logger.error(f"Error listing files from S3: {str(e)}")
            raise
