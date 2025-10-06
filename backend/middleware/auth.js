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

// Get authorized emails from environment variable
const getAuthorizedEmails = () => {
    const authorizedEmailsEnv = process.env.AUTHORIZED_EMAILS;
    if (!authorizedEmailsEnv) {
        console.warn('⚠️  AUTHORIZED_EMAILS not set - no email restrictions');
        return [];
    }
    
    return authorizedEmailsEnv.split(',').map(email => email.trim().toLowerCase());
};

// Check if email is authorized to access the app
const isEmailAuthorized = (email) => {
    const authorizedEmails = getAuthorizedEmails();
    
    // If no authorized emails are set, allow all (for development)
    if (authorizedEmails.length === 0) {
        console.log('🔐 No email restrictions configured');
        return true;
    }
    
    const isAuthorized = authorizedEmails.includes(email.toLowerCase());
    console.log(`🔐 Email ${email} authorization check: ${isAuthorized ? '✅ AUTHORIZED' : '❌ NOT AUTHORIZED'}`);
    console.log(`🔐 Authorized emails: ${authorizedEmails.join(', ')}`);
    
    return isAuthorized;
};

// Get user ID based on email authorization
// All authorized users get User ID 2, unauthorized users get User ID 1
const getUserIdFromEmail = (email) => {
    if (isEmailAuthorized(email)) {
        console.log(`🔐 Authorized email ${email} mapped to user ID 2`);
        return 2; // All authorized users get User ID 2
    }
    
    console.log(`🔐 Unauthorized email ${email} mapped to default user ID 1`);
    return 1; // Default user ID for unauthorized users
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
                // JWT verified successfully - check authorization and get user ID
                const userEmail = decoded.email || decoded.sub || 'unknown@user.com';
                
                // Check authorization and get mapped user ID (2 for authorized, 1 for unauthorized)
                if (!isEmailAuthorized(userEmail)) {
                    console.error(`🚫 UNAUTHORIZED ACCESS ATTEMPT: Email ${userEmail} not in authorized list`);
                    return res.status(403).json({
                        error: 'Access Denied',
                        message: 'Your email address is not authorized to access this application',
                        code: 'EMAIL_NOT_AUTHORIZED'
                    });
                }
                
                // Email is authorized - all authorized users get User ID 2
                req.user = decoded;
                req.userId = 2; // All authorized users get User ID 2
                
                console.log(`🔐 JWT verified for AUTHORIZED email: ${userEmail}, mapped to user ID: 2`);
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
