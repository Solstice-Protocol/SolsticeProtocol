import { Router } from 'express';
import { generateZKProof, verifyZKProof } from '../utils/zkproof.js';
import { updateIdentityVerification } from '../db/queries.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { rateLimiter, cache } from '../utils/redis.js';

const router = Router();

/**
 * POST /api/proof/generate
 * Generate ZK proof for identity attributes
 */
router.post('/generate', async (req, res) => {
    try {
        const { attributeType, privateInputs, publicInputs } = req.body;

        if (!attributeType || !privateInputs || !publicInputs) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Rate limiting - 20 proof generations per hour per IP
        const limit = await rateLimiter.checkLimit(`proof:${req.ip}`, 20, 3600);
        if (!limit.allowed) {
            return res.status(429).json({ 
                error: 'Too many proof generation requests. Try again later.',
                resetTime: limit.resetTime
            });
        }

        // Validate attribute type
        const validTypes = ['age', 'nationality', 'uniqueness'];
        if (!validTypes.includes(attributeType)) {
            return res.status(400).json({ error: 'Invalid attribute type' });
        }

        // Generate proof (this will be queued for async processing)
        const proofId = uuidv4();
        
        // In production, this would be handled by a worker queue
        const { proof, publicSignals } = await generateZKProof(
            attributeType,
            privateInputs,
            publicInputs
        );

        res.json({
            success: true,
            proofId,
            proof,
            publicSignals,
            message: 'Proof generated successfully'
        });

    } catch (error) {
        logger.error('Error generating proof:', error);
        res.status(500).json({ error: 'Failed to generate proof' });
    }
});

/**
 * POST /api/proof/verify
 * Verify ZK proof off-chain
 */
router.post('/verify', async (req, res) => {
    try {
        const { proof, publicSignals, attributeType } = req.body;

        if (!proof || !publicSignals || !attributeType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify proof
        const isValid = await verifyZKProof(proof, publicSignals, attributeType);

        res.json({
            success: true,
            isValid,
            message: isValid ? 'Proof is valid' : 'Proof is invalid'
        });

    } catch (error) {
        logger.error('Error verifying proof:', error);
        res.status(500).json({ error: 'Failed to verify proof' });
    }
});

/**
 * POST /api/proof/submit
 * Submit proof verification result to update on-chain status
 */
router.post('/submit', async (req, res) => {
    try {
        const { walletAddress, attributeType, txSignature } = req.body;

        if (!walletAddress || !attributeType || !txSignature) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Map attribute type to bitmap
        const attributeMap = {
            'age': 1,
            'nationality': 2,
            'uniqueness': 4
        };

        const attributeBit = attributeMap[attributeType];

        // Update database
        await updateIdentityVerification(
            walletAddress,
            attributeBit,
            txSignature
        );

        res.json({
            success: true,
            message: 'Verification submitted successfully'
        });

    } catch (error) {
        logger.error('Error submitting verification:', error);
        res.status(500).json({ error: 'Failed to submit verification' });
    }
});

/**
 * GET /api/proof/status/:proofId
 * Check proof generation status (for async processing)
 */
router.get('/status/:proofId', async (req, res) => {
    try {
        const { proofId } = req.params;

        // In production, check Redis/queue status
        // For now, return mock status
        res.json({
            success: true,
            proofId,
            status: 'completed',
            progress: 100
        });

    } catch (error) {
        logger.error('Error checking proof status:', error);
        res.status(500).json({ error: 'Failed to check proof status' });
    }
});

export default router;
