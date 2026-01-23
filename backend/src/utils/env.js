import { logger } from './logger.js';

/**
 * Required environment variables for production
 */
const REQUIRED_VARS = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'SOLANA_RPC_URL',
    'PROGRAM_ID',
    'ENCRYPTION_KEY',
    'SESSION_SECRET'
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_VARS = {
    FRONTEND_URL: 'http://localhost:5173',
    LOG_LEVEL: 'info',
    RATE_LIMIT_WINDOW: '900000',
    RATE_LIMIT_MAX_REQUESTS: '100',
    SESSION_EXPIRY: '86400000',
    SOLANA_NETWORK: 'devnet',
    SHUTDOWN_TIMEOUT: '10000'
};

/**
 * Validate environment variables
 */
export function validateEnvironment() {
    const errors = [];
    const warnings = [];

    // Check required variables
    for (const varName of REQUIRED_VARS) {
        if (!process.env[varName]) {
            errors.push(`Missing required environment variable: ${varName}`);
        }
    }

    // Set defaults for optional variables
    for (const [varName, defaultValue] of Object.entries(OPTIONAL_VARS)) {
        if (!process.env[varName]) {
            process.env[varName] = defaultValue;
            warnings.push(`Using default value for ${varName}: ${defaultValue}`);
        }
    }

    // Validate specific formats
    if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
        errors.push('PORT must be a number');
    }

    if (process.env.DB_PORT && isNaN(parseInt(process.env.DB_PORT))) {
        errors.push('DB_PORT must be a number');
    }

    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 64) {
        errors.push('ENCRYPTION_KEY must be a 64-character hex string (256 bits)');
    }

    if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
        warnings.push('SESSION_SECRET should be at least 32 characters for security');
    }

    // Validate SOLANA_RPC_URL format
    if (process.env.SOLANA_RPC_URL) {
        try {
            new URL(process.env.SOLANA_RPC_URL);
        } catch (e) {
            errors.push('SOLANA_RPC_URL must be a valid URL');
        }
    }

    // Validate PROGRAM_ID format (base58, 32-44 chars)
    if (process.env.PROGRAM_ID && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(process.env.PROGRAM_ID)) {
        errors.push('PROGRAM_ID must be a valid Solana program ID (base58 encoded)');
    }

    // Production-specific validations
    if (process.env.NODE_ENV === 'production') {
        if (!process.env.REDIS_URL) {
            warnings.push('REDIS_URL not set - using in-memory storage (not recommended for production)');
        }

        if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.startsWith('http://')) {
            warnings.push('FRONTEND_URL uses HTTP instead of HTTPS in production');
        }

        if (process.env.SOLANA_RPC_URL && process.env.SOLANA_RPC_URL.startsWith('http://')) {
            warnings.push('SOLANA_RPC_URL uses HTTP instead of HTTPS in production');
        }

        // Validate database credentials are not defaults
        if (process.env.DB_PASSWORD === 'solstice_dev_password') {
            errors.push('DB_PASSWORD must not use default development password in production');
        }

        if (process.env.ENCRYPTION_KEY === 'your-256-bit-hex-key-here') {
            errors.push('ENCRYPTION_KEY must not use default value in production');
        }

        if (process.env.SESSION_SECRET === 'your-session-secret-here') {
            errors.push('SESSION_SECRET must not use default value in production');
        }
    }

    // Log results
    if (warnings.length > 0) {
        warnings.forEach(warning => logger.warn(warning));
    }

    if (errors.length > 0) {
        errors.forEach(error => logger.error(error));
        throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
    }

    logger.info('Environment validation passed');
    return true;
}

/**
 * Get validated environment configuration
 */
export function getConfig() {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3000,
        frontendUrl: process.env.FRONTEND_URL,
        database: {
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            name: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        },
        solana: {
            network: process.env.SOLANA_NETWORK,
            rpcUrl: process.env.SOLANA_RPC_URL,
            programId: process.env.PROGRAM_ID
        },
        security: {
            encryptionKey: process.env.ENCRYPTION_KEY,
            sessionSecret: process.env.SESSION_SECRET,
            sessionExpiry: parseInt(process.env.SESSION_EXPIRY)
        },
        rateLimit: {
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW),
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
        },
        redis: {
            url: process.env.REDIS_URL
        },
        logging: {
            level: process.env.LOG_LEVEL
        },
        shutdownTimeout: parseInt(process.env.SHUTDOWN_TIMEOUT) || 10000
    };
}
