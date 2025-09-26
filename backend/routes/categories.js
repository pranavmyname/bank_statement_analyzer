const express = require('express');
const router = express.Router();
const { Category } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { DEFAULT_CATEGORIES } = require('../utils/initialize');

// Get all categories
router.get('/', requireAuth, async (req, res) => {
    try {
        const categories = await Category.findAll({
            order: [['isDefault', 'DESC'], ['name', 'ASC']]
        });
        
        res.json({
            categories,
            defaultCategories: DEFAULT_CATEGORIES
        });
        
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({
            error: 'Failed to fetch categories',
            message: error.message
        });
    }
});

// Add new category
router.post('/', requireAuth, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid category name',
                message: 'Category name is required and cannot be empty'
            });
        }
        
        const trimmedName = name.trim();
        
        // Check if category already exists (case-insensitive)
        const existingCategory = await Category.findOne({
            where: {
                name: {
                    [require('sequelize').Op.iLike]: trimmedName
                }
            }
        });
        
        if (existingCategory) {
            return res.status(400).json({
                error: 'Category already exists',
                message: 'A category with this name already exists'
            });
        }
        
        const category = await Category.create({
            name: trimmedName,
            isDefault: false
        });
        
        res.status(201).json({
            success: true,
            category,
            message: 'Category created successfully'
        });
        
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({
            error: 'Failed to create category',
            message: error.message
        });
    }
});

// Update category
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                error: 'Invalid category name',
                message: 'Category name is required and cannot be empty'
            });
        }
        
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({
                error: 'Category not found',
                message: 'The specified category does not exist'
            });
        }
        
        // Prevent updating default categories
        if (category.isDefault) {
            return res.status(400).json({
                error: 'Cannot update default category',
                message: 'Default categories cannot be modified'
            });
        }
        
        const trimmedName = name.trim();
        
        // Check if another category already has this name
        const existingCategory = await Category.findOne({
            where: {
                name: {
                    [require('sequelize').Op.iLike]: trimmedName
                },
                id: {
                    [require('sequelize').Op.ne]: id
                }
            }
        });
        
        if (existingCategory) {
            return res.status(400).json({
                error: 'Category name already exists',
                message: 'Another category already has this name'
            });
        }
        
        await category.update({ name: trimmedName });
        
        res.json({
            success: true,
            category,
            message: 'Category updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({
            error: 'Failed to update category',
            message: error.message
        });
    }
});

// Delete category
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const category = await Category.findByPk(id);
        if (!category) {
            return res.status(404).json({
                error: 'Category not found',
                message: 'The specified category does not exist'
            });
        }
        
        // Prevent deleting default categories
        if (category.isDefault) {
            return res.status(400).json({
                error: 'Cannot delete default category',
                message: 'Default categories cannot be deleted'
            });
        }
        
        // Check if category is being used by any transactions
        const { Transaction } = require('../models');
        const transactionCount = await Transaction.count({
            where: { category: category.name }
        });
        
        if (transactionCount > 0) {
            return res.status(400).json({
                error: 'Category in use',
                message: `This category is used by ${transactionCount} transactions and cannot be deleted`
            });
        }
        
        await category.destroy();
        
        res.json({
            success: true,
            message: 'Category deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            error: 'Failed to delete category',
            message: error.message
        });
    }
});

// Reset to default categories
router.post('/reset-defaults', requireAuth, async (req, res) => {
    try {
        // Delete all non-default categories
        const deletedCount = await Category.destroy({
            where: { isDefault: false }
        });
        
        // Ensure all default categories exist
        const existingDefaults = await Category.findAll({
            where: { isDefault: true }
        });
        
        const existingNames = existingDefaults.map(cat => cat.name);
        const missingDefaults = DEFAULT_CATEGORIES.filter(name => !existingNames.includes(name));
        
        if (missingDefaults.length > 0) {
            const newDefaults = missingDefaults.map(name => ({
                name,
                isDefault: true
            }));
            
            await Category.bulkCreate(newDefaults);
        }
        
        res.json({
            success: true,
            deletedCount,
            createdCount: missingDefaults.length,
            message: 'Categories reset to defaults successfully'
        });
        
    } catch (error) {
        console.error('Error resetting categories:', error);
        res.status(500).json({
            error: 'Failed to reset categories',
            message: error.message
        });
    }
});

// Get categories usage statistics
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { Transaction } = require('../models');
        
        // Get category usage statistics
        const categoryStats = await Transaction.findAll({
            attributes: [
                'category',
                [Transaction.sequelize.fn('COUNT', Transaction.sequelize.col('id')), 'transactionCount'],
                [Transaction.sequelize.fn('SUM', 
                    Transaction.sequelize.literal("CASE WHEN type = 'expense' THEN amount ELSE 0 END")
                ), 'totalExpenses'],
                [Transaction.sequelize.fn('SUM', 
                    Transaction.sequelize.literal("CASE WHEN type = 'credit' THEN amount ELSE 0 END")
                ), 'totalCredits']
            ],
            group: ['category'],
            order: [[Transaction.sequelize.literal('transactionCount'), 'DESC']],
            raw: true
        });
        
        // Get all categories with usage info
        const allCategories = await Category.findAll({
            order: [['isDefault', 'DESC'], ['name', 'ASC']]
        });
        
        const categoriesWithStats = allCategories.map(category => {
            const stats = categoryStats.find(stat => stat.category === category.name);
            return {
                ...category.toJSON(),
                transactionCount: parseInt(stats?.transactionCount || 0),
                totalExpenses: parseFloat(stats?.totalExpenses || 0),
                totalCredits: parseFloat(stats?.totalCredits || 0),
                inUse: (stats?.transactionCount || 0) > 0
            };
        });
        
        res.json({
            categories: categoriesWithStats,
            summary: {
                totalCategories: allCategories.length,
                defaultCategories: allCategories.filter(cat => cat.isDefault).length,
                customCategories: allCategories.filter(cat => !cat.isDefault).length,
                categoriesInUse: categoryStats.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching category stats:', error);
        res.status(500).json({
            error: 'Failed to fetch category statistics',
            message: error.message
        });
    }
});

module.exports = router;
