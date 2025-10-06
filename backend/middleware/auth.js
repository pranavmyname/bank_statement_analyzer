const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for token verification
const client = jwksClient({
    jwksUri: process.env.NEON_JWKS_URL || 'https://api.stack-auth.com/api/v1/projects/default/.well-known/jwks.json',
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000 // 10 minutes
});

// Get signing key from JWKS
const getKey = (header, callback) => {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            console.error('Error getting signing key:', err);
            return callback(err);
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
};

// JWT verification middleware
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please provide a valid JWT token'
        });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    jwt.verify(token, getKey, {
        audience: process.env.NEON_PROJECT_ID,
        issuer: 'https://api.stack-auth.com',
        algorithms: ['RS256']
    }, (err, decoded) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(401).json({
                error: 'Invalid token',
                message: 'JWT token verification failed'
            });
        }
        
        // Store user info in request
        req.user = decoded;
        req.userId = decoded.sub; // Subject claim contains user ID
        next();
    });
};

const getCurrentUserId = (req) => {
    return req.userId || req.user?.sub || 1; // Default to user ID 1 if not found
};

// For backward compatibility - no longer needed with JWT
const setCurrentUserId = (req, userId) => {
    req.userId = userId;
};

module.exports = {
    requireAuth,
    getCurrentUserId,
    setCurrentUserId
};
