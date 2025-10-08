const express = require('express');
const router = express.Router();
const { Transaction } = require('../models');
const { requireAuth, getCurrentUserId } = require('../middleware/auth');
const { Op } = require('sequelize');

// Get chart data for analytics
router.get('/chart-data', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const { year, month, accountType, date_from, date_to, account_type, category } = req.query;
        
        // Build base where clause
        const whereClause = { userId };
        
        // Add date filtering (support both old year/month and new date_from/date_to)
        if (date_from || date_to) {
            const dateFilter = {};
            if (date_from) {
                dateFilter[Op.gte] = new Date(date_from);
            }
            if (date_to) {
                dateFilter[Op.lte] = new Date(date_to);
            }
            whereClause.date = dateFilter;
        } else if (year) {
            const startDate = new Date(parseInt(year), 0, 1);
            let endDate = new Date(parseInt(year), 11, 31);
            
            if (month) {
                const monthIndex = parseInt(month) - 1;
                startDate.setMonth(monthIndex);
                startDate.setDate(1);
                endDate = new Date(parseInt(year), monthIndex + 1, 0);
            }
            
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        }
        
        // Add category filter (supports array or single value)
        if (category) {
            if (Array.isArray(category)) {
                // Multiple categories selected
                if (category.length > 0) {
                    whereClause.category = { [Op.in]: category };
                }
            } else if (category !== 'all' && category !== '') {
                // Single category selected
                whereClause.category = category;
            }
        }
        
        if (account_type && ['bank_account', 'credit_card'].includes(account_type)) {
            whereClause.accountType = account_type;
        } else if (accountType && ['bank_account', 'credit_card'].includes(accountType)) {
            whereClause.accountType = accountType;
        }

        // Add account_id filter (supports array or single value)
        const { account_id } = req.query;
        if (account_id) {
            if (Array.isArray(account_id)) {
                // Multiple account IDs selected
                const validAccountIds = account_id
                    .map(id => parseInt(id))
                    .filter(id => !isNaN(id));
                if (validAccountIds.length > 0) {
                    whereClause.accountId = { [Op.in]: validAccountIds };
                }
            } else if (account_id !== 'all' && account_id !== '') {
                // Single account ID selected
                try {
                    const accountIdInt = parseInt(account_id);
                    if (!isNaN(accountIdInt)) {
                        whereClause.accountId = accountIdInt;
                    }
                } catch (error) {
                    // Invalid account_id, ignore filter
                }
            }
        }
        
        // Monthly spending trend
        const monthlyTrend = await Transaction.findAll({
            where: whereClause,
            attributes: [
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')), 'year'],
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')), 'month'],
                'type',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total']
            ],
            group: [
                Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')),
                Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')),
                'type'
            ],
            order: [
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')), 'ASC'],
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')), 'ASC']
            ],
            raw: true
        });
        
        // Category-wise spending
        const categorySpending = await Transaction.findAll({
            where: { ...whereClause, type: 'expense' },
            attributes: [
                'category',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
            ],
            group: ['category'],
            order: [[Transaction.sequelize.literal('total'), 'DESC']],
            raw: true
        });
        
        // Daily spending pattern
        const dailyPattern = await Transaction.findAll({
            where: { ...whereClause, type: 'expense' },
            attributes: [
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('DAY FROM date')), 'day'],
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
            ],
            group: [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('DAY FROM date'))],
            order: [[Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('DAY FROM date')), 'ASC']],
            raw: true
        });
        
        // Account type distribution
        const accountTypeDistribution = await Transaction.findAll({
            where: whereClause,
            attributes: [
                'accountType',
                'type',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
            ],
            group: ['accountType', 'type'],
            raw: true
        });
        
        // Top expenses by amount
        const topExpenses = await Transaction.findAll({
            where: { ...whereClause, type: 'expense' },
            order: [['amount', 'DESC']],
            limit: 10,
            attributes: ['id', 'date', 'description', 'amount', 'category']
        });

        // Get top 5 categories for trend analysis
        const topCategoriesForTrend = await Transaction.findAll({
            where: { ...whereClause, type: 'expense' },
            attributes: [
                'category',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total']
            ],
            group: ['category'],
            order: [[Transaction.sequelize.literal('total'), 'DESC']],
            limit: 5,
            raw: true
        });

        // Get category trend data for top categories
        const categoryTrendData = {};
        if (topCategoriesForTrend.length > 0) {
            const topCategoryNames = topCategoriesForTrend.map(cat => cat.category);
            
            const categoryTrend = await Transaction.findAll({
                where: { 
                    ...whereClause, 
                    type: 'expense',
                    category: { [Op.in]: topCategoryNames }
                },
                attributes: [
                    [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')), 'year'],
                    [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')), 'month'],
                    'category',
                    [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total']
                ],
                group: [
                    Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')),
                    Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')),
                    'category'
                ],
                order: [
                    [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')), 'ASC'],
                    [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')), 'ASC']
                ],
                raw: true
            });

            // Format category trend data
            categoryTrend.forEach(item => {
                const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
                if (!categoryTrendData[key]) {
                    categoryTrendData[key] = { month: key };
                    topCategoryNames.forEach(cat => {
                        categoryTrendData[key][cat] = 0;
                    });
                }
                categoryTrendData[key][item.category] = parseFloat(item.total);
            });
        }

        // Day of week spending pattern
        const dayOfWeekSpending = await Transaction.findAll({
            where: { ...whereClause, type: 'expense' },
            attributes: [
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('DOW FROM date')), 'dow'],
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count'],
                [Transaction.sequelize.fn('AVG', Transaction.sequelize.col('amount')), 'average']
            ],
            group: [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('DOW FROM date'))],
            order: [[Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('DOW FROM date')), 'ASC']],
            raw: true
        });

        // Bank analysis
        const bankAnalysis = await Transaction.findAll({
            where: { ...whereClause, bank: { [Op.ne]: 'Unknown' } },
            attributes: [
                'bank',
                'type',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
            ],
            group: ['bank', 'type'],
            order: [['bank', 'ASC'], ['type', 'ASC']],
            raw: true
        });
        
        // Format the data for charts
        const monthlyData = {};
        monthlyTrend.forEach(item => {
            const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
            if (!monthlyData[key]) {
                monthlyData[key] = { month: key, credits: 0, expenses: 0 };
            }
            if (item.type === 'credit') {
                monthlyData[key].credits = parseFloat(item.total);
            } else {
                monthlyData[key].expenses = parseFloat(item.total);
            }
        });
        
        const categoryData = categorySpending.map(item => ({
            category: item.category,
            amount: parseFloat(item.total),
            transactionCount: parseInt(item.count)
        }));
        
        const dailyData = dailyPattern.map(item => ({
            day: parseInt(item.day),
            amount: parseFloat(item.total),
            transactionCount: parseInt(item.count)
        }));
        
        const accountData = {};
        accountTypeDistribution.forEach(item => {
            if (!accountData[item.accountType]) {
                accountData[item.accountType] = { credits: 0, expenses: 0 };
            }
            if (item.type === 'credit') {
                accountData[item.accountType].credits = parseFloat(item.total);
            } else {
                accountData[item.accountType].expenses = parseFloat(item.total);
            }
        });
        
        // Format day of week data
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayOfWeekData = dayOfWeekSpending.map(item => ({
            day: dayNames[parseInt(item.dow)],
            amount: parseFloat(item.total),
            count: parseInt(item.count),
            average: parseFloat(item.average)
        }));

        // Format bank analysis data
        const bankData = {};
        bankAnalysis.forEach(item => {
            if (!bankData[item.bank]) {
                bankData[item.bank] = { credits: 0, expenses: 0, creditCount: 0, expenseCount: 0 };
            }
            if (item.type === 'credit') {
                bankData[item.bank].credits = parseFloat(item.total);
                bankData[item.bank].creditCount = parseInt(item.count);
            } else {
                bankData[item.bank].expenses = parseFloat(item.total);
                bankData[item.bank].expenseCount = parseInt(item.count);
            }
        });

        res.json({
            monthlyTrend: Object.values(monthlyData),
            categorySpending: categoryData,
            dailyPattern: dailyData,
            accountTypeDistribution: accountData,
            categoryTrend: Object.values(categoryTrendData),
            topCategories: topCategoriesForTrend.map(cat => cat.category),
            dayOfWeek: dayOfWeekData,
            bankAnalysis: Object.keys(bankData).map(bank => ({
                bank,
                ...bankData[bank]
            })),
            topExpenses: topExpenses.map(exp => ({
                id: exp.id,
                date: exp.date,
                description: exp.description,
                amount: exp.amount,
                category: exp.category
            }))
        });
        
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({
            error: 'Failed to fetch chart data',
            message: error.message
        });
    }
});

// Get available account IDs
router.get('/account-ids', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        const accountIds = await Transaction.findAll({
            where: { 
                userId,
                accountId: { [Op.ne]: null }
            },
            attributes: ['accountId'],
            group: ['accountId'],
            order: [['accountId', 'ASC']],
            raw: true
        });
        
        res.json({
            accountIds: accountIds.map(item => item.accountId.toString())
        });
        
    } catch (error) {
        console.error('Error fetching account IDs:', error);
        res.status(500).json({
            error: 'Failed to fetch account IDs',
            message: error.message
        });
    }
});

// Get category-wise transactions for drill-down
router.get('/category-transactions', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const { category, year, month, accountType, limit = 20 } = req.query;
        
        if (!category) {
            return res.status(400).json({
                error: 'Category required',
                message: 'Please specify a category to view transactions'
            });
        }
        
        const whereClause = { 
            userId,
            category,
            type: 'expense' // Usually we want to see expense transactions in category drill-down
        };
        
        // Add date filtering
        if (year) {
            let startDate = new Date(parseInt(year), 0, 1);
            let endDate = new Date(parseInt(year), 11, 31);
            
            if (month) {
                const monthIndex = parseInt(month) - 1;
                startDate = new Date(parseInt(year), monthIndex, 1);
                endDate = new Date(parseInt(year), monthIndex + 1, 0);
            }
            
            whereClause.date = {
                [Op.between]: [startDate, endDate]
            };
        }
        
        if (accountType && ['bank_account', 'credit_card'].includes(accountType)) {
            whereClause.accountType = accountType;
        }
        
        const transactions = await Transaction.findAll({
            where: whereClause,
            order: [['amount', 'DESC'], ['date', 'DESC']],
            limit: parseInt(limit),
            attributes: ['id', 'date', 'description', 'amount', 'accountType', 'bank']
        });
        
        // Get category summary
        const summary = await Transaction.findAll({
            where: whereClause,
            attributes: [
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'totalAmount'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'transactionCount'],
                [Transaction.sequelize.fn('AVG', Transaction.sequelize.col('amount')), 'averageAmount'],
                [Transaction.sequelize.fn('MAX', Transaction.sequelize.col('amount')), 'maxAmount'],
                [Transaction.sequelize.fn('MIN', Transaction.sequelize.col('amount')), 'minAmount']
            ],
            raw: true
        });
        
        const stats = summary[0];
        
        res.json({
            category,
            transactions,
            summary: {
                totalAmount: parseFloat(stats.totalAmount) || 0,
                transactionCount: parseInt(stats.transactionCount) || 0,
                averageAmount: parseFloat(stats.averageAmount) || 0,
                maxAmount: parseFloat(stats.maxAmount) || 0,
                minAmount: parseFloat(stats.minAmount) || 0
            }
        });
        
    } catch (error) {
        console.error('Error fetching category transactions:', error);
        res.status(500).json({
            error: 'Failed to fetch category transactions',
            message: error.message
        });
    }
});

// Get spending insights
router.get('/insights', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        const { year, month, date_from, date_to, account_type, category } = req.query;
        
        // Build date range
        let currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd;
        
        // Use date_from and date_to if provided
        if (date_from || date_to) {
            currentPeriodStart = date_from ? new Date(date_from) : new Date('1900-01-01');
            currentPeriodEnd = date_to ? new Date(date_to) : new Date();
            
            // Calculate previous period of same length
            const periodLength = currentPeriodEnd - currentPeriodStart;
            previousPeriodEnd = new Date(currentPeriodStart - 1); // Day before current period starts
            previousPeriodStart = new Date(previousPeriodEnd - periodLength);
        } else if (month && year) {
            // Monthly comparison
            const currentYear = parseInt(year);
            const currentMonth = parseInt(month) - 1;
            
            currentPeriodStart = new Date(currentYear, currentMonth, 1);
            currentPeriodEnd = new Date(currentYear, currentMonth + 1, 0);
            
            // Previous month
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            previousPeriodStart = new Date(prevYear, prevMonth, 1);
            previousPeriodEnd = new Date(prevYear, prevMonth + 1, 0);
        } else if (year) {
            // Yearly comparison
            const currentYear = parseInt(year);
            
            currentPeriodStart = new Date(currentYear, 0, 1);
            currentPeriodEnd = new Date(currentYear, 11, 31);
            
            // Previous year
            previousPeriodStart = new Date(currentYear - 1, 0, 1);
            previousPeriodEnd = new Date(currentYear - 1, 11, 31);
        } else {
            // Default to current month vs previous month
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            currentPeriodStart = new Date(currentYear, currentMonth, 1);
            currentPeriodEnd = new Date(currentYear, currentMonth + 1, 0);
            
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            previousPeriodStart = new Date(prevYear, prevMonth, 1);
            previousPeriodEnd = new Date(prevYear, prevMonth + 1, 0);
        }
        
        // Build additional filters for current period
        const currentWhere = {
            userId,
            date: { [Op.between]: [currentPeriodStart, currentPeriodEnd] }
        };
        
        // Add category filter (supports array or single value)
        if (category) {
            if (Array.isArray(category)) {
                if (category.length > 0) {
                    currentWhere.category = { [Op.in]: category };
                }
            } else if (category !== 'all' && category !== '') {
                currentWhere.category = category;
            }
        }
        
        if (account_type && ['bank_account', 'credit_card'].includes(account_type)) {
            currentWhere.accountType = account_type;
        }
        
        // Get current period stats
        const currentStats = await Transaction.findAll({
            where: currentWhere,
            attributes: [
                'type',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
            ],
            group: ['type'],
            raw: true
        });
        
        // Build additional filters for previous period
        const previousWhere = {
            userId,
            date: { [Op.between]: [previousPeriodStart, previousPeriodEnd] }
        };
        
        // Add category filter (supports array or single value)
        if (category) {
            if (Array.isArray(category)) {
                if (category.length > 0) {
                    previousWhere.category = { [Op.in]: category };
                }
            } else if (category !== 'all' && category !== '') {
                previousWhere.category = category;
            }
        }
        
        if (account_type && ['bank_account', 'credit_card'].includes(account_type)) {
            previousWhere.accountType = account_type;
        }
        
        // Get previous period stats
        const previousStats = await Transaction.findAll({
            where: previousWhere,
            attributes: [
                'type',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total'],
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'count']
            ],
            group: ['type'],
            raw: true
        });
        
        // Process stats
        const processStats = (stats) => {
            const result = { credits: 0, expenses: 0, creditCount: 0, expenseCount: 0 };
            stats.forEach(stat => {
                if (stat.type === 'credit') {
                    result.credits = parseFloat(stat.total);
                    result.creditCount = parseInt(stat.count);
                } else {
                    result.expenses = parseFloat(stat.total);
                    result.expenseCount = parseInt(stat.count);
                }
            });
            return result;
        };
        
        const current = processStats(currentStats);
        const previous = processStats(previousStats);
        
        // Calculate changes
        const expenseChange = previous.expenses > 0 ? 
            ((current.expenses - previous.expenses) / previous.expenses * 100) : 0;
        const creditChange = previous.credits > 0 ? 
            ((current.credits - previous.credits) / previous.credits * 100) : 0;
        
        // Build filters for top categories query
        const topCategoriesWhere = {
            userId,
            type: 'expense',
            date: { [Op.between]: [currentPeriodStart, currentPeriodEnd] }
        };
        
        // Add category filter (supports array or single value)
        if (category) {
            if (Array.isArray(category)) {
                if (category.length > 0) {
                    topCategoriesWhere.category = { [Op.in]: category };
                }
            } else if (category !== 'all' && category !== '') {
                topCategoriesWhere.category = category;
            }
        }
        
        if (account_type && ['bank_account', 'credit_card'].includes(account_type)) {
            topCategoriesWhere.accountType = account_type;
        }
        
        // Get biggest expense categories for current period
        const topCategories = await Transaction.findAll({
            where: topCategoriesWhere,
            attributes: [
                'category',
                [Transaction.sequelize.fn('SUM', Transaction.sequelize.col('amount')), 'total']
            ],
            group: ['category'],
            order: [[Transaction.sequelize.literal('total'), 'DESC']],
            limit: 5,
            raw: true
        });
        
        // Generate insights
        const insights = [];
        
        if (expenseChange > 10) {
            insights.push({
                type: 'warning',
                message: `Your expenses increased by ${expenseChange.toFixed(1)}% compared to the previous period.`,
                value: expenseChange
            });
        } else if (expenseChange < -10) {
            insights.push({
                type: 'positive',
                message: `Great! Your expenses decreased by ${Math.abs(expenseChange).toFixed(1)}% compared to the previous period.`,
                value: expenseChange
            });
        }
        
        if (creditChange > 10) {
            insights.push({
                type: 'positive',
                message: `Your income increased by ${creditChange.toFixed(1)}% compared to the previous period.`,
                value: creditChange
            });
        } else if (creditChange < -10) {
            insights.push({
                type: 'warning',
                message: `Your income decreased by ${Math.abs(creditChange).toFixed(1)}% compared to the previous period.`,
                value: creditChange
            });
        }
        
        if (topCategories.length > 0) {
            const topCategory = topCategories[0];
            const percentage = current.expenses > 0 ? 
                (parseFloat(topCategory.total) / current.expenses * 100) : 0;
            
            if (percentage > 30) {
                insights.push({
                    type: 'info',
                    message: `${topCategory.category} accounts for ${percentage.toFixed(1)}% of your expenses this period.`,
                    value: percentage
                });
            }
        }
        
        res.json({
            period: {
                start: currentPeriodStart,
                end: currentPeriodEnd,
                type: month ? 'month' : 'year'
            },
            current,
            previous,
            changes: {
                expenses: expenseChange,
                credits: creditChange
            },
            topCategories: topCategories.map(cat => ({
                category: cat.category,
                amount: parseFloat(cat.total),
                percentage: current.expenses > 0 ? (parseFloat(cat.total) / current.expenses * 100) : 0
            })),
            insights
        });
        
    } catch (error) {
        console.error('Error fetching insights:', error);
        res.status(500).json({
            error: 'Failed to fetch insights',
            message: error.message
        });
    }
});

// Get available years and months for filtering
router.get('/date-ranges', requireAuth, async (req, res) => {
    try {
        const userId = getCurrentUserId(req);
        
        const dateRanges = await Transaction.findAll({
            where: { userId },
            attributes: [
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')), 'year'],
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')), 'month']
            ],
            group: [
                Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')),
                Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date'))
            ],
            order: [
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('YEAR FROM date')), 'DESC'],
                [Transaction.sequelize.fn('EXTRACT', Transaction.sequelize.literal('MONTH FROM date')), 'DESC']
            ],
            raw: true
        });
        
        const years = [...new Set(dateRanges.map(item => parseInt(item.year)))];
        const months = [];
        
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        dateRanges.forEach(item => {
            const monthObj = {
                value: parseInt(item.month),
                name: monthNames[parseInt(item.month) - 1],
                year: parseInt(item.year)
            };
            
            if (!months.find(m => m.value === monthObj.value && m.year === monthObj.year)) {
                months.push(monthObj);
            }
        });
        
        res.json({
            years,
            months,
            availableRanges: dateRanges
        });
        
    } catch (error) {
        console.error('Error fetching date ranges:', error);
        res.status(500).json({
            error: 'Failed to fetch date ranges',
            message: error.message
        });
    }
});

module.exports = router;
