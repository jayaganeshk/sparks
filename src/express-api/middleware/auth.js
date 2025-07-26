const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Create a verifier for your user pool
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.VITE_USER_POOL_ID,
  tokenUse: "id",
  clientId: process.env.VITE_USER_POOL_WEB_CLIENT_ID,
});

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header is missing or invalid.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = await verifier.verify(token);
    req.user = payload; // Attach user payload to the request object
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = authMiddleware;
