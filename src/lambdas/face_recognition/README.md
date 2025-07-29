# Face Recognition Lambda Function

This Lambda function provides AI-powered face recognition and tagging for the Sparks photo sharing platform. It processes uploaded images, detects faces, and matches them against known persons using vector similarity search.

## Features

- **Face Detection**: Uses MTCNN for robust face detection
- **Face Recognition**: Generates 128-dimensional face encodings using dlib
- **Vector Search**: Leverages Pinecone for fast similarity matching
- **Auto-tagging**: Automatically tags photos with recognized persons
- **New Person Detection**: Creates new person records for unknown faces
- **ARM64 Optimized**: Built specifically for ARM64 Lambda functions

## Architecture

```
S3 Upload → SQS → Lambda → [Face Detection] → [Face Recognition] → Pinecone
                     ↓
                 DynamoDB ← [Person Management] ← [Tagging]
```

## Migration Changes from Old Version

### 1. **Updated Pinecone SDK**
- **Old**: `pinecone.init()` and legacy client
- **New**: `Pinecone()` client with ServerlessSpec
- **Benefits**: Better performance, serverless architecture support

### 2. **ARM64 Compatibility**
- **Old**: x86_64 specific Docker build
- **New**: Multi-stage ARM64 optimized build
- **Benefits**: Better performance on ARM64 Lambda, cost savings

### 3. **Improved Error Handling**
- **Old**: Basic try-catch blocks
- **New**: Comprehensive error handling with detailed logging
- **Benefits**: Better debugging and monitoring

### 4. **Updated Dependencies**
- **Old**: Outdated package versions
- **New**: Latest stable versions with security patches
- **Benefits**: Security improvements, bug fixes

### 5. **Enhanced Code Structure**
- **Old**: Monolithic handler function
- **New**: Modular functions with clear separation of concerns
- **Benefits**: Better maintainability and testing

## Environment Variables

```bash
# Required
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=sparks-face-recognition
DDB_TABLE_NAME=sparks-main-table
S3_BUCKET_NAME=sparks-photos-bucket

# Optional (with defaults)
FACE_SIMILARITY_THRESHOLD=0.8
FACE_RECOGNITION_TOLERANCE=0.6
```

## Building and Deployment

### Prerequisites
- Docker with ARM64 support
- AWS CLI configured
- ECR repository: `face_recognition_and_tagging`

### Build Process

#### 1. Build Base Image
```bash
cd BaseDocker
docker build --platform linux/arm64 -t face-recognition-base:arm64 .
docker tag face-recognition-base:arm64 face-recognition-base:latest
cd ..
```

#### 2. Build Lambda Image
```bash
docker build --platform linux/arm64 -t face_recognition_and_tagging:arm64 .
docker tag face_recognition_and_tagging:arm64 face_recognition_and_tagging:latest
```

#### 3. Push to ECR
```bash
# Your existing ECR repository
ECR_URI="183103430916.dkr.ecr.ap-south-1.amazonaws.com/face_recognition_and_tagging"

# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 183103430916.dkr.ecr.ap-south-1.amazonaws.com

# Tag and push
docker tag face_recognition_and_tagging:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

### Lambda Configuration
- **Runtime**: Container image
- **Architecture**: arm64
- **Memory**: 2048 MB (minimum recommended)
- **Timeout**: 5 minutes
- **Ephemeral storage**: 1024 MB

## Local Testing

```bash
# Run the container locally
docker run --rm -p 9000:8080 \
  -e PINECONE_API_KEY=your_key \
  -e PINECONE_INDEX_NAME=test-index \
  -e DDB_TABLE_NAME=test-table \
  -e S3_BUCKET_NAME=test-bucket \
  face_recognition_and_tagging:latest

# Test with curl (in another terminal)
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{
  "Records": [{
    "body": "{\"bucketName\": \"test-bucket\", \"objectKey\": \"test-image.jpg\"}"
  }]
}'
```

## Build Architecture Details

The build creates two images:

1. **Base Image** (`face-recognition-base:latest`):
   - Contains pre-compiled dlib, face_recognition, and OpenCV
   - Stays local on your machine
   - Takes 10-15 minutes to build initially
   - Reused for faster subsequent builds

2. **Lambda Image** (`face_recognition_and_tagging:latest`):
   - Built on top of base image
   - Contains your Lambda function code
   - Includes latest Pinecone SDK and other dependencies
   - This is what gets pushed to ECR

## Performance Optimizations

### ARM64 Specific
- Uses pip install for dlib (no source compilation)
- ARM64-native base images
- Optimized OpenCV build for ARM64
- Includes OpenGL libraries for Lambda compatibility

### Memory Management
- Efficient cleanup of temporary files
- Streaming image processing
- Optimized face encoding generation

### Pinecone Optimizations
- Batch upserts for new persons
- Efficient vector queries with metadata
- Proper index management

## Monitoring and Debugging

### CloudWatch Logs
The function provides detailed logging for:
- Face detection results
- Pinecone query performance
- DynamoDB operations
- Error conditions

### Key Metrics to Monitor
- **Execution Duration**: Should be < 30 seconds for most images
- **Memory Usage**: Typically 1-2GB depending on image size
- **Error Rate**: Should be < 1% under normal conditions
- **Face Detection Accuracy**: Monitor via custom metrics

## Troubleshooting

### Build Issues

1. **Docker ARM64 support**: Ensure Docker Desktop has ARM64 emulation enabled
2. **Memory during build**: The base image build requires significant memory (4GB+)
3. **Network timeouts**: TensorFlow download can timeout, retry the build
4. **OpenGL errors**: Base image now includes `libgl1-mesa-glx` for Lambda compatibility

### Runtime Issues

1. **Import errors**: Check that all dependencies are ARM64 compatible
2. **Memory errors**: Increase Lambda memory allocation to 2048MB+
3. **Timeout errors**: Increase Lambda timeout for large images
4. **libGL.so.1 errors**: Resolved by including OpenGL libraries in base image

### Pinecone Issues

1. **API key**: Ensure the API key is valid and has proper permissions
2. **Index creation**: The code will try to create the index if it doesn't exist
3. **Dimension mismatch**: Face encodings are 128-dimensional

### Common Solutions

- **"No faces detected"**: Check image quality, format, and lighting
- **Pinecone connection errors**: Verify API key, network connectivity, and index status
- **Memory errors**: Increase Lambda memory allocation and optimize image size

## Security Considerations

- **API Keys**: Stored in environment variables, consider AWS Secrets Manager
- **S3 Access**: Uses IAM roles with minimal required permissions
- **DynamoDB**: Implements proper access patterns
- **Image Data**: Temporary files are cleaned up after processing

## Performance Tips

1. **Warm starts**: Keep Lambda warm with CloudWatch Events
2. **Memory allocation**: More memory = faster CPU, optimal around 2048MB
3. **Image preprocessing**: Resize large images before processing
4. **Batch processing**: Process multiple faces in one invocation when possible

## File Structure

```
src/lambdas/face_recognition/
├── lambda_function.py          # Main Lambda handler with updated Pinecone SDK
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Main Lambda image
├── BaseDocker/
│   ├── Dockerfile             # Base image with heavy dependencies
│   └── README.md              # Base image documentation
├── README.md                  # This comprehensive guide
└── .gitignore                 # Git ignore rules
```

## Dependencies

See `requirements.txt` for complete list. Key dependencies:
- `face-recognition==1.3.0`: Core face recognition library
- `opencv-python-headless==4.10.0.84`: Computer vision operations
- `pinecone-client==4.1.1`: Vector database client (updated)
- `mtcnn==0.1.1`: Face detection
- `boto3==1.34.144`: AWS SDK

## Future Enhancements

- [ ] Support for video face recognition
- [ ] Real-time face recognition API
- [ ] Advanced face clustering algorithms
- [ ] Integration with AWS Rekognition for comparison
- [ ] Batch processing optimization
- [ ] Custom face recognition models
