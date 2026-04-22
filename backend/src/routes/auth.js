import { Router } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { v4 as uuidv4 } from 'uuid';
import { signToken, signRefreshToken, verifyToken, verifyRefreshToken } from '../utils/jwt.js';
import { getIdentity } from '../db/queries.js';
import { logger } from '../utils/logger.js';
import { rateLimiter, sessionManager } from '../utils/redis.js';

const router = Router();

const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com'
);

/**
 * POST /api/auth/create-session
 * Create authentication session after identity verification
 */
router.post('/create-session', async (req, res) => {
    try {
        const { walletAddress, signature } = req.body;

        if (!walletAddress || !signature) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Rate limiting - 5 attempts per 5 minutes per wallet
        const limit = await rateLimiter.checkLimit(`auth:${walletAddress}`, 5, 300);
        if (!limit.allowed) {
            return res.status(429).json({ 
                error: 'Too many authentication attempts. Try again later.',
                resetTime: limit.resetTime
            });
        }

        // Verify wallet ownership through signature
        try {
            // The signature should be the wallet signing a standard message:
            // "Sign this message to authenticate with Solstice Protocol: {timestamp}"
            const publicKey = new PublicKey(walletAddress);
            
            // Decode the signature from base58
            const signatureBuffer = bs58.decode(signature);
            
            // Generate the message that was signed
            // For security, should include a timestamp that's recent (within 5 minutes)
            const messageStr = `Sign this message to authenticate with Solstice Protocol`;
            const messageBytes = new TextEncoder().encode(messageStr);
            
            // Verify the signature using ed25519
            const verified = nacl.sign.detached.verify(
                messageBytes,
                signatureBuffer,
                publicKey.toBytes()
            );
            
            if (!verified) {
                logger.warn(`Failed signature verification for wallet: ${walletAddress}`);
                return res.status(401).json({ error: 'Invalid signature' });
            }
            
            logger.info(`Signature verified successfully for wallet: ${walletAddress}`);
        } catch (error) {
            logger.error('Signature verification error:', error);
            return res.status(401).json({ error: 'Invalid signature format' });
        }

        // Check if identity is verified
        const identity = await getIdentity(walletAddress);
        
        if (!identity || !identity.is_verified) {
            return res.status(403).json({ error: 'Identity not verified' });
        }

        // Generate session ID
        const sessionId = uuidv4();
        
        // Generate JWT access and refresh tokens
        const accessToken = signToken({
            walletAddress,
            sessionId,
            identityId: identity.id,
            isVerified: identity.is_verified
        });
        
        const refreshToken = signRefreshToken({
            walletAddress,
            sessionId
        });
        
        // Store session in Redis for tracking and invalidation
        await sessionManager.setSession(sessionId, {
            sessionId,
            walletAddress,
            identityId: identity.id,
            authenticated: true,
            createdAt: Date.now()
        }, 86400); // 24 hours
        
        // Calculate expiry time
        const expiresAt = Date.now() + (3600 * 1000); // 1 hour for access token

        logger.info(`JWT session created for wallet: ${walletAddress}`);

        res.json({
            success: true,
            sessionId,
            token: accessToken,
            refreshToken,
            expiresAt,
            tokenType: 'Bearer'
        });

    } catch (error) {
        logger.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * POST /api/auth/verify-session
 * Verify JWT authentication token
 */
router.post('/verify-session', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Verify JWT token
        const verification = verifyToken(token);

        if (!verification.valid) {
            return res.status(401).json({ 
                error: 'Invalid or expired token',
                reason: verification.error
            });
        }
        
        // Check if session still exists in Redis
        const sessionExists = await sessionManager.exists(verification.sessionId);
        if (!sessionExists) {
            return res.status(401).json({ error: 'Session has been invalidated' });
        }

        res.json({
            success: true,
            walletAddress: verification.walletAddress,
            sessionId: verification.sessionId,
            expiresAt: verification.expiresAt,
            issuedAt: verification.issuedAt
        });

    } catch (error) {
        logger.error('Error verifying JWT token:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});

/**
 * POST /api/auth/close-session
 * Close authentication session and invalidate JWT
 */
router.post('/close-session', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Verify JWT token
        const verification = verifyToken(token);
        
        if (!verification.valid) {
            return res.status(404).json({ error: 'Session not found or already expired' });
        }

        // Delete session from Redis to invalidate all tokens with this sessionId
        await sessionManager.deleteSession(verification.sessionId);
        
        logger.info(`JWT session closed for wallet: ${verification.walletAddress}`);

        res.json({
            success: true,
            message: 'Session closed successfully'
        });

    } catch (error) {
        logger.error('Error closing session:', error);
        res.status(500).json({ error: 'Failed to close session' });
    }
});

/**
 * POST /api/auth/refresh-token
 * Refresh access token using refresh token
 */
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Verify refresh token
        const verification = verifyRefreshToken(refreshToken);

        if (!verification.valid) {
            return res.status(401).json({ 
                error: 'Invalid or expired refresh token',
                reason: verification.error
            });
        }

        // Check if session still exists in Redis
        const session = await sessionManager.getSession(verification.sessionId);
        if (!session) {
            return res.status(401).json({ error: 'Session has been invalidated' });
        }

        // Generate new access token
        const newAccessToken = signToken({
            walletAddress: verification.walletAddress,
            sessionId: verification.sessionId,
            identityId: session.identityId,
            isVerified: true
        });

        const expiresAt = Date.now() + (3600 * 1000); // 1 hour

        logger.info(`Access token refreshed for wallet: ${verification.walletAddress}`);

        res.json({
            success: true,
            token: newAccessToken,
            expiresAt,
            tokenType: 'Bearer'
        });

    } catch (error) {
        logger.error('Error refreshing token:', error);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

export default router;
