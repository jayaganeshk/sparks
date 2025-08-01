# Sparks Data Model

This document provides a comprehensive overview of the data model used throughout the Sparks photo sharing platform. It serves as a reference for all components including the backend APIs, frontend UI, and infrastructure code.

## Overview

Sparks uses a single-table DynamoDB design pattern to store all application data. This approach optimizes for performance, cost, and scalability by leveraging DynamoDB's flexible schema and efficient access patterns.

## Core Entities

### 1. User Entity

Represents registered users of the platform, including both regular users and event organizers.

**Storage Pattern:**
- **PK**: `{email}` (user's email address)
- **SK**: `{email}` (same as PK for user records)
- **entityType**: `USER`

**Attributes:**
- `email` (String): User's email address (primary identifier)
- `username` (String): Display name for the user
- `userType` (String): User role - either `REGULAR_USER` or `EVENT_ORGANIZER`
- `organizationName` (String, optional): Organization name for event organizers
- `storageQuota` (Number, optional): Storage quota in bytes for event organizers
- `storageUsed` (Number, optional): Current storage usage in bytes for event organizers
- `isActive` (Boolean): Whether the user account is active
- `createdAt` (String): ISO 8601 timestamp of account creation
- Additional user profile attributes as needed

**Example (Regular User):**
```json
{
  "PK": "jayaganesh111999@gmail.com",
  "SK": "jayaganesh111999@gmail.com",
  "entityType": "USER",
  "email": "jayaganesh111999@gmail.com",
  "username": "Ja",
  "userType": "REGULAR_USER",
  "isActive": true,
  "createdAt": "2025-08-01T09:00:00.000Z"
}
```

**Example (Event Organizer):**
```json
{
  "PK": "organizer@example.com",
  "SK": "organizer@example.com",
  "entityType": "USER",
  "email": "organizer@example.com",
  "username": "ABC Events",
  "userType": "EVENT_ORGANIZER",
  "organizationName": "ABC Events",
  "storageQuota": 10737418240,
  "storageUsed": 1073741824,
  "isActive": true,
  "createdAt": "2025-08-01T10:00:00.000Z"
}
```

### 2. Image Entity

Represents uploaded photos with their metadata and processing information. Supports both personal photos and event organizer photos.

**Storage Pattern:**
- **PK**: `{imageId}` (UUID of the image)
- **SK**: `UPLOADED_BY#{email}` (uploader's email)
- **entityType**: `IMAGE` (for personal photos) or `EVENT_IMAGE` (for event organizer photos)

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
    "large": {"S": "processed/{imageId}_large.webp"},
    "medium": {"S": "processed/{imageId}_medium.webp"},
    "processedAt": {"S": "2025-08-01T09:24:28.957Z"}
  }
  ```
- `persons` (Array): List of person IDs detected in the image
- `tags` (Array): User-defined tags for the image
- `albumId` (String, optional): Album ID for event organizer images
- `metadata` (Object, optional): Additional metadata for event images:
  ```json
  {
    "originalFileName": "IMG_001.jpg",
    "fileSize": 2048576,
    "dimensions": {"width": 4000, "height": 3000}
  }
  ```

**Example (Personal Photo):**
```json
{
  "PK": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "SK": "UPLOADED_BY#jayaganesh111999@gmail.com",
  "assetType": "IMAGE",
  "entityType": "IMAGE",
  "imageId": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "s3Key": "originals/02df423f-0d45-4d59-b987-2ade841d0fbf.jpg",
  "uploadedBy": "jayaganesh111999@gmail.com",
  "uploaded_datetime": "2025-08-01T09:24:22.159Z",
  "lastModified": "2025-08-01T09:24:28.957Z",
  "persons": [],
  "tags": []
}
```

**Example (Event Photo):**
```json
{
  "PK": "image-uuid-789",
  "SK": "UPLOADED_BY#organizer@example.com",
  "entityType": "EVENT_IMAGE",
  "imageId": "image-uuid-789",
  "assetType": "IMAGE",
  "uploadedBy": "organizer@example.com",
  "uploaded_datetime": "2025-08-01T10:30:00.000Z",
  "lastModified": "2025-08-01T10:30:00.000Z",
  "s3Key": "originals/image-uuid-789.jpg",
  "images": {
    "large": "processed/image-uuid-789_large.webp",
    "medium": "processed/image-uuid-789_medium.webp",
    "processedAt": "2025-08-01T10:35:00.000Z"
  },
  "persons": [],
  "tags": [],
  "albumId": "album-uuid-123",
  "metadata": {
    "originalFileName": "IMG_001.jpg",
    "fileSize": 2048576,
    "dimensions": {"width": 4000, "height": 3000}
  }
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
  "PK": "LIMIT#jayaganesh111999@gmail.com",
  "SK": "jayaganesh111999@gmail.com",
  "entityType": "DEFAULT_LIMIT",
  "limit": 500
}
```

### 6. Album Entity

Represents event organizer albums for organizing event photos.

**Storage Pattern:**
- **PK**: `ALBUM#{albumId}` (album identifier with prefix)
- **SK**: `METADATA` (metadata record for the album)
- **entityType**: `ALBUM`

**Attributes:**
- `albumId` (String): UUID identifier for the album
- `name` (String): Album name/title
- `description` (String, optional): Album description
- `eventDate` (String): ISO 8601 date of the event
- `createdBy` (String): Email of the event organizer who created the album
- `createdAt` (String): ISO 8601 timestamp of album creation
- `visibility` (String): Album visibility - `"public"` or `"private"`
- `imageCount` (Number): Number of images in the album
- `coverImageId` (String, optional): Image ID to use as album cover

**Example:**
```json
{
  "PK": "ALBUM#album-uuid-123",
  "SK": "METADATA",
  "entityType": "ALBUM",
  "albumId": "album-uuid-123",
  "name": "Wedding Reception 2025",
  "description": "Beautiful wedding reception photos",
  "eventDate": "2025-07-15",
  "createdBy": "organizer@example.com",
  "createdAt": "2025-08-01T10:00:00.000Z",
  "visibility": "public",
  "imageCount": 150,
  "coverImageId": "image-uuid-456"
}
```

### 7. Album-Image Association Entity

Links images to albums in a many-to-many relationship pattern.

**Storage Pattern:**
- **PK**: `ALBUM#{albumId}` (album identifier with prefix)
- **SK**: `IMAGE#{imageId}` (image identifier with prefix)
- **entityType**: `ALBUM_IMAGE`

**Attributes:**
- `albumId` (String): UUID identifier for the album
- `imageId` (String): UUID identifier for the image
- `addedAt` (String): ISO 8601 timestamp when image was added to album
- `sortOrder` (Number, optional): Sort order within the album

**Example:**
```json
{
  "PK": "ALBUM#album-uuid-123",
  "SK": "IMAGE#image-uuid-789",
  "entityType": "ALBUM_IMAGE",
  "albumId": "album-uuid-123",
  "imageId": "image-uuid-789",
  "addedAt": "2025-08-01T10:30:00.000Z",
  "sortOrder": 1
}
```

### 8. Unknown Persons Counter

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
3. **Get all event organizers**: `Query` GSI `entityType-PK-index` with `entityType = USER` and filter `userType = EVENT_ORGANIZER`
4. **Get user upload limit**: `GetItem` with `PK = LIMIT#{email}, SK = {email}`

### Image Operations
1. **Get image by ID**: `Query` with `PK = {imageId}`
2. **Get all images by user**: `Query` GSI `uploadedBy-PK-index` with `uploadedBy = {email}`
3. **Get all personal images (feed)**: `Query` GSI `entityType-PK-index` with `entityType = IMAGE`
4. **Get all event images**: `Query` GSI `entityType-PK-index` with `entityType = EVENT_IMAGE`
5. **Get event images by organizer**: `Query` GSI `uploadedBy-PK-index` with `uploadedBy = {email}` and filter `entityType = EVENT_IMAGE`
6. **Upload new image**: `PutItem` with image metadata

### Album Operations
1. **Get album metadata**: `GetItem` with `PK = ALBUM#{albumId}, SK = METADATA`
2. **Get all albums by organizer**: `Query` GSI `entityType-PK-index` with `entityType = ALBUM` and filter `createdBy = {email}`
3. **Get all public albums**: `Query` GSI `entityType-PK-index` with `entityType = ALBUM` and filter `visibility = public`
4. **Get album images**: `Query` with `PK = ALBUM#{albumId}` and `SK begins_with IMAGE#`
5. **Add image to album**: `PutItem` with Album-Image association entity
6. **Remove image from album**: `DeleteItem` with `PK = ALBUM#{albumId}, SK = IMAGE#{imageId}`

### Person and Face Recognition Operations
1. **Get person by ID**: `GetItem` with `PK = PERSON#{personId}, SK = {personId}`
2. **Get all persons**: `Query` GSI `entityType-PK-index` with `entityType = PERSON`
3. **Get all images containing a person**: `Query` GSI `entityType-PK-index` with `entityType = TAGGING#{personId}`
4. **Get event images containing a person**: `Query` GSI `entityType-PK-index` with `entityType = TAGGING#{personId}` then filter by source image type
5. **Generate new person ID**: `UpdateItem` on `PK = UNKNOWN_PERSONS, SK = UNKNOWN_PERSONS` with increment

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
      "uploadedBy": "jayaganesh111999@gmail.com",
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
