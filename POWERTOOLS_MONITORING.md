# AWS PowerTools Monitoring Implementation for Sparks

This document describes the comprehensive monitoring and observability implementation using AWS PowerTools across the Sparks photo-sharing platform.

## Overview

The Sparks platform now includes comprehensive monitoring using AWS PowerTools for:
- **Distributed Tracing** with AWS X-Ray
- **Structured Logging** with CloudWatch Logs
- **Custom Metrics** with CloudWatch Metrics
- **Performance Monitoring** and alerting

## Architecture Components

### 1. Express API (src/express-api/)
- **PowerTools Integration**: Logger, Tracer, Metrics
- **X-Ray Tracing**: Request/response tracing with subsegments
- **Custom Metrics**: API performance, error rates, business metrics
- **Structured Logging**: Request context, error tracking

### 2. Lambda Functions

#### Image Thumbnail Generation (src/lambdas/image_thumbnail_generation/)
- **Tracing**: Image processing pipeline with subsegments
- **Metrics**: Processing success/failure rates, performance metrics
- **Logging**: Detailed processing logs with metadata

#### Signup Trigger (src/lambdas/signup_trigger/)
- **Tracing**: User registration flow
- **Metrics**: Signup success rates, DynamoDB operations
- **Logging**: User creation events and errors

### 3. CloudWatch Dashboard
- **Comprehensive Monitoring**: API, Lambda, DynamoDB, S3, SQS metrics
- **Custom Metrics**: Business logic metrics from PowerTools
- **Alarms**: Critical error rate and performance monitoring

## Key Features

### Distributed Tracing
- **End-to-end visibility** from API requests to Lambda executions
- **Subsegment tracking** for granular operation monitoring
- **Error correlation** across service boundaries
- **Performance bottleneck identification**

### Structured Logging
- **Consistent log format** across all services
- **Contextual information** (request IDs, user context, operation metadata)
- **Error tracking** with stack traces and correlation IDs
- **Business event logging** (image processing, user actions)

### Custom Metrics
- **Business Metrics**: Photos processed, users created, API usage
- **Performance Metrics**: Response times, processing durations
- **Error Metrics**: Failure rates, error types, retry counts
- **Resource Metrics**: DynamoDB operations, S3 uploads, queue processing

## Implementation Details

### PowerTools Configuration

#### Environment Variables (Applied to all Lambda functions)
```bash
POWERTOOLS_SERVICE_NAME=<service-name>
POWERTOOLS_LOG_LEVEL=INFO
POWERTOOLS_LOGGER_LOG_EVENT=true
POWERTOOLS_TRACER_CAPTURE_RESPONSE=true
POWERTOOLS_TRACER_CAPTURE_ERROR=true
POWERTOOLS_METRICS_NAMESPACE=Sparks/Lambda
_X_AMZN_TRACE_ID=""
```

#### Express API Configuration
```javascript
// PowerTools initialization
const logger = new Logger({
  serviceName: 'sparks-express-api',
  logLevel: process.env.LOG_LEVEL || 'INFO'
});

const tracer = new Tracer({
  serviceName: 'sparks-express-api',
  captureHTTPsRequests: true
});

const metrics = new Metrics({
  namespace: 'Sparks/API',
  serviceName: 'sparks-express-api'
});
```

### Monitoring Capabilities

#### 1. API Monitoring
- **Request Tracking**: All HTTP requests with method, path, response time
- **Error Monitoring**: 4xx/5xx errors with detailed context
- **Performance Metrics**: Response times, throughput
- **Business Metrics**: Photos queried, signed URLs generated

#### 2. Lambda Function Monitoring
- **Invocation Tracking**: Function executions with context
- **Performance Monitoring**: Duration, memory usage, cold starts
- **Error Tracking**: Exceptions with stack traces
- **Business Logic Metrics**: Image processing success rates

#### 3. DynamoDB Monitoring
- **Operation Tracking**: Queries, updates, inserts with timing
- **Capacity Monitoring**: Read/write capacity utilization
- **Error Tracking**: Throttling, failed operations
- **Performance Metrics**: Response times, item counts

#### 4. S3 Monitoring
- **Upload Tracking**: File uploads with metadata
- **Error Monitoring**: Failed uploads, access errors
- **Storage Metrics**: Bucket size, object counts
- **Performance Tracking**: Upload durations

## CloudWatch Dashboard

The comprehensive dashboard includes:

### Widget Categories
1. **API Gateway Metrics**: Request counts, error rates, response times
2. **Lambda Function Metrics**: Invocations, errors, duration, throttles
3. **Image Processing Metrics**: Variants processed, upload success rates
4. **DynamoDB Metrics**: Capacity utilization, operation counts
5. **Error Rate Dashboard**: System-wide error monitoring
6. **Performance Dashboard**: Response times, processing durations
7. **SQS Queue Metrics**: Message processing, queue depths
8. **S3 Storage Metrics**: Storage utilization, upload metrics
9. **User Activity Metrics**: Signups, user operations
10. **System Health Summary**: Overall system status

### Alarms
- **Lambda Error Rate**: Triggers when error rate exceeds threshold
- **API Error Rate**: Monitors API 5xx error rates
- **DynamoDB Throttles**: Alerts on capacity issues

## Usage Examples

### Adding Custom Metrics
```javascript
// In Lambda functions
metrics.addMetric('CustomOperation', MetricUnit.Count, 1);
metrics.addMetric('ProcessingTime', MetricUnit.Milliseconds, duration);

// In Express API
addCustomMetric('PhotosProcessed', count, MetricUnit.Count, { 
  operation: 'upload' 
});
```

### Creating Trace Subsegments
```javascript
// Lambda function
const subsegment = tracer.getSegment()?.addNewSubsegment('customOperation');
try {
  // Your operation
  tracer.addMetadata('operation_data', { key: 'value' });
} finally {
  subsegment?.close();
}

// Express API
const subsegment = createRouteSegment('photos', 'getAllPhotos');
// Operation logic
subsegment?.close();
```

### Structured Logging
```javascript
// Lambda function
logger.info('Processing started', {
  operation: 'imageProcessing',
  fileName: fileName,
  metadata: { width, height }
});

// Express API
logger.error('Request failed', {
  error: err.message,
  path: req.path,
  method: req.method,
  statusCode: 500
});
```

## Deployment

### Prerequisites
1. **X-Ray Tracing**: Enabled on Lambda functions and API Gateway
2. **CloudWatch Permissions**: Lambda execution roles have CloudWatch access
3. **PowerTools Dependencies**: Installed in all Lambda functions

### Terraform Deployment
```bash
cd terraform/
terraform plan
terraform apply
```

### Package Installation
```bash
# Express API
cd src/express-api/
npm install

# Lambda functions (already configured in package.json)
# Dependencies will be installed during Terraform deployment
```

## Monitoring Best Practices

### 1. Log Levels
- **INFO**: Normal operations, business events
- **WARN**: Recoverable errors, performance issues
- **ERROR**: Unrecoverable errors, system failures

### 2. Metric Naming
- Use consistent naming conventions
- Include service and operation context
- Use appropriate metric units

### 3. Trace Correlation
- Use correlation IDs across services
- Add meaningful metadata to traces
- Create subsegments for major operations

### 4. Alert Configuration
- Set appropriate thresholds for alarms
- Configure notification channels
- Test alarm conditions regularly

## Troubleshooting

### Common Issues
1. **Missing Traces**: Check X-Ray permissions and service configuration
2. **No Custom Metrics**: Verify CloudWatch permissions and metric namespace
3. **Log Correlation**: Ensure correlation IDs are passed between services

### Debug Commands
```bash
# Check CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/sparks"

# View X-Ray traces
aws xray get-trace-summaries --time-range-type TimeRangeByStartTime

# Check custom metrics
aws cloudwatch list-metrics --namespace "Sparks/Lambda"
```

## Performance Impact

### Overhead Analysis
- **Tracing**: ~1-2ms per request
- **Logging**: ~0.5ms per log entry
- **Metrics**: ~0.1ms per metric
- **Total**: <5ms additional latency per request

### Cost Considerations
- **X-Ray**: $5 per 1M traces
- **CloudWatch Logs**: $0.50 per GB ingested
- **CloudWatch Metrics**: $0.30 per metric per month
- **Estimated Monthly Cost**: $10-50 for typical usage

## Future Enhancements

1. **Advanced Alerting**: Integration with SNS/Slack notifications
2. **Custom Dashboards**: Role-specific monitoring views
3. **Automated Remediation**: Lambda-based auto-scaling responses
4. **ML-based Anomaly Detection**: CloudWatch Anomaly Detection
5. **Cross-Region Monitoring**: Multi-region observability

## Support and Maintenance

### Regular Tasks
- Review dashboard metrics weekly
- Update alarm thresholds based on usage patterns
- Clean up old log groups and traces
- Monitor costs and optimize retention policies

### Documentation Updates
- Update this document when adding new services
- Document new metrics and their business meaning
- Maintain troubleshooting guides

---

For questions or issues with the monitoring implementation, please refer to the AWS PowerTools documentation or create an issue in the project repository.
