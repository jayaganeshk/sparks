# Sparks - Photo Sharing Platform

Sparks is a modern, cloud-native photo sharing platform designed for performance, scalability, and rich user experiences. It allows users to upload, manage, and share their photos securely.

## Core Features

*   **Secure User Authentication**: Managed by AWS Cognito, providing robust user sign-up, sign-in, and profile management.
*   **Dynamic Image Processing**: Automatic thumbnail generation, image compression, and AI-powered face recognition for tagging.
*   **Scalable Serverless Backend**: Built entirely on AWS serverless technologies (Lambda, S3, DynamoDB, SNS, SQS) for high availability and pay-per-use cost efficiency.
*   **Responsive Web Interface**: A reactive front-end built with Vue.js and Vuetify for a seamless experience across all devices.

## Architecture Overview

The application follows a serverless-first architecture, leveraging the power of AWS services.

### Front-End (UI)

*   **Framework**: Vue.js 3 with Vite for a fast development experience.
*   **Component Library**: Vuetify for a rich set of Material Design components.
*   **State Management**: Pinia.
*   **Hosting**: Deployed via AWS Amplify and served globally through Amazon CloudFront.

### Back-End (Serverless)

*   **Compute**: A suite of AWS Lambda functions (primarily Node.js, with Python for ML tasks) handle all business logic.
*   **Storage**:
    *   **Amazon S3**: Securely stores all original images, processed thumbnails, and compressed versions.
    *   **Amazon DynamoDB**: Acts as the primary database for application metadata, user information, and image details.
*   **Event-Driven Processing**:
    *   Image uploads to S3 trigger an event-driven pipeline using **Amazon SNS** and **SQS**.
    *   This pipeline orchestrates tasks like thumbnail generation, image compression, and face recognition tagging.
*   **Identity**: **AWS Cognito** manages the entire user lifecycle, including authentication and authorization.

### Infrastructure as Code (IaC)

*   **Current**: The entire infrastructure is defined in a single AWS SAM / CloudFormation template (`cloudFormation.yaml`).
*   **Future**: We are migrating to **Terraform** to manage infrastructure in a more modular, scalable, and maintainable way.

## Project Roadmap

Our immediate goals are to modernize the codebase and improve the development workflow:

1.  **Terraform Migration**: Decompose the monolithic `cloudFormation.yaml` into a modular Terraform project. This will improve maintainability, enable versioning, and streamline environment management.
2.  **Vuetify Upgrade**: Update the front-end to use the latest version of Vuetify, leveraging its newest features and performance improvements.

## Getting Started

(Details to be added)

### Prerequisites

*   Node.js
*   AWS CLI
*   Terraform
*   An AWS account

### Installation & Deployment

(Instructions will be updated post-Terraform migration)

1.  Clone the repository.
2.  Configure your AWS credentials.
3.  Navigate to the `terraform/` directory and run `terraform init` and `terraform apply`.
4.  Navigate to the `UI/` directory, run `npm install`, and then `npm run build`.
5.  Configure the Amplify deployment.

---
*This README was generated based on an analysis of the existing `old_repo` codebase.*
