# Sparks DynamoDB Data Model

This document describes the single-table design pattern used in the Sparks application's DynamoDB table.

## Single-Table Design

The Sparks application uses a single DynamoDB table to store all data, including users, photos, person records, events, and livestream configurations. This approach leverages DynamoDB's flexible schema and access patterns to optimize for performance and cost.

## Primary Keys

The table uses the following primary key structure:

- **Partition Key (PK)**: A composite key that includes the entity type and a unique identifier
- **Sort Key (SK)**: Used for hierarchical relationships and sorting

## Entity Types

### User

Represents a user of the application.

```
{
  "PK": "USER#email@example.com",
  "SK": "USER#email@example.com",
  "entityType": "USER",
  "email": "email@example.com",
  "displayName": "User Name",
  "uploadLimit": 100,
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### Image

Represents a photo uploaded by a user.

```
{
  "PK": "IMAGE#uuid",
  "SK": "IMAGE#timestamp",
  "entityType": "IMAGE",
  "email": "email@example.com",
  "imageId": "uuid",
  "originalKey": "originals/email@example.com/uuid.jpg",
  "thumbnailKey": "thumbnails/email@example.com/uuid.jpg",
  "description": "Photo description",
  "tags": ["tag1", "tag2"],
  "persons": ["person1", "person2"],
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### Person

Represents a person detected in photos.

```
{
  "PK": "PERSON#uuid",
  "SK": "PERSON#name",
  "entityType": "PERSON",
  "personId": "uuid",
  "name": "Person Name",
  "faceCount": 5,
  "thumbnailUrl": "https://example.com/thumbnail.jpg",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### Face

Represents a face detection in a specific photo.

```
{
  "PK": "FACE#uuid",
  "SK": "IMAGE#imageId",
  "entityType": "FACE",
  "personId": "personId",
  "imageId": "imageId",
  "confidence": 0.98,
  "boundingBox": {
    "left": 0.1,
    "top": 0.1,
    "width": 0.2,
    "height": 0.2
  },
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### Event

Represents a web event logged by the application.

```
{
  "PK": "EVENT#uuid",
  "SK": "EVENT#timestamp",
  "entityType": "EVENT",
  "eventType": "PHOTO_VIEW",
  "eventData": {
    "imageId": "uuid"
  },
  "email": "email@example.com",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

### Livestream

Represents a livestream configuration.

```
{
  "PK": "LIVESTREAM#uuid",
  "SK": "LIVESTREAM#timestamp",
  "entityType": "LIVESTREAM",
  "streamUrl": "https://example.com/stream",
  "title": "Live Stream Title",
  "description": "Live Stream Description",
  "startTime": "2023-01-01T00:00:00Z",
  "endTime": "2023-01-01T01:00:00Z",
  "createdAt": "2023-01-01T00:00:00Z"
}
```

## Global Secondary Indexes (GSIs)

The table uses the following GSIs to enable efficient access patterns:

### 1. entityType-PK-index

- **Partition Key**: `entityType`
- **Sort Key**: `PK`

This GSI allows querying all items of a specific entity type, sorted by their primary key. Used for listing all users, photos, persons, etc.

### 2. email-PK-index

- **Partition Key**: `email`
- **Sort Key**: `PK`

This GSI allows querying all items associated with a specific user email, such as all photos uploaded by a user.

### 3. personId-PK-index

- **Partition Key**: `personId`
- **Sort Key**: `PK`

This GSI allows querying all photos that contain a specific person.

## Access Patterns

The table design supports the following access patterns:

1. Get user by email: `PK = USER#email, SK = USER#email`
2. Get photo by ID: `PK = IMAGE#uuid, SK = IMAGE#timestamp`
3. Get all photos: Query GSI `entityType-PK-index` with `entityType = IMAGE`
4. Get all users: Query GSI `entityType-PK-index` with `entityType = USER`
5. Get all photos by user: Query GSI `email-PK-index` with `email = user@example.com` and begins_with `PK = IMAGE#`
6. Get all persons: Query GSI `entityType-PK-index` with `entityType = PERSON`
7. Get all photos with a specific person: Query GSI `personId-PK-index` with `personId = uuid`
8. Get most recent livestream: Query GSI `entityType-PK-index` with `entityType = LIVESTREAM`, limit 1, sorted descending

## Pagination

For paginated queries, the API uses DynamoDB's `LastEvaluatedKey` mechanism. The API encodes this key in base64 and returns it as `lastEvaluatedKey` in the response. Clients can pass this value back in subsequent requests to continue pagination.

## Consistency

The table uses eventually consistent reads for most operations to optimize for cost and performance. For operations that require strong consistency, the API explicitly requests strongly consistent reads.
