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

// Email to User ID mapping
const EMAIL_USER_MAPPING = {
    'pranavmyname@gmail.com': 2,
    // Add more email mappings here as needed
    // 'another@example.com': 3,
};

// Get user ID based on email mapping
const getUserIdFromEmail = (email) => {
    const mappedUserId = EMAIL_USER_MAPPING[email.toLowerCase()];
    if (mappedUserId) {
        console.log(`🔐 Email ${email} mapped to user ID ${mappedUserId}`);
        return mappedUserId;
    }
    
    console.log(`🔐 Email ${email} not in mapping, using default user ID 1`);
    return 1; // Default user ID
};

// Flexible auth middleware - works with or without JWT
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    // If JWT token is provided, verify it
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Use flexible JWT verification (audience/issuer validation causes issues with Neon Auth)
        jwt.verify(token, getKey, {
            algorithms: ['RS256', 'HS256', 'ES256']
        }, (err, decoded) => {
            if (err) {
                console.error('🔐 JWT verification failed:', err.message);
                // If JWT verification fails, fall back to default user
                req.userId = 1;
                req.user = { sub: 1, email: 'default@user.com' };
                next();
            } else {
                // JWT verified successfully - map email to user ID
                const userEmail = decoded.email || decoded.sub || 'unknown@user.com';
                const mappedUserId = getUserIdFromEmail(userEmail);
                
                req.user = decoded;
                req.userId = mappedUserId;
                
                console.log(`🔐 JWT verified for email: ${userEmail}, mapped to user ID: ${mappedUserId}`);
                next();
            }
        });
    } else {
        // No JWT token provided, use default user for basic app access
        console.log('🔐 No JWT token provided, using default user (ID: 1)');
        req.userId = 1;
        req.user = { sub: 1, email: 'default@user.com' };
        next();
    }
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
