import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool;

export async function connectDB() {
    try {
        const isAzure = process.env.DB_HOST && process.env.DB_HOST.includes('azure.com');
        
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'solstice_protocol',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
            ssl: isAzure ? { rejectUnauthorized: false } : false,
        });

        // Test connection
        await pool.query('SELECT NOW()');
        logger.info('PostgreSQL connected successfully');

        return pool;
    } catch (error) {
        logger.error('PostgreSQL connection error:', error);
        throw error;
    }
}

export function getPool() {
    if (!pool) {
        throw new Error('Database pool not initialized. Call connectDB() first.');
    }
    return pool;
}

export async function closeDB() {
    if (pool) {
        await pool.end();
        logger.info('PostgreSQL connection closed');
    }
}
