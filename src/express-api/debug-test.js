#!/usr/bin/env node

// Comprehensive test script to debug API issues
const path = require('path');

console.log('🔍 Starting API Debug Test');
console.log('========================');

// Test 1: Check if basic modules can be imported
console.log('\n1️⃣ Testing module imports...');
try {
  const express = require('express');
  const serverless = require('serverless-http');
  console.log('✅ Express and serverless-http imported successfully');
} catch (error) {
  console.error('❌ Basic module import failed:', error);
  process.exit(1);
}

// Test 2: Check PowerTools imports
console.log('\n2️⃣ Testing PowerTools imports...');
try {
  const { Logger } = require('@aws-lambda-powertools/logger');
  const { Tracer } = require('@aws-lambda-powertools/tracer');
  const { Metrics } = require('@aws-lambda-powertools/metrics');
  console.log('✅ PowerTools imported successfully');
} catch (error) {
  console.error('❌ PowerTools import failed:', error);
  console.log('💡 Try running: npm install @aws-lambda-powertools/logger @aws-lambda-powertools/tracer @aws-lambda-powertools/metrics');
}

// Test 3: Test simple Express app
console.log('\n3️⃣ Testing simple Express app...');
try {
  const express = require('express');
  const app = express();
  
  app.get('/', (req, res) => {
    res.json({ message: 'Simple Express test' });
  });
  
  console.log('✅ Simple Express app created successfully');
} catch (error) {
  console.error('❌ Simple Express app failed:', error);
}

// Test 4: Test serverless-http wrapper
console.log('\n4️⃣ Testing serverless-http wrapper...');
try {
  const express = require('express');
  const serverless = require('serverless-http');
  
  const app = express();
  app.get('/', (req, res) => {
    res.json({ message: 'Serverless test' });
  });
  
  const handler = serverless(app);
  console.log('✅ Serverless wrapper created successfully');
  
  // Test the handler with mock event
  const mockEvent = {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    body: null,
    requestContext: {
      requestId: 'test-123',
      stage: 'test'
    }
  };
  
  const mockContext = {
    awsRequestId: 'test-123',
    functionName: 'test-function',
    functionVersion: '1',
    memoryLimitInMB: 512,
    getRemainingTimeInMillis: () => 30000
  };
  
  console.log('🧪 Testing serverless handler...');
  handler(mockEvent, mockContext, (err, result) => {
    if (err) {
      console.error('❌ Serverless handler callback error:', err);
    } else {
      console.log('✅ Serverless handler callback success:', {
        statusCode: result.statusCode,
        hasBody: !!result.body
      });
    }
  });
  
} catch (error) {
  console.error('❌ Serverless wrapper failed:', error);
}

// Test 5: Test async wrapper
console.log('\n5️⃣ Testing async wrapper...');
try {
  const express = require('express');
  const serverless = require('serverless-http');
  
  const app = express();
  app.get('/', (req, res) => {
    res.json({ message: 'Async wrapper test' });
  });
  
  const serverlessHandler = serverless(app);
  
  const asyncHandler = async (event, context) => {
    console.log('📞 Async handler called');
    try {
      const result = await serverlessHandler(event, context);
      console.log('✅ Async handler result:', {
        statusCode: result.statusCode,
        hasBody: !!result.body
      });
      return result;
    } catch (error) {
      console.error('❌ Async handler error:', error);
      throw error;
    }
  };
  
  // Test async handler
  const mockEvent = {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    body: null,
    requestContext: {
      requestId: 'test-async-123',
      stage: 'test'
    }
  };
  
  const mockContext = {
    awsRequestId: 'test-async-123',
    functionName: 'test-function',
    functionVersion: '1',
    memoryLimitInMB: 512,
    getRemainingTimeInMillis: () => 30000
  };
  
  asyncHandler(mockEvent, mockContext)
    .then(result => {
      console.log('✅ Async wrapper test passed:', {
        statusCode: result.statusCode,
        body: result.body ? JSON.parse(result.body) : null
      });
    })
    .catch(error => {
      console.error('❌ Async wrapper test failed:', error);
    });
    
} catch (error) {
  console.error('❌ Async wrapper setup failed:', error);
}

// Test 6: Test PowerTools decorators
console.log('\n6️⃣ Testing PowerTools decorators...');
try {
  const { Logger } = require('@aws-lambda-powertools/logger');
  const { Tracer } = require('@aws-lambda-powertools/tracer');
  const { Metrics } = require('@aws-lambda-powertools/metrics');
  
  const logger = new Logger({ serviceName: 'test' });
  const tracer = new Tracer({ serviceName: 'test' });
  const metrics = new Metrics({ namespace: 'Test', serviceName: 'test' });
  
  const testHandler = async (event, context) => {
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'PowerTools test' })
    };
  };
  
  const decoratedHandler = tracer.captureLambdaHandler(
    logger.injectLambdaContext(
      metrics.logMetrics(testHandler)
    )
  );
  
  console.log('✅ PowerTools decorators applied successfully');
  
  // Test decorated handler
  const mockEvent = {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    body: null,
    requestContext: {
      requestId: 'test-powertools-123',
      stage: 'test'
    }
  };
  
  const mockContext = {
    awsRequestId: 'test-powertools-123',
    functionName: 'test-function',
    functionVersion: '1',
    memoryLimitInMB: 512,
    getRemainingTimeInMillis: () => 30000,
    callbackWaitsForEmptyEventLoop: false
  };
  
  decoratedHandler(mockEvent, mockContext)
    .then(result => {
      console.log('✅ PowerTools decorators test passed:', {
        statusCode: result.statusCode,
        body: result.body ? JSON.parse(result.body) : null
      });
    })
    .catch(error => {
      console.error('❌ PowerTools decorators test failed:', error);
    });
    
} catch (error) {
  console.error('❌ PowerTools decorators setup failed:', error);
}

// Test 7: Test current handler
console.log('\n7️⃣ Testing current handler...');
try {
  // Try to import the current handler
  const currentHandler = require('./index').handler;
  
  if (!currentHandler) {
    console.error('❌ Current handler is undefined');
  } else {
    console.log('✅ Current handler imported successfully');
    
    const mockEvent = {
      httpMethod: 'GET',
      path: '/',
      headers: {},
      body: null,
      requestContext: {
        requestId: 'test-current-123',
        stage: 'test'
      }
    };
    
    const mockContext = {
      awsRequestId: 'test-current-123',
      functionName: 'test-function',
      functionVersion: '1',
      memoryLimitInMB: 512,
      getRemainingTimeInMillis: () => 30000,
      callbackWaitsForEmptyEventLoop: false
    };
    
    console.log('🧪 Testing current handler...');
    currentHandler(mockEvent, mockContext)
      .then(result => {
        console.log('✅ Current handler test passed:', {
          statusCode: result.statusCode,
          hasBody: !!result.body,
          body: result.body ? JSON.parse(result.body) : null
        });
      })
      .catch(error => {
        console.error('❌ Current handler test failed:', error);
        console.error('Stack trace:', error.stack);
      });
  }
} catch (error) {
  console.error('❌ Current handler import failed:', error);
  console.error('Stack trace:', error.stack);
}

console.log('\n🏁 Debug test completed');
console.log('========================');

// Keep the process alive for async operations
setTimeout(() => {
  console.log('\n⏰ Test timeout reached, exiting...');
  process.exit(0);
}, 5000);
