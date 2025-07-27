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
├── tests/                 # Unit and integration tests
├── Dockerfile             # Docker image definition
├── build.sh               # Build script for Docker operations
├── .dockerignore          # Docker ignore file
├── lambda-deployment.json # Lambda deployment configuration
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
export PINECONE_INDEX_NAME="your-index-name"
export DDB_TABLE_NAME="your-table-name"
export S3_BUCKET_NAME="your-bucket-name"

# Run tests
python -m unittest discover tests
```

## Deployment

## Deployment

### Docker Build

```bash
cd src/face_recognition
docker build -t face-recognition-service .
```

**Or use the build script (recommended):**
```bash
cd src/face_recognition
./build.sh build
```

### AWS Lambda Deployment

1. Build the Docker image:

```bash
cd src/face_recognition
docker build -t face-recognition-service .
```

**Or use the build script for complete build and push:**
```bash
cd src/face_recognition
# Edit build.sh to set your AWS_ACCOUNT_ID first
./build.sh push
```

2. Tag and push to Amazon ECR:

```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag face-recognition-service:latest <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/face-recognition-service:latest
docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/face-recognition-service:latest
```

3. Create Lambda function from the ECR image using the configuration in `lambda-deployment.json`.

### Lambda Configuration

The `lambda-deployment.json` file contains the recommended Lambda function configuration including:
- Function settings (timeout: 300s, memory: 1024MB)
- Required environment variables
- Resource tags
- VPC configuration (if needed)

Use this configuration when creating your Lambda function via AWS CLI, CloudFormation, or Terraform.

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
