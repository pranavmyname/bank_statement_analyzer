const requireAuth = (req, res, next) => {
    if (!req.session.authenticated) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please authenticate with the access token'
        });
    }
    next();
};

const getCurrentUserId = (req) => {
    return req.session.currentUserId || 1; // Default to user ID 1
};

const setCurrentUserId = (req, userId) => {
    req.session.currentUserId = userId;
};

module.exports = {
    requireAuth,
    getCurrentUserId,
    setCurrentUserId
};
