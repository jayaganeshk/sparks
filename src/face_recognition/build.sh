#!/bin/bash

# Face Recognition Service Build Script
set -e

# Configuration
IMAGE_NAME="face-recognition-service"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=""  # Set this to your AWS account ID

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Build Docker image
build_image() {
    log_info "Building Docker image: $IMAGE_NAME"
    docker build -t $IMAGE_NAME .
    log_info "Docker image built successfully"
}

# Tag image for ECR
tag_for_ecr() {
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        log_error "AWS_ACCOUNT_ID is not set. Please set it in this script."
        exit 1
    fi
    
    ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:latest"
    log_info "Tagging image for ECR: $ECR_URI"
    docker tag $IMAGE_NAME:latest $ECR_URI
}

# Push to ECR
push_to_ecr() {
    if [ -z "$AWS_ACCOUNT_ID" ]; then
        log_error "AWS_ACCOUNT_ID is not set. Please set it in this script."
        exit 1
    fi
    
    ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$IMAGE_NAME:latest"
    
    log_info "Logging into ECR"
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    log_info "Pushing image to ECR: $ECR_URI"
    docker push $ECR_URI
    log_info "Image pushed successfully"
}

# Test image locally
test_image() {
    log_info "Testing image locally"
    
    # Check if .env file exists
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please create one from .env.example"
        log_info "Run: cp .env.example .env && nano .env"
        return 1
    fi
    
    # Check if test event exists
    if [ ! -f "test-events/sqs-event.json" ]; then
        log_error "Test event file not found: test-events/sqs-event.json"
        log_info "Please update the bucketName and objectKey in test-events/sqs-event.json with real values"
        return 1
    fi
    
    log_info "Using .env file for environment variables"
    docker run --rm -d -p 9000:8080 --env-file .env --name face-recognition-test $IMAGE_NAME:latest
    
    # Wait for container to start
    sleep 5
    
    # Check if container is running
    if ! docker ps | grep -q face-recognition-test; then
        log_error "Container failed to start. Check logs with: docker logs face-recognition-test"
        return 1
    fi
    
    log_info "Container started successfully. Testing with SQS event..."
    
    # Test with SQS event
    curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
         -H "Content-Type: application/json" \
         -d @test-events/sqs-event.json
    
    echo "" # New line after curl output
    log_info "Test completed. Check container logs for details:"
    docker logs face-recognition-test
    
    # Stop and remove container
    docker stop face-recognition-test 2>/dev/null || true
    log_info "Local test completed"
}

# Interactive test mode
test_interactive() {
    log_info "Starting interactive test mode"
    
    if [ ! -f ".env" ]; then
        log_error ".env file not found. Please create one from .env.example"
        log_info "Run: cp .env.example .env && nano .env"
        return 1
    fi
    
    log_info "Starting container in interactive mode..."
    docker run --rm -it -p 9000:8080 --env-file .env $IMAGE_NAME:latest /bin/bash
}

# Deploy to Lambda (requires lambda-deployment.json)
deploy_lambda() {
    if [ ! -f "lambda-deployment.json" ]; then
        log_error "lambda-deployment.json not found. This file is required for deployment."
        exit 1
    fi
    
    log_info "Deploying to AWS Lambda using lambda-deployment.json configuration"
    log_warn "This is a placeholder - implement actual deployment logic based on your infrastructure setup"
    log_info "Configuration file: lambda-deployment.json"
}

# Main script
main() {
    case "${1:-build}" in
        "build")
            check_docker
            build_image
            ;;
        "tag")
            tag_for_ecr
            ;;
        "push")
            check_docker
            build_image
            tag_for_ecr
            push_to_ecr
            ;;
        "test")
            check_docker
            test_image
            ;;
        "test-interactive")
            check_docker
            test_interactive
            ;;
        "deploy")
            deploy_lambda
            ;;
        "all")
            check_docker
            build_image
            tag_for_ecr
            push_to_ecr
            ;;
        *)
            echo "Usage: $0 {build|tag|push|test|test-interactive|deploy|all}"
            echo "  build            - Build Docker image"
            echo "  tag              - Tag image for ECR"
            echo "  push             - Build, tag, and push to ECR"
            echo "  test             - Test image locally (requires .env file)"
            echo "  test-interactive - Start container in interactive mode"
            echo "  deploy           - Show deployment info (requires lambda-deployment.json)"
            echo "  all              - Build, tag, and push to ECR"
            exit 1
            ;;
    esac
}

main "$@"
