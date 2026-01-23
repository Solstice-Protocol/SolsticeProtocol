import { Router } from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { createSession, verifySession, closeSession } from '../utils/session.js';
import { getIdentity } from '../db/queries.js';
import { logger } from '../utils/logger.js';
import { isValidWalletAddress, isValidTimestamp, isValidSignature } from '../middleware/validation.js';

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
        const { walletAddress, signature, timestamp } = req.body;

        if (!walletAddress || !signature || !timestamp) {
            return res.status(400).json({ error: 'Missing required fields: walletAddress, signature, timestamp' });
        }

        // Validate wallet address format
        if (!isValidWalletAddress(walletAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        // Validate signature format
        if (!isValidSignature(signature)) {
            return res.status(400).json({ error: 'Invalid signature format' });
        }

        // Verify timestamp is recent (within 5 minutes)
        if (!isValidTimestamp(timestamp)) {
            logger.warn(`Timestamp validation failed for wallet: ${walletAddress}`);
            return res.status(401).json({ error: 'Timestamp must be within 5 minutes of current time' });
        }

        // Verify wallet ownership through signature
        try {
            // The signature should be the wallet signing a message with timestamp:
            // "Sign this message to authenticate with Solstice Protocol: {timestamp}"
            const publicKey = new PublicKey(walletAddress);
            
            // Decode the signature from base58
            const signatureBuffer = bs58.decode(signature);
            
            // Generate the message that was signed with timestamp nonce
            const messageStr = `Sign this message to authenticate with Solstice Protocol: ${timestamp}`;
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

        // Verify session exists before closing
        const session = await verifySession(token);
        
        if (!session.valid) {
            return res.status(404).json({ error: 'Session not found or already expired' });
        }

        // Close session
        await closeSession(token);
        
        logger.info(`Session closed for wallet: ${session.walletAddress}`);

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
