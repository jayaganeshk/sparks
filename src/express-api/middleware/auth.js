const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Create verifiers for both user pools
const mainVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.COGNITO_CLIENT_ID,
});

const organizerVerifier = CognitoJwtVerifier.create({
  userPoolId: process.env.ORGANIZER_COGNITO_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.ORGANIZER_COGNITO_CLIENT_ID,
});

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header is missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    let payload;
    let userType;

    // Try main user pool first
    try {
      payload = await mainVerifier.verify(token);
      userType = 'REGULAR_USER';
    } catch (mainError) {
      // If main verification fails, try organizer pool
      try {
        payload = await organizerVerifier.verify(token);
        userType = 'EVENT_ORGANIZER';
      } catch (organizerError) {
        console.error('Token verification failed for both pools:', { mainError, organizerError });
        return res.status(401).json({ message: 'Invalid token.' });
      }
    }

    req.user = payload;
    req.userType = userType;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Middleware to require event organizer access
const requireOrganizer = (req, res, next) => {
  if (req.userType !== 'EVENT_ORGANIZER') {
    return res.status(403).json({ error: 'Event organizer access required' });
  }
  next();
};

module.exports = { authMiddleware, requireOrganizer };
