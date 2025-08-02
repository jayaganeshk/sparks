const { CognitoJwtVerifier } = require("aws-jwt-verify");


// Create a verifier for your user pool
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

/**
 * Authentication middleware for verifying JWT tokens
 * and optionally checking for organizer role
 */
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header is missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifier.verify(token);
    req.user = payload; // Attach user payload to the request object
    
    // Check if the route requires organizer role
    // This is determined by the route path in albums.js
    if (req.originalUrl.includes('/albums') && 
        !req.originalUrl.includes('/albums/') || // GET /albums (list)
        req.originalUrl.includes('/albums/') && 
        (req.method === 'POST' || req.method === 'DELETE')) { // POST or DELETE on specific album
      
      // Check if user has 'cognito:groups' claim and if it includes 'Organizers'
      const groups = req.user['cognito:groups'] || [];
      if (!Array.isArray(groups) || !groups.includes('Organizers')) {
        return res.status(403).json({ message: 'Access denied. Organizer role required.' });
      }
    }
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
