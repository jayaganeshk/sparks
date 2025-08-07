// Test script to verify the Lambda handler works correctly
const { handler } = require('./index');

// Mock Lambda event for API Gateway
const mockEvent = {
  httpMethod: 'GET',
  path: '/',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'test-agent'
  },
  queryStringParameters: null,
  body: null,
  requestContext: {
    requestId: 'test-request-id',
    stage: 'test',
    identity: {
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent'
    }
  }
};

// Mock Lambda context
const mockContext = {
  awsRequestId: 'test-request-id',
  functionName: 'test-function',
  functionVersion: '1',
  memoryLimitInMB: 512,
  getRemainingTimeInMillis: () => 30000,
  callbackWaitsForEmptyEventLoop: false
};

async function testHandler() {
  console.log('Testing Lambda handler...');
  
  try {
    const result = await handler(mockEvent, mockContext);
    
    console.log('Handler result:', {
      statusCode: result.statusCode,
      headers: result.headers,
      body: JSON.parse(result.body)
    });
    
    if (result.statusCode === 200) {
      console.log('✅ Handler test passed!');
    } else {
      console.log('❌ Handler test failed with status:', result.statusCode);
    }
  } catch (error) {
    console.error('❌ Handler test failed with error:', error);
  }
}

// Run the test
testHandler();
