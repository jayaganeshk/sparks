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

| Method | Endpoint                               | Description                                                                 | Authentication |
| :----- | :------------------------------------- | :-------------------------------------------------------------------------- | :------------- |
| `GET`  | `/photos`                              | Get a paginated list of all photos.                                         | Cognito        |
| `GET`  | `/users`                               | Get a list of all users who have uploaded photos.                           | Cognito        |
| `GET`  | `/users/:email/photos`                 | Get a paginated list of photos uploaded by a specific user.                 | Cognito        |
| `GET`  | `/persons`                             | Get a paginated list of all unique people detected across all photos.       | Cognito        |
| `GET`  | `/persons/:personId/photos`            | Get a paginated list of photos that a specific person is tagged in.         | Cognito        |
| `GET`  | `/me/limit`                            | Get the current user's upload limit.                                        | Cognito        |
| `PUT`  | `/me/limit`                            | Set the current user's upload limit. (Admin only)                           | Cognito        |
| `PUT`  | `/me/profile`                          | Update the current user's display name.                                     | Cognito        |
| `GET`  | `/livestream`                          | Check for and retrieve the current live stream configuration.               | Cognito        |
| `POST` | `/events`                              | Log a web event.                                                            | Cognito        |
| `GET`  | `/upload-url`                          | Get a pre-signed S3 URL for uploading a new photo.                          | Cognito        |

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

## Deployment

The API is deployed as a Lambda function using Terraform. The deployment process is handled by the Terraform configuration in the `terraform` directory.

To deploy changes to the API, run the following commands:

```bash
cd terraform
terraform init -backend-config="bucket=tf-backend-183103430916" -backend-config="key=sparks/dev/terraform.tfstate" -backend-config="region=ap-south-1"
terraform plan -var-file="environments/dev/variables.tfvars" -out="tf-output"
terraform apply "tf-output"
```

## License

This project is proprietary and confidential. Unauthorized copying, transfer, or use is strictly prohibited.
