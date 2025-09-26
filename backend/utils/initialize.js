const { Category, User } = require('../models');

const DEFAULT_CATEGORIES = [
    'Transportation', 'Flights', 'Stays', 'Home Rent & Utilities',
    'Furniture', 'Electronics', 'Groceries', 'Health', 'Outside Food',
    'Money sent to family', 'Investments', 'Entertainment',
    'Shopping', 'Petrol', 'Credit Card Payment', 'Loan repayment', 'Other'
];

const createDefaultCategories = async () => {
    try {
        // Check if categories already exist
        const existingCategories = await Category.count();
        
        if (existingCategories === 0) {
            console.log('Creating default categories...');
            
            // Create all default categories
            const categoryPromises = DEFAULT_CATEGORIES.map(categoryName => 
                Category.create({
                    name: categoryName,
                    isDefault: true
                })
            );
            
            await Promise.all(categoryPromises);
            console.log('Default categories created successfully');
        } else {
            console.log('Categories already exist, skipping default creation');
        }
    } catch (error) {
        console.error('Error creating default categories:', error);
    }
};

const ensureDefaultUser = async () => {
    try {
        // Check if any user exists
        const userCount = await User.count();
        
        if (userCount === 0) {
            console.log('Creating default user...');
            
            const defaultUser = await User.create({
                name: 'Default User'
            });
            
            console.log('Default user created with ID:', defaultUser.id);
        } else {
            console.log('Users already exist, skipping default user creation');
        }
    } catch (error) {
        console.error('Error creating default user:', error);
    }
};

const getDefaultUserId = async () => {
    try {
        const firstUser = await User.findOne({
            order: [['id', 'ASC']]
        });
        
        return firstUser ? firstUser.id : 1;
    } catch (error) {
        console.error('Error getting default user ID:', error);
        return 1;
    }
};

module.exports = {
    DEFAULT_CATEGORIES,
    createDefaultCategories,
    ensureDefaultUser,
    getDefaultUserId
};
