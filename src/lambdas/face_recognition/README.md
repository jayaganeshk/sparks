# Face Recognition Lambda Function

This Lambda function provides AI-powered face recognition and tagging for the Sparks photo sharing platform. It processes uploaded images, detects faces, and matches them against known persons using vector similarity search.

## Features

- **Face Detection**: Uses MTCNN for robust face detection
- **Face Recognition**: Generates 128-dimensional face encodings using dlib
- **Vector Search**: Leverages Pinecone for fast similarity matching
- **Auto-tagging**: Automatically tags photos with recognized persons
- **New Person Detection**: Creates new person records for unknown faces
- **ARM64 Optimized**: Built specifically for ARM64 Lambda functions
- **Secure API Key Management**: Retrieves Pinecone API key from AWS SSM Parameter Store

## Architecture

```
S3 Upload → SQS → Lambda → [Face Detection] → [Face Recognition] → Pinecone
                     ↓
                 DynamoDB ← [Person Management] ← [Tagging]
                     ↑
                SSM Parameter Store (Pinecone API Key)
```

## Migration Changes from Old Version

### 1. **Updated Pinecone SDK**
- **Old**: `pinecone.init()` and legacy client
- **New**: `Pinecone()` client with ServerlessSpec
- **Benefits**: Better performance, serverless architecture support

### 2. **ARM64 Compatibility**
- **Old**: x86_64 specific Docker build
- **New**: Multi-stage ARM64 optimized build with base image
- **Benefits**: Better performance on ARM64 Lambda, cost savings

### 3. **Enhanced Security with SSM Parameter Store**
- **Old**: Pinecone API key in environment variables
- **New**: API key retrieved from AWS SSM Parameter Store at runtime
- **Benefits**: Encrypted storage, manual key rotation, audit trails

### 4. **Improved Error Handling**
- **Old**: Basic try-catch blocks
- **New**: Comprehensive error handling with detailed logging
- **Benefits**: Better debugging and monitoring

### 5. **Updated Dependencies**
- **Old**: Outdated package versions
- **New**: Latest stable versions with security patches
- **Benefits**: Security improvements, bug fixes

### 6. **Enhanced Code Structure**
- **Old**: Monolithic handler function
- **New**: Modular functions with clear separation of concerns
- **Benefits**: Better maintainability and testing

## Environment Variables

```bash
# Required
PINECONE_INDEX_NAME=sparks-face-recognition
DDB_TABLE_NAME=sparks-main-table
S3_BUCKET_NAME=sparks-photos-bucket

# SSM Parameter Configuration
PINECONE_SSM_PARAMETER_NAME=/pinecone/sparks  # Default if not specified

# Optional (with defaults)
FACE_SIMILARITY_THRESHOLD=0.8
FACE_RECOGNITION_TOLERANCE=0.6
```

## SSM Parameter Store Setup

The Pinecone API key is now securely stored in AWS SSM Parameter Store. The parameter name is configurable through the `PINECONE_SSM_PARAMETER_NAME` environment variable (defaults to `/pinecone/sparks`).

### Using the Helper Script (Default Parameter)
```bash
# From the project root
./scripts/setup-pinecone-api-key.sh your-pinecone-api-key ap-south-1
```

### Using the Helper Script (Custom Parameter Name)
```bash
# From the project root
./scripts/setup-pinecone-api-key.sh your-pinecone-api-key ap-south-1 /custom/pinecone/path
```

### Using AWS CLI Directly
```bash
aws ssm put-parameter \
  --name "/pinecone/sparks" \
  --description "Pinecone API key for Sparks face recognition service" \
  --value "your-actual-pinecone-api-key" \
  --type "SecureString" \
  --region your-aws-region
```

### Verify Parameter
```bash
aws ssm get-parameter --name "/pinecone/sparks" --with-decryption --region your-aws-region
```

### Configuration Flexibility

The SSM parameter name can be customized per environment:

1. **Default**: Uses `/pinecone/sparks` if `PINECONE_SSM_PARAMETER_NAME` is not set
2. **Environment-specific**: Configure different parameter names in Terraform tfvars
3. **Runtime**: Lambda function reads the parameter name from environment variable

## Building and Deployment

### Prerequisites
- Docker with ARM64 support
- AWS CLI configured
- ECR repository: `face_recognition_and_tagging`

### Build Architecture

The build process uses a two-stage approach for optimal performance:

1. **Base Image** (`face_recognition_and_tagging_base:arm64`):
   - Contains pre-compiled dlib, face_recognition, and OpenCV
   - ARM64 optimized with multi-stage build
   - Reduces final image size and build time
   - Built once and reused for subsequent builds

2. **Lambda Image** (`face_recognition_and_tagging:latest`):
   - Built on top of base image
   - Contains Lambda function code and lightweight dependencies
   - This is what gets deployed to Lambda

### Build Process

#### 1. Build Base Image (One-time Setup)
```bash
cd BaseDocker
docker build --platform linux/arm64 -t face_recognition_and_tagging_base:arm64 .
docker tag face_recognition_and_tagging_base:arm64 face_recognition_and_tagging_base:latest
cd ..
```

**Base Image Features:**
- Python 3.11 slim base
- Pre-compiled dlib 19.24 with ARM64 optimizations
- face_recognition 1.3.0
- opencv-python-headless 4.10.0.84
- Required system libraries for image processing
- OpenGL libraries for Lambda compatibility

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
- **Memory**: 3078 MB (as configured in Terraform)
- **Timeout**: 60 seconds
- **Ephemeral storage**: 1024 MB
- **Reserved Concurrency**: 1 (to manage costs)

## Local Testing

```bash
# Run the container locally (without SSM - use environment variable for testing)
docker run --rm -p 9000:8080 \
  -e PINECONE_INDEX_NAME=test-index \
  -e DDB_TABLE_NAME=test-table \
  -e S3_BUCKET_NAME=test-bucket \
  -e AWS_ACCESS_KEY_ID=your_access_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret_key \
  -e AWS_DEFAULT_REGION=ap-south-1 \
  face_recognition_and_tagging:latest

# Test with curl (in another terminal)
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{
  "Records": [{
    "body": "{\"bucketName\": \"test-bucket\", \"objectKey\": \"test-image.jpg\"}"
  }]
}'
```

**Note**: For local testing, you'll need to either:
1. Set up AWS credentials to access SSM Parameter Store
2. Temporarily modify the code to use an environment variable for testing

## Performance Optimizations

### ARM64 Specific
- Uses optimized ARM64 base image
- Pre-compiled dlib for ARM64 architecture
- ARM64-native OpenCV build
- Includes OpenGL libraries for Lambda compatibility
- Multi-stage build reduces final image size

### Memory Management
- Efficient cleanup of temporary files in `/tmp`
- Streaming image processing
- Optimized face encoding generation
- Reserved concurrency to manage memory usage

### Pinecone Optimizations
- Batch upserts for new persons
- Efficient vector queries with metadata filtering
- Proper index management with ServerlessSpec
- Similarity threshold optimization (0.8 default)

## Monitoring and Debugging

### CloudWatch Logs
The function provides detailed logging for:
- SSM parameter retrieval
- Face detection results
- Pinecone query performance
- DynamoDB operations
- Error conditions with stack traces

### Key Metrics to Monitor
- **Execution Duration**: Should be < 30 seconds for most images
- **Memory Usage**: Typically 1-2GB depending on image size
- **Error Rate**: Should be < 1% under normal conditions
- **Face Detection Accuracy**: Monitor via custom metrics
- **SSM Parameter Access**: Monitor for access failures

## Troubleshooting

### Build Issues

1. **Docker ARM64 support**: Ensure Docker Desktop has ARM64 emulation enabled
2. **Memory during build**: The base image build requires significant memory (4GB+)
3. **Network timeouts**: Heavy dependencies download can timeout, retry the build
4. **OpenGL errors**: Base image includes `libgl1-mesa-glx` for Lambda compatibility
5. **Base image not found**: Ensure you've built the base image first

### Runtime Issues

1. **SSM Parameter errors**: 
   - Verify parameter exists: `aws ssm get-parameter --name "/pinecone/sparks"`
   - Check IAM permissions for SSM access
   - Ensure parameter value is not empty

2. **Import errors**: Check that all dependencies are ARM64 compatible
3. **Memory errors**: Function configured with 3078MB, increase if needed
4. **Timeout errors**: Function timeout set to 60 seconds, increase for large images
5. **libGL.so.1 errors**: Resolved by including OpenGL libraries in base image

### Pinecone Issues

1. **API key retrieval**: Check SSM parameter and IAM permissions
2. **Index creation**: The code will try to create the index if it doesn't exist
3. **Dimension mismatch**: Face encodings are 128-dimensional
4. **Connection errors**: Verify Pinecone service status and network connectivity

### Common Solutions

- **"No faces detected"**: Check image quality, format, and lighting
- **SSM access denied**: Verify Lambda execution role has SSM permissions
- **Pinecone connection errors**: Check API key in SSM and network connectivity
- **Memory errors**: Monitor CloudWatch metrics and adjust memory allocation

## Security Considerations

- **API Keys**: Securely stored in SSM Parameter Store with encryption
- **IAM Permissions**: Minimal required permissions for SSM, S3, DynamoDB
- **S3 Access**: Uses IAM roles with least privilege principle
- **DynamoDB**: Implements proper access patterns
- **Image Data**: Temporary files are cleaned up after processing
- **Audit Trail**: SSM parameter access is logged in CloudTrail

## Performance Tips

1. **Warm starts**: Keep Lambda warm with CloudWatch Events
2. **Memory allocation**: More memory = faster CPU, optimal around 3078MB
3. **Image preprocessing**: Resize large images before processing
4. **Batch processing**: Process multiple faces in one invocation when possible
5. **Reserved concurrency**: Set to 1 to manage costs and memory usage

## File Structure

```
src/lambdas/face_recognition/
├── lambda_function.py          # Main Lambda handler with SSM integration
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Main Lambda image (uses base image)
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
- `boto3==1.34.144`: AWS SDK (includes SSM client)

## IAM Permissions Required

The Lambda execution role needs these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/pinecone/sparks"
    }
  ]
}
```

Note: The resource ARN uses wildcards for region and account for simplicity.

## Future Enhancements

- [ ] Support for video face recognition
- [ ] Real-time face recognition API
- [ ] Advanced face clustering algorithms
- [ ] Integration with AWS Rekognition for comparison
- [ ] Batch processing optimization
- [ ] Custom face recognition models
- [ ] Automated API key rotation with AWS Secrets Manager
- [ ] Multi-region SSM parameter replication
