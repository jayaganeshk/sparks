# Sparks DynamoDB Data Model

This document describes the single-table design pattern used in the Sparks application's DynamoDB table.

## Single-Table Design

The Sparks application uses a single DynamoDB table to store all data, including users, photos, and person records. This approach leverages DynamoDB's flexible schema and access patterns to optimize for performance and cost.

## Primary Keys

- **Partition Key (PK)**: A composite key that includes the entity type and a unique identifier (e.g., `USER#email@example.com`, `PHOTO#uuid`).
- **Sort Key (SK)**: Used for hierarchical relationships and sorting (e.g., `USER#email@example.com`, `PHOTO#timestamp`).

## Entity Types

### User

- **PK**: `USER#{email}`
- **SK**: `USER#{email}`
- **entityType**: `user`
- **uploadedBy**: `{email}` (for GSI queries)
- **Other attributes**: `displayName`, `uploadLimit`, `createdAt`

### Photo

- **PK**: `PHOTO#{uuid}`
- **SK**: `PHOTO#{timestamp}`
- **entityType**: `photo`
- **uploadedBy**: `{email}` (for GSI queries)
- **Other attributes**: `originalKey`, `thumbnailKey`, `description`, `tags`, `persons`

### Person

- **PK**: `PERSON#{name}`
- **SK**: `{name}`
- **entityType**: `PERSON`
- **Other attributes**: `displayName`, `s3Key` (path to the person's face image in S3)

### Person Tagging

- **PK**: `{photoId}` (the ID of the photo containing the person)
- **SK**: `PERSON#{personName}` (the person detected in the photo)
- **entityType**: `TAGGING#{personName}` (used for querying all photos containing a specific person)
- **Other attributes**: `s3Key` (path to the original photo in S3)

### Unknown Persons Counter

- **PK**: `UNKNOWN_PERSONS`
- **SK**: `UNKNOWN_PERSONS`
- **entityType**: `UNKNOWN_PERSONS`
- **Other attributes**: `limit` (auto-incrementing counter for generating new person IDs)

## Indexes

### Global Secondary Indexes (GSIs)

- **uploadedBy-PK-index**
  - **Partition Key**: `uploadedBy` (S)
  - **Sort Key**: `PK` (S)
  - **Purpose**: To efficiently query for all photos uploaded by a specific user, sorted by upload time.

- **entityType-PK-index**
  - **Partition Key**: `entityType` (S)
  - **Sort Key**: `PK` (S)
  - **Purpose**: To query for all items of a specific type (e.g., all users, all photos), sorted by their creation timestamp.

### Local Secondary Indexes (LSIs)

- **PK-limit-index**
  - **Partition Key**: `PK` (S) - (Same as base table)
  - **Sort Key**: `limit` (N)
  - **Purpose**: To query items under a specific partition key (like a user) and sort them by a numeric `limit` attribute.

## Common Access Patterns

1.  **Get user by email**: `GetItem` with `PK = USER#{email}`.
2.  **Get all photos by user**: `Query` GSI `uploadedBy-PK-index` with `uploadedBy = {email}`.
3.  **Get all photos (feed)**: `Query` GSI `entityType-PK-index` with `entityType = photo`.
4.  **Get all users**: `Query` GSI `entityType-PK-index` with `entityType = user`.
5.  **Get all persons**: `Query` GSI `entityType-PK-index` with `entityType = PERSON`.
6.  **Get all photos containing a specific person**: `Query` GSI `entityType-PK-index` with `entityType = TAGGING#{personName}`.
7.  **Get next available person ID**: `UpdateItem` on `PK = UNKNOWN_PERSONS, SK = UNKNOWN_PERSONS` with increment expression on `limit` attribute.

## Pagination

For paginated queries, the API uses DynamoDB's `LastEvaluatedKey`. The API receives this key from the client, decodes it, and uses it as the `ExclusiveStartKey` for the next query. It then encodes the new `LastEvaluatedKey` from the response and sends it back to the client for the subsequent request.
