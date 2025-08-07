/**
 * Structured JSON logging middleware
 * Captures request/response details and user information for each API request
 */

const logger = (req, res, next) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Store the original end function
  const originalEnd = res.end;
  
  // Override the end function to capture response details
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - start;
    
    // Create structured log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId: requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      route: req.route?.path || 'unknown',
      statusCode: res.statusCode,
      responseTime: responseTime,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.connection.remoteAddress,
      event: {
        type: 'api_request',
        service: 'sparks-api',
        resource: req.path || '/'
      },
      user: req.user ? {
        sub: req.user.sub || 'unknown',
        email: req.user.email || 'unknown',
        username: req.user['cognito:username'] || 'unknown'
      } : {
        authenticated: false
      }
    };

    // Log as JSON string for easy parsing by log analytics tools
    console.log(JSON.stringify(logEntry));

    // Call the original end function
    return originalEnd.apply(this, arguments);
  };

  next();
};

/**
 * Generate a unique request ID if one is not provided
 */
function generateRequestId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

module.exports = logger;
