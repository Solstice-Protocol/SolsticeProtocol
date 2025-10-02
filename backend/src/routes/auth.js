import { Router } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import { createSession, verifySession } from '../utils/session.js';
import { getIdentity } from '../db/queries.js';
import { logger } from '../utils/logger.js';

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

        // Verify wallet ownership through signature
        // TODO: Implement proper signature verification

        // Check if identity is verified
        const identity = await getIdentity(walletAddress);
        
        if (!identity || !identity.is_verified) {
            return res.status(403).json({ error: 'Identity not verified' });
        }

        // Create session
        const session = await createSession(walletAddress);

        res.json({
            success: true,
            sessionId: session.sessionId,
            token: session.token,
            expiresAt: session.expiresAt
        });

    } catch (error) {
        logger.error('Error creating session:', error);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * POST /api/auth/verify-session
 * Verify authentication session token
 */
router.post('/verify-session', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const session = await verifySession(token);

        if (!session.valid) {
            return res.status(401).json({ error: 'Invalid or expired session' });
        }

        res.json({
            success: true,
            walletAddress: session.walletAddress,
            expiresAt: session.expiresAt
        });

    } catch (error) {
        logger.error('Error verifying session:', error);
        res.status(500).json({ error: 'Failed to verify session' });
    }
});

/**
 * POST /api/auth/close-session
 * Close authentication session
 */
router.post('/close-session', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Close session
        // TODO: Implement session closure logic

        res.json({
            success: true,
            message: 'Session closed successfully'
        });

    } catch (error) {
        logger.error('Error closing session:', error);
        res.status(500).json({ error: 'Failed to close session' });
    }
});

export default router;
