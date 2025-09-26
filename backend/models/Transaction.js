const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const Transaction = sequelize.define('Transaction', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: () => uuidv4()
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        time: {
            type: DataTypes.STRING(9), // HH:MM format
            allowNull: true
        },
        user: {
            type: DataTypes.STRING(100), // Optional user name for joint accounts
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        bank: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        accountId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'account_id'
        },
        originalDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'original_description'
        },
        amount: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(20), // 'credit' or 'expense'
            allowNull: false,
            validate: {
                isIn: [['credit', 'expense']]
            }
        },
        accountType: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: 'bank_account',
            field: 'account_type',
            validate: {
                isIn: [['bank_account', 'credit_card']]
            }
        },
        category: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        fileSource: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'file_source'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'created_at'
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'updated_at'
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            field: 'is_deleted'
        }
    }, {
        tableName: 'transactions',
        timestamps: false, // We handle timestamps manually
        hooks: {
            beforeUpdate: (transaction) => {
                transaction.updatedAt = new Date();
            }
        }
    });

    Transaction.associate = (models) => {
        Transaction.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'transactionUser'
        });
    };

    return Transaction;
};
