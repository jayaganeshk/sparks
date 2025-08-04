# Cleanup System Module

This module provides a scheduled cleanup system for the Sparks application that can automatically clear all user data and reset the system to a clean state.

## ⚠️ WARNING

**This cleanup system is DESTRUCTIVE and will permanently delete all user data!**

The cleanup process will:
- **Delete and recreate the DynamoDB table** (all data lost)
- **Delete all Cognito users** (preserving user pool and app client configuration)
- **Clear the Pinecone vector index** (all face recognition data lost)
- **Delete all files in the S3 persons folder** (all person images lost)
- **Invalidate CloudFront distribution** (clear cached assets)

## Features

- **Scheduled Cleanup**: Runs every 12 hours when enabled
- **Disabled by Default**: The schedule is disabled by default for safety
- **Manual Trigger**: Can be triggered manually via AWS Lambda console or CLI
- **Parallel Execution**: All cleanup operations run concurrently for optimal performance
- **Comprehensive Cleanup**: Clears all user data while preserving infrastructure
- **CloudFront Invalidation**: Automatically invalidates cached assets
- **Error Handling**: Continues cleanup even if individual operations fail
- **Performance Tracking**: Reports duration and success rate for each operation
- **Detailed Logging**: Provides comprehensive logs of all cleanup operations

## Components

### Lambda Function
- **Name**: `{prefix}-cleanup-system`
- **Runtime**: Node.js 22.x
- **Timeout**: 15 minutes (reduced due to parallel execution)
- **Memory**: 512 MB
- **Execution**: All operations run in parallel using Promise.allSettled
- **Performance**: Significantly faster than sequential execution
- **Permissions**: Full access to DynamoDB, Cognito, S3, SSM, and CloudFront

### EventBridge Rule
- **Name**: `{prefix}-cleanup-schedule`
- **Schedule**: Every 12 hours (`rate(12 hours)`)
- **State**: Disabled by default
- **Target**: Cleanup Lambda function

## Usage

### Via Terraform Variables

Enable/disable the cleanup schedule by setting the `cleanup_schedule_enabled` variable:

```hcl
# terraform.tfvars
cleanup_schedule_enabled = false  # Default: disabled for safety
```

### Via Management Script

Use the provided management script for easier control:

```bash
# Check current status
./scripts/manage_cleanup.sh status

# Enable automatic cleanup (DANGEROUS!)
./scripts/manage_cleanup.sh enable

# Disable automatic cleanup
./scripts/manage_cleanup.sh disable

# Run cleanup immediately (DANGEROUS!)
./scripts/manage_cleanup.sh run-now
```

### Via AWS CLI

Manually invoke the cleanup lambda:

```bash
aws lambda invoke \
  --function-name "{prefix}-cleanup-system" \
  --payload '{"source": "manual-trigger"}' \
  response.json
```

### Via AWS Console

1. Go to AWS Lambda console
2. Find the `{prefix}-cleanup-system` function
3. Click "Test" and create a test event
4. Execute the function

## Configuration

### Required Variables

| Variable | Description | Type | Default |
|----------|-------------|------|---------|
| `prefix` | Resource prefix | string | - |
| `environment` | Environment name | string | "dev" |
| `aws_region` | AWS region | string | - |
| `lambda_exec_role_arn` | Lambda execution role ARN | string | - |
| `lambda_exec_role_name` | Lambda execution role name | string | - |
| `dynamodb_table_name` | DynamoDB table name | string | - |
| `dynamodb_table_arn` | DynamoDB table ARN | string | - |
| `cognito_user_pool_id` | Cognito User Pool ID | string | - |
| `cognito_user_pool_arn` | Cognito User Pool ARN | string | - |
| `s3_bucket_name` | S3 bucket name | string | - |
| `s3_bucket_arn` | S3 bucket ARN | string | - |
| `pinecone_index_name` | Pinecone index name | string | - |
| `pinecone_ssm_parameter_name` | SSM parameter for Pinecone API key | string | - |
| `cloudfront_distribution_id` | CloudFront distribution ID | string | - |
| `cloudfront_distribution_arn` | CloudFront distribution ARN | string | - |

### Optional Variables

| Variable | Description | Type | Default |
|----------|-------------|------|---------|
| `cleanup_schedule_enabled` | Enable automatic cleanup | bool | false |

## Outputs

| Output | Description |
|--------|-------------|
| `cleanup_lambda_function_name` | Name of the cleanup Lambda function |
| `cleanup_lambda_function_arn` | ARN of the cleanup Lambda function |
| `cleanup_schedule_rule_name` | Name of the EventBridge rule |
| `cleanup_schedule_rule_arn` | ARN of the EventBridge rule |
| `cleanup_schedule_enabled` | Whether the schedule is enabled |

## Security Considerations

### IAM Permissions

The cleanup lambda requires extensive permissions:
- **DynamoDB**: Full table management (describe, delete, create, update TTL)
- **Cognito**: User management (list users, delete users)
- **S3**: Object management (list bucket, delete objects)
- **SSM**: Parameter access (get Pinecone API key)
- **CloudFront**: Invalidation management (create invalidations)

### Safety Measures

1. **Disabled by Default**: The schedule is disabled by default
2. **Confirmation Required**: Management script requires explicit confirmation
3. **Comprehensive Logging**: All operations are logged for audit
4. **Error Isolation**: Failures in one cleanup operation don't stop others
5. **Infrastructure Preservation**: Only data is deleted, infrastructure remains

## Monitoring

### CloudWatch Logs

Monitor cleanup operations via CloudWatch Logs:
- Log Group: `/aws/lambda/{prefix}-cleanup-system`
- Retention: As configured in your CloudWatch settings

### EventBridge Metrics

Monitor schedule execution via EventBridge metrics:
- Rule invocations
- Target success/failure rates
- Lambda execution metrics

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure the Lambda execution role has all required permissions
2. **Pinecone Connection Failed**: Verify the SSM parameter contains a valid API key
3. **DynamoDB Recreation Failed**: Check for deletion protection or conflicting resources
4. **Cognito User Deletion Failed**: Verify user pool exists and is accessible

### Recovery

If cleanup fails partially:
1. Check CloudWatch logs for specific error details
2. Run cleanup again (it's idempotent)
3. Manually clean remaining resources if needed
4. Verify all resources are properly configured

## Development

### Local Testing

To test the cleanup lambda locally:

1. Set up environment variables
2. Install dependencies: `npm install`
3. Run with Node.js: `node index.js`

### Deployment

The module is deployed automatically when you run:

```bash
terraform apply
```

## Best Practices

1. **Never enable in production** unless absolutely necessary
2. **Always backup critical data** before running cleanup
3. **Test in development environment** first
4. **Monitor cleanup execution** via CloudWatch
5. **Use manual trigger** for controlled cleanup
6. **Document cleanup schedules** in your operations runbook

## Support

For issues or questions about the cleanup system:
1. Check CloudWatch logs for error details
2. Verify all required resources exist
3. Ensure proper IAM permissions
4. Test individual cleanup operations manually
