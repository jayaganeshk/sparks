# PowerTools Step-by-Step Integration Guide

This guide shows how to add PowerTools back to the Express API in a controlled manner to avoid the issues we encountered.

## Issue Analysis

The problem was with PowerTools Tracer initialization. The error `Cannot read properties of undefined (reading 'value')` occurred because:

1. PowerTools Tracer expects certain environment variables to be set
2. The tracer was being initialized before the Lambda context was available
3. Some PowerTools decorators were conflicting with the serverless-http wrapper

## Step-by-Step Integration

### Step 1: Working Base (✅ COMPLETED)

Current `index.js` is working without PowerTools:
- Basic Express app with routes
- Serverless-http wrapper
- Async handler for Lambda
- Proper error handling and CORS

### Step 2: Add Logger Only

```javascript
// Add to index.js
const { Logger } = require('@aws-lambda-powertools/logger');

const logger = new Logger({
  serviceName: 'sparks-express-api',
  logLevel: 'INFO'
});

// Replace console.log with logger
app.use((req, res, next) => {
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
  next();
});
```

### Step 3: Add Metrics Only

```javascript
// Add to index.js
const { Metrics, MetricUnit } = require('@aws-lambda-powertools/metrics');

const metrics = new Metrics({
  namespace: 'Sparks/API',
  serviceName: 'sparks-express-api'
});

// Add metrics to routes
app.use((req, res, next) => {
  metrics.addMetric('RequestCount', MetricUnit.Count, 1);
  next();
});
```

### Step 4: Add Tracer (Carefully)

```javascript
// Add to index.js - ONLY in Lambda environment
let tracer = null;

if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const { Tracer } = require('@aws-lambda-powertools/tracer');
  tracer = new Tracer({
    serviceName: 'sparks-express-api'
  });
}

// Use tracer conditionally
if (tracer) {
  tracer.addMetadata('request', { ... });
}
```

### Step 5: Apply Decorators (Final Step)

```javascript
// Only apply decorators in Lambda environment
if (process.env.AWS_LAMBDA_FUNCTION_NAME && tracer) {
  module.exports.handler = tracer.captureLambdaHandler(
    logger.injectLambdaContext(
      metrics.logMetrics(asyncHandler)
    )
  );
} else {
  module.exports.handler = asyncHandler;
}
```

## Current Status

✅ **Working**: Basic Express API with all routes
❌ **Not Working**: PowerTools integration (causes initialization errors)

## Next Steps

1. **Deploy the working version** to get the API functional again
2. **Add PowerTools incrementally** following the steps above
3. **Test each step** before proceeding to the next
4. **Monitor CloudWatch logs** for any initialization errors

## Environment Variables Required

For PowerTools to work properly, ensure these are set:

```bash
POWERTOOLS_SERVICE_NAME=sparks-express-api
POWERTOOLS_LOG_LEVEL=INFO
POWERTOOLS_METRICS_NAMESPACE=Sparks/API
AWS_REGION=us-east-1
_X_AMZN_TRACE_ID=""
AWS_LAMBDA_NODEJS_DISABLE_CALLBACK_WARNING=1
```

## Testing Commands

```bash
# Test locally
cd src/express-api/
node test-handler.js

# Test deployed Lambda
aws lambda invoke \
  --function-name sparks-express-api \
  --payload '{"httpMethod":"GET","path":"/","headers":{},"body":null}' \
  response.json && cat response.json
```

## Rollback Plan

If PowerTools integration fails again:

1. Revert to the working `index.js` (current version)
2. Deploy immediately to restore API functionality
3. Debug PowerTools issues in a separate branch

## Key Learnings

1. **PowerTools initialization is sensitive** to environment and context
2. **Tracer requires specific Lambda environment** to work properly
3. **Decorators should be applied conditionally** based on environment
4. **Test each PowerTools component separately** before combining
5. **Always have a working fallback** without PowerTools

This approach ensures we maintain API functionality while gradually adding monitoring capabilities.
