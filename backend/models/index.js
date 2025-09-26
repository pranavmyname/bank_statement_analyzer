const sequelize = require('../config/database');
const User = require('./User')(sequelize);
const Transaction = require('./Transaction')(sequelize);
const Category = require('./Category')(sequelize);
const UploadedFile = require('./UploadedFile')(sequelize);

// Set up associations
const models = {
    User,
    Transaction,
    Category,
    UploadedFile
};

// Initialize associations
Object.keys(models).forEach(modelName => {
    if (models[modelName].associate) {
        models[modelName].associate(models);
    }
});

models.sequelize = sequelize;

module.exports = models;
