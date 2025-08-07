# Lambda Handler Troubleshooting Guide

This guide helps resolve common issues with the Express API Lambda handler, particularly the callback warning and null response issues.

## Issue: Null Response from Lambda

### Problem
All routes returning null responses with callback warning:
```
AWS Lambda plans to remove support for callback-based function handlers starting with Node.js 24
```

### Root Cause
The PowerTools decorators (`tracer.captureLambdaHandler`, `logger.injectLambdaContext`, `metrics.logMetrics`) expect an async function, but `serverless-http` returns a callback-based handler.

### Solution Applied

#### 1. Async Handler Wrapper
Created an async wrapper function that properly handles the serverless-http response:

```javascript
// Create async wrapper for PowerTools integration
const asyncHandler = async (event, context) => {
  // PowerTools context setup
  logger.addContext({
    requestId: context.awsRequestId,
    functionName: context.functionName
  });

  try {
    // Call the serverless handler
    const result = await serverlessHandler(event, context);
    return result;
  } catch (error) {
    // Proper error handling
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
```

#### 2. PowerTools Integration
Applied PowerTools decorators to the async wrapper:

```javascript
module.exports.handler = tracer.captureLambdaHandler(
  logger.injectLambdaContext(
    metrics.logMetrics(asyncHandler)
  )
);
```

#### 3. Environment Variable
Added environment variable to suppress the callback warning:

```hcl
AWS_LAMBDA_NODEJS_DISABLE_CALLBACK_WARNING = "1"
```

## Testing the Fix

### Local Testing
Run the test script to verify the handler works:

```bash
cd src/express-api/
node test-handler.js
```

Expected output:
```
Testing Lambda handler...
Handler result: {
  statusCode: 200,
  headers: { ... },
  body: { message: 'Sparks API is running!' }
}
✅ Handler test passed!
```

### Lambda Testing
Test the deployed Lambda function:

```bash
# Test via AWS CLI
aws lambda invoke \
  --function-name sparks-express-api \
  --payload '{"httpMethod":"GET","path":"/","headers":{},"body":null}' \
  response.json

# Check the response
cat response.json
```

## Common Issues and Solutions

### 1. Handler Still Returns Null

**Symptoms:**
- Lambda returns null or undefined
- No error logs in CloudWatch

**Solutions:**
- Ensure the async wrapper properly awaits the serverless handler
- Check that the Express app is properly exported
- Verify middleware order (PowerTools middleware should be early)

### 2. PowerTools Not Working

**Symptoms:**
- No traces in X-Ray
- No custom metrics in CloudWatch
- Missing structured logs

**Solutions:**
- Verify PowerTools environment variables are set
- Check Lambda execution role has X-Ray and CloudWatch permissions
- Ensure PowerTools decorators are applied in correct order

### 3. User Context Errors

**Symptoms:**
- Errors in user context middleware
- Missing user data in logs

**Solutions:**
- Ensure user context middleware handles null/undefined user objects
- Check that authentication middleware runs before user context middleware
- Verify Cognito JWT verification is working

### 4. CORS Issues

**Symptoms:**
- CORS errors in browser
- OPTIONS requests failing

**Solutions:**
- Ensure CORS headers are set in error responses
- Check that OPTIONS method is handled
- Verify CORS configuration matches frontend domain

## Debugging Steps

### 1. Check Lambda Logs
```bash
# View recent logs
aws logs filter-log-events \
  --log-group-name "/aws/lambda/sparks-express-api" \
  --start-time $(date -d '1 hour ago' +%s)000

# Follow logs in real-time
aws logs tail "/aws/lambda/sparks-express-api" --follow
```

### 2. Test Individual Components

#### Test Express App Locally
```bash
cd src/express-api/
npm run dev
curl http://localhost:3000/
```

#### Test Serverless Handler
```javascript
const serverless = require('serverless-http');
const app = require('./index').app;
const handler = serverless(app);

// Test the handler
handler(mockEvent, mockContext, (err, result) => {
  console.log('Result:', result);
});
```

### 3. Verify Environment Variables
```bash
# Check Lambda configuration
aws lambda get-function-configuration \
  --function-name sparks-express-api \
  --query 'Environment.Variables'
```

### 4. Check PowerTools Setup
```javascript
// Add debug logging to verify PowerTools initialization
console.log('Logger initialized:', !!logger);
console.log('Tracer initialized:', !!tracer);
console.log('Metrics initialized:', !!metrics);
```

## Best Practices

### 1. Error Handling
- Always wrap async operations in try-catch
- Return proper HTTP status codes
- Include CORS headers in error responses
- Log errors with context

### 2. PowerTools Usage
- Apply decorators in correct order: tracer → logger → metrics
- Use async handlers for PowerTools compatibility
- Set appropriate service names and namespaces
- Include user context in all traces and logs

### 3. Performance
- Minimize cold start time
- Use connection pooling for databases
- Cache frequently accessed data
- Monitor memory usage and timeout settings

### 4. Monitoring
- Set up CloudWatch alarms for errors and performance
- Use structured logging for better searchability
- Include correlation IDs in all logs
- Monitor business metrics alongside technical metrics

## Validation Checklist

After applying fixes, verify:

- [ ] Lambda handler returns proper HTTP responses
- [ ] No callback warnings in logs
- [ ] PowerTools traces appear in X-Ray
- [ ] Custom metrics appear in CloudWatch
- [ ] Structured logs include user context
- [ ] Error handling works correctly
- [ ] CORS headers are present
- [ ] Authentication flow works
- [ ] Business metrics are being tracked

## Emergency Rollback

If issues persist, quickly rollback:

```bash
# Revert to simple handler without PowerTools
module.exports.handler = serverless(app);
```

Then redeploy:
```bash
cd terraform/
terraform apply
```

## Support Resources

- [AWS Lambda Node.js Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [PowerTools for AWS Lambda](https://docs.powertools.aws.dev/lambda/typescript/latest/)
- [Serverless HTTP](https://github.com/dougmoscrop/serverless-http)
- [Express.js Documentation](https://expressjs.com/)

This troubleshooting guide should help resolve the Lambda handler issues and ensure proper PowerTools integration.
