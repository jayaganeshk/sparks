# Sparks DynamoDB Data Model

This document describes the single-table design pattern used in the Sparks application's DynamoDB table.

## Single-Table Design

The Sparks application uses a single DynamoDB table to store all data, including users, images, and person records. This approach leverages DynamoDB's flexible schema and access patterns to optimize for performance and cost.

## Primary Keys

- **Partition Key (PK)**: A composite key that includes the entity identifier (e.g., `02df423f-0d45-4d59-b987-2ade841d0fbf`, `jayaganesh111999@gmail.com`, `LIMIT#jayaganesh111999@gmail.com`).
- **Sort Key (SK)**: Used for hierarchical relationships and entity identification (e.g., `UPLOADED_BY#jayaganesh111999@gmail.com`, `jayaganesh111999@gmail.com`, `PERSON#person1`).

## Entity Types

### User

- **PK**: `{email}`
- **SK**: `{email}`
- **entityType**: `USER`
- **email**: User's email address
- **username**: Display username
- **userType**: User role - either `REGULAR_USER` or `EVENT_ORGANIZER`
- **organizationName**: Organization name for event organizers (optional)
- **storageQuota**: Storage quota in bytes for event organizers (optional)
- **storageUsed**: Current storage usage in bytes for event organizers (optional)
- **isActive**: Whether the user account is active
- **createdAt**: ISO 8601 timestamp of account creation
- **Other attributes**: User-specific attributes

### Image

- **PK**: `{imageId}` (UUID format, e.g., `02df423f-0d45-4d59-b987-2ade841d0fbf`)
- **SK**: `UPLOADED_BY#{email}`
- **entityType**: `IMAGE` (for personal photos) or `EVENT_IMAGE` (for event organizer photos)
- **assetType**: `IMAGE`
- **imageId**: UUID of the image
- **uploadedBy**: `{email}` (for GSI queries)
- **uploaded_datetime**: ISO timestamp of upload
- **lastModified**: ISO timestamp of last modification
- **s3Key**: Path to original image in S3 (e.g., `originals/02df423f-0d45-4d59-b987-2ade841d0fbf.jpg`)
- **images**: JSON object containing processed image variants:
  ```json
  {
    "large": {"S": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_large.webp"},
    "medium": {"S": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_medium.webp"},
    "processedAt": {"S": "2025-08-01T09:24:28.957Z"}
  }
  ```
- **persons**: JSON array of person IDs detected in the image
- **tags**: JSON array of user-defined tags
- **albumId**: Album ID for event organizer images (optional)
- **metadata**: Additional metadata for event images (optional):
  ```json
  {
    "originalFileName": "IMG_001.jpg",
    "fileSize": 2048576,
    "dimensions": {"width": 4000, "height": 3000}
  }
  ```

### User Upload Limit

- **PK**: `LIMIT#{email}`
- **SK**: `{email}`
- **entityType**: `DEFAULT_LIMIT`
- **limit**: Numeric limit for user uploads (default: 500)

### Person

- **PK**: `PERSON#{personId}` (e.g., `PERSON#person1`)
- **SK**: `{personId}` (e.g., `person1`)
- **entityType**: `PERSON`
- **displayName**: Human-readable name for the person
- **s3Key**: Path to the person's face image in S3 (e.g., `persons/person1.jpg`)
- **createdAt**: Unix timestamp of when person was created

### Person Tagging

- **PK**: `{imageId}` (the UUID of the image containing the person)
- **SK**: `PERSON#{personId}` (the person detected in the image)
- **entityType**: `TAGGING#{personId}` (used for querying all images containing a specific person)
- **s3Key**: Path to the processed image in S3
- **images**: JSON object containing processed image variants (same structure as Image entity)
- **createdAt**: Unix timestamp of when tagging was created

### Album

- **PK**: `ALBUM#{albumId}` (album identifier with prefix)
- **SK**: `METADATA` (metadata record for the album)
- **entityType**: `ALBUM`
- **albumId**: UUID identifier for the album
- **name**: Album name/title
- **description**: Album description (optional)
- **eventDate**: ISO 8601 date of the event
- **createdBy**: Email of the event organizer who created the album
- **createdAt**: ISO 8601 timestamp of album creation
- **visibility**: Album visibility - `"public"` or `"private"`
- **imageCount**: Number of images in the album
- **coverImageId**: Image ID to use as album cover (optional)

### Album-Image Association

- **PK**: `ALBUM#{albumId}` (album identifier with prefix)
- **SK**: `IMAGE#{imageId}` (image identifier with prefix)
- **entityType**: `ALBUM_IMAGE`
- **albumId**: UUID identifier for the album
- **imageId**: UUID identifier for the image
- **addedAt**: ISO 8601 timestamp when image was added to album
- **sortOrder**: Sort order within the album (optional)

### Unknown Persons Counter

- **PK**: `UNKNOWN_PERSONS` (corrected from previous typo)
- **SK**: `UNKNOWN_PERSONS`
- **entityType**: `UNKNOWN_PERSONS`
- **limit**: Auto-incrementing counter for generating new person IDs

## Indexes

### Global Secondary Indexes (GSIs)

- **entityType-PK-index**

  - **Partition Key**: `entityType` (String)
  - **Sort Key**: `PK` (String)
  - **Projected attributes**: All
  - **Purpose**: To query for all items of a specific type (e.g., all users, all images), sorted by their primary key

- **uploadedBy-PK-index**
  - **Partition Key**: `uploadedBy` (String)
  - **Sort Key**: `PK` (String)
  - **Projected attributes**: All
  - **Purpose**: To efficiently query for all images uploaded by a specific user

### Local Secondary Indexes (LSIs)

- **PK-limit-index**
  - **Partition Key**: `PK` (String) - (Same as base table)
  - **Sort Key**: `limit` (Number)
  - **Projected attributes**: All
  - **Purpose**: To query items under a specific partition key and sort them by a numeric `limit` attribute

## Common Access Patterns

### User Operations
1. **Get user by email**: `GetItem` with `PK = {email}, SK = {email}`
2. **Get all users**: `Query` GSI `entityType-PK-index` with `entityType = USER`
3. **Get all event organizers**: `Query` GSI `entityType-PK-index` with `entityType = USER` and filter `userType = EVENT_ORGANIZER`
4. **Get user upload limit**: `GetItem` with `PK = LIMIT#{email}, SK = {email}`

### Image Operations
5. **Get image by ID**: `Query` with `PK = {imageId}` to get all related records (including person tags)
6. **Get all images by user**: `Query` GSI `uploadedBy-PK-index` with `uploadedBy = {email}`
7. **Get all personal images (feed)**: `Query` GSI `entityType-PK-index` with `entityType = IMAGE`
8. **Get all event images**: `Query` GSI `entityType-PK-index` with `entityType = EVENT_IMAGE`
9. **Get event images by organizer**: `Query` GSI `uploadedBy-PK-index` with `uploadedBy = {email}` and filter `entityType = EVENT_IMAGE`

### Album Operations
10. **Get album metadata**: `GetItem` with `PK = ALBUM#{albumId}, SK = METADATA`
11. **Get all albums by organizer**: `Query` GSI `entityType-PK-index` with `entityType = ALBUM` and filter `createdBy = {email}`
12. **Get all public albums**: `Query` GSI `entityType-PK-index` with `entityType = ALBUM` and filter `visibility = public`
13. **Get album images**: `Query` with `PK = ALBUM#{albumId}` and `SK begins_with IMAGE#`
14. **Add image to album**: `PutItem` with Album-Image association entity
15. **Remove image from album**: `DeleteItem` with `PK = ALBUM#{albumId}, SK = IMAGE#{imageId}`

### Person Operations
16. **Get person by ID**: `GetItem` with `PK = PERSON#{personId}, SK = {personId}`
17. **Get all persons**: `Query` GSI `entityType-PK-index` with `entityType = PERSON`
18. **Get all images containing a specific person**: `Query` GSI `entityType-PK-index` with `entityType = TAGGING#{personId}`
19. **Get event images containing a person**: `Query` GSI `entityType-PK-index` with `entityType = TAGGING#{personId}` then filter by source image type
20. **Get next available person ID**: `UpdateItem` on `PK = UNKNOWN_PERSONS, SK = UNKNOWN_PERSONS` with increment expression on `limit` attribute

## Data Structure Examples

### Image Record (Personal Photo)

```json
{
  "PK": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "SK": "UPLOADED_BY#jayaganesh111999@gmail.com",
  "assetType": "IMAGE",
  "entityType": "IMAGE",
  "imageId": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "s3Key": "originals/02df423f-0d45-4d59-b987-2ade841d0fbf.jpg",
  "images": {
    "large": {"S": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_large.webp"},
    "medium": {"S": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_medium.webp"},
    "processedAt": {"S": "2025-08-01T09:24:28.957Z"}
  },
  "uploadedBy": "jayaganesh111999@gmail.com",
  "uploaded_datetime": "2025-08-01T09:24:22.159Z",
  "lastModified": "2025-08-01T09:24:28.957Z",
  "persons": [],
  "tags": []
}
```

### Image Record (Event Photo)

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

### Person Record

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

### Person Tagging Record

```json
{
  "PK": "02df423f-0d45-4d59-b987-2ade841d0fbf",
  "SK": "PERSON#person1",
  "entityType": "TAGGING#person1",
  "s3Key": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_large.webp",
  "images": {
    "large": {"S": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_large.webp"},
    "medium": {"S": "processed/02df423f-0d45-4d59-b987-2ade841d0fbf_medium.webp"}
  },
  "createdAt": 1754040302
}
```

### User Record (Regular User)

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

### User Record (Event Organizer)

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

### User Limit Record

```json
{
  "PK": "LIMIT#jayaganesh111999@gmail.com",
  "SK": "jayaganesh111999@gmail.com",
  "entityType": "DEFAULT_LIMIT",
  "limit": 500
}
```

### Album Record

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

### Album-Image Association Record

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

### Unknown Persons Counter

```json
{
  "PK": "UNKNOWN_PERSONS",
  "SK": "UNKNOWN_PERSONS",
  "entityType": "UNKNOWN_PERSONS",
  "limit": 1
}
```

## Pagination

For paginated queries, the API uses DynamoDB's `LastEvaluatedKey`. The API receives this key from the client, decodes it, and uses it as the `ExclusiveStartKey` for the next query. It then encodes the new `LastEvaluatedKey` from the response and sends it back to the client for the subsequent request.

## Notes

- The application uses UUID format for image IDs and album IDs (e.g., `02df423f-0d45-4d59-b987-2ade841d0fbf`)
- The `uploaded_datetime`, `lastModified`, `createdAt`, and `addedAt` fields use ISO 8601 timestamp format
- The `createdAt` field for persons uses Unix timestamp in seconds (legacy format)
- The `UNKNOWN_PERSONS` entity is used for generating unique person IDs
- User limits default to 500 uploads per user
- Event organizers have configurable storage quotas stored in the `storageQuota` field
- Image processing creates multiple variants (large, medium) stored as WebP format
- The `images` attribute contains a JSON object with processed image paths and metadata
- Person tagging links images to detected persons for face recognition functionality
- Personal photos use `entityType = IMAGE` while event organizer photos use `entityType = EVENT_IMAGE`
- Albums are created by event organizers and can be either `public` or `private`
- Album-Image associations enable many-to-many relationships between albums and images
- The same S3 storage structure is used for both personal and event photos
- Face recognition works across both personal and event photos, with shared person entities
