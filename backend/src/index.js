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
import { connectDB, closeDB } from './db/connection.js';
import { connectRedis, closeRedis } from './utils/redis.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());

// Allow multiple origins for development and production
const allowedOrigins = [
    // Local development
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    // Production domains
    'https://app.solsticeprotocol.dev',
    'https://solsticeprotocol.dev',
    'https://api.solsticeprotocol.dev',
    // Environment variable for additional URLs
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
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'Solstice Protocol API'
    });
});

// API Routes
app.use('/api/identity', identityRoutes);
app.use('/api/proof', proofRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengesRoutes);

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
        logger.info('✅ Database connected successfully');

        // Connect to Redis with Microsoft Entra ID
        await connectRedis();
        logger.info('✅ Redis connected successfully');

        app.listen(PORT, () => {
            logger.info(`🚀 Solstice Protocol API running on port ${PORT}`);
            logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🌐 Allowed origins: ${allowedOrigins.join(', ')}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, closing connections gracefully...`);
    
    try {
        // Close Redis connection
        await closeRedis();
        
        // Close database connection
        await closeDB();
        
        logger.info('All connections closed. Exiting...');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

export default app;
