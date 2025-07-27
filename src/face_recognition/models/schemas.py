"""
Data models and schemas for the face recognition application.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class FaceEmbedding(BaseModel):
    """
    Face embedding model.
    """
    encoding: List[float] = Field(..., description="Face encoding vector")
    filename: str = Field(..., description="Filename of the face image")

class PersonVector(BaseModel):
    """
    Person vector model for Pinecone.
    """
    id: str = Field(..., description="Person ID")
    values: List[float] = Field(..., description="Face encoding vector")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class ProcessingResult(BaseModel):
    """
    Processing result model.
    """
    persons_found: List[str] = Field(..., description="List of person IDs found in the image")
    time_taken: float = Field(..., description="Processing time in seconds")

class ErrorResponse(BaseModel):
    """
    Error response model.
    """
    message: str = Field(..., description="Error message")
    error: str = Field(..., description="Error details")
    status: int = Field(..., description="HTTP status code")

class S3Event(BaseModel):
    """
    S3 event model for Lambda function.
    """
    bucketName: str = Field(..., description="S3 bucket name")
    objectKey: str = Field(..., description="S3 object key")

class SQSRecord(BaseModel):
    """
    SQS record model for Lambda function.
    """
    body: str = Field(..., description="SQS message body")

class SQSEvent(BaseModel):
    """
    SQS event model for Lambda function.
    """
    Records: List[SQSRecord] = Field(..., description="List of SQS records")
