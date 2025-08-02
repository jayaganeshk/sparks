# Sparks Application - Terraform Infrastructure

This directory contains the Terraform configuration for deploying the Sparks photo-sharing application's AWS infrastructure.

## Project Structure

The Terraform configuration is organized into a modular structure for maintainability and reusability.

- **`main.tf`**: The root module that integrates all other modules.
- **`variables.tf`**: Contains the variable definitions for the root module.
- **`outputs.tf`**: Defines the outputs from the root module.
- **`modules/`**: This directory contains the reusable Terraform modules for each component of the infrastructure (e.g., `lambda`, `s3`, `cognito`, `cloudfront`, etc.).
- **`environments/`**: This directory contains the environment-specific configurations.
  - **`dev/`**: Configuration for the development environment.
  - **`prod/`**: Configuration for the production environment.

Each environment directory contains a `variables.tfvars` file with the specific values for that environment.

## Backend Configuration

This project is configured to use an S3 backend for state management. The provider and backend configurations are defined in `provider.tf`. Ensure the specified S3 bucket exists in your AWS account before initializing.

## Usage

To deploy the infrastructure, navigate to the `terraform` directory and follow these steps:

1.  **Initialize Terraform:**

    You must initialize Terraform for each environment separately by passing the backend configuration as command-line arguments. This ensures that each environment has its own separate state file in the S3 bucket.

    For the **development** environment:

    ```bash
    terraform init \
        -backend-config="bucket=tf-backend-183103430916" \
        -backend-config="key=sparks/dev/terraform.tfstate" \
        -backend-config="region=ap-south-1"
    ```

    For the **production** environment:

    ```bash
    terraform init \
        -backend-config="bucket=tf-backend-183103430916" \
        -backend-config="key=sparks/prod/terraform.tfstate" \
        -backend-config="region=ap-south-1"
    ```

    terraform init \
     -backend-config="bucket=tf-backend-183103430916" \
     -backend-config="key=sparks/event-dev/terraform.tfstate" \
     -backend-config="region=ap-south-1"

2.  **Plan the deployment:**

    It is a best practice to save the execution plan to a file. This ensures that what you apply is exactly what you planned.

    Replace `[environment]` with either `dev` or `prod`.

    ```bash
    terraform plan -var-file="environments/dev/variables.tfvars" -out="tf-output"

    terraform plan -var-file="environments/event-dev/variables.tfvars" -out="tf-output"

    terraform plan -var-file="environments/prod/variables.tfvars" -out="tf-output"
    ```

3.  **Apply the changes:**

    Apply the saved plan file. This command will execute the changes exactly as specified in the plan, without any surprises.

    ```bash
    terraform apply "tf-output"
    ```

## Refactoring

This project has been refactored to use the official `terraform-aws-modules` for `lambda` and `cloudfront` to improve maintainability and leverage community best practices.
