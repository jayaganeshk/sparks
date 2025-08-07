const { Logger } = require('@aws-lambda-powertools/logger');
const { Tracer } = require('@aws-lambda-powertools/tracer');
const { Metrics, MetricUnit } = require('@aws-lambda-powertools/metrics');

// Initialize PowerTools instances with proper configuration
const logger = new Logger({
  serviceName: process.env.POWERTOOLS_SERVICE_NAME || 'sparks-express-api',
  logLevel: process.env.POWERTOOLS_LOG_LEVEL || process.env.LOG_LEVEL || 'INFO',
  persistentLogAttributes: {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.API_VERSION || '1.0.0',
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
  }
});

// Initialize tracer with proper configuration to avoid the undefined error
const tracer = new Tracer({
  serviceName: process.env.POWERTOOLS_SERVICE_NAME || 'sparks-express-api',
  captureHTTPsRequests: process.env.POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS !== 'false',
  captureResponse: process.env.POWERTOOLS_TRACER_CAPTURE_RESPONSE !== 'false',
  captureError: process.env.POWERTOOLS_TRACER_CAPTURE_ERROR !== 'false'
});

const metrics = new Metrics({
  namespace: process.env.POWERTOOLS_METRICS_NAMESPACE || 'Sparks/API',
  serviceName: process.env.POWERTOOLS_SERVICE_NAME || 'sparks-express-api',
  defaultDimensions: {
    environment: process.env.NODE_ENV || 'development',
    service: 'express-api'
  }
});

// Enhanced middleware for request tracing and logging with user context
const requestTracingMiddleware = (req, res, next) => {
  const segment = tracer.getSegment();
  const subsegment = segment?.addNewSubsegment(`${req.method} ${req.path}`);
  
  // Add request metadata to tracer
  tracer.addMetadata('request', {
    method: req.method,
    path: req.path,
    query: req.query,
    headers: {
      'user-agent': req.get('User-Agent'),
      'content-type': req.get('Content-Type'),
      'authorization': req.get('Authorization') ? 'Bearer [REDACTED]' : undefined
    },
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Add request info to logger context
  logger.addContext({
    requestId: req.get('x-request-id') || req.get('x-amzn-requestid'),
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent')
  });

  // Add metrics
  metrics.addMetric('RequestCount', MetricUnit.Count, 1);
  metrics.addMetric(`${req.method}RequestCount`, MetricUnit.Count, 1);

  // Store start time for response time calculation
  req.startTime = Date.now();

  // Override res.json to capture response with user context
  const originalJson = res.json;
  res.json = function(data) {
    const responseTime = Date.now() - req.startTime;
    
    // Add response metadata to tracer
    tracer.addMetadata('response', {
      statusCode: res.statusCode,
      responseTime: responseTime,
      timestamp: new Date().toISOString()
    });

    // Enhanced response logging with user context
    const logContext = {
      statusCode: res.statusCode,
      responseTime: responseTime,
      method: req.method,
      path: req.path
    };

    // Add user context to response log if available
    if (req.userContext) {
      logContext.userId = req.userContext.userId;
      logContext.userType = req.userContext.userType;
      logContext.userEmail = req.userContext.email;
      logContext.emailVerified = req.userContext.emailVerified;
    }

    logger.info('Request completed', logContext);

    // Add response metrics with user context
    metrics.addMetric('ResponseTime', MetricUnit.Milliseconds, responseTime);
    metrics.addMetric(`Status${res.statusCode}Count`, MetricUnit.Count, 1);
    
    // Enhanced error metrics with user context
    if (res.statusCode >= 400) {
      metrics.addMetric('ErrorCount', MetricUnit.Count, 1);
      
      if (req.userContext) {
        metrics.addMetric('UserErrorCount', MetricUnit.Count, 1, {
          userType: req.userContext.userType,
          statusCode: res.statusCode.toString()
        });
      }
    }

    // Business metrics based on user context
    if (req.userContext && req.userContext.isAuthenticated) {
      metrics.addMetric('AuthenticatedResponseTime', MetricUnit.Milliseconds, responseTime, {
        userType: req.userContext.userType
      });
    }

    // Close subsegment
    if (subsegment) {
      subsegment.close();
    }

    return originalJson.call(this, data);
  };

  next();
};

// Enhanced error handling middleware with user context
const errorTracingMiddleware = (err, req, res, next) => {
  // Capture error in tracer
  tracer.addErrorAsMetadata(err);
  
  // Enhanced error logging with user context
  const errorContext = {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode || 500
  };

  // Add user context to error log if available
  if (req.userContext) {
    errorContext.userId = req.userContext.userId;
    errorContext.userType = req.userContext.userType;
    errorContext.userEmail = req.userContext.email;
    errorContext.emailVerified = req.userContext.emailVerified;
    errorContext.groups = req.userContext.groups;
  }

  logger.error('Request error', errorContext);

  // Add error metrics with user context
  metrics.addMetric('ErrorCount', MetricUnit.Count, 1);
  metrics.addMetric(`Error${err.statusCode || 500}Count`, MetricUnit.Count, 1);

  // User-specific error metrics
  if (req.userContext && req.userContext.isAuthenticated) {
    metrics.addMetric('UserErrorCount', MetricUnit.Count, 1, {
      userType: req.userContext.userType,
      errorType: err.name || 'UnknownError'
    });
  }

  next(err);
};

// Enhanced utility function to create route-specific subsegments with user context
const createRouteSegment = (routeName, operation, userContext = null) => {
  const segment = tracer.getSegment();
  const subsegment = segment?.addNewSubsegment(`${routeName}:${operation}`);
  
  const metadata = {
    name: routeName,
    operation: operation,
    timestamp: new Date().toISOString()
  };

  // Add user context to route segment metadata if available
  if (userContext) {
    metadata.userId = userContext.userId;
    metadata.userType = userContext.userType;
    metadata.userEmail = userContext.email;
    metadata.emailVerified = userContext.emailVerified;
    metadata.groups = userContext.groups;
  }

  tracer.addMetadata('route', metadata);

  return subsegment;
};

// Enhanced utility function to add custom metrics with user context
const addCustomMetric = (metricName, value, unit = MetricUnit.Count, dimensions = {}) => {
  Object.entries(dimensions).forEach(([key, value]) => {
    metrics.addDimension(key, value);
  });
  
  metrics.addMetric(metricName, unit, value);
};

// Business metrics helper functions
const trackBusinessMetric = (metricName, value, userContext, additionalDimensions = {}) => {
  const dimensions = {
    userType: userContext?.userType || 'anonymous',
    emailVerified: userContext?.emailVerified?.toString() || 'false',
    ...additionalDimensions
  };

  addCustomMetric(metricName, value, MetricUnit.Count, dimensions);
};

const trackUserActivity = (activity, userContext, metadata = {}) => {
  // Log user activity
  logger.info(`User activity: ${activity}`, {
    userId: userContext?.userId,
    userType: userContext?.userType,
    userEmail: userContext?.email,
    activity: activity,
    ...metadata
  });

  // Add activity to tracer
  tracer.addMetadata('user_activity', {
    activity: activity,
    userId: userContext?.userId,
    userType: userContext?.userType,
    timestamp: new Date().toISOString(),
    ...metadata
  });

  // Track activity metrics
  trackBusinessMetric(`${activity}Activity`, 1, userContext);
  
  // Track by user type
  if (userContext?.userType) {
    trackBusinessMetric(`${userContext.userType}UserActivity`, 1, userContext, {
      activity: activity
    });
  }
};

const trackFeatureUsage = (feature, userContext, usage = 1) => {
  logger.info(`Feature usage: ${feature}`, {
    userId: userContext?.userId,
    userType: userContext?.userType,
    feature: feature,
    usage: usage
  });

  trackBusinessMetric(`${feature}FeatureUsage`, usage, userContext);
  
  // Track feature adoption by user type
  if (userContext?.userType) {
    trackBusinessMetric('FeatureAdoption', 1, userContext, {
      feature: feature,
      userType: userContext.userType
    });
  }
};

const trackContentInteraction = (contentType, action, userContext, contentMetadata = {}) => {
  logger.info(`Content interaction: ${action} on ${contentType}`, {
    userId: userContext?.userId,
    userType: userContext?.userType,
    contentType: contentType,
    action: action,
    ...contentMetadata
  });

  tracer.addMetadata('content_interaction', {
    contentType: contentType,
    action: action,
    userId: userContext?.userId,
    userType: userContext?.userType,
    timestamp: new Date().toISOString(),
    ...contentMetadata
  });

  trackBusinessMetric(`${contentType}${action}`, 1, userContext);
  trackBusinessMetric('ContentInteractions', 1, userContext, {
    contentType: contentType,
    action: action
  });
};

module.exports = {
  logger,
  tracer,
  metrics,
  requestTracingMiddleware,
  errorTracingMiddleware,
  createRouteSegment,
  addCustomMetric,
  MetricUnit,
  // Enhanced functions with user context
  trackBusinessMetric,
  trackUserActivity,
  trackFeatureUsage,
  trackContentInteraction
};
