import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import identityRoutes from './routes/identity.js';
import proofRoutes from './routes/proof.js';
import authRoutes from './routes/auth.js';
import challengesRoutes from './routes/challenges.js';
import { logger } from './utils/logger.js';
import { connectDB } from './db/connection.js';
import { validateEnvironment, getConfig } from './utils/env.js';
import { standardRateLimiter, strictRateLimiter, lenientRateLimiter } from './middleware/rateLimiter.js';
import { validateContentType } from './middleware/validation.js';

dotenv.config();

// Validate environment variables on startup
try {
    validateEnvironment();
} catch (error) {
    logger.error('Environment validation failed:', error);
    process.exit(1);
}

const config = getConfig();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// Allow multiple origins for development (main website and testing app)
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(validateContentType);

// Trust proxy for rate limiting (if behind reverse proxy)
app.set('trust proxy', 1);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Solstice Protocol API'
    });
});

// API Routes with rate limiting
app.use('/api/identity', standardRateLimiter, identityRoutes);
app.use('/api/proof', standardRateLimiter, proofRoutes);
app.use('/api/auth', strictRateLimiter, authRoutes);
app.use('/api/challenges', lenientRateLimiter, challengesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
    try {
        // Connect to database
        await connectDB();
        logger.info('Database connected successfully');

        const server = app.listen(PORT, () => {
            logger.info(`Solstice Protocol API running on port ${PORT}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} signal received: closing HTTP server`);
            server.close(async () => {
                logger.info('HTTP server closed');
                
                // Close database connection
                try {
                    const { closeDB } = await import('./db/connection.js');
                    await closeDB();
                    logger.info('Database connection closed');
                } catch (error) {
                    logger.error('Error closing database:', error);
                }
                
                process.exit(0);
            });

            // Force shutdown after timeout
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, config.shutdownTimeout);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;
