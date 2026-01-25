import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/**
 * Generate a JWT access token
 * @param {object} payload - Token payload (user data)
 * @param {string} expiresIn - Expiry time (default: 1h)
 * @returns {string} Signed JWT token
 */
export function signToken(payload, expiresIn = JWT_EXPIRY) {
    try {
        const token = jwt.sign(
            {
                ...payload,
                type: 'access',
                iat: Math.floor(Date.now() / 1000)
            },
            JWT_SECRET,
            { 
                expiresIn,
                issuer: 'solstice-protocol',
                audience: 'solstice-api'
            }
        );
        
        logger.debug(`JWT token generated for ${payload.walletAddress || 'unknown'}`);
        return token;
    } catch (error) {
        logger.error('Error signing JWT token:', error);
        throw new Error('Failed to generate token');
    }
}

/**
 * Generate a JWT refresh token
 * @param {object} payload - Token payload (user data)
 * @returns {string} Signed JWT refresh token
 */
export function signRefreshToken(payload) {
    try {
        const token = jwt.sign(
            {
                walletAddress: payload.walletAddress,
                sessionId: payload.sessionId,
                type: 'refresh',
                iat: Math.floor(Date.now() / 1000)
            },
            JWT_SECRET,
            { 
                expiresIn: JWT_REFRESH_EXPIRY,
                issuer: 'solstice-protocol',
                audience: 'solstice-api'
            }
        );
        
        logger.debug(`JWT refresh token generated for ${payload.walletAddress}`);
        return token;
    } catch (error) {
        logger.error('Error signing JWT refresh token:', error);
        throw new Error('Failed to generate refresh token');
    }
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload or null if invalid
 */
export function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'solstice-protocol',
            audience: 'solstice-api'
        });
        
        return {
            valid: true,
            payload: decoded,
            walletAddress: decoded.walletAddress,
            sessionId: decoded.sessionId,
            expiresAt: decoded.exp * 1000, // Convert to milliseconds
            issuedAt: decoded.iat * 1000
        };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn('JWT token expired:', error.message);
            return {
                valid: false,
                error: 'Token expired',
                expiredAt: error.expiredAt
            };
        } else if (error.name === 'JsonWebTokenError') {
            logger.warn('Invalid JWT token:', error.message);
            return {
                valid: false,
                error: 'Invalid token'
            };
        } else {
            logger.error('JWT verification error:', error);
            return {
                valid: false,
                error: 'Verification failed'
            };
        }
    }
}

/**
 * Verify a refresh token and return payload
 * @param {string} token - JWT refresh token
 * @returns {object} Decoded token payload or null if invalid
 */
export function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'solstice-protocol',
            audience: 'solstice-api'
        });
        
        if (decoded.type !== 'refresh') {
            logger.warn('Invalid token type for refresh');
            return {
                valid: false,
                error: 'Invalid token type'
            };
        }
        
        return {
            valid: true,
            payload: decoded,
            walletAddress: decoded.walletAddress,
            sessionId: decoded.sessionId
        };
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            logger.warn('Refresh token expired:', error.message);
            return {
                valid: false,
                error: 'Refresh token expired'
            };
        }
        logger.error('Refresh token verification error:', error);
        return {
            valid: false,
            error: 'Invalid refresh token'
        };
    }
}

/**
 * Decode a JWT token without verification (for debugging)
 * @param {string} token - JWT token to decode
 * @returns {object|null} Decoded token or null
 */
export function decodeToken(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        logger.error('Error decoding JWT token:', error);
        return null;
    }
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
export function extractBearerToken(authHeader) {
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
}

/**
 * Middleware to verify JWT token from Authorization header
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
export function authenticateJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = extractBearerToken(authHeader);
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const verification = verifyToken(token);
    
    if (!verification.valid) {
        return res.status(401).json({ 
            error: 'Invalid or expired token',
            reason: verification.error
        });
    }
    
    // Attach user info to request
    req.user = {
        walletAddress: verification.walletAddress,
        sessionId: verification.sessionId,
        payload: verification.payload
    };
    
    next();
}

export default {
    signToken,
    signRefreshToken,
    verifyToken,
    verifyRefreshToken,
    decodeToken,
    extractBearerToken,
    authenticateJWT
};
