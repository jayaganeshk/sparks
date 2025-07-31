# Sparks Multi-Environment Deployment Guide

This comprehensive guide covers the complete deployment process for the Sparks photo sharing platform with full multi-environment support.

## Overview

The deployment system supports three environments:
- **dev**: Development environment with debug features enabled
- **staging**: Pre-production environment for testing
- **prod**: Production environment with optimizations

## Prerequisites

- Node.js (v16 or higher)
- AWS CLI configured with appropriate permissions
- Terraform (v1.0 or higher)
- jq (for JSON processing)

## Environment Structure

```
terraform/
├── environments/
│   ├── dev/
│   │   └── variables.tfvars
│   ├── staging/
│   │   └── variables.tfvars
│   └── prod/
│       └── variables.tfvars
└── [terraform files]

webUI/
├── .env.dev
├── .env.staging
├── .env.prod
└── [source files]
```

## Quick Start

### 1. Deploy Infrastructure

```bash
# Initialize and plan for development
./terraform-env.sh dev init
./terraform-env.sh dev plan
./terraform-env.sh dev apply

# For other environments
./terraform-env.sh staging plan && ./terraform-env.sh staging apply
./terraform-env.sh prod plan && ./terraform-env.sh prod apply
```

### 2. Deploy Application

```bash
# Deploy to development
./deploy.sh dev

# Deploy to staging
./deploy.sh staging

# Deploy to production
./deploy.sh prod
```

## Complete Deployment Walkthrough

### Step 1: Development Deployment

Deploy infrastructure:
```bash
./terraform-env.sh dev init
./terraform-env.sh dev plan
./terraform-env.sh dev apply
```

Deploy application:
```bash
./deploy.sh dev
```

**Expected Output:**
```
🚀 SPARKS WEBUI DEPLOYMENT
Multi-environment build, sync & deployment

[INFO] Deploying to dev environment
[SUCCESS] All prerequisites are met
[INFO] Initializing Terraform for dev environment...
[SUCCESS] Terraform configured for dev environment
[INFO] Getting configuration from Terraform (dev)...
[SUCCESS] Configuration retrieved for dev environment
  Amplify App ID: d1a2b3c4d5e6f7
  API Endpoint: https://api-dev.sparks.example.com
  S3 Bucket: sparks-dev-store-bucket
  Deployment Bucket: d1a2b3c4d5e6f7-sparks-deployments-dev
[SUCCESS] dev environment configuration created
[SUCCESS] Build completed for dev
  Build size: 2.1M
  File count: 45 files
  Build mode: development
[SUCCESS] S3 bucket configured for dev
[SUCCESS] Files synced to S3 for dev
[SUCCESS] Deployment started for dev
  Job ID: 123456789
  Branch: dev
[SUCCESS] Deployment completed successfully!

==========================================
      🚀 DEPLOYMENT SUCCESSFUL! 🚀
==========================================

🌍 Environment: dev
🔗 Your app is now live at:
   https://dev.d1a2b3c4d5e6f7.amplifyapp.com
==========================================
```

### Step 2: Staging Deployment

After dev testing:
```bash
./terraform-env.sh staging plan && ./terraform-env.sh staging apply
./deploy.sh staging
```

### Step 3: Production Deployment

After staging validation:
```bash
./terraform-env.sh prod plan && ./terraform-env.sh prod apply
./deploy.sh prod
```

## Infrastructure Management

The `terraform-env.sh` script provides environment-aware Terraform operations:

```bash
# Initialize Terraform for an environment
./terraform-env.sh <env> init

# Plan changes
./terraform-env.sh <env> plan

# Apply changes
./terraform-env.sh <env> apply

# Show outputs
./terraform-env.sh <env> output

# Destroy infrastructure (use with caution!)
./terraform-env.sh <env> destroy

# Workspace management
./terraform-env.sh <env> workspace list
./terraform-env.sh <env> workspace show
```

## Application Deployment Features

The `deploy.sh` script handles the complete pipeline:

1. **Terraform Integration**: Initializes and selects correct workspace
2. **Configuration Retrieval**: Gets environment-specific configuration from Terraform
3. **Environment Setup**: Creates `.env.<environment>` file with proper configuration
4. **Build Process**: Builds with environment-specific optimizations
5. **S3 Sync**: Syncs to environment-specific S3 bucket
6. **Amplify Deployment**: Deploys to correct Amplify branch
7. **Monitoring**: Tracks deployment progress with detailed status

### Environment-Specific Features

| Environment | Build Mode | Debug | Source Maps | Branch | Optimizations |
|-------------|------------|-------|-------------|--------|---------------|
| **dev**     | development| ✅    | ✅          | dev    | Fast builds   |
| **staging** | production | ❌    | ❌          | staging| Full optimization |
| **prod**    | production | ❌    | ❌          | main   | Full optimization |

## Configuration Files

### Terraform Variables Example

```hcl
# terraform/environments/dev/variables.tfvars
prefix             = "dev"
environment        = "dev"
aws_region         = "ap-south-1"
tf_state_s3_bucket = "tf-backend-183103430916"
tf_state_s3_key    = "sparks/dev/terraform.tfstate"

user_pool_domain               = "sparks-dev-unique-domain"
ui_custom_domain               = "https://dev.sparks.yourdomain.com"
use_custom_domain_for_ui       = false
```

### Generated WebUI Environment Files

**Development (.env.dev):**
```bash
VITE_API_BASE_URL=https://api-dev.sparks.example.com
VITE_ENVIRONMENT=dev
VITE_DEBUG_MODE=true
VITE_APP_TITLE=Sparks (dev)
```

**Staging (.env.staging):**
```bash
VITE_API_BASE_URL=https://api-staging.sparks.example.com
VITE_ENVIRONMENT=staging
VITE_DEBUG_MODE=false
VITE_APP_TITLE=Sparks (staging)
```

**Production (.env.prod):**
```bash
VITE_API_BASE_URL=https://api.sparks.example.com
VITE_ENVIRONMENT=prod
VITE_DEBUG_MODE=false
VITE_APP_TITLE=Sparks
```

## Terraform Workspaces

The system uses Terraform workspaces for state isolation:
- `dev` workspace for development
- `staging` workspace for staging  
- `prod` workspace for production

## S3 Bucket Structure

Environment-specific deployment buckets:
```
<amplify-app-id>-sparks-deployments-dev/
├── web/
│   ├── assets/
│   ├── index.html
│   └── deployment-manifest.json

<amplify-app-id>-sparks-deployments-staging/
├── web/
│   └── [staging files]

<amplify-app-id>-sparks-deployments-prod/
├── web/
│   └── [production files]
```

## Monitoring and Debugging

### Deployment Status Monitoring

Real-time monitoring during deployment:
```bash
[INFO] Deployment in progress....
[SUCCESS] Deployment completed successfully!
  Start time: 2024-07-31T08:00:00Z
  End time: 2024-07-31T08:05:00Z
  Branch: dev
```

### Quick Commands

```bash
# View deployment logs
aws amplify get-job --app-id <APP_ID> --branch-name <BRANCH> --job-id <JOB_ID>

# Check Terraform plan
cd terraform && terraform plan -var-file="environments/<env>/variables.tfvars"

# Redeploy application
./deploy.sh <environment>

# Check workspace
./terraform-env.sh <env> workspace show

# Compare configurations
diff terraform/environments/dev/variables.tfvars terraform/environments/prod/variables.tfvars
```

## Troubleshooting

### Common Issues and Solutions

**1. Terraform workspace mismatch**
```bash
[ERROR] Terraform workspace mismatch. Expected: prod, Current: dev
```
Solution:
```bash
./terraform-env.sh prod workspace select
```

**2. Missing infrastructure**
```bash
[WARNING] No Terraform outputs found. Infrastructure may not be deployed yet.
```
Solution:
```bash
./terraform-env.sh prod plan
./terraform-env.sh prod apply
```

**3. Build failures**
```bash
[ERROR] Build failed - dist directory not found
```
Solution:
```bash
cd webUI
rm -rf node_modules package-lock.json
npm install
cd ..
./deploy.sh dev
```

**4. S3 sync issues**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify bucket permissions in AWS Console
- Check region configuration

**5. Amplify deployment failures**
- Verify branch exists in Amplify Console
- Check S3 bucket policy
- Review Amplify build settings

### Debug Commands

```bash
# Check deployment manifest
aws s3 cp s3://<bucket>/web/deployment-manifest.json -

# Review Terraform outputs
./terraform-env.sh <env> output

# Check all environments status
./terraform-env.sh dev workspace show
./terraform-env.sh staging workspace show  
./terraform-env.sh prod workspace show

# Check deployment history
aws amplify list-jobs --app-id <APP_ID> --branch-name main --max-results 10
```

## Rollback Procedure

If issues are found in production:

```bash
# Quick rollback using previous deployment
aws amplify start-deployment \
  --app-id <APP_ID> \
  --branch-name main \
  --source-url s3://<bucket>/web-backup/ \
  --source-url-type BUCKET_PREFIX

# Or redeploy previous version
git checkout previous-stable-commit
./deploy.sh prod
```

## Best Practices

1. **Always plan before apply**
   ```bash
   ./terraform-env.sh <env> plan
   # Review changes
   ./terraform-env.sh <env> apply
   ```

2. **Test progression: dev → staging → prod**
   ```bash
   ./deploy.sh dev      # Test thoroughly
   ./deploy.sh staging  # Final validation
   ./deploy.sh prod     # Production deployment
   ```

3. **Monitor deployments**
   - Watch deployment progress
   - Check AWS Console for issues
   - Verify application functionality

4. **Environment isolation**
   - Keep environment configurations separate
   - Use different AWS accounts for prod if possible
   - Regular backup of Terraform state

## Security Considerations

- Environment variables generated automatically from Terraform
- S3 buckets have environment-specific policies
- Amplify deployments use service roles
- Terraform state stored in separate S3 keys per environment

## Post-Deployment Verification

After each deployment:

1. **Functional Testing**
   ```bash
   curl -I https://<environment-url>
   ```

2. **Configuration Verification**
   ```bash
   ./terraform-env.sh <env> workspace show
   ./terraform-env.sh <env> output
   ```

3. **Application Testing**
   - Verify new features work
   - Test existing functionality
   - Check API connectivity
   - Validate authentication

This comprehensive guide covers everything needed to successfully deploy and manage the Sparks application across multiple environments with proper isolation, monitoring, and troubleshooting capabilities.
