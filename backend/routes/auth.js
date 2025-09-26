const express = require('express');
const router = express.Router();
const { getCurrentUserId } = require('../middleware/auth');

// Token verification endpoint
router.post('/verify-token', (req, res) => {
    const { token } = req.body;
    const MAGIC_TOKEN = process.env.MAGIC_TOKEN || 'default_token_for_dev';
    
    if (token === MAGIC_TOKEN) {
        req.session.authenticated = true;
        res.json({ 
            success: true, 
            message: 'Authentication successful' 
        });
    } else {
        res.status(401).json({ 
            error: 'Invalid token', 
            message: 'Please provide the correct access token' 
        });
    }
});

// Check authentication status
router.get('/status', (req, res) => {
    res.json({
        authenticated: !!req.session.authenticated,
        currentUserId: getCurrentUserId(req)
    });
});

// Upload token verification (for file access)
router.post('/verify-upload-token', (req, res) => {
    const { token } = req.body;
    const UPLOAD_TOKEN = process.env.UPLOAD_TOKEN || 'default_upload_token_for_dev';
    
    if (token === UPLOAD_TOKEN) {
        req.session.uploadAccess = true;
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

// Logout endpoint
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ 
                error: 'Failed to logout', 
                message: 'Could not destroy session' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    });
});

module.exports = router;
