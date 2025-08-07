const { logger, tracer, addCustomMetric, MetricUnit } = require('./powertools');

/**
 * Extract comprehensive user context from Cognito JWT payload
 * @param {Object} cognitoPayload - The verified Cognito JWT payload
 * @returns {Object} Enhanced user context object
 */
function extractUserContext(cognitoPayload) {
  if (!cognitoPayload) {
    return {
      userId: 'anonymous',
      email: 'anonymous',
      userType: 'anonymous',
      isAuthenticated: false,
      emailVerified: false,
      groups: [],
      roles: [],
      accountAge: null,
      sessionDuration: null
    };
  }

  // Extract standard Cognito claims
  const userContext = {
    // Core identifiers
    userId: cognitoPayload.sub || 'unknown',
    email: cognitoPayload.email || cognitoPayload['cognito:username'] || 'unknown',
    username: cognitoPayload['cognito:username'] || cognitoPayload.email || 'unknown',
    
    // User attributes
    name: cognitoPayload.name || cognitoPayload.given_name || cognitoPayload.family_name || null,
    givenName: cognitoPayload.given_name || null,
    familyName: cognitoPayload.family_name || null,
    preferredUsername: cognitoPayload.preferred_username || null,
    
    // Account status
    emailVerified: cognitoPayload.email_verified === true || cognitoPayload.email_verified === 'true',
    phoneNumber: cognitoPayload.phone_number || null,
    phoneVerified: cognitoPayload.phone_number_verified === true || cognitoPayload.phone_number_verified === 'true',
    
    // Groups and roles
    groups: cognitoPayload['cognito:groups'] || [],
    roles: cognitoPayload['cognito:roles'] || [],
    
    // Session information
    tokenUse: cognitoPayload.token_use || 'id',
    authTime: cognitoPayload.auth_time ? new Date(cognitoPayload.auth_time * 1000).toISOString() : null,
    issuedAt: cognitoPayload.iat ? new Date(cognitoPayload.iat * 1000).toISOString() : null,
    expiresAt: cognitoPayload.exp ? new Date(cognitoPayload.exp * 1000).toISOString() : null,
    
    // Client information
    clientId: cognitoPayload.aud || cognitoPayload.client_id || null,
    issuer: cognitoPayload.iss || null,
    
    // Custom attributes (if any)
    customAttributes: extractCustomAttributes(cognitoPayload),
    
    // Derived properties
    userType: determineUserType(cognitoPayload),
    accountAge: calculateAccountAge(cognitoPayload),
    sessionDuration: calculateSessionDuration(cognitoPayload),
    isAuthenticated: true
  };

  return userContext;
}

/**
 * Extract custom attributes from Cognito payload
 */
function extractCustomAttributes(payload) {
  const customAttrs = {};
  
  Object.keys(payload).forEach(key => {
    if (key.startsWith('custom:')) {
      const attrName = key.replace('custom:', '');
      customAttrs[attrName] = payload[key];
    }
  });
  
  return customAttrs;
}

/**
 * Determine user type based on groups and attributes
 */
function determineUserType(payload) {
  const groups = payload['cognito:groups'] || [];
  
  if (groups.includes('admin') || groups.includes('administrators')) {
    return 'admin';
  }
  if (groups.includes('premium') || groups.includes('pro')) {
    return 'premium';
  }
  if (groups.includes('beta') || groups.includes('tester')) {
    return 'beta';
  }
  
  const customAttrs = extractCustomAttributes(payload);
  if (customAttrs.userType) {
    return customAttrs.userType;
  }
  
  return 'standard';
}

/**
 * Calculate account age based on auth_time or custom attributes
 */
function calculateAccountAge(payload) {
  const customAttrs = extractCustomAttributes(payload);
  if (customAttrs.accountCreated) {
    const createdDate = new Date(customAttrs.accountCreated);
    const now = new Date();
    return Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  }
  
  if (payload.auth_time) {
    const authDate = new Date(payload.auth_time * 1000);
    const now = new Date();
    return Math.floor((now - authDate) / (1000 * 60 * 60 * 24));
  }
  
  return null;
}

/**
 * Calculate current session duration
 */
function calculateSessionDuration(payload) {
  if (payload.auth_time && payload.iat) {
    const authTime = payload.auth_time * 1000;
    const issuedTime = payload.iat * 1000;
    return Math.floor((issuedTime - authTime) / (1000 * 60));
  }
  return null;
}

/**
 * Add user context to PowerTools logger and tracer
 */
function addUserContextToMonitoring(userContext, operation) {
  // Add to logger context
  logger.addContext({
    userId: userContext.userId,
    userEmail: userContext.email,
    userType: userContext.userType,
    isAuthenticated: userContext.isAuthenticated,
    emailVerified: userContext.emailVerified,
    groups: userContext.groups,
    operation: operation
  });

  // Add to tracer metadata
  tracer.addMetadata('user_context', {
    userId: userContext.userId,
    email: userContext.email,
    username: userContext.username,
    userType: userContext.userType,
    groups: userContext.groups,
    roles: userContext.roles,
    emailVerified: userContext.emailVerified,
    phoneVerified: userContext.phoneVerified,
    accountAge: userContext.accountAge,
    sessionDuration: userContext.sessionDuration,
    clientId: userContext.clientId,
    authTime: userContext.authTime,
    operation: operation
  });

  // Add user-based metrics only for authenticated users
  if (userContext.isAuthenticated) {
    addCustomMetric('AuthenticatedRequests', 1, MetricUnit.Count, {
      userType: userContext.userType,
      emailVerified: userContext.emailVerified.toString()
    });

    // Track user type distribution
    addCustomMetric(`${userContext.userType}UserRequests`, 1, MetricUnit.Count);

    // Track verification status
    if (userContext.emailVerified) {
      addCustomMetric('VerifiedUserRequests', 1, MetricUnit.Count);
    } else {
      addCustomMetric('UnverifiedUserRequests', 1, MetricUnit.Count);
    }

    // Track group membership
    userContext.groups.forEach(group => {
      addCustomMetric(`${group}GroupRequests`, 1, MetricUnit.Count);
    });

    // Track account age cohorts
    if (userContext.accountAge !== null) {
      const ageGroup = getAgeGroup(userContext.accountAge);
      addCustomMetric(`${ageGroup}AccountRequests`, 1, MetricUnit.Count);
    }
  } else {
    // Track anonymous requests
    addCustomMetric('AnonymousRequests', 1, MetricUnit.Count);
  }
}

/**
 * Categorize account age into groups for metrics
 */
function getAgeGroup(ageInDays) {
  if (ageInDays <= 7) return 'NewUser';
  if (ageInDays <= 30) return 'RecentUser';
  if (ageInDays <= 90) return 'RegularUser';
  if (ageInDays <= 365) return 'EstablishedUser';
  return 'VeteranUser';
}

/**
 * Enhanced middleware that adds user context to all monitoring
 */
function enhancedUserContextMiddleware(req, res, next) {
  try {
    // Extract user context from Cognito payload (may be null for unauthenticated requests)
    const userContext = extractUserContext(req.user);
    
    // Store enhanced context in request
    req.userContext = userContext;
    
    // Add to monitoring (operation will be set by individual routes)
    addUserContextToMonitoring(userContext, 'request_start');
    
    // Log user activity
    logger.info('User request initiated', {
      userId: userContext.userId,
      userEmail: userContext.email,
      userType: userContext.userType,
      isAuthenticated: userContext.isAuthenticated,
      path: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    next();
  } catch (error) {
    logger.error('Error processing user context', {
      error: error.message,
      stack: error.stack,
      hasUser: !!req.user,
      path: req.path,
      method: req.method
    });
    
    // Set anonymous context on error
    req.userContext = extractUserContext(null);
    
    // Add error metric
    addCustomMetric('UserContextErrors', 1, MetricUnit.Count);
    
    next();
  }
}

module.exports = {
  extractUserContext,
  addUserContextToMonitoring,
  enhancedUserContextMiddleware,
  extractCustomAttributes,
  determineUserType,
  calculateAccountAge,
  calculateSessionDuration,
  getAgeGroup
};
