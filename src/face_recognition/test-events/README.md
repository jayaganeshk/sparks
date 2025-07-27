# Test Events for Face Recognition Lambda

This directory contains test events that simulate how the Lambda function receives messages from SQS.

## Files

### `sqs-event.json`
Single image processing test event. This simulates an SQS message containing one image to process.

**Before testing, update:**
- `bucketName`: Replace `"your-test-bucket-name"` with your actual S3 bucket name
- `objectKey`: Replace `"test-images/sample-face.jpg"` with the path to an actual image in your bucket

### `sqs-batch-event.json`
Batch processing test event. This simulates an SQS batch with multiple images to process.

**Before testing, update:**
- Both `bucketName` values with your actual S3 bucket name
- Both `objectKey` values with paths to actual images in your bucket

## How the Lambda Handler Processes These Events

The lambda handler expects SQS events with this structure:

```json
{
  "Records": [
    {
      "body": "{\"bucketName\": \"your-bucket\", \"objectKey\": \"path/to/image.jpg\"}"
    }
  ]
}
```

For each record, it:
1. Parses the `body` JSON string
2. Extracts `bucketName` and `objectKey`
3. Downloads the image from S3
4. Detects faces using MTCNN
5. Generates face embeddings
6. Queries Pinecone for similar faces
7. Stores results in DynamoDB

## Testing Locally

1. **Update test events** with real bucket and object keys
2. **Set up environment** with `.env` file containing AWS credentials
3. **Run test:**
   ```bash
   ./build.sh test
   ```

## Manual Testing

You can also test manually:

```bash
# Start container
docker run --rm -d -p 9000:8080 --env-file .env --name face-test face-recognition-service:latest

# Send test event
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -H "Content-Type: application/json" \
  -d @test-events/sqs-event.json

# Check logs
docker logs face-test

# Stop container
docker stop face-test
```

## Expected Response

Successful processing should return:

```json
{
  "persons_found": ["person1", "person2"],
  "time_taken": 15.23
}
```

Error response:

```json
{
  "message": "Error occurred",
  "error": "Error details here",
  "status": 500
}
```
