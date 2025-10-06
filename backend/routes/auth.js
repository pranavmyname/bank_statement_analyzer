const express = require('express');
const router = express.Router();
const { getCurrentUserId } = require('../middleware/auth');

// Token verification endpoint
router.post('/verify-token', (req, res) => {
    const { token } = req.body;
    const MAGIC_TOKEN = process.env.MAGIC_TOKEN || 'default_token_for_dev';
    
    if (token === MAGIC_TOKEN) {
        console.log('🔐 BACKEND: Valid token received, setting session...');
        req.session.authenticated = true;
        req.session.currentUserId = 1; // Set default user ID
        
        console.log('🔐 BACKEND: Session before save:', req.session);
        
        // Force session save before responding
        req.session.save((err) => {
            if (err) {
                console.error('🔐 BACKEND: Session save error:', err);
                return res.status(500).json({ 
                    error: 'Session error', 
                    message: 'Failed to save session' 
                });
            }
            
            console.log('🔐 BACKEND: Session saved successfully:', req.session);
            console.log('🔐 BACKEND: Session ID:', req.sessionID);
            
            res.json({ 
                success: true, 
                message: 'Authentication successful' 
            });
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
    console.log('📊 BACKEND: Status check - Session ID:', req.sessionID);
    console.log('📊 BACKEND: Status check - Full session:', req.session);
    console.log('📊 BACKEND: Status check - authenticated value:', req.session.authenticated);
    console.log('📊 BACKEND: Status check - currentUserId:', req.session.currentUserId);
    
    const authStatus = !!req.session.authenticated;
    const userId = getCurrentUserId(req);
    
    console.log('📊 BACKEND: Sending response - authenticated:', authStatus, 'userId:', userId);
    
    res.json({
        authenticated: authStatus,
        currentUserId: userId
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
