# PowerTools Deployment Checklist

This checklist ensures proper deployment and validation of the AWS PowerTools monitoring implementation across the Sparks platform.

## Pre-Deployment Checklist

### ✅ Code Implementation
- [ ] All Express API routes updated with PowerTools integration
- [ ] Lambda functions updated with PowerTools decorators
- [ ] PowerTools utility module created (`utils/powertools.js`)
- [ ] Package.json files updated with PowerTools dependencies
- [ ] Terraform configuration updated with environment variables

### ✅ Dependencies Verification
- [ ] Express API dependencies installed: `@aws-lambda-powertools/logger`, `@aws-lambda-powertools/tracer`, `@aws-lambda-powertools/metrics`
- [ ] Lambda function dependencies configured in package.json files
- [ ] X-Ray SDK packages installed: `aws-xray-sdk-core`, `aws-xray-sdk-express`

### ✅ Infrastructure Configuration
- [ ] Terraform Lambda module updated with PowerTools environment variables
- [ ] CloudWatch dashboard configuration updated
- [ ] CloudWatch alarms configured for critical metrics
- [ ] X-Ray tracing enabled for all Lambda functions

## Deployment Steps

### 1. Install Dependencies
```bash
# Express API
cd src/express-api/
npm install

# Verify PowerTools packages
npm list @aws-lambda-powertools/logger
npm list @aws-lambda-powertools/tracer
npm list @aws-lambda-powertools/metrics
```

### 2. Deploy Infrastructure
```bash
# Run deployment script
./scripts/deploy-monitoring.sh

# Or manual deployment
cd terraform/
terraform init
terraform plan
terraform apply
```

### 3. Verify Environment Variables
Check that all Lambda functions have the following environment variables:
- [ ] `POWERTOOLS_SERVICE_NAME`
- [ ] `POWERTOOLS_LOG_LEVEL`
- [ ] `POWERTOOLS_LOGGER_LOG_EVENT`
- [ ] `POWERTOOLS_TRACER_CAPTURE_RESPONSE`
- [ ] `POWERTOOLS_TRACER_CAPTURE_ERROR`
- [ ] `POWERTOOLS_METRICS_NAMESPACE`
- [ ] `_X_AMZN_TRACE_ID`

## Post-Deployment Validation

### ✅ Functional Testing

#### Express API Routes
Test each route and verify functionality:
- [ ] `GET /` - Health check
- [ ] `GET /photos` - Photo listing
- [ ] `GET /photos/:id` - Photo details
- [ ] `GET /users` - User listing
- [ ] `GET /users/:email` - User details
- [ ] `GET /persons` - Person listing
- [ ] `GET /upload` - Upload URL generation
- [ ] `POST /upload/complete` - Upload completion
- [ ] `GET /me/profile` - User profile
- [ ] `POST /events` - Event logging
- [ ] `GET /livestream` - Livestream status
- [ ] `GET /proxy/image` - Image proxy

#### Lambda Functions
Test Lambda function invocations:
- [ ] Image thumbnail generation
- [ ] Signup trigger
- [ ] Face recognition (if applicable)

### ✅ Monitoring Validation

#### CloudWatch Logs
Verify structured logging:
- [ ] Express API logs contain PowerTools structured format
- [ ] Lambda function logs show PowerTools decorators working
- [ ] Log entries include correlation IDs and context
- [ ] Error logs include stack traces and metadata

#### X-Ray Traces
Verify distributed tracing:
- [ ] API Gateway requests show in X-Ray console
- [ ] Lambda function traces appear with subsegments
- [ ] DynamoDB operations traced
- [ ] S3 operations traced
- [ ] Error traces include exception details

#### CloudWatch Metrics
Verify custom metrics:
- [ ] `Sparks/API` namespace contains API metrics
- [ ] `Sparks/Lambda` namespace contains Lambda metrics
- [ ] Business metrics appear (PhotosQueried, UsersRetrieved, etc.)
- [ ] Error metrics appear (PhotosQueryErrors, etc.)
- [ ] Performance metrics appear (ResponseTime, etc.)

#### CloudWatch Dashboard
Verify dashboard widgets:
- [ ] API Gateway metrics widget shows data
- [ ] Lambda function metrics widget shows data
- [ ] Image processing metrics widget shows data
- [ ] DynamoDB metrics widget shows data
- [ ] Error rate dashboard shows data
- [ ] Performance dashboard shows data
- [ ] System health summary shows data

### ✅ Performance Validation

#### Response Time Impact
- [ ] API response times increased by <5ms
- [ ] Lambda cold start times acceptable
- [ ] No significant memory usage increase

#### Cost Impact
- [ ] X-Ray costs within expected range
- [ ] CloudWatch Logs costs acceptable
- [ ] CloudWatch Metrics costs reasonable

## Testing Commands

### 1. API Testing
```bash
# Health check
curl -X GET https://your-api-domain.com/

# Test with authentication (replace with actual token)
curl -X GET https://your-api-domain.com/photos \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test event logging
curl -X POST https://your-api-domain.com/events \
  -H "Content-Type: application/json" \
  -H "x-user-email: test@example.com" \
  -d '{"eventType": "page_view", "eventData": {"page": "home"}}'
```

### 2. AWS CLI Validation
```bash
# Check CloudWatch metrics
aws cloudwatch list-metrics --namespace "Sparks/API"
aws cloudwatch list-metrics --namespace "Sparks/Lambda"

# Check X-Ray traces
aws xray get-trace-summaries --time-range-type TimeRangeByStartTime \
  --start-time 2024-01-01T00:00:00Z --end-time 2024-12-31T23:59:59Z

# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/sparks"

# Check dashboard
aws cloudwatch get-dashboard --dashboard-name "sparks-sparks-monitoring"
```

### 3. Lambda Testing
```bash
# Test signup trigger (replace with actual user pool)
aws cognito-idp admin-create-user \
  --user-pool-id YOUR_USER_POOL_ID \
  --username testuser@example.com \
  --message-action SUPPRESS

# Check Lambda logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/sparks-signup-trigger" \
  --start-time $(date -d '1 hour ago' +%s)000
```

## Troubleshooting

### Common Issues

#### 1. Missing Traces
**Symptoms**: No X-Ray traces appearing
**Solutions**:
- [ ] Verify X-Ray tracing enabled on Lambda functions
- [ ] Check IAM permissions for X-Ray
- [ ] Ensure `_X_AMZN_TRACE_ID` environment variable set
- [ ] Verify PowerTools tracer initialization

#### 2. Missing Metrics
**Symptoms**: Custom metrics not appearing in CloudWatch
**Solutions**:
- [ ] Check CloudWatch permissions in Lambda execution role
- [ ] Verify metrics namespace configuration
- [ ] Ensure PowerTools metrics decorator applied
- [ ] Check for metric publishing errors in logs

#### 3. Missing Logs
**Symptoms**: Structured logs not appearing
**Solutions**:
- [ ] Verify CloudWatch Logs permissions
- [ ] Check PowerTools logger configuration
- [ ] Ensure logger context injection working
- [ ] Verify log level configuration

#### 4. High Latency
**Symptoms**: Increased response times
**Solutions**:
- [ ] Review subsegment creation/closure
- [ ] Optimize metric collection frequency
- [ ] Check for memory leaks in tracing
- [ ] Verify efficient error handling

### Debug Commands
```bash
# Check Lambda function configuration
aws lambda get-function-configuration --function-name sparks-express-api

# Check recent errors
aws logs filter-log-events \
  --log-group-name "/aws/lambda/sparks-express-api" \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000

# Check X-Ray service map
aws xray get-service-graph \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s)
```

## Rollback Plan

If issues occur during deployment:

### 1. Code Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Redeploy previous version
terraform apply
```

### 2. Feature Flag Disable
```bash
# Disable PowerTools via environment variables
aws lambda update-function-configuration \
  --function-name sparks-express-api \
  --environment Variables='{
    "POWERTOOLS_LOG_LEVEL":"WARN",
    "POWERTOOLS_TRACER_CAPTURE_RESPONSE":"false"
  }'
```

### 3. Infrastructure Rollback
```bash
# Revert Terraform changes
terraform plan -destroy -target=module.cloudwatch
terraform apply -target=module.cloudwatch
```

## Success Criteria

Deployment is considered successful when:
- [ ] All API endpoints respond correctly
- [ ] All Lambda functions execute without errors
- [ ] CloudWatch dashboard shows live data
- [ ] X-Ray traces appear for requests
- [ ] Custom metrics populate in CloudWatch
- [ ] Error rates remain within acceptable limits
- [ ] Performance impact is minimal (<5ms latency increase)
- [ ] No increase in Lambda timeout errors
- [ ] Monitoring costs are within budget

## Maintenance Tasks

### Weekly
- [ ] Review CloudWatch dashboard for anomalies
- [ ] Check error rates and investigate spikes
- [ ] Verify all alarms are functioning
- [ ] Review X-Ray service map for issues

### Monthly
- [ ] Analyze performance trends
- [ ] Review and optimize custom metrics
- [ ] Update alert thresholds based on usage patterns
- [ ] Clean up old log groups and traces

### Quarterly
- [ ] Review monitoring costs and optimize
- [ ] Update PowerTools to latest versions
- [ ] Enhance dashboard based on new requirements
- [ ] Conduct monitoring effectiveness review

---

This checklist ensures a successful deployment and ongoing maintenance of the PowerTools monitoring implementation for the Sparks platform.
