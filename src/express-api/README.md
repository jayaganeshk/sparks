# Sparks Express API

This is the backend API for the Sparks photo-sharing application. It provides a RESTful interface for the frontend to interact with the AWS services that power the application.

## Architecture

The API is built using Express.js and is designed to run as a Lambda function behind an AWS HTTP API Gateway. It uses the following AWS services:

- **DynamoDB**: For storing all application data
- **S3**: For storing photos and thumbnails
- **Cognito**: For user authentication and authorization
- **Lambda**: For running the API and other serverless functions
- **API Gateway**: For exposing the API to the internet

## API Endpoints

| Method | Endpoint                    | Description                                                           | Authentication |
| :----- | :-------------------------- | :-------------------------------------------------------------------- | :------------- |
| `GET`  | `/photos`                   | Get a paginated list of all photos.                                   | Cognito        |
| `GET`  | `/photos/:id`               | Get a specific photo by ID.                                           | Cognito        |
| `GET`  | `/photos/:id/persons`       | Get persons detected in a specific photo.                             | Cognito        |
| `GET`  | `/users`                    | Get a paginated list of all users who have uploaded photos.           | Cognito        |
| `GET`  | `/users/:email`             | Get information about a specific user.                                | Cognito        |
| `GET`  | `/users/:email/photos`      | Get a paginated list of photos uploaded by a specific user.           | Cognito        |
| `GET`  | `/me/photos`                | Get photos uploaded by the current authenticated user.                | Cognito        |
| `GET`  | `/me/limit`                 | Get the current user's upload limit.                                  | Cognito        |
| `PUT`  | `/me/limit`                 | Set the current user's upload limit. (Admin only)                     | Cognito        |
| `PUT`  | `/me/profile`               | Update the current user's display name.                               | Cognito        |
| `GET`  | `/persons`                  | Get a paginated list of all unique people detected across all photos. | Cognito        |
| `GET`  | `/persons/:personId`        | Get information about a specific person.                              | Cognito        |
| `GET`  | `/persons/:personId/photos` | Get a paginated list of photos that a specific person is tagged in.   | Cognito        |
| `PUT`  | `/persons/:personId`        | Update a person's name.                                               | Cognito        |
| `GET`  | `/upload`                   | Get a pre-signed S3 URL for uploading a new photo.                    | Cognito        |
| `POST` | `/upload/complete`          | Create a record in DynamoDB after a successful upload.                | Cognito        |
| `GET`  | `/livestream`               | Check for and retrieve the current live stream configuration.         | Cognito        |
| `POST` | `/events`                   | Log a web event.                                                      | None           |

## Development

### Prerequisites

- Node.js 22.x or later
- AWS CLI configured with appropriate credentials
- AWS SAM CLI (optional, for local testing)

### Installation

```bash
npm install
```

### Environment Variables

The following environment variables are required:

- `DDB_TABLE_NAME`: The name of the DynamoDB table
- `S3_BUCKET_NAME`: The name of the S3 bucket for storing photos

### Local Development

For local development, you can run the API using the following command:

```bash
npm start
```

This will start the API on port 3000. You can then use a tool like Postman to test the endpoints.

### Testing with Cognito Authentication

For testing with Cognito authentication, you can use the `x-user-email` header to simulate a logged-in user. In production, the API Gateway will extract the user's email from the Cognito JWT token.
