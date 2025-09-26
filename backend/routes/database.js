const express = require('express');
const router = express.Router();
const { User, Transaction, Category, UploadedFile } = require('../models');
const { requireAuth, getCurrentUserId } = require('../middleware/auth');
const { createDefaultCategories, ensureDefaultUser } = require('../utils/initialize');
const fs = require('fs-extra');
const path = require('path');

// Get database statistics
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        // Get overall stats
        const totalUsers = await User.count();
        const totalTransactions = await Transaction.count();
        const totalCategories = await Category.count();
        const totalFiles = await UploadedFile.count();
        
        // Get user-specific stats
        const userTransactions = await Transaction.count({ where: { userId } });
        const userCategories = await Transaction.findAll({
            where: { userId },
            attributes: ['category'],
            group: ['category'],
            raw: true
        });
        const userFiles = await UploadedFile.count({ where: { userId } });
        
        res.json({
            total: {
                users: totalUsers,
                transactions: totalTransactions,
                categories: totalCategories,
                files: totalFiles
            },
            user: {
                transactions: userTransactions,
                categories: userCategories.length,
                files: userFiles
            }
        });
        
    } catch (error) {
        console.error('Error fetching database stats:', error);
        res.status(500).json({
            error: 'Failed to fetch database statistics',
            message: error.message
        });
    }
});

// Reinitialize database (DANGEROUS OPERATION)
router.post('/reinitialize', requireAuth, async (req, res) => {
    try {
        const { confirmation } = req.body;
        
        // Require explicit confirmation
        if (confirmation !== 'CONFIRM') {
            return res.status(400).json({
                error: 'Invalid confirmation',
                message: 'You must type exactly "CONFIRM" to proceed with database reinitialization'
            });
        }
        
        console.log('Starting database reinitialization...');
        
        // Delete all data in specific order to handle foreign key constraints
        console.log('Deleting all transactions...');
        await Transaction.destroy({ where: {}, truncate: true });
        
        console.log('Deleting all uploaded files...');
        await UploadedFile.destroy({ where: {}, truncate: true });
        
        console.log('Deleting all categories...');
        await Category.destroy({ where: {}, truncate: true });
        
        console.log('Deleting all users...');
        await User.destroy({ where: {}, truncate: true });
        
        // Clean up uploaded files directory
        const uploadsDir = path.join(__dirname, '../uploads');
        try {
            if (await fs.pathExists(uploadsDir)) {
                const files = await fs.readdir(uploadsDir);
                for (const file of files) {
                    if (file !== '.gitkeep') { // Keep .gitkeep if it exists
                        await fs.remove(path.join(uploadsDir, file));
                    }
                }
                console.log('Cleaned up uploaded files directory');
            }
        } catch (fsError) {
            console.warn('Warning: Could not clean up uploads directory:', fsError.message);
        }
        
        // Recreate default data
        console.log('Creating default categories...');
        await createDefaultCategories();
        
        console.log('Creating default user...');
        await ensureDefaultUser();
        
        // Reset session to default user
        const defaultUser = await User.findOne({ order: [['id', 'ASC']] });
        if (defaultUser) {
            req.session.currentUserId = defaultUser.id;
        }
        
        console.log('Database reinitialization completed successfully');
        
        res.json({
            success: true,
            message: 'Database has been successfully reinitialized with default configuration',
            defaultUserId: defaultUser ? defaultUser.id : null
        });
        
    } catch (error) {
        console.error('Error reinitializing database:', error);
        res.status(500).json({
            error: 'Failed to reinitialize database',
            message: error.message,
            details: 'The database may be in an inconsistent state. Please check the server logs and consider manual intervention.'
        });
    }
});

// Backup database (export all data)
router.get('/backup', requireAuth, async (req, res) => {
    try {
        console.log('Creating database backup...');
        
        // Get all data
        const users = await User.findAll();
        const transactions = await Transaction.findAll();
        const categories = await Category.findAll();
        const uploadedFiles = await UploadedFile.findAll();
        
        const backup = {
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            data: {
                users,
                transactions,
                categories,
                uploadedFiles
            }
        };
        
        const filename = `expense_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(backup);
        
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            error: 'Failed to create backup',
            message: error.message
        });
    }
});

// Get connection pool status
router.get('/connection-status', requireAuth, async (req, res) => {
    try {
        const { sequelize } = require('../models');
        
        // Test database connection
        await sequelize.authenticate();
        
        const connectionInfo = {
            status: 'connected',
            dialect: sequelize.getDialect(),
            database: sequelize.config.database || 'SQLite',
            host: sequelize.config.host || 'local',
            port: sequelize.config.port || 'N/A'
        };
        
        // Get connection pool info if available (PostgreSQL)
        if (sequelize.connectionManager && sequelize.connectionManager.pool) {
            const pool = sequelize.connectionManager.pool;
            connectionInfo.pool = {
                size: pool.size || 0,
                available: pool.available || 0,
                using: pool.using || 0,
                waiting: pool.waiting || 0
            };
        }
        
        res.json(connectionInfo);
        
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            error: 'Database connection failed',
            message: error.message,
            status: 'disconnected'
        });
    }
});

// Optimize database (analyze tables, clean up)
router.post('/optimize', requireAuth, async (req, res) => {
    try {
        const { sequelize } = require('../models');
        
        console.log('Starting database optimization...');
        
        let results = {
            optimized: [],
            warnings: []
        };
        
        // For PostgreSQL, run ANALYZE on tables
        if (sequelize.getDialect() === 'postgres') {
            try {
                await sequelize.query('ANALYZE users');
                await sequelize.query('ANALYZE transactions');
                await sequelize.query('ANALYZE categories');
                await sequelize.query('ANALYZE uploaded_files');
                results.optimized.push('Updated table statistics');
            } catch (analyzeError) {
                results.warnings.push(`Could not analyze tables: ${analyzeError.message}`);
            }
        }
        
        // Clean up orphaned transactions (transactions without users)
        const orphanedTransactions = await Transaction.count({
            where: {
                userId: {
                    [require('sequelize').Op.notIn]: sequelize.literal('(SELECT id FROM users)')
                }
            }
        });
        
        if (orphanedTransactions > 0) {
            await Transaction.destroy({
                where: {
                    userId: {
                        [require('sequelize').Op.notIn]: sequelize.literal('(SELECT id FROM users)')
                    }
                }
            });
            results.optimized.push(`Removed ${orphanedTransactions} orphaned transactions`);
        }
        
        // Clean up orphaned uploaded files
        const orphanedFiles = await UploadedFile.count({
            where: {
                userId: {
                    [require('sequelize').Op.notIn]: sequelize.literal('(SELECT id FROM users)')
                }
            }
        });
        
        if (orphanedFiles > 0) {
            await UploadedFile.destroy({
                where: {
                    userId: {
                        [require('sequelize').Op.notIn]: sequelize.literal('(SELECT id FROM users)')
                    }
                }
            });
            results.optimized.push(`Removed ${orphanedFiles} orphaned file records`);
        }
        
        // Clean up physical files that don't have database records
        const uploadsDir = path.join(__dirname, '../uploads');
        try {
            if (await fs.pathExists(uploadsDir)) {
                const physicalFiles = await fs.readdir(uploadsDir);
                const dbFiles = await UploadedFile.findAll({ attributes: ['filename'] });
                const dbFilenames = dbFiles.map(file => file.filename);
                
                let cleanedFiles = 0;
                for (const file of physicalFiles) {
                    if (file !== '.gitkeep' && !dbFilenames.includes(file)) {
                        await fs.remove(path.join(uploadsDir, file));
                        cleanedFiles++;
                    }
                }
                
                if (cleanedFiles > 0) {
                    results.optimized.push(`Removed ${cleanedFiles} orphaned physical files`);
                }
            }
        } catch (fsError) {
            results.warnings.push(`Could not clean up physical files: ${fsError.message}`);
        }
        
        console.log('Database optimization completed');
        
        res.json({
            success: true,
            message: 'Database optimization completed',
            results
        });
        
    } catch (error) {
        console.error('Error optimizing database:', error);
        res.status(500).json({
            error: 'Failed to optimize database',
            message: error.message
        });
    }
});

module.exports = router;
