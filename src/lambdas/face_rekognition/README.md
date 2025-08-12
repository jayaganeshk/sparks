# face_rekognition Lambda (Amazon Rekognition)

This Lambda mirrors the business logic of `src/lambdas/face_recognition/` but uses Amazon Rekognition for face detection, search, and indexing instead of custom models and Pinecone.

## Event Payload Compatibility

Accepts the same SQS event format used by `face_recognition`:
- `bucketName`: S3 bucket
- Either `objectKey` or `largeImageKey`
- `fileNameWithoutExt`: KSUID for tagging lookups (when provided by thumbnailer)
- Optional `isProfilePicture` (boolean) and `userEmail` for profile picture association

## Environment Variables

- `DDB_TABLE_NAME` (required): Main table name
- `S3_BUCKET_NAME` (optional): Default bucket when not present in event
- `REKOGNITION_COLLECTION_ID` (default: `sparks-face-collection`)
- `REKOGNITION_MATCH_THRESHOLD` (default: `90.0`)
- `REKOGNITION_MAX_FACES` (default: `5`)
- `MAX_FACES_PER_IMAGE` (default: `10`)
- `FACE_PADDING` (default: `20`)
- `SAVE_DETECTED_FACES` (default: `true`)

## Behavior

- Detect faces using `DetectFaces`
- For each detected face, crop with padding and call `SearchFacesByImage` on the collection
- If matched, returns the `ExternalImageId` as `person` (should be of the form `personN`)
- If not matched, creates a new `personN`:
  - Increments `UNKNOWN_PERSONS.limit` for ID
  - Uploads cropped face to `s3://<bucket>/persons/personN.jpg` (if enabled)
  - Inserts person record into DynamoDB
  - Indexes the face into the collection with `ExternalImageId=personN`
- Tags normal images into DynamoDB using the same format as the existing Lambda
- Associates profile pictures by writing `personId` to the user record

## IAM Permissions

Attach the following minimal permissions to the Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateCollection",
        "rekognition:DescribeCollection",
        "rekognition:DetectFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:IndexFaces"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::*"
    }
  ]
}
```

For production, scope resources to specific ARNs.

## Dependencies

- `Pillow` (for face cropping). `boto3` is provided by Lambda runtime.

See `requirements.txt`.

## Notes

- Ensure a Rekognition collection exists. The function will create it if missing.
- Existing known persons must be indexed with `ExternalImageId=personN` to be recognized.
- The result JSON mirrors the original Lambda shape for downstream compatibility.
