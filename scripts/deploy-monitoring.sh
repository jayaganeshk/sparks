#!/bin/bash

# Sparks PowerTools Monitoring Deployment Script with Business Metrics
# This script deploys the monitoring infrastructure and validates the setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"
EXPRESS_API_DIR="$PROJECT_ROOT/src/express-api"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        log_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Install Express API dependencies
    if [ -d "$EXPRESS_API_DIR" ]; then
        log_info "Installing Express API dependencies..."
        cd "$EXPRESS_API_DIR"
        npm install
        
        # Verify PowerTools packages
        log_info "Verifying PowerTools packages..."
        if npm list @aws-lambda-powertools/logger &> /dev/null; then
            log_success "PowerTools Logger installed"
        else
            log_error "PowerTools Logger not found"
            exit 1
        fi
        
        if npm list @aws-lambda-powertools/tracer &> /dev/null; then
            log_success "PowerTools Tracer installed"
        else
            log_error "PowerTools Tracer not found"
            exit 1
        fi
        
        if npm list @aws-lambda-powertools/metrics &> /dev/null; then
            log_success "PowerTools Metrics installed"
        else
            log_error "PowerTools Metrics not found"
            exit 1
        fi
        
        log_success "Express API dependencies installed and verified"
    else
        log_warning "Express API directory not found: $EXPRESS_API_DIR"
    fi
    
    log_info "Lambda dependencies will be installed during Terraform deployment"
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Deploying infrastructure with Terraform..."
    
    cd "$TERRAFORM_DIR"
    
    # Initialize Terraform
    log_info "Initializing Terraform..."
    terraform init
    
    # Plan deployment
    log_info "Planning Terraform deployment..."
    terraform plan -out=tfplan
    
    # Apply deployment
    log_info "Applying Terraform deployment..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    log_success "Infrastructure deployment completed"
}

# Validate monitoring setup
validate_monitoring() {
    log_info "Validating monitoring setup..."
    
    # Get AWS region
    AWS_REGION=$(aws configure get region)
    if [ -z "$AWS_REGION" ]; then
        AWS_REGION="us-east-1"
        log_warning "AWS region not set, using default: $AWS_REGION"
    fi
    
    # Check if CloudWatch dashboard exists
    DASHBOARD_NAME=$(terraform output -raw dashboard_name 2>/dev/null || echo "")
    if [ -n "$DASHBOARD_NAME" ]; then
        log_info "Checking CloudWatch dashboard: $DASHBOARD_NAME"
        if aws cloudwatch get-dashboard --dashboard-name "$DASHBOARD_NAME" --region "$AWS_REGION" &> /dev/null; then
            log_success "CloudWatch dashboard found: $DASHBOARD_NAME"
        else
            log_warning "CloudWatch dashboard not found: $DASHBOARD_NAME"
        fi
    fi
    
    # Check Lambda functions
    log_info "Checking Lambda functions..."
    LAMBDA_FUNCTIONS=(
        "sparks-signup-trigger"
        "sparks-imageThumbnailGeneration"
        "sparks-express-api"
    )
    
    for func in "${LAMBDA_FUNCTIONS[@]}"; do
        if aws lambda get-function --function-name "$func" --region "$AWS_REGION" &> /dev/null; then
            log_success "Lambda function found: $func"
            
            # Check if X-Ray tracing is enabled
            TRACING_CONFIG=$(aws lambda get-function-configuration --function-name "$func" --region "$AWS_REGION" --query 'TracingConfig.Mode' --output text 2>/dev/null || echo "")
            if [ "$TRACING_CONFIG" = "Active" ]; then
                log_success "X-Ray tracing enabled for: $func"
            else
                log_warning "X-Ray tracing not enabled for: $func"
            fi
            
            # Check PowerTools environment variables
            ENV_VARS=$(aws lambda get-function-configuration --function-name "$func" --region "$AWS_REGION" --query 'Environment.Variables' --output json 2>/dev/null || echo "{}")
            
            if echo "$ENV_VARS" | jq -e '.POWERTOOLS_SERVICE_NAME' &> /dev/null; then
                log_success "PowerTools environment variables configured for: $func"
            else
                log_warning "PowerTools environment variables missing for: $func"
            fi
        else
            log_warning "Lambda function not found: $func"
        fi
    done
    
    # Check CloudWatch log groups
    log_info "Checking CloudWatch log groups..."
    for func in "${LAMBDA_FUNCTIONS[@]}"; do
        LOG_GROUP="/aws/lambda/$func"
        if aws logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" --region "$AWS_REGION" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "$LOG_GROUP"; then
            log_success "Log group found: $LOG_GROUP"
        else
            log_warning "Log group not found: $LOG_GROUP"
        fi
    done
}

# Test monitoring functionality
test_monitoring() {
    log_info "Testing monitoring functionality..."
    
    # Get API Gateway URL
    API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
    if [ -n "$API_URL" ]; then
        log_info "Testing API endpoint: $API_URL"
        
        # Test health endpoint
        if curl -s -f "$API_URL/" > /dev/null; then
            log_success "API health check passed"
        else
            log_warning "API health check failed"
        fi
        
        # Test photos endpoint (may require authentication)
        log_info "Testing photos endpoint (may require authentication)"
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/photos" || echo "000")
        if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "401" ]; then
            log_success "Photos endpoint responding (status: $HTTP_STATUS)"
        else
            log_warning "Photos endpoint issue (status: $HTTP_STATUS)"
        fi
    else
        log_warning "API Gateway URL not found in Terraform outputs"
    fi
    
    # Wait for metrics to appear (they may take a few minutes)
    log_info "Waiting for metrics to appear in CloudWatch (this may take a few minutes)..."
    sleep 30
    
    # Check for custom metrics
    AWS_REGION=$(aws configure get region || echo "us-east-1")
    NAMESPACES=("Sparks/API" "Sparks/Lambda")
    
    for namespace in "${NAMESPACES[@]}"; do
        log_info "Checking metrics in namespace: $namespace"
        METRIC_COUNT=$(aws cloudwatch list-metrics --namespace "$namespace" --region "$AWS_REGION" --query 'length(Metrics)' --output text 2>/dev/null || echo "0")
        if [ "$METRIC_COUNT" -gt 0 ]; then
            log_success "Found $METRIC_COUNT metrics in namespace: $namespace"
        else
            log_warning "No metrics found in namespace: $namespace (may take time to appear)"
        fi
    done
    
    # Check for business metrics specifically
    log_info "Checking for business metrics..."
    BUSINESS_METRICS=(
        "AuthenticatedRequests"
        "PhotosQueried"
        "FeatureUsage"
        "UserActivity"
        "ContentInteractions"
    )
    
    for metric in "${BUSINESS_METRICS[@]}"; do
        METRIC_EXISTS=$(aws cloudwatch list-metrics --namespace "Sparks/API" --metric-name "$metric" --region "$AWS_REGION" --query 'length(Metrics)' --output text 2>/dev/null || echo "0")
        if [ "$METRIC_EXISTS" -gt 0 ]; then
            log_success "Business metric found: $metric"
        else
            log_info "Business metric not yet available: $metric (will appear after API usage)"
        fi
    done
}

# Test user context integration
test_user_context() {
    log_info "Testing user context integration..."
    
    # Check if user context utilities exist
    USER_CONTEXT_FILE="$EXPRESS_API_DIR/utils/userContext.js"
    if [ -f "$USER_CONTEXT_FILE" ]; then
        log_success "User context utility found"
        
        # Check if the file contains expected functions
        if grep -q "extractUserContext" "$USER_CONTEXT_FILE"; then
            log_success "User context extraction function found"
        else
            log_warning "User context extraction function not found"
        fi
        
        if grep -q "enhancedUserContextMiddleware" "$USER_CONTEXT_FILE"; then
            log_success "Enhanced user context middleware found"
        else
            log_warning "Enhanced user context middleware not found"
        fi
    else
        log_error "User context utility not found: $USER_CONTEXT_FILE"
    fi
    
    # Check if PowerTools utility is updated
    POWERTOOLS_FILE="$EXPRESS_API_DIR/utils/powertools.js"
    if [ -f "$POWERTOOLS_FILE" ]; then
        if grep -q "trackBusinessMetric" "$POWERTOOLS_FILE"; then
            log_success "Business metric tracking functions found"
        else
            log_warning "Business metric tracking functions not found"
        fi
        
        if grep -q "trackUserActivity" "$POWERTOOLS_FILE"; then
            log_success "User activity tracking functions found"
        else
            log_warning "User activity tracking functions not found"
        fi
    else
        log_error "PowerTools utility not found: $POWERTOOLS_FILE"
    fi
}

# Generate monitoring report
generate_report() {
    log_info "Generating monitoring report..."
    
    REPORT_FILE="$PROJECT_ROOT/monitoring-report.txt"
    
    cat > "$REPORT_FILE" << EOF
# Sparks Business Metrics Monitoring Deployment Report
Generated: $(date)

## Infrastructure Status
EOF
    
    # Add Terraform outputs
    cd "$TERRAFORM_DIR"
    echo "### Terraform Outputs" >> "$REPORT_FILE"
    terraform output >> "$REPORT_FILE" 2>/dev/null || echo "No Terraform outputs available" >> "$REPORT_FILE"
    
    # Add AWS resource information
    AWS_REGION=$(aws configure get region || echo "us-east-1")
    echo -e "\n### AWS Resources" >> "$REPORT_FILE"
    echo "Region: $AWS_REGION" >> "$REPORT_FILE"
    
    # Lambda functions
    echo -e "\n#### Lambda Functions" >> "$REPORT_FILE"
    aws lambda list-functions --region "$AWS_REGION" --query 'Functions[?starts_with(FunctionName, `sparks`)].{Name:FunctionName,Runtime:Runtime,Timeout:Timeout,Memory:MemorySize}' --output table >> "$REPORT_FILE" 2>/dev/null || echo "Error retrieving Lambda functions" >> "$REPORT_FILE"
    
    # CloudWatch dashboards
    echo -e "\n#### CloudWatch Dashboards" >> "$REPORT_FILE"
    aws cloudwatch list-dashboards --region "$AWS_REGION" --query 'DashboardEntries[?contains(DashboardName, `sparks`)].{Name:DashboardName,LastModified:LastModified}' --output table >> "$REPORT_FILE" 2>/dev/null || echo "Error retrieving dashboards" >> "$REPORT_FILE"
    
    # Custom metrics summary
    echo -e "\n#### Custom Metrics Summary" >> "$REPORT_FILE"
    for namespace in "Sparks/API" "Sparks/Lambda"; do
        echo "Namespace: $namespace" >> "$REPORT_FILE"
        METRIC_COUNT=$(aws cloudwatch list-metrics --namespace "$namespace" --region "$AWS_REGION" --query 'length(Metrics)' --output text 2>/dev/null || echo "0")
        echo "Metric Count: $METRIC_COUNT" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    done
    
    # Business metrics status
    echo -e "\n#### Business Metrics Status" >> "$REPORT_FILE"
    echo "The following business metrics will be available after API usage:" >> "$REPORT_FILE"
    echo "- User Authentication & Engagement metrics" >> "$REPORT_FILE"
    echo "- Content Interaction & Feature Usage metrics" >> "$REPORT_FILE"
    echo "- Face Recognition & AI Feature metrics" >> "$REPORT_FILE"
    echo "- Upload & Content Creation metrics" >> "$REPORT_FILE"
    echo "- User Behavior Pattern metrics" >> "$REPORT_FILE"
    
    log_success "Monitoring report generated: $REPORT_FILE"
}

# Main execution
main() {
    log_info "Starting Sparks Business Metrics Monitoring Deployment"
    log_info "Project root: $PROJECT_ROOT"
    
    # Parse command line arguments
    SKIP_DEPLOY=false
    SKIP_TEST=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deploy)
                SKIP_DEPLOY=true
                shift
                ;;
            --skip-test)
                SKIP_TEST=true
                shift
                ;;
            --help)
                echo "Usage: $0 [--skip-deploy] [--skip-test] [--help]"
                echo "  --skip-deploy  Skip infrastructure deployment"
                echo "  --skip-test    Skip monitoring tests"
                echo "  --help         Show this help message"
                echo ""
                echo "This script deploys enhanced business metrics monitoring including:"
                echo "  - Cognito user data integration"
                echo "  - Business intelligence dashboards"
                echo "  - Application performance monitoring"
                echo "  - User behavior analytics"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    install_dependencies
    
    if [ "$SKIP_DEPLOY" = false ]; then
        deploy_infrastructure
    else
        log_info "Skipping infrastructure deployment"
    fi
    
    validate_monitoring
    test_user_context
    
    if [ "$SKIP_TEST" = false ]; then
        test_monitoring
    else
        log_info "Skipping monitoring tests"
    fi
    
    generate_report
    
    log_success "Sparks Business Metrics Monitoring deployment completed!"
    log_info "Check the monitoring report: $PROJECT_ROOT/monitoring-report.txt"
    log_info "Access your enhanced CloudWatch dashboard in the AWS Console"
    log_info ""
    log_info "New Features Deployed:"
    log_info "✓ Cognito user data integration in all traces and logs"
    log_info "✓ Business intelligence metrics and dashboards"
    log_info "✓ User behavior analytics and cohort analysis"
    log_info "✓ Feature usage tracking and adoption metrics"
    log_info "✓ Content interaction and engagement monitoring"
    log_info "✓ Premium user and revenue-focused dashboards"
    log_info ""
    log_info "Next Steps:"
    log_info "1. Generate some API traffic to populate business metrics"
    log_info "2. Review the enhanced CloudWatch dashboard"
    log_info "3. Set up alerts based on business KPIs"
    log_info "4. Analyze user behavior patterns and feature adoption"
}

# Run main function
main "$@"
