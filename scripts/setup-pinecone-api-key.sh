#!/bin/bash

# Script to set up Pinecone API key in AWS SSM Parameter Store
# Usage: ./setup-pinecone-api-key.sh <api-key> <aws-region> [parameter-name]

set -e

# Check if required arguments are provided
if [ $# -lt 2 ] || [ $# -gt 3 ]; then
    echo "Usage: $0 <pinecone-api-key> <aws-region> [parameter-name]"
    echo "Example: $0 your-pinecone-api-key ap-south-1"
    echo "Example: $0 your-pinecone-api-key ap-south-1 /pinecone/sparks"
    exit 1
fi

API_KEY="$1"
AWS_REGION="$2"
PARAMETER_NAME="${3:-/pinecone/sparks}"  # Default to /pinecone/sparks if not provided

echo "Setting up Pinecone API key in SSM Parameter Store..."
echo "Parameter Name: $PARAMETER_NAME"
echo "AWS Region: $AWS_REGION"

# Check if parameter already exists
if aws ssm get-parameter --name "$PARAMETER_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "Parameter already exists. Updating..."
    aws ssm put-parameter \
        --name "$PARAMETER_NAME" \
        --value "$API_KEY" \
        --type "SecureString" \
        --overwrite \
        --region "$AWS_REGION"
    echo "✅ Parameter updated successfully!"
else
    echo "Parameter does not exist. Creating..."
    aws ssm put-parameter \
        --name "$PARAMETER_NAME" \
        --description "Pinecone API key for Sparks face recognition service" \
        --value "$API_KEY" \
        --type "SecureString" \
        --region "$AWS_REGION"
    echo "✅ Parameter created successfully!"
fi

# Verify the parameter was set
echo "Verifying parameter..."
if aws ssm get-parameter --name "$PARAMETER_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
    echo "✅ Parameter verification successful!"
    echo ""
    echo "To view the parameter (without decryption):"
    echo "aws ssm get-parameter --name '$PARAMETER_NAME' --region '$AWS_REGION'"
    echo ""
    echo "To view the parameter (with decryption):"
    echo "aws ssm get-parameter --name '$PARAMETER_NAME' --with-decryption --region '$AWS_REGION'"
else
    echo "❌ Parameter verification failed!"
    exit 1
fi

echo ""
echo "🎉 Pinecone API key setup completed successfully!"
echo "The face recognition Lambda function will now be able to retrieve the API key from SSM Parameter Store."
echo "Make sure your Terraform configuration uses the parameter name: $PARAMETER_NAME"
