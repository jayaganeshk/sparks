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
- **profilePicture**: S3 key path to user's profile picture (optional)
- **personId**: ID of the associated PERSON entity after face recognition (optional)
- **Other attributes**: User-specific attributes

### Image

- **PK**: `{imageId}` (UUID format, e.g., `02df423f-0d45-4d59-b987-2ade841d0fbf`)
- **SK**: `UPLOADED_BY#{email}`
- **entityType**: `IMAGE`
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

1. **Get user by email**: `GetItem` with `PK = {email}, SK = {email}`
2. **Get all images by user**: `Query` GSI `uploadedBy-PK-index` with `uploadedBy = {email}`
3. **Get all images (feed)**: `Query` GSI `entityType-PK-index` with `entityType = IMAGE`
4. **Get all users**: `Query` GSI `entityType-PK-index` with `entityType = USER`
5. **Get all persons**: `Query` GSI `entityType-PK-index` with `entityType = PERSON`
6. **Get all images containing a specific person**: `Query` GSI `entityType-PK-index` with `entityType = TAGGING#{personId}`
7. **Get user upload limit**: `GetItem` with `PK = LIMIT#{email}, SK = {email}`
8. **Get next available person ID**: `UpdateItem` on `PK = UNKOWN_PERSONS, SK = UNKOWN_PERSONS` with increment expression on `limit` attribute
9. **Get image by ID**: `Query` with `PK = {imageId}` to get all related records (including person tags)
10. **Get person by ID**: `GetItem` with `PK = PERSON#{personId}, SK = PERSON#{personId}`

## Data Structure Examples

### Image Record

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

### User Record

```json
{
  "PK": "jayaganesh111999@gmail.com",
  "SK": "jayaganesh111999@gmail.com",
  "entityType": "USER",
  "email": "jayaganesh111999@gmail.com",
  "username": "Ja"
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

- The application uses UUID format for image IDs (e.g., `02df423f-0d45-4d59-b987-2ade841d0fbf`)
- The `uploaded_datetime` and `lastModified` fields use ISO 8601 timestamp format
- The `createdAt` field for persons uses Unix timestamp in seconds
- The `UNKNOWN_PERSONS` entity is used for generating unique person IDs
- User limits default to 500 uploads per user
- Image processing creates multiple variants (large, medium) stored as WebP format
- The `images` attribute contains a JSON object with processed image paths and metadata
- Person tagging links images to detected persons for face recognition functionality
