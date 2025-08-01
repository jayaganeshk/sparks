# Event Organizer Development Environment

This environment is specifically created for developing and testing the event organizer functionality without disrupting the existing development environment.

## Environment Details

- **Environment Name**: `event-dev`
- **Prefix**: `event-dev`
- **AWS Region**: `ap-south-1`
- **State File**: `sparks/event-dev/terraform.tfstate`

## Resource Naming

All resources in this environment will be prefixed with `event-dev-` to ensure they don't conflict with existing `dev-` or `prod-` resources.

## Deployment

### Option 1: Using the deployment script (Recommended)

From the `terraform/` directory:

```bash
# For Linux/Mac
./deploy-event-dev.sh

# For Windows PowerShell
.\deploy-event-dev.ps1
```

### Option 2: Manual deployment

1. **Initialize Terraform:**
   ```bash
   terraform init \
       -backend-config="bucket=tf-backend-183103430916" \
       -backend-config="key=sparks/event-dev/terraform.tfstate" \
       -backend-config="region=ap-south-1" \
       -backend-config="dynamodb_table=terraform-state-lock" \
       -backend-config="encrypt=true"
   ```

2. **Plan the deployment:**
   ```bash
   terraform plan -var-file="environments/event-dev/variables.tfvars" -out="event-dev-tf-output"
   ```

3. **Apply the changes:**
   ```bash
   terraform apply "event-dev-tf-output"
   ```

## Configuration

The environment-specific configuration is stored in `variables.tfvars`. Key configurations include:

- **Cognito User Pool Domain**: `sparks-event-dev-unique-domain`
- **Pinecone Index**: `sparks-event-dev-index`
- **Custom Domain**: Disabled for development
- **State Isolation**: Completely separate from dev and prod environments

## Purpose

This environment is designed to:

1. **Isolate Development**: Prevent disruption to the existing dev environment during event organizer feature development
2. **Test New Features**: Safely test dual Cognito user pool setup and event organizer functionality
3. **Validate Infrastructure**: Ensure new Terraform modules work correctly before applying to production
4. **Enable Parallel Development**: Allow multiple developers to work on different features simultaneously

## Cleanup

To destroy this environment when no longer needed:

```bash
terraform destroy -var-file="environments/event-dev/variables.tfvars"
```

**⚠️ Warning**: This will permanently delete all resources in the event-dev environment.