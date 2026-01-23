import { logger } from '../utils/logger.js';

// In-memory store for rate limiting (use Redis in production)
const requestCounts = new Map();

// Clean up old entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
        if (now - data.windowStart > data.windowMs) {
            requestCounts.delete(key);
        }
    }
}, 60 * 1000);

/**
 * Rate limiting middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests allowed in window
 * @param {function} keyGenerator - Function to generate rate limit key (default: IP address)
 */
export function rateLimiter(options = {}) {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes default
        maxRequests = 100,
        keyGenerator = (req) => req.ip || req.connection.remoteAddress,
        message = 'Too many requests, please try again later',
        statusCode = 429,
        skipSuccessfulRequests = false,
        skipFailedRequests = false
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();
        
        if (!requestCounts.has(key)) {
            requestCounts.set(key, {
                count: 1,
                windowStart: now,
                windowMs
            });
            return next();
        }

        const data = requestCounts.get(key);
        
        // Reset window if expired
        if (now - data.windowStart > data.windowMs) {
            data.count = 1;
            data.windowStart = now;
            requestCounts.set(key, data);
            return next();
        }

        // Check if limit exceeded
        if (data.count >= maxRequests) {
            logger.warn(`Rate limit exceeded for key: ${key}`);
            res.setHeader('Retry-After', Math.ceil((data.windowStart + data.windowMs - now) / 1000));
            return res.status(statusCode).json({ 
                error: message,
                retryAfter: Math.ceil((data.windowStart + data.windowMs - now) / 1000)
            });
        }

        // Increment counter
        data.count++;
        requestCounts.set(key, data);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - data.count));
        res.setHeader('X-RateLimit-Reset', new Date(data.windowStart + data.windowMs).toISOString());

        next();
    };
}

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later'
});

/**
 * Standard rate limiter for API endpoints
 */
export const standardRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later'
});

/**
 * Lenient rate limiter for public endpoints
 */
export const lenientRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 300,
    message: 'Too many requests, please try again later'
});

/**
 * Per-wallet rate limiter
 */
export function walletRateLimiter(options = {}) {
    return rateLimiter({
        ...options,
        keyGenerator: (req) => {
            const walletAddress = req.body.walletAddress || req.params.walletAddress || req.query.walletAddress;
            return walletAddress || req.ip || req.connection.remoteAddress;
        }
    });
}
