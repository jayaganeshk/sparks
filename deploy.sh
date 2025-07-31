#!/bin/bash

# Sparks WebUI Deployment Script
# Builds webUI, syncs to S3, and deploys to Amplify with environment support

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$SCRIPT_DIR/terraform"
WEBUI_DIR="$SCRIPT_DIR/webUI"

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_bold() { echo -e "${BOLD}$1${NC}"; }
command_exists() { command -v "$1" >/dev/null 2>&1; }

# Show usage information
show_usage() {
    echo "Usage: $0 <environment>"
    echo
    echo "Arguments:"
    echo "  environment    Target environment (dev, staging, prod)"
    echo
    echo "Examples:"
    echo "  $0 dev         Deploy to development environment"
    echo "  $0 staging     Deploy to staging environment"
    echo "  $0 prod        Deploy to production environment"
    echo
    echo "The script will:"
    echo "  - Use terraform/environments/<env>/variables.tfvars"
    echo "  - Create webUI/.env.<env> configuration"
    echo "  - Deploy to the specified environment's infrastructure"
}

# Parse command line arguments
parse_arguments() {
    if [ $# -eq 0 ]; then
        print_error "Environment parameter is required"
        echo
        show_usage
        exit 1
    fi
    
    ENVIRONMENT="$1"
    
    # Validate environment
    case "$ENVIRONMENT" in
        dev|staging|prod)
            print_status "Deploying to $ENVIRONMENT environment"
            ;;
        *)
            print_error "Invalid environment: $ENVIRONMENT"
            print_error "Supported environments: dev, staging, prod"
            exit 1
            ;;
    esac
    
    # Set environment-specific paths
    TFVARS_FILE="$TERRAFORM_DIR/environments/$ENVIRONMENT/variables.tfvars"
    ENV_FILE="$WEBUI_DIR/.env.$ENVIRONMENT"
    BUILD_DIR="$WEBUI_DIR/dist"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    for cmd in terraform aws npm jq; do
        if ! command_exists $cmd; then
            print_error "$cmd is not installed or not in PATH"
            exit 1
        fi
    done
    
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured or expired"
        exit 1
    fi
    
    # Check if terraform variables file exists
    if [ ! -f "$TFVARS_FILE" ]; then
        print_error "Terraform variables file not found: $TFVARS_FILE"
        print_error "Please ensure the environment configuration exists"
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Initialize and configure Terraform for environment
init_terraform() {
    print_status "Initializing Terraform for $ENVIRONMENT environment..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform if not already done
    if [ ! -d ".terraform" ]; then
        print_status "Running terraform init..."
        terraform init >/dev/null 2>&1
        if [ $? -ne 0 ]; then
            print_error "Terraform initialization failed"
            exit 1
        fi
    fi
    
    # Select or create workspace for environment
    print_status "Setting up Terraform workspace for $ENVIRONMENT..."
    
    # List existing workspaces and check if environment workspace exists
    EXISTING_WORKSPACES=$(terraform workspace list 2>/dev/null | grep -v "^\*" | sed 's/^[[:space:]]*//')
    
    if echo "$EXISTING_WORKSPACES" | grep -q "^$ENVIRONMENT$"; then
        print_status "Switching to existing $ENVIRONMENT workspace..."
        terraform workspace select "$ENVIRONMENT" >/dev/null 2>&1
    else
        print_status "Creating new $ENVIRONMENT workspace..."
        terraform workspace new "$ENVIRONMENT" >/dev/null 2>&1
    fi
    
    if [ $? -ne 0 ]; then
        print_error "Failed to setup Terraform workspace for $ENVIRONMENT"
        exit 1
    fi
    
    CURRENT_WORKSPACE=$(terraform workspace show)
    if [ "$CURRENT_WORKSPACE" != "$ENVIRONMENT" ]; then
        print_error "Failed to switch to $ENVIRONMENT workspace (current: $CURRENT_WORKSPACE)"
        exit 1
    fi
    
    print_success "Terraform configured for $ENVIRONMENT environment"
    cd "$SCRIPT_DIR"
}

# Get configuration from Terraform
get_config() {
    print_status "Getting configuration from Terraform ($ENVIRONMENT)..."
    
    cd "$TERRAFORM_DIR"
    
    # Ensure we're in the correct workspace
    CURRENT_WORKSPACE=$(terraform workspace show)
    if [ "$CURRENT_WORKSPACE" != "$ENVIRONMENT" ]; then
        print_error "Terraform workspace mismatch. Expected: $ENVIRONMENT, Current: $CURRENT_WORKSPACE"
        exit 1
    fi
    
    # Get outputs using environment-specific tfvars and workspace
    print_status "Retrieving Terraform outputs for $ENVIRONMENT..."
    TERRAFORM_OUTPUTS=$(terraform output -var-file="$TFVARS_FILE" -json 2>/dev/null)
    
    if [ $? -ne 0 ] || [ -z "$TERRAFORM_OUTPUTS" ]; then
        print_warning "No Terraform outputs found. Infrastructure may not be deployed yet."
        print_status "Attempting to plan/apply infrastructure for $ENVIRONMENT..."
        
        # Run terraform plan to check what needs to be created
        terraform plan -var-file="$TFVARS_FILE" -out="terraform-$ENVIRONMENT.tfplan" >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            print_status "Infrastructure changes detected. Apply them first:"
            print_status "  cd terraform && terraform apply terraform-$ENVIRONMENT.tfplan"
            exit 1
        else
            print_error "Failed to generate Terraform plan for $ENVIRONMENT"
            exit 1
        fi
    fi
    
    # Extract configuration values
    AMPLIFY_APP_ID=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.amplify_app_id.value // empty')
    HTTP_API_ENDPOINT=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.http_api_endpoint.value // empty')
    COGNITO_USER_POOL_ID=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.cognito_user_pool_id.value // empty')
    COGNITO_APP_CLIENT_ID=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.cognito_app_client_id.value // empty')
    COGNITO_IDENTITY_POOL_ID=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.cognito_identity_pool_id.value // empty')
    S3_BUCKET_NAME=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.s3_sparks_store_bucket_name.value // empty')
    AMPLIFY_APP_URL=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.amplify_app_url.value // empty')
    
    # Validate required outputs
    if [ -z "$AMPLIFY_APP_ID" ] || [ "$AMPLIFY_APP_ID" = "null" ]; then
        print_error "Missing required Terraform output: amplify_app_id"
        exit 1
    fi
    
    # Get AWS configuration
    AWS_REGION=$(echo "$TERRAFORM_OUTPUTS" | jq -r '.aws_region.value // empty')
    if [ -z "$AWS_REGION" ]; then
        AWS_REGION=$(aws configure get region 2>/dev/null || echo "ap-south-1")
    fi
    
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Environment-specific CloudFront domain (you may want to make this configurable)
    case "$ENVIRONMENT" in
        prod)
            CLOUDFRONT_DOMAIN="https://d15qneawx6zpid.cloudfront.net"
            ;;
        staging)
            CLOUDFRONT_DOMAIN="https://d15qneawx6zpid-staging.cloudfront.net"
            ;;
        dev)
            CLOUDFRONT_DOMAIN="https://d15qneawx6zpid-dev.cloudfront.net"
            ;;
        *)
            CLOUDFRONT_DOMAIN="https://d15qneawx6zpid.cloudfront.net"
            ;;
    esac
    
    DEPLOYMENT_BUCKET_NAME="${AMPLIFY_APP_ID}-sparks-deployments-${ENVIRONMENT}"
    S3_WEB_PREFIX="s3://$DEPLOYMENT_BUCKET_NAME/web/"
    
    print_success "Configuration retrieved for $ENVIRONMENT environment"
    print_status "  Amplify App ID: $AMPLIFY_APP_ID"
    print_status "  API Endpoint: $HTTP_API_ENDPOINT"
    print_status "  S3 Bucket: $S3_BUCKET_NAME"
    print_status "  Deployment Bucket: $DEPLOYMENT_BUCKET_NAME"
    
    cd "$SCRIPT_DIR"
}

# Create environment-specific configuration file
create_env_file() {
    print_status "Creating $ENVIRONMENT environment configuration..."
    
    # Create environment-specific .env file
    cat > "$ENV_FILE" << EOF
# $ENVIRONMENT Environment Configuration
# Generated on $(date)
# Terraform Workspace: $(cd "$TERRAFORM_DIR" && terraform workspace show)

VITE_API_BASE_URL=$HTTP_API_ENDPOINT
VITE_AWS_REGION=$AWS_REGION
VITE_USER_POOL_ID=$COGNITO_USER_POOL_ID
VITE_USER_POOL_WEB_CLIENT_ID=$COGNITO_APP_CLIENT_ID
VITE_IDENTITY_POOL_ID=$COGNITO_IDENTITY_POOL_ID
VITE_CLOUDFRONT_DOMAIN=$CLOUDFRONT_DOMAIN
VITE_API_ENDPOINT=$HTTP_API_ENDPOINT
VITE_S3_BUCKET=$S3_BUCKET_NAME
VITE_BATCH_UPLOAD_LIMIT=10
VITE_ENVIRONMENT=$ENVIRONMENT
VITE_APP_TITLE=Sparks ($ENVIRONMENT)
VITE_DEBUG_MODE=$([ "$ENVIRONMENT" = "prod" ] && echo "false" || echo "true")
EOF
    
    # Also create a generic .env file pointing to the environment-specific one
    cp "$ENV_FILE" "$WEBUI_DIR/.env"
    
    print_success "$ENVIRONMENT environment configuration created"
    print_status "  Environment file: $ENV_FILE"
    print_status "  Generic .env file updated"
}

# Build the webUI for specific environment
build_webui() {
    print_status "Building webUI for $ENVIRONMENT environment..."
    
    cd "$WEBUI_DIR"
    
    # Check if node_modules exists and package.json has changed
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        print_status "Installing/updating dependencies..."
        npm install >/dev/null 2>&1
        if [ $? -ne 0 ]; then
            print_error "Failed to install dependencies"
            exit 1
        fi
    fi
    
    # Clean previous build
    if [ -d "$BUILD_DIR" ]; then
        print_status "Cleaning previous build..."
        rm -rf "$BUILD_DIR"
    fi
    
    # Set environment variables for build
    export NODE_ENV=production
    export VITE_MODE=$ENVIRONMENT
    
    # Build with environment-specific configuration
    print_status "Running build process..."
    if [ "$ENVIRONMENT" = "dev" ]; then
        # Development build with source maps
        npm run build -- --mode development --sourcemap >/dev/null 2>&1
    else
        # Production build
        npm run build -- --mode production >/dev/null 2>&1
    fi
    
    if [ $? -ne 0 ]; then
        print_error "Build failed"
        exit 1
    fi
    
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "Build failed - dist directory not found"
        exit 1
    fi
    
    # Get build statistics
    BUILD_SIZE=$(du -sh "$BUILD_DIR" | cut -f1)
    FILE_COUNT=$(find "$BUILD_DIR" -type f | wc -l)
    
    print_success "Build completed for $ENVIRONMENT"
    print_status "  Build size: $BUILD_SIZE"
    print_status "  File count: $FILE_COUNT files"
    print_status "  Build mode: $([ "$ENVIRONMENT" = "dev" ] && echo "development" || echo "production")"
    
    cd "$SCRIPT_DIR"
}

# Setup S3 bucket with proper permissions
setup_s3_bucket() {
    print_status "Setting up S3 bucket for $ENVIRONMENT..."
    
    # Create environment-specific bucket if it doesn't exist
    if ! aws s3api head-bucket --bucket "$DEPLOYMENT_BUCKET_NAME" 2>/dev/null; then
        print_status "Creating deployment bucket: $DEPLOYMENT_BUCKET_NAME"
        
        if [ "$AWS_REGION" = "us-east-1" ]; then
            aws s3api create-bucket --bucket "$DEPLOYMENT_BUCKET_NAME" >/dev/null 2>&1
        else
            aws s3api create-bucket \
                --bucket "$DEPLOYMENT_BUCKET_NAME" \
                --region "$AWS_REGION" \
                --create-bucket-configuration LocationConstraint="$AWS_REGION" >/dev/null 2>&1
        fi
        
        if [ $? -ne 0 ]; then
            print_error "Failed to create S3 bucket: $DEPLOYMENT_BUCKET_NAME"
            exit 1
        fi
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$DEPLOYMENT_BUCKET_NAME" \
            --versioning-configuration Status=Enabled >/dev/null 2>&1
        
        # Add environment tag
        aws s3api put-bucket-tagging \
            --bucket "$DEPLOYMENT_BUCKET_NAME" \
            --tagging "TagSet=[{Key=Environment,Value=$ENVIRONMENT},{Key=Project,Value=Sparks},{Key=Purpose,Value=Deployment}]" >/dev/null 2>&1
    fi
    
    # Create environment-specific bucket policy for Amplify access
    BUCKET_POLICY=$(cat << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AmplifyAccess",
            "Effect": "Allow",
            "Principal": {
                "Service": "amplify.amazonaws.com"
            },
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${DEPLOYMENT_BUCKET_NAME}",
                "arn:aws:s3:::${DEPLOYMENT_BUCKET_NAME}/*"
            ]
        },
        {
            "Sid": "AccountAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::${AWS_ACCOUNT_ID}:root"
            },
            "Action": [
                "s3:*"
            ],
            "Resource": [
                "arn:aws:s3:::${DEPLOYMENT_BUCKET_NAME}",
                "arn:aws:s3:::${DEPLOYMENT_BUCKET_NAME}/*"
            ]
        }
    ]
}
EOF
)
    
    # Apply bucket policy
    echo "$BUCKET_POLICY" | aws s3api put-bucket-policy \
        --bucket "$DEPLOYMENT_BUCKET_NAME" \
        --policy file:///dev/stdin >/dev/null 2>&1
    
    if [ $? -ne 0 ]; then
        print_warning "Failed to apply bucket policy (bucket may still work)"
    fi
    
    print_success "S3 bucket configured for $ENVIRONMENT"
    print_status "  Bucket: $DEPLOYMENT_BUCKET_NAME"
    print_status "  Region: $AWS_REGION"
}

# Sync dist folder to S3
sync_to_s3() {
    print_status "Syncing files to S3 ($ENVIRONMENT)..."
    
    # Create a deployment manifest
    DEPLOYMENT_MANIFEST=$(cat << EOF
{
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "terraform_workspace": "$(cd "$TERRAFORM_DIR" && terraform workspace show)",
    "build_size": "$(du -sh "$BUILD_DIR" | cut -f1)",
    "file_count": $(find "$BUILD_DIR" -type f | wc -l),
    "amplify_app_id": "$AMPLIFY_APP_ID",
    "api_endpoint": "$HTTP_API_ENDPOINT"
}
EOF
)
    
    # Save manifest to build directory
    echo "$DEPLOYMENT_MANIFEST" > "$BUILD_DIR/deployment-manifest.json"
    
    # Sync the dist folder to S3 web/ prefix with environment-specific metadata
    aws s3 sync "$BUILD_DIR" "$S3_WEB_PREFIX" \
        --delete \
        --exact-timestamps \
        --metadata "Environment=$ENVIRONMENT,Project=Sparks,DeployedAt=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        # Get sync statistics
        SYNCED_FILES=$(aws s3 ls "$S3_WEB_PREFIX" --recursive | wc -l)
        print_success "Files synced to S3 for $ENVIRONMENT"
        print_status "  Synced files: $SYNCED_FILES"
        print_status "  S3 location: $S3_WEB_PREFIX"
    else
        print_error "Failed to sync files to S3"
        exit 1
    fi
}

# Deploy to Amplify
deploy_to_amplify() {
    print_status "Deploying to Amplify ($ENVIRONMENT)..."
    
    # Determine branch name based on environment
    case "$ENVIRONMENT" in
        prod)
            BRANCH_NAME="main"
            ;;
        staging)
            BRANCH_NAME="staging"
            ;;
        dev)
            BRANCH_NAME="dev"
            ;;
        *)
            BRANCH_NAME="main"
            ;;
    esac
    
    # Start deployment using S3 bucket prefix
    DEPLOYMENT_RESULT=$(aws amplify start-deployment \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --source-url "$S3_WEB_PREFIX" \
        --source-url-type "BUCKET_PREFIX" \
        --output json 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        print_error "Failed to start Amplify deployment"
        print_error "This might be because the branch '$BRANCH_NAME' doesn't exist in Amplify"
        print_status "Available branches can be checked in AWS Console"
        exit 1
    fi
    
    JOB_ID=$(echo "$DEPLOYMENT_RESULT" | jq -r '.jobSummary.jobId')
    
    if [ -z "$JOB_ID" ] || [ "$JOB_ID" = "null" ]; then
        print_error "Failed to get deployment job ID"
        exit 1
    fi
    
    print_success "Deployment started for $ENVIRONMENT"
    print_status "  Job ID: $JOB_ID"
    print_status "  Branch: $BRANCH_NAME"
    print_status "  App ID: $AMPLIFY_APP_ID"
    
    # Monitor deployment
    monitor_deployment "$JOB_ID" "$BRANCH_NAME"
}

# Monitor deployment progress
monitor_deployment() {
    local job_id=$1
    local branch_name=$2
    print_status "Monitoring deployment progress..."
    
    local dots=""
    local max_attempts=60  # 5 minutes max
    local attempts=0
    
    while [ $attempts -lt $max_attempts ]; do
        STATUS_RESPONSE=$(aws amplify get-job \
            --app-id "$AMPLIFY_APP_ID" \
            --branch-name "$branch_name" \
            --job-id "$job_id" \
            --output json 2>/dev/null)
        
        if [ $? -ne 0 ]; then
            print_error "Failed to get deployment status"
            exit 1
        fi
        
        STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.job.summary.status')
        
        case "$STATUS" in
            "SUCCEED")
                echo
                print_success "Deployment completed successfully!"
                
                # Get deployment details
                START_TIME=$(echo "$STATUS_RESPONSE" | jq -r '.job.summary.startTime')
                END_TIME=$(echo "$STATUS_RESPONSE" | jq -r '.job.summary.endTime')
                
                print_status "  Start time: $START_TIME"
                print_status "  End time: $END_TIME"
                print_status "  Branch: $branch_name"
                
                DEPLOYMENT_SUCCESS=true
                return 0
                ;;
            "FAILED")
                echo
                print_error "Deployment failed!"
                STATUS_REASON=$(echo "$STATUS_RESPONSE" | jq -r '.job.summary.statusReason // "Unknown error"')
                print_error "Reason: $STATUS_REASON"
                
                # Get step details for debugging
                STEPS=$(echo "$STATUS_RESPONSE" | jq -r '.job.steps[]? | select(.status == "FAILED") | .stepName + ": " + .statusReason')
                if [ -n "$STEPS" ]; then
                    print_error "Failed steps:"
                    echo "$STEPS" | while read -r step; do
                        print_error "  $step"
                    done
                fi
                
                exit 1
                ;;
            "RUNNING"|"PENDING")
                dots="${dots}."
                if [ ${#dots} -gt 20 ]; then
                    dots=""
                fi
                printf "\r${BLUE}[INFO]${NC} Deployment in progress${dots}   "
                sleep 5
                attempts=$((attempts + 1))
                ;;
            *)
                echo
                print_warning "Unknown deployment status: $STATUS"
                sleep 5
                attempts=$((attempts + 1))
                ;;
        esac
    done
    
    echo
    print_warning "Deployment monitoring timed out. Check Amplify console for status."
    print_status "Console URL: https://console.aws.amazon.com/amplify/home?region=${AWS_REGION}#/${AMPLIFY_APP_ID}"
    exit 1
}

# Show final deployment information
show_deployment_info() {
    echo
    print_bold "=========================================="
    print_bold "      🚀 DEPLOYMENT SUCCESSFUL! 🚀"
    print_bold "=========================================="
    echo
    print_success "✅ Terraform workspace: $ENVIRONMENT"
    print_success "✅ Environment configuration created"
    print_success "✅ Build completed successfully"
    print_success "✅ Files synced to S3"
    print_success "✅ Amplify deployment completed"
    print_success "✅ CORS issues resolved"
    echo
    print_bold "🌍 Environment: $ENVIRONMENT"
    print_bold "🔗 Your app is now live at:"
    print_bold "   $AMPLIFY_APP_URL"
    echo
    print_bold "📊 AWS Resources:"
    echo "   Amplify Console: https://console.aws.amazon.com/amplify/home?region=${AWS_REGION}#/${AMPLIFY_APP_ID}"
    echo "   S3 Bucket: https://s3.console.aws.amazon.com/s3/buckets/${DEPLOYMENT_BUCKET_NAME}?region=${AWS_REGION}"
    echo "   API Gateway: https://console.aws.amazon.com/apigateway/home?region=${AWS_REGION}"
    echo
    print_bold "📁 Configuration files:"
    echo "   Terraform vars: $TFVARS_FILE"
    echo "   WebUI env: $ENV_FILE"
    echo "   Terraform workspace: $(cd "$TERRAFORM_DIR" && terraform workspace show)"
    echo
    print_bold "🔧 Quick commands:"
    echo "   View logs: aws amplify get-job --app-id $AMPLIFY_APP_ID --branch-name $([ "$ENVIRONMENT" = "prod" ] && echo "main" || echo "$ENVIRONMENT") --job-id [JOB_ID]"
    echo "   Terraform plan: cd terraform && terraform plan -var-file=\"$TFVARS_FILE\""
    echo "   Redeploy: $0 $ENVIRONMENT"
    print_bold "=========================================="
}

# Main execution
main() {
    echo
    print_bold "🚀 SPARKS WEBUI DEPLOYMENT"
    print_bold "Multi-environment build, sync & deployment"
    echo
    
    parse_arguments "$@"
    
    DEPLOYMENT_SUCCESS=false
    
    check_prerequisites
    init_terraform
    get_config
    create_env_file
    build_webui
    setup_s3_bucket
    sync_to_s3
    deploy_to_amplify
    show_deployment_info
    
    print_success "🎉 Deployment completed successfully for $ENVIRONMENT!"
}

main "$@"
