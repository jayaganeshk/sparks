# Sparks Data Model

This document provides a comprehensive overview of the data model used throughout the Sparks photo sharing platform. It serves as a reference for all components including the backend APIs, frontend UI, and infrastructure code.

## Overview

Sparks uses a single-table DynamoDB design pattern to store all application data. This approach optimizes for performance, cost, and scalability by leveraging DynamoDB's flexible schema and efficient access patterns.

## Core Entities

### 1. User Entity

Represents registered users of the platform.

**Storage Pattern:**

- **PK**: `{email}` (user's email address)
- **SK**: `{email}` (same as PK for user records)
- **entityType**: `USER`

**Attributes:**

- `email` (String): User's email address (primary identifier)
- `username` (String): Display name for the user
- `profilePicture` (String, Optional): S3 key path to user's profile picture
- `personId` (String, Optional): ID of the associated PERSON entity (set after face recognition)
- Additional user profile attributes as needed

**Example:**

```json
{
  "PK": "example@gmail.com",
  "SK": "example@gmail.com",
  "entityType": "USER",
  "email": "example@gmail.com",
  "username": "Ja",
  "profilePicture": "profile-pictures/example@gmail.com/profile.jpg",
  "personId": "person123"
}
```

### 2. Image Entity

Represents uploaded photos with their metadata and processing information.

**Storage Pattern:**

- **PK**: `{imageId}` (UUID of the image)
- **SK**: `UPLOADED_BY#{email}` (uploader's email)
- **entityType**: `IMAGE`

**Attributes:**

- `imageId` (String): UUID identifier for the image
- `assetType` (String): Always `"IMAGE"`
- `uploadedBy` (String): Email of the user who uploaded the image
- `uploaded_datetime` (String): ISO 8601 timestamp of upload
- `lastModified` (String): ISO 8601 timestamp of last modification
- `s3Key` (String): Path to original image in S3 bucket
- `images` (Object): JSON object containing processed image variants:
  ```json
  {
    "large": { "S": "processed/{imageId}_large.webp" },
    "medium": { "S": "processed/{imageId}_medium.webp" },
    "processedAt": { "S": "2025-08-01T09:24:28.957Z" }
  }
  ```
- `persons` (Array): List of person IDs detected in the image
- `tags` (Array): User-defined tags for the image

**Example:**

```json
{
  "PK": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "SK": "UPLOADED_BY#example@gmail.com",
  "assetType": "IMAGE",
  "entityType": "IMAGE",
  "imageId": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "s3Key": "originals/02df423f-0d45-4d59-b987-2ade841d0fbf.jpg",
  "uploadedBy": "example@gmail.com",
  "uploaded_datetime": "2025-08-01T09:24:22.159Z",
  "lastModified": "2025-08-01T09:24:28.957Z",
  "persons": [],
  "tags": []
}
```

### 3. Person Entity

Represents individuals detected through face recognition.

**Storage Pattern:**

- **PK**: `PERSON#{personId}` (person identifier)
- **SK**: `{personId}` (person identifier without prefix)
- **entityType**: `PERSON`

**Attributes:**

- `displayName` (String): Human-readable name for the person
- `s3Key` (String): Path to the person's face image in S3
- `createdAt` (Number): Unix timestamp when person was created

**Example:**

```json
{
  "PK": "PERSON#person1",
  "SK": "person1",
  "entityType": "PERSON",
  "displayName": "person1",
  "s3Key": "persons/person1.jpg",
  "createdAt": 1754040302
}
```

### 4. Person Tagging Entity

Links images to the persons detected within them.

**Storage Pattern:**

- **PK**: `{imageId}` (UUID of the image containing the person)
- **SK**: `PERSON#{personId}` (person detected in the image)
- **entityType**: `TAGGING#{personId}`

**Attributes:**

- `s3Key` (String): Path to the processed image in S3
- `images` (Object): JSON object with processed image variants
- `createdAt` (Number): Unix timestamp when tagging was created

**Example:**

```json
{
  "PK": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "SK": "PERSON#person1",
  "entityType": "TAGGING#person1",
  "s3Key": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_large.webp",
  "createdAt": 1754040302
}
```

### 5. User Upload Limit Entity

Tracks upload limits and quotas for users.

**Storage Pattern:**

- **PK**: `LIMIT#{email}` (user's email with LIMIT prefix)
- **SK**: `{email}` (user's email)
- **entityType**: `DEFAULT_LIMIT`

**Attributes:**

- `limit` (Number): Upload limit for the user (default: 500)

**Example:**

```json
{
  "PK": "LIMIT#example@gmail.com",
  "SK": "example@gmail.com",
  "entityType": "DEFAULT_LIMIT",
  "limit": 500
}
```

### 6. Unknown Persons Counter

Global counter for generating unique person IDs.

**Storage Pattern:**

- **PK**: `UNKNOWN_PERSONS`
- **SK**: `UNKNOWN_PERSONS`
- **entityType**: `UNKNOWN_PERSONS`

**Attributes:**

- `limit` (Number): Auto-incrementing counter

**Example:**

```json
{
  "PK": "UNKNOWN_PERSONS",
  "SK": "UNKNOWN_PERSONS",
  "entityType": "UNKNOWN_PERSONS",
  "limit": 1
}
```

## DynamoDB Indexes

### Global Secondary Indexes (GSIs)

#### entityType-PK-index

- **Partition Key**: `entityType`
- **Sort Key**: `PK`
- **Purpose**: Query all items of a specific type (e.g., all users, all images)

#### uploadedBy-PK-index

- **Partition Key**: `uploadedBy`
- **Sort Key**: `PK`
- **Purpose**: Query all images uploaded by a specific user

### Local Secondary Indexes (LSIs)

#### PK-limit-index

- **Partition Key**: `PK` (same as base table)
- **Sort Key**: `limit`
- **Purpose**: Query items under a partition key sorted by limit value

## Common Access Patterns

### User Operations

1. **Get user by email**: `GetItem` with `PK = {email}, SK = {email}`
2. **Get all users**: `Query` GSI `entityType-PK-index` with `entityType = USER`
3. **Get user upload limit**: `GetItem` with `PK = LIMIT#{email}, SK = {email}`

### Image Operations

1. **Get image by ID**: `Query` with `PK = {imageId}`
2. **Get all images by user**: `Query` GSI `uploadedBy-PK-index` with `uploadedBy = {email}`
3. **Get all images (feed)**: `Query` GSI `entityType-PK-index` with `entityType = IMAGE`
4. **Upload new image**: `PutItem` with image metadata

### Person and Face Recognition Operations

1. **Get person by ID**: `GetItem` with `PK = PERSON#{personId}, SK = {personId}`
2. **Get all persons**: `Query` GSI `entityType-PK-index` with `entityType = PERSON`
3. **Get all images containing a person**: `Query` GSI `entityType-PK-index` with `entityType = TAGGING#{personId}`
4. **Generate new person ID**: `UpdateItem` on `PK = UNKNOWN_PERSONS, SK = UNKNOWN_PERSONS` with increment

## S3 Storage Structure

The application uses Amazon S3 for storing image files with the following structure:

```
bucket-name/
├── originals/           # Original uploaded images
│   └── {imageId}.jpg
├── processed/           # Processed image variants
│   ├── {imageId}_large.webp
│   └── {imageId}_medium.webp
└── persons/            # Face images for person entities
    └── {personId}.jpg
```

## Data Types and Formats

### Identifiers

- **Image IDs**: UUID format (e.g., `02df423f-0d45-4d59-b987-2ade841d0fbf`)
- **Person IDs**: Simple string identifiers (e.g., `person1`)
- **User IDs**: Email addresses

### Timestamps

- **ISO 8601 Format**: Used for `uploaded_datetime` and `lastModified` (e.g., `2025-08-01T09:24:22.159Z`)
- **Unix Timestamp**: Used for `createdAt` in person entities (seconds since epoch)

### Image Processing

- **Original Format**: JPEG stored in `originals/` folder
- **Processed Formats**: WebP format in `large` and `medium` sizes
- **Processing Metadata**: Stored in `images` attribute with paths and processing timestamp

## API Response Formats

### Image List Response

```json
{
  "images": [
    {
      "imageId": "02df423f-0d45-4d59-b987-2ade841d0fbf",
      "uploadedBy": "example@gmail.com",
      "uploaded_datetime": "2025-08-01T09:24:22.159Z",
      "s3Key": "originals/02df423f-0d45-4d59-b987-2ade841d0fbf.jpg",
      "images": {
        "large": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_large.webp",
        "medium": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_medium.webp"
      },
      "persons": [],
      "tags": []
    }
  ],
  "lastEvaluatedKey": "encoded-pagination-key"
}
```

### Person List Response

```json
{
  "persons": [
    {
      "personId": "person1",
      "displayName": "person1",
      "s3Key": "persons/person1.jpg",
      "createdAt": 1754040302
    }
  ]
}
```

## Security Considerations

- **User Authentication**: Managed by AWS Cognito
- **Data Access**: All operations are scoped to the authenticated user
- **S3 Access**: Images are stored in private S3 buckets with signed URLs for access
- **API Keys**: Sensitive configuration (like Pinecone API keys) stored in AWS Systems Manager Parameter Store

## Performance Optimizations

- **Single Table Design**: Reduces the number of database connections and improves query performance
- **GSI Usage**: Enables efficient querying patterns without table scans
- **Image Processing**: Asynchronous processing pipeline using SNS/SQS for scalability
- **WebP Format**: Smaller file sizes for faster loading while maintaining quality
- **CDN Distribution**: Images served through Amazon CloudFront for global performance

## Deletion Lifecycle

When a user deletes an uploaded image via the Profile > My Uploads page, the system performs the following operations:

1. Authorization and lookup
   - Verify ownership by reading the IMAGE item with keys: `PK = {imageId}`, `SK = UPLOADED_BY#{email}`.
2. S3 cleanup
   - Delete the original object `originals/{imageId}.jpg`.
   - Delete generated assets if present: `thumbnailFileName`, `images.medium`, and `images.large`.
3. DynamoDB cleanup
   - Delete the IMAGE item `({PK: imageId, SK: UPLOADED_BY#{email}})`.
   - Query by `PK = {imageId}` and delete any related `TAGGING#{personId}` records.
4. Upload limit adjustment
   - Increment the user's `DEFAULT_LIMIT` (`PK = LIMIT#{email}, SK = {email}, attribute: limit`) by 1.

All deletions are implemented to be idempotent; attempting to delete missing S3 objects or non-existent TAGGING items will not cause a hard failure of the request.
