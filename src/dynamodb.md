# Sparks DynamoDB Data Model

This document describes the single-table design pattern used in the Sparks application's DynamoDB table.

## Single-Table Design

The Sparks application uses a single DynamoDB table to store all data, including users, images, and person records. This approach leverages DynamoDB's flexible schema and access patterns to optimize for performance and cost.

## Primary Keys

- **Partition Key (PK)**: A composite key that includes the entity identifier (e.g., `01K01PZ2ANA51ESNM6G1NAFFMS`, `jayaganesh111999@gmail.com`, `LIMIT#jayaganesh111999@gmail.com`).
- **Sort Key (SK)**: Used for hierarchical relationships and entity identification (e.g., `UPLOADED_BY#jayaganesh111999@gmail.com`, `jayaganesh111999@gmail.com`).

## Entity Types

### User

- **PK**: `{email}`
- **SK**: `{email}`
- **entityType**: `USER`
- **Other attributes**: User-specific attributes

### Image

- **PK**: `{imageId}` (ULID format, e.g., `01K01PZ2ANA51ESNM6G1NAFFMS`)
- **SK**: `UPLOADED_BY#{email}`
- **entityType**: `IMAGE`
- **assetType**: `IMAGE`
- **uploadedBy**: `{email}` (for GSI queries)
- **Other attributes**: `s3Key`, `thumbnailFileName`, `upload_datetime`

### User Upload Limit

- **PK**: `LIMIT#{email}`
- **SK**: `{email}`
- **Other attributes**: `limit` (numeric counter for user's upload limit/count)

### Person

- **PK**: `PERSON#{personId}` (e.g., `PERSON#01K01PZ2ANA51ESNM6G1NAFFMS`)
- **SK**: `PERSON#{personId}`
- **entityType**: `PERSON`
- **Other attributes**: `displayName`, `s3Key` (path to the person's face image in S3)

### Person Tagging

- **PK**: `{imageId}` (the ULID of the image containing the person)
- **SK**: `PERSON#{personId}` (the person detected in the image)
- **entityType**: `TAGGING#{personId}` (used for querying all images containing a specific person)
- **Other attributes**: `s3Key` (path to the original image in S3), `uploadedBy` (for GSI queries)

### Unknown Persons Counter

- **PK**: `UNKOWN_PERSONS` (note: appears to have typo in actual data)
- **SK**: `UNKOWN_PERSONS`
- **entityType**: `UNKOWN_PERSONS`
- **Other attributes**: `limit` (auto-incrementing counter for generating new person IDs)

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
  "PK": "01K01PZ2ANA51ESNM6G1NAFFMS",
  "SK": "UPLOADED_BY#jayaganesh111999@gmail.com",
  "assetType": "IMAGE",
  "entityType": "IMAGE",
  "s3Key": "originals/01K01PZ2ANA51ESNM6G1NAFFMS.jpg",
  "thumbnailFileName": "thumbnail/01K01PZ2ANA51ESNM6G1NAFFMS.jpg",
  "uploadedBy": "jayaganesh111999@gmail.com",
  "upload_datetime": 1752404298069
}
```

### Person Record

```json
{
  "PK": "PERSON#01K01PZ2ANA51ESNM6G1NAFFMS",
  "SK": "PERSON#01K01PZ2ANA51ESNM6G1NAFFMS",
  "entityType": "PERSON",
  "displayName": "John Doe",
  "s3Key": "persons/01K01PZ2ANA51ESNM6G1NAFFMS_face.jpg"
}
```

### Person Tagging Record

```json
{
  "PK": "01K01PZ2ANA51ESNM6G1NAFFMS",
  "SK": "PERSON#01K01PZ2ANA51ESNM6G1NAFFMS",
  "entityType": "TAGGING#01K01PZ2ANA51ESNM6G1NAFFMS",
  "s3Key": "originals/01K01PZ2ANA51ESNM6G1NAFFMS.jpg",
  "uploadedBy": "jayaganesh111999@gmail.com"
}
```

### User Record

```json
{
  "PK": "jayaganesh111999@gmail.com",
  "SK": "jayaganesh111999@gmail.com",
  "entityType": "USER"
}
```

### User Limit Record

```json
{
  "PK": "LIMIT#jayaganesh111999@gmail.com",
  "SK": "jayaganesh111999@gmail.com",
  "limit": 495
}
```

### Unknown Persons Counter

```json
{
  "PK": "UNKOWN_PERSONS",
  "SK": "UNKOWN_PERSONS",
  "entityType": "UNKOWN_PERSONS",
  "limit": 0
}
```

## Pagination

For paginated queries, the API uses DynamoDB's `LastEvaluatedKey`. The API receives this key from the client, decodes it, and uses it as the `ExclusiveStartKey` for the next query. It then encodes the new `LastEvaluatedKey` from the response and sends it back to the client for the subsequent request.

## Notes

- The application uses ULID (Universally Unique Lexicographically Sortable Identifier) format for image IDs
- The `upload_datetime` field uses Unix timestamp in milliseconds
- The `UNKOWN_PERSONS` entity appears to have a typo but is maintained for consistency with existing data
- User limits are tracked separately in `LIMIT#{email}` entities for efficient querying via the LSI
