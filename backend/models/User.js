const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        }
    }, {
        tableName: 'users',
        timestamps: false // We handle timestamps manually
    });

    User.associate = (models) => {
        User.hasMany(models.Transaction, {
            foreignKey: 'userId',
            as: 'transactions'
        });
        
        User.hasMany(models.UploadedFile, {
            foreignKey: 'userId',
            as: 'uploadedFiles'
        });
    };

    return User;
};
