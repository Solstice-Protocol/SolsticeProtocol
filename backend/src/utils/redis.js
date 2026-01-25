import { createClient } from 'redis';
import { DefaultAzureCredential } from '@azure/identity';
import { logger } from './logger.js';

let redisClient = null;
let tokenRefreshInterval = null;

/**
 * Initialize and connect to Azure Managed Redis using Microsoft Entra ID
 */
export async function connectRedis() {
    try {
        // Use Azure Managed Identity for authentication
        const credential = new DefaultAzureCredential();
        
        // Get access token for Azure Cache for Redis
        const tokenResponse = await credential.getToken('https://redis.azure.com/.default');
        
        const config = {
            socket: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT || '10000'),
                tls: true,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        logger.error('Redis max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    // Exponential backoff: 50ms * 2^retries, max 3 seconds
                    return Math.min(retries * 50, 3000);
                }
            },
            // Use Entra ID token instead of password
            username: process.env.REDIS_USERNAME || 'default',
            password: tokenResponse.token,
            database: parseInt(process.env.REDIS_DB || '0')
        };

        redisClient = createClient(config);

        // Error handling
        redisClient.on('error', (err) => {
            logger.error('Redis client error:', err);
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connecting...');
        });

        redisClient.on('ready', () => {
            logger.info('✅ Redis client ready');
        });

        redisClient.on('reconnecting', () => {
            logger.warn('Redis client reconnecting...');
        });

        redisClient.on('end', () => {
            logger.info('Redis client connection closed');
        });

        // Connect to Redis
        await redisClient.connect();
        
        // Test connection
        await redisClient.ping();
        logger.info('✅ Azure Managed Redis connected with Microsoft Entra ID');

        // Set up automatic token refresh (Entra tokens expire after ~60 minutes)
        tokenRefreshInterval = setInterval(async () => {
            try {
                const newToken = await credential.getToken('https://redis.azure.com/.default');
                await redisClient.auth({ 
                    username: config.username, 
                    password: newToken.token 
                });
                logger.info('Redis Entra ID token refreshed successfully');
            } catch (err) {
                logger.error('Failed to refresh Redis token:', err);
            }
        }, 50 * 60 * 1000); // Refresh every 50 minutes (tokens last ~60 min)

        return redisClient;
    } catch (error) {
        logger.error('Failed to connect to Redis with Entra ID:', error);
        throw error;
    }
}

/**
 * Get the Redis client instance
 */
export function getRedisClient() {
    if (!redisClient || !redisClient.isOpen) {
        throw new Error('Redis client not initialized. Call connectRedis() first.');
    }
    return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis() {
    if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        tokenRefreshInterval = null;
    }
    
    if (redisClient) {
        await redisClient.quit();
        logger.info('Redis connection closed');
    }
}

/**
 * Session management utilities
 */
export const sessionManager = {
    /**
     * Set a session with expiry
     * @param {string} key - Session key (typically wallet address or user ID)
     * @param {object} value - Session data
     * @param {number} expirySeconds - Time to live in seconds (default: 1 hour)
     */
    async setSession(key, value, expirySeconds = 3600) {
        const client = getRedisClient();
        await client.setEx(`session:${key}`, expirySeconds, JSON.stringify(value));
        logger.debug(`Session set for key: ${key}, TTL: ${expirySeconds}s`);
    },

    /**
     * Get a session
     * @param {string} key - Session key
     * @returns {object|null} Session data or null if not found
     */
    async getSession(key) {
        const client = getRedisClient();
        const data = await client.get(`session:${key}`);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Delete a session
     * @param {string} key - Session key
     */
    async deleteSession(key) {
        const client = getRedisClient();
        await client.del(`session:${key}`);
        logger.debug(`Session deleted for key: ${key}`);
    },

    /**
     * Check if session exists
     * @param {string} key - Session key
     * @returns {boolean} True if session exists
     */
    async exists(key) {
        const client = getRedisClient();
        return (await client.exists(`session:${key}`)) === 1;
    },

    /**
     * Extend session expiry
     * @param {string} key - Session key
     * @param {number} expirySeconds - New TTL in seconds
     */
    async extendSession(key, expirySeconds = 3600) {
        const client = getRedisClient();
        await client.expire(`session:${key}`, expirySeconds);
    }
};

/**
 * Rate limiting utilities
 */
export const rateLimiter = {
    /**
     * Check and increment rate limit
     * @param {string} identifier - Unique identifier (e.g., IP, wallet address)
     * @param {number} maxRequests - Maximum requests allowed in window
     * @param {number} windowSeconds - Time window in seconds
     * @returns {object} { allowed: boolean, remaining: number, resetTime: number }
     */
    async checkLimit(identifier, maxRequests = 100, windowSeconds = 900) {
        const client = getRedisClient();
        const key = `ratelimit:${identifier}`;
        
        const current = await client.get(key);
        
        if (!current) {
            // First request in window
            await client.setEx(key, windowSeconds, '1');
            const resetTime = Date.now() + (windowSeconds * 1000);
            return { 
                allowed: true, 
                remaining: maxRequests - 1, 
                resetTime 
            };
        }

        const count = parseInt(current);
        
        if (count >= maxRequests) {
            const ttl = await client.ttl(key);
            const resetTime = Date.now() + (ttl * 1000);
            logger.warn(`Rate limit exceeded for: ${identifier}`);
            return { 
                allowed: false, 
                remaining: 0, 
                resetTime 
            };
        }

        await client.incr(key);
        const ttl = await client.ttl(key);
        const resetTime = Date.now() + (ttl * 1000);
        return { 
            allowed: true, 
            remaining: maxRequests - count - 1, 
            resetTime 
        };
    },

    /**
     * Reset rate limit for an identifier
     * @param {string} identifier - Identifier to reset
     */
    async resetLimit(identifier) {
        const client = getRedisClient();
        await client.del(`ratelimit:${identifier}`);
        logger.debug(`Rate limit reset for: ${identifier}`);
    }
};

/**
 * Caching utilities
 */
export const cache = {
    /**
     * Set a cache entry
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} expirySeconds - Time to live in seconds (default: 1 hour)
     */
    async set(key, value, expirySeconds = 3600) {
        const client = getRedisClient();
        await client.setEx(`cache:${key}`, expirySeconds, JSON.stringify(value));
        logger.debug(`Cache set for key: ${key}, TTL: ${expirySeconds}s`);
    },

    /**
     * Get a cache entry
     * @param {string} key - Cache key
     * @returns {any|null} Cached value or null if not found/expired
     */
    async get(key) {
        const client = getRedisClient();
        const data = await client.get(`cache:${key}`);
        return data ? JSON.parse(data) : null;
    },

    /**
     * Delete a cache entry
     * @param {string} key - Cache key
     */
    async del(key) {
        const client = getRedisClient();
        await client.del(`cache:${key}`);
        logger.debug(`Cache deleted for key: ${key}`);
    },

    /**
     * Check if cache entry exists
     * @param {string} key - Cache key
     * @returns {boolean} True if exists
     */
    async exists(key) {
        const client = getRedisClient();
        return (await client.exists(`cache:${key}`)) === 1;
    },

    /**
     * Set cache with pattern-based invalidation support
     * @param {string} pattern - Pattern for grouping (e.g., 'user:123')
     * @param {string} key - Specific cache key
     * @param {any} value - Value to cache
     * @param {number} expirySeconds - TTL in seconds
     */
    async setWithPattern(pattern, key, value, expirySeconds = 3600) {
        const client = getRedisClient();
        const fullKey = `cache:${pattern}:${key}`;
        await client.setEx(fullKey, expirySeconds, JSON.stringify(value));
    },

    /**
     * Invalidate all cache entries matching a pattern
     * @param {string} pattern - Pattern to match (e.g., 'user:123:*')
     */
    async invalidatePattern(pattern) {
        const client = getRedisClient();
        const keys = await client.keys(`cache:${pattern}`);
        if (keys.length > 0) {
            await client.del(keys);
            logger.debug(`Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
        }
    }
};

/**
 * Nonce/Challenge management for authentication
 */
export const challengeManager = {
    /**
     * Store a challenge/nonce
     * @param {string} identifier - User identifier (wallet address)
     * @param {string} challenge - Challenge value
     * @param {number} expirySeconds - TTL in seconds (default: 5 minutes)
     */
    async setChallenge(identifier, challenge, expirySeconds = 300) {
        const client = getRedisClient();
        await client.setEx(`challenge:${identifier}`, expirySeconds, challenge);
    },

    /**
     * Get and delete a challenge (one-time use)
     * @param {string} identifier - User identifier
     * @returns {string|null} Challenge value or null
     */
    async getAndDeleteChallenge(identifier) {
        const client = getRedisClient();
        const key = `challenge:${identifier}`;
        const challenge = await client.get(key);
        if (challenge) {
            await client.del(key);
        }
        return challenge;
    }
};

export default {
    connectRedis,
    getRedisClient,
    closeRedis,
    sessionManager,
    rateLimiter,
    cache,
    challengeManager
};
