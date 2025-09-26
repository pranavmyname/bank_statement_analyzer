const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { requireAuth, getCurrentUserId, setCurrentUserId } = require('../middleware/auth');

// Get all users
router.get('/', requireAuth, async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['name', 'ASC']]
        });
        
        const currentUserId = getCurrentUserId(req);
        const currentUser = await User.findByPk(currentUserId);
        
        res.json({
            users,
            currentUser,
            currentUserId
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            error: 'Failed to fetch users', 
            message: error.message 
        });
    }
});

// Add new user
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid user name',
                message: 'User name is required and cannot be empty'
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({
            where: { name: name.trim() }
        });
        
        if (existingUser) {
            return res.status(400).json({
                error: 'User already exists',
                message: 'A user with this name already exists'
            });
        }
        
        const user = await User.create({
            name: name.trim()
        });
        
        res.status(201).json({
            success: true,
            user,
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ 
            error: 'Failed to create user', 
            message: error.message 
        });
    }
});

// Switch current user
router.post('/switch', requireAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                error: 'User ID required',
                message: 'Please provide a user ID to switch to'
            });
        }
        
        // Verify user exists
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user does not exist'
            });
        }
        
        // Update session
        setCurrentUserId(req, parseInt(userId));
        
        res.json({
            success: true,
            currentUser: user,
            message: `Switched to user: ${user.name}`
        });
    } catch (error) {
        console.error('Error switching user:', error);
        res.status(500).json({ 
            error: 'Failed to switch user', 
            message: error.message 
        });
    }
});

// Update user
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid user name',
                message: 'User name is required and cannot be empty'
            });
        }
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user does not exist'
            });
        }
        
        // Check if another user already has this name
        const existingUser = await User.findOne({
            where: { 
                name: name.trim(),
                id: { [require('sequelize').Op.ne]: id }
            }
        });
        
        if (existingUser) {
            return res.status(400).json({
                error: 'User name already exists',
                message: 'Another user already has this name'
            });
        }
        
        await user.update({ name: name.trim() });
        
        res.json({
            success: true,
            user,
            message: 'User updated successfully'
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ 
            error: 'Failed to update user', 
            message: error.message 
        });
    }
});

// Delete user
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = getCurrentUserId(req);
        
        // Prevent deleting current user
        if (parseInt(id) === currentUserId) {
            return res.status(400).json({
                error: 'Cannot delete current user',
                message: 'Please switch to another user before deleting this user'
            });
        }
        
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'The specified user does not exist'
            });
        }
        
        // Check if this is the only user
        const userCount = await User.count();
        if (userCount <= 1) {
            return res.status(400).json({
                error: 'Cannot delete last user',
                message: 'At least one user must exist in the system'
            });
        }
        
        // Delete user (this will cascade delete related transactions due to foreign key constraints)
        await user.destroy();
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            error: 'Failed to delete user', 
            message: error.message 
        });
    }
});

module.exports = router;
