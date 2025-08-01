# Sparks Backend Source Code

This directory contains the backend components of the Sparks photo sharing platform, organized into three main sections: Express API, Lambda Functions, and Lambda Layers.

## Directory Structure

- **express-api/**: RESTful API built with Express.js running as a Lambda function behind API Gateway
- **lambdas/**: Collection of specialized AWS Lambda functions for various backend processing tasks
- **lambda-layers/**: Shared code and dependencies packaged as Lambda Layers

## Express API

The Express API provides a RESTful interface for the frontend to interact with the AWS services. It handles user authentication, photo management, and other core application features.

### Key Features

- Cognito-based authentication
- Photo management endpoints
- User profile management
- Live streaming configuration
- Event logging

For detailed information about API endpoints and development setup, refer to the [Express API README](./express-api/README.md).

## Lambda Functions

The `lambdas/` directory contains several specialized Lambda functions that perform various backend tasks:

### Face Recognition (`face_recognition/`)

AI-powered face detection and recognition system that:
- Detects faces in uploaded images using MTCNN
- Generates face encodings using dlib
- Matches faces against known persons using Pinecone vector database
- Automatically tags photos with recognized persons

Built with Python, optimized for ARM64 Lambda runtime. For detailed documentation, see the [Face Recognition README](./lambdas/face_recognition/README.md).

### Face Recognition S3 Trigger (`face_recognition_s3_trigger/`)

Handles S3 upload events and triggers the face recognition pipeline.

### Image Compression (`image_compression/`)

Compresses uploaded images to save storage space and improve loading performance.

### Image Thumbnail Generation (`image_thumbnail_generation/`)

Creates thumbnails of uploaded images for efficient display in the web interface.

### Signup Trigger (`signup_trigger/`)

Handles post-signup processing for new user accounts.

### Web Event Logs (`web_event_logs/`)

Processes and stores web event logs for analytics and monitoring.

## Lambda Layers

The `lambda-layers/` directory contains shared code and dependencies that are used by multiple Lambda functions:

### Image Thumbnail Layer (`image-thumbnail-layer/`)

Contains shared Node.js modules for image processing and thumbnail generation.

## Data Storage

The application uses the following AWS services for data storage:

- **Amazon DynamoDB**: Primary database for application metadata, user information, and image details
- **Amazon S3**: Storage for original images, processed thumbnails, and compressed versions
- **Pinecone**: Vector database for face recognition and similarity matching

## Deployment

All backend components are deployed through the Terraform configuration in the `terraform/` directory. For deployment instructions, refer to the [Terraform README](../terraform/README.md).

## Development Prerequisites

- Node.js (v16 or higher) for Express API and JavaScript Lambda functions
- Python 3.9+ for Python-based Lambda functions
- AWS CLI configured with appropriate credentials
- Docker for building custom Lambda container images

## Configuration

Most configuration is managed through Terraform variables and AWS Systems Manager Parameter Store. See the respective READMEs in each subdirectory for specific configuration requirements.

## Documentation

Each component has its own dedicated README file with detailed documentation. Refer to these files for component-specific information:

- [Express API Documentation](./express-api/README.md)
- [Face Recognition Lambda Documentation](./lambdas/face_recognition/README.md)
- [DynamoDB Data Model](../data_model.md)
