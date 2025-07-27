# Face Recognition System

A modern face recognition system built with Python 3.11+, the latest Pinecone client, and AWS services. This system detects faces in images, generates embeddings, and stores them in Pinecone for efficient similarity search.

## Features

- Face detection using MTCNN
- Face embedding generation using face_recognition library
- Vector similarity search with Pinecone
- AWS Lambda integration for serverless processing
- DynamoDB for metadata storage
- S3 for image storage
- Modular architecture following AWS best practices

## Project Structure

```
src/face_recognition/
├── core/                  # Core business logic
│   ├── face_detector.py   # Face detection module
│   ├── face_encoder.py    # Face embedding generation
│   ├── person_manager.py  # DynamoDB operations
│   └── vector_store.py    # Pinecone operations
├── handlers/              # Request handlers
│   └── lambda_handler.py  # AWS Lambda handler
├── models/                # Data models
│   └── schemas.py         # Pydantic models
├── utils/                 # Utility functions
│   ├── logging_config.py  # Logging configuration
│   └── s3_utils.py        # S3 operations
├── docker/                # Docker configuration
│   ├── Dockerfile         # Docker image definition
│   └── lambda-deployment.json  # Lambda deployment config
├── tests/                 # Unit and integration tests
├── requirements.txt       # Python dependencies
└── README.md              # Project documentation
```

## Prerequisites

- Python 3.11+
- AWS account with access to Lambda, DynamoDB, and S3
- Pinecone account with API key

## Environment Variables

The following environment variables are required:

- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_API_ENV`: Pinecone environment (e.g., "us-west1-gcp")
- `PINECONE_INDEX_NAME`: Name of your Pinecone index
- `DDB_TABLE_NAME`: DynamoDB table name
- `S3_BUCKET_NAME`: S3 bucket name
- `LOG_LEVEL`: Logging level (default: "INFO")

## Installation

1. Clone the repository
2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Local Development

For local development, you can use the following:

```bash
# Set environment variables
export PINECONE_API_KEY="your-api-key"
export PINECONE_API_ENV="your-environment"
export PINECONE_INDEX_NAME="your-index-name"
export DDB_TABLE_NAME="your-table-name"
export S3_BUCKET_NAME="your-bucket-name"

# Run tests
python -m unittest discover tests
```

## Deployment

### Docker Build

```bash
cd src/face_recognition
docker build -f docker/Dockerfile -t face-recognition-service .
```

### AWS Lambda Deployment

1. Build the Docker image:

```bash
cd src/face_recognition
docker build -f docker/Dockerfile -t face-recognition-service .
```

2. Tag and push to Amazon ECR:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag face-recognition-service:latest <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/face-recognition-service:latest
docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/face-recognition-service:latest
```

3. Create Lambda function from the ECR image.

## Usage

The Lambda function processes images from S3 via SQS events. The SQS message should have the following format:

```json
{
  "bucketName": "your-bucket-name",
  "objectKey": "path/to/image.jpg"
}
```

## Testing

Run the unit tests:

```bash
python -m unittest discover tests
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [face_recognition](https://github.com/ageitgey/face_recognition) - Face recognition library
- [MTCNN](https://github.com/ipazc/mtcnn) - Face detection library
- [Pinecone](https://www.pinecone.io/) - Vector database
- [AWS](https://aws.amazon.com/) - Cloud infrastructure
