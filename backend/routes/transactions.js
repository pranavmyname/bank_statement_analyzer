const express = require('express');
const router = express.Router();
const { Transaction, UploadedFile } = require('../models');
const { requireAuth, getCurrentUserId } = require('../middleware/auth');
const { parseDate } = require('../utils/fileProcessor');
const { Op } = require('sequelize');

// Save processed transactions to database
router.post('/save', requireAuth, async (req, res) => {
    try {
        const { transactions } = req.body;
        
        if (!req.session.processedTransactions) {
            return res.status(400).json({
                error: 'No processed transactions found',
                message: 'Please process a file first'
            });
        }
        
        const sessionData = req.session.processedTransactions;
        const userId = getCurrentUserId(req);
        
        // Validate that provided transactions match session data
        if (!transactions || !Array.isArray(transactions) || transactions.length !== sessionData.transactions.length) {
            return res.status(400).json({
                error: 'Invalid transaction data',
                message: 'Transaction data does not match processed data'
            });
        }
        
        console.log(`Saving ${transactions.length} transactions for user ${userId}`);
        
        // Prepare transaction data for database
        const transactionData = transactions.map(transaction => ({
            date: parseDate(transaction.date),
            time: transaction.time || null,
            user: transaction.user || null,
            description: transaction.description,
            bank: transaction.bank || null,
            accountId: transaction.account_id || null,
            originalDescription: transaction.original_description || transaction.description,
            amount: parseFloat(transaction.amount) || 0,
            type: transaction.type,
            accountType: sessionData.accountType,
            category: transaction.category || 'Other',
            fileSource: sessionData.fileId ? `file_${sessionData.fileId}` : null,
            userId: userId
        }));
        
        // Save all transactions
        const savedTransactions = await Transaction.bulkCreate(transactionData);
        
        // Update uploaded file record
        if (sessionData.fileId) {
            await UploadedFile.update(
                {
                    processed: true,
                    transactionsCount: savedTransactions.length
                },
                {
                    where: { id: sessionData.fileId }
                }
            );
        }
        
        // Clear processed transactions from session
        delete req.session.processedTransactions;
        delete req.session.currentFile;
        
        console.log(`Successfully saved ${savedTransactions.length} transactions`);
        
        res.json({
            success: true,
            transactionCount: savedTransactions.length,
            message: `Successfully saved ${savedTransactions.length} transactions to database`
        });
        
    } catch (error) {
        console.error('Error saving transactions:', error);
        res.status(500).json({
            error: 'Failed to save transactions',
            message: error.message
        });
    }
});

// Get all transactions with pagination and filtering
router.get('/', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        
        // Build where clause
        const whereClause = { userId };
        
        // Add filters
        if (req.query.type && ['credit', 'expense'].includes(req.query.type)) {
            whereClause.type = req.query.type;
        }
        
        if (req.query.category) {
            whereClause.category = req.query.category;
        }
        
        if (req.query.accountType && ['bank_account', 'credit_card'].includes(req.query.accountType)) {
            whereClause.accountType = req.query.accountType;
        }
        
        // Date range filtering
        if (req.query.startDate || req.query.endDate) {
            whereClause.date = {};
            if (req.query.startDate) {
                whereClause.date[Op.gte] = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                whereClause.date[Op.lte] = new Date(req.query.endDate);
            }
        }
        
        // Month/Year filtering
        if (req.query.month && req.query.year) {
            const startDate = new Date(parseInt(req.query.year), parseInt(req.query.month) - 1, 1);
            const endDate = new Date(parseInt(req.query.year), parseInt(req.query.month), 0);
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        } else if (req.query.year) {
            const startDate = new Date(parseInt(req.query.year), 0, 1);
            const endDate = new Date(parseInt(req.query.year), 11, 31);
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        }
        
        // Search in description
        if (req.query.search) {
            whereClause.description = {
                [Op.iLike]: `%${req.query.search}%`
            };
        }
        
        // Handle sorting
        const validSortColumns = ['date', 'description', 'amount', 'type', 'category', 'accountType', 'createdAt'];
        const sortBy = req.query.sortBy && validSortColumns.includes(req.query.sortBy) ? req.query.sortBy : 'date';
        const sortOrder = req.query.sortOrder && ['asc', 'desc'].includes(req.query.sortOrder.toLowerCase()) 
            ? req.query.sortOrder.toUpperCase() 
            : 'DESC';
        
        // Get transactions with count
        const { count, rows: transactions } = await Transaction.findAndCountAll({
            where: whereClause,
            order: [[sortBy, sortOrder], ['createdAt', 'DESC']], // Secondary sort by createdAt for consistency
            limit,
            offset
        });
        
        // Calculate summary statistics
        const summary = await Transaction.findAll({
            where: whereClause,
            attributes: [
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'totalTransactions'],
                [Transaction.sequelize.fn('SUM', 
                    Transaction.sequelize.literal("CASE WHEN type = 'credit' THEN amount ELSE 0 END")
                ), 'totalCredits'],
                [Transaction.sequelize.fn('SUM', 
                    Transaction.sequelize.literal("CASE WHEN type = 'expense' THEN amount ELSE 0 END")
                ), 'totalExpenses']
            ],
            raw: true
        });
        
        const stats = summary[0] || { totalTransactions: 0, totalCredits: 0, totalExpenses: 0 };
        
        res.json({
            transactions,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(count / limit),
                totalCount: count
            },
            summary: {
                totalTransactions: parseInt(stats.totalTransactions) || 0,
                totalCredits: parseFloat(stats.totalCredits) || 0,
                totalExpenses: parseFloat(stats.totalExpenses) || 0,
                netBalance: (parseFloat(stats.totalCredits) || 0) - (parseFloat(stats.totalExpenses) || 0)
            }
        });
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            error: 'Failed to fetch transactions',
            message: error.message
        });
    }
});

// Update transaction
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        const updateData = req.body;
        
        // Find transaction belonging to current user
        const transaction = await Transaction.findOne({
            where: { id, userId }
        });
        
        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction not found',
                message: 'The specified transaction does not exist or you do not have access to it'
            });
        }
        
        // Validate update data
        const allowedFields = ['description', 'amount', 'type', 'category', 'date', 'time'];
        const filteredData = {};
        
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                if (key === 'date' && updateData[key]) {
                    filteredData[key] = parseDate(updateData[key]);
                } else if (key === 'amount' && updateData[key]) {
                    filteredData[key] = parseFloat(updateData[key]);
                } else if (key === 'type' && updateData[key]) {
                    if (['credit', 'expense'].includes(updateData[key])) {
                        filteredData[key] = updateData[key];
                    }
                } else {
                    filteredData[key] = updateData[key];
                }
            }
        });
        
        if (Object.keys(filteredData).length === 0) {
            return res.status(400).json({
                error: 'No valid fields to update',
                message: 'Please provide at least one valid field to update'
            });
        }
        
        // Update transaction
        await transaction.update(filteredData);
        
        res.json({
            success: true,
            transaction,
            message: 'Transaction updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({
            error: 'Failed to update transaction',
            message: error.message
        });
    }
});

// Delete single transaction
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getCurrentUserId(req);
        
        const transaction = await Transaction.findOne({
            where: { id, userId }
        });
        
        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction not found',
                message: 'The specified transaction does not exist or you do not have access to it'
            });
        }
        
        await transaction.destroy();
        
        res.json({
            success: true,
            message: 'Transaction deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({
            error: 'Failed to delete transaction',
            message: error.message
        });
    }
});

// Bulk delete transactions
router.delete('/bulk/delete', requireAuth, async (req, res) => {
    try {
        const { transactionIds } = req.body;
        const userId = getCurrentUserId(req);
        
        if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
            return res.status(400).json({
                error: 'Invalid transaction IDs',
                message: 'Please provide an array of transaction IDs to delete'
            });
        }
        
        // Delete transactions belonging to current user
        const deletedCount = await Transaction.destroy({
            where: {
                id: { [Op.in]: transactionIds },
                userId
            }
        });
        
        res.json({
            success: true,
            deletedCount,
            message: `Successfully deleted ${deletedCount} transactions`
        });
        
    } catch (error) {
        console.error('Error bulk deleting transactions:', error);
        res.status(500).json({
            error: 'Failed to delete transactions',
            message: error.message
        });
    }
});

// Find duplicate transactions
router.get('/duplicates', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        // Find potential duplicates based on date, amount, and similar description
        const duplicates = await Transaction.sequelize.query(`
            SELECT t1.id as id1, t2.id as id2, t1.date, t1.amount, t1.description as desc1, t2.description as desc2,
                   t1.type, t1.category, t1.created_at as created1, t2.created_at as created2
            FROM transactions t1
            JOIN transactions t2 ON t1.date = t2.date 
                                AND t1.amount = t2.amount 
                                AND t1.type = t2.type
                                AND t1.user_id = t2.user_id
                                AND t1.id < t2.id
            WHERE t1.user_id = :userId
            AND (
                SIMILARITY(t1.description, t2.description) > 0.8
                OR LOWER(t1.description) = LOWER(t2.description)
                OR ABS(EXTRACT(EPOCH FROM (t1.created_at - t2.created_at))) < 300
            )
            ORDER BY t1.date DESC, t1.amount DESC
        `, {
            replacements: { userId },
            type: Transaction.sequelize.QueryTypes.SELECT
        });
        
        // Group duplicates
        const duplicateGroups = [];
        const processedIds = new Set();
        
        duplicates.forEach(dup => {
            if (!processedIds.has(dup.id1) && !processedIds.has(dup.id2)) {
                duplicateGroups.push({
                    date: dup.date,
                    amount: parseFloat(dup.amount),
                    type: dup.type,
                    category: dup.category,
                    transactions: [
                        {
                            id: dup.id1,
                            description: dup.desc1,
                            createdAt: dup.created1
                        },
                        {
                            id: dup.id2,
                            description: dup.desc2,
                            createdAt: dup.created2
                        }
                    ]
                });
                processedIds.add(dup.id1);
                processedIds.add(dup.id2);
            }
        });
        
        res.json({
            duplicateGroups,
            totalDuplicates: duplicateGroups.length,
            message: duplicateGroups.length > 0 ? 
                `Found ${duplicateGroups.length} potential duplicate groups` : 
                'No duplicate transactions found'
        });
        
    } catch (error) {
        console.error('Error finding duplicates:', error);
        res.status(500).json({
            error: 'Failed to find duplicates',
            message: error.message
        });
    }
});

// Get transaction summary for dashboard
router.get('/summary', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        // Build where clause for filtering
        const whereClause = { userId };
        
        // Add date filtering if provided
        if (req.query.year) {
            const year = parseInt(req.query.year);
            let startDate = new Date(year, 0, 1);
            let endDate = new Date(year, 11, 31);
            
            if (req.query.month) {
                const month = parseInt(req.query.month) - 1; // Month is 0-indexed
                startDate = new Date(year, month, 1);
                endDate = new Date(year, month + 1, 0);
            }
            
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        }
        
        if (req.query.accountType && ['bank_account', 'credit_card'].includes(req.query.accountType)) {
            whereClause.accountType = req.query.accountType;
        }
        
        // Get overall statistics
        const overallStats = await Transaction.findAll({
            where: whereClause,
            attributes: [
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'totalTransactions'],
                [Transaction.sequelize.fn('SUM', 
                    Transaction.sequelize.literal("CASE WHEN type = 'credit' THEN amount ELSE 0 END")
                ), 'totalCredits'],
                [Transaction.sequelize.fn('SUM', 
                    Transaction.sequelize.literal("CASE WHEN type = 'expense' THEN amount ELSE 0 END")
                ), 'totalExpenses']
            ],
            raw: true
        });
        
        // Get category breakdown for expenses
        const categoryBreakdown = await Transaction.findAll({
            where: { ...whereClause, type: 'expense' },
            attributes: [
                'category',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total']
            ],
            group: ['category'],
            order: [[Transaction.sequelize.literal('total'), 'DESC']],
            raw: true
        });
        
        const stats = overallStats[0] || { totalTransactions: 0, totalCredits: 0, totalExpenses: 0 };
        
        // Format category breakdown
        const categoryData = {};
        categoryBreakdown.forEach(item => {
            categoryData[item.category] = parseFloat(item.total) || 0;
        });
        
        res.json({
            totalTransactions: parseInt(stats.totalTransactions) || 0,
            totalCredits: parseFloat(stats.totalCredits) || 0,
            totalExpenses: parseFloat(stats.totalExpenses) || 0,
            netBalance: (parseFloat(stats.totalCredits) || 0) - (parseFloat(stats.totalExpenses) || 0),
            categoryBreakdown: categoryData
        });
        
    } catch (error) {
        console.error('Error getting transaction summary:', error);
        res.status(500).json({
            error: 'Failed to get transaction summary',
            message: error.message
        });
    }
});

// Export transactions
router.post('/export', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const { format = 'csv', filters = {} } = req.body;
        
        // Build where clause with filters
        const whereClause = { userId };
        
        if (filters.type && ['credit', 'expense'].includes(filters.type)) {
            whereClause.type = filters.type;
        }
        
        if (filters.category) {
            whereClause.category = filters.category;
        }
        
        if (filters.startDate || filters.endDate) {
            whereClause.date = {};
            if (filters.startDate) {
                whereClause.date[Op.gte] = new Date(filters.startDate);
            }
            if (filters.endDate) {
                whereClause.date[Op.lte] = new Date(filters.endDate);
            }
        }
        
        const transactions = await Transaction.findAll({
            where: whereClause,
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });
        
        if (format === 'csv') {
            // Generate CSV
            const csvHeader = 'Date,Time,Description,Amount,Type,Category,Account Type,Bank\n';
            const csvRows = transactions.map(t => [
                t.date,
                t.time || '',
                `"${t.description.replace(/"/g, '""')}"`,
                t.amount,
                t.type,
                t.category || '',
                t.accountType,
                t.bank || ''
            ].join(','));
            
            const csvContent = csvHeader + csvRows.join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
            res.send(csvContent);
        } else {
            // Return JSON
            res.json({
                transactions,
                totalCount: transactions.length,
                exportDate: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('Error exporting transactions:', error);
        res.status(500).json({
            error: 'Failed to export transactions',
            message: error.message
        });
    }
});

module.exports = router;
