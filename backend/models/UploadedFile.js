const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize) => {
    const UploadedFile = sequelize.define('UploadedFile', {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            defaultValue: () => uuidv4()
        },
        filename: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        originalFilename: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'original_filename'
        },
        fileType: {
            type: DataTypes.STRING(10),
            allowNull: false,
            field: 'file_type'
        },
        fileSize: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'file_size'
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'user_id'
        },
        uploadedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'uploaded_at'
        },
        processed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        transactionsCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            field: 'transactions_count'
        }
    }, {
        tableName: 'uploaded_files',
        timestamps: false // We handle timestamps manually
    });

    UploadedFile.associate = (models) => {
        UploadedFile.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'fileUser'
        });
    };

    return UploadedFile;
};
