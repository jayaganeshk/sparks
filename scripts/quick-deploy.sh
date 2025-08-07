#!/bin/bash

# Quick deployment script to restore working API
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERRAFORM_DIR="$PROJECT_ROOT/terraform"

log_info "🚀 Quick Deploy - Restoring Working API"
log_info "Project root: $PROJECT_ROOT"

# Check if we're in the right directory
if [ ! -f "$TERRAFORM_DIR/main.tf" ]; then
    log_error "Terraform directory not found: $TERRAFORM_DIR"
    exit 1
fi

# Backup current files
log_info "📦 Creating backup of current files..."
BACKUP_DIR="$PROJECT_ROOT/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup the problematic files
if [ -f "$PROJECT_ROOT/src/express-api/index.js" ]; then
    cp "$PROJECT_ROOT/src/express-api/index.js" "$BACKUP_DIR/index.js.backup"
    log_success "Backed up index.js"
fi

if [ -f "$PROJECT_ROOT/src/express-api/routes/photos.js" ]; then
    cp "$PROJECT_ROOT/src/express-api/routes/photos.js" "$BACKUP_DIR/photos.js.backup"
    log_success "Backed up photos.js"
fi

# Use working versions
log_info "🔧 Switching to working versions..."

# The current index.js should already be the working version
log_success "Using working index.js (without PowerTools)"

# Optionally use working photos route
if [ -f "$PROJECT_ROOT/src/express-api/routes/photos-working.js" ]; then
    log_info "Using working photos route..."
    cp "$PROJECT_ROOT/src/express-api/routes/photos-working.js" "$PROJECT_ROOT/src/express-api/routes/photos.js"
    log_success "Switched to working photos.js"
fi

# Deploy with Terraform
log_info "🚀 Deploying with Terraform..."
cd "$TERRAFORM_DIR"

# Quick deploy without plan
terraform apply -auto-approve

if [ $? -eq 0 ]; then
    log_success "✅ Deployment completed successfully!"
    
    # Test the API
    log_info "🧪 Testing the deployed API..."
    
    # Get API URL from Terraform output
    API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "")
    
    if [ -n "$API_URL" ]; then
        log_info "Testing API endpoint: $API_URL"
        
        # Test health endpoint
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/" || echo "000")
        
        if [ "$HTTP_STATUS" = "200" ]; then
            log_success "✅ API is responding correctly (status: $HTTP_STATUS)"
            
            # Test a simple endpoint
            RESPONSE=$(curl -s "$API_URL/" || echo "")
            if echo "$RESPONSE" | grep -q "Sparks API is running"; then
                log_success "✅ API health check passed"
            else
                log_warning "⚠️ API responding but unexpected content"
            fi
        else
            log_warning "⚠️ API health check failed (status: $HTTP_STATUS)"
        fi
    else
        log_warning "⚠️ Could not get API URL from Terraform outputs"
    fi
    
    log_success "🎉 Quick deployment completed!"
    log_info "📁 Backup created at: $BACKUP_DIR"
    log_info ""
    log_info "Next steps:"
    log_info "1. Test your API endpoints to ensure they're working"
    log_info "2. Check CloudWatch logs for any issues"
    log_info "3. Follow POWERTOOLS_STEP_BY_STEP.md to add monitoring back gradually"
    
else
    log_error "❌ Deployment failed!"
    log_info "Restoring backup files..."
    
    # Restore backup files
    if [ -f "$BACKUP_DIR/index.js.backup" ]; then
        cp "$BACKUP_DIR/index.js.backup" "$PROJECT_ROOT/src/express-api/index.js"
        log_info "Restored index.js from backup"
    fi
    
    if [ -f "$BACKUP_DIR/photos.js.backup" ]; then
        cp "$BACKUP_DIR/photos.js.backup" "$PROJECT_ROOT/src/express-api/routes/photos.js"
        log_info "Restored photos.js from backup"
    fi
    
    exit 1
fi
