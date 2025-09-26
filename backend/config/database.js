const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DB_URL) {
    // Production or custom database URL
    sequelize = new Sequelize(process.env.DB_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            acquire: 60000,
            idle: 10000,
        },
        dialectOptions: {
            ssl: process.env.NODE_ENV === 'production' ? {
                require: true,
                rejectUnauthorized: false
            } : false
        }
    });
} else {
    // Development - SQLite fallback
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: 'database.sqlite',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });
}

module.exports = sequelize;
