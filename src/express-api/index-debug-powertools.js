const express = require('express');
const cors = require('cors');
const serverless = require('serverless-http');
require("dotenv").config();

// Step 1: Try importing PowerTools (this might be the issue)
let logger, tracer, metrics;
try {
  const { Logger } = require('@aws-lambda-powertools/logger');
  const { Tracer } = require('@aws-lambda-powertools/tracer');
  const { Metrics } = require('@aws-lambda-powertools/metrics');

  logger = new Logger({
    serviceName: 'sparks-express-api-debug',
    logLevel: 'INFO'
  });

  tracer = new Tracer({
    serviceName: 'sparks-express-api-debug'
  });

  metrics = new Metrics({
    namespace: 'Sparks/API/Debug',
    serviceName: 'sparks-express-api-debug'
  });

  console.log('✅ PowerTools imported successfully');
} catch (error) {
  console.error('❌ PowerTools import failed:', error);
  // Fallback to console logging
  logger = {
    info: console.log,
    error: console.error,
    addContext: () => {},
    injectLambdaContext: (handler) => handler
  };
  tracer = {
    addMetadata: () => {},
    addErrorAsMetadata: () => {},
    captureLambdaHandler: (handler) => handler
  };
  metrics = {
    addMetric: () => {},
    logMetrics: (handler) => handler
  };
}

const app = express();

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS || 'https://yourdomain.com'
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  credentials: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`📝 Request: ${req.method} ${req.path}`);
  logger.info('Request received', {
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check route
app.get('/', (req, res) => {
  console.log('🏥 Health check endpoint hit');
  logger.info('Health check accessed');
  
  res.json({ 
    message: 'Sparks API is running with PowerTools debug!',
    timestamp: new Date().toISOString(),
    version: '1.0.0-powertools-debug',
    powertools: {
      logger: !!logger,
      tracer: !!tracer,
      metrics: !!metrics
    }
  });
});

// Test route
app.get('/test', (req, res) => {
  console.log('🧪 Test endpoint hit');
  logger.info('Test endpoint accessed');
  
  try {
    // Test PowerTools functionality
    tracer.addMetadata('test_metadata', {
      endpoint: '/test',
      timestamp: new Date().toISOString()
    });
    
    metrics.addMetric('TestEndpointHits', 'Count', 1);
    
    res.json({ 
      message: 'Test endpoint working with PowerTools',
      timestamp: new Date().toISOString(),
      powertools_test: 'success'
    });
  } catch (error) {
    console.error('❌ PowerTools test failed:', error);
    res.json({ 
      message: 'Test endpoint working but PowerTools failed',
      timestamp: new Date().toISOString(),
      powertools_test: 'failed',
      error: error.message
    });
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  logger.error('Request error', {
    error: err.message,
    stack: err.stack
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Export the app for local development
module.exports.app = app;

// Step 2: Create serverless handler
console.log('🔧 Creating serverless handler...');
const serverlessHandler = serverless(app);

// Step 3: Create async wrapper (this might be the issue)
const asyncHandler = async (event, context) => {
  console.log('🚀 Async handler called');
  console.log('📦 Event:', JSON.stringify(event, null, 2));
  console.log('🏗️ Context:', {
    requestId: context.awsRequestId,
    functionName: context.functionName
  });

  try {
    // Add context to logger
    logger.addContext({
      requestId: context.awsRequestId,
      functionName: context.functionName
    });

    // Add metadata to tracer
    tracer.addMetadata('lambda_event', {
      requestId: context.awsRequestId,
      httpMethod: event.httpMethod,
      path: event.path
    });

    console.log('📞 Calling serverless handler...');
    const result = await serverlessHandler(event, context);
    
    console.log('✅ Handler result:', {
      statusCode: result.statusCode,
      hasBody: !!result.body,
      bodyLength: result.body ? result.body.length : 0
    });

    return result;
  } catch (error) {
    console.error('❌ Async handler error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// Step 4: Apply PowerTools decorators (this might be the issue)
console.log('🎯 Applying PowerTools decorators...');
try {
  const decoratedHandler = tracer.captureLambdaHandler(
    logger.injectLambdaContext(
      metrics.logMetrics(asyncHandler)
    )
  );
  
  console.log('✅ PowerTools decorators applied successfully');
  module.exports.handler = decoratedHandler;
} catch (error) {
  console.error('❌ PowerTools decorators failed:', error);
  // Fallback to simple async handler
  module.exports.handler = asyncHandler;
}

console.log('🎉 Handler setup complete');
