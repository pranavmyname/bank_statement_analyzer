const express = require('express');
const router = express.Router();
const { requireAuth, getCurrentUserId } = require('../middleware/auth');

// Validate JWT token endpoint - used by frontend to verify token validity
router.get('/verify', requireAuth, (req, res) => {
    console.log('🔐 BACKEND: JWT token verified successfully');
    console.log('🔐 BACKEND: User info:', req.user);
    
    res.json({
        success: true,
        message: 'Token is valid',
        user: {
            id: req.user.sub,
            email: req.user.email,
            // Add other user fields as needed
        }
    });
});

// Check authentication status (compatible with existing frontend)
router.get('/status', requireAuth, (req, res) => {
    console.log('📊 BACKEND: Auth status check for user:', req.user.sub);
    
    res.json({
        authenticated: true,
        currentUserId: getCurrentUserId(req),
        user: req.user
    });
});

// Upload token verification (for file access) - keeping for backward compatibility
router.post('/verify-upload-token', (req, res) => {
    const { token } = req.body;
    const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN || 'default_upload_token_for_dev';
    
    if (token === UPLOAD_TOKEN) {
        res.json({ 
            success: true, 
            message: 'Upload access granted' 
        });
    } else {
        res.status(401).json({ 
            error: 'Invalid upload token', 
            message: 'Please provide the correct upload access token' 
        });
    }
});

// Logout endpoint (for Neon Auth, logout is handled on frontend)
router.post('/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Logout successful - handled by Neon Auth on frontend' 
    });
});

module.exports = router;
