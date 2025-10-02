import { Router } from 'express';
import { parseAadhaarQR, verifyAadhaarSignature } from '../utils/aadhaar.js';
import { generateIdentityCommitment } from '../utils/crypto.js';
import { storeIdentity, getIdentity } from '../db/queries.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/identity/parse-qr
 * Parse Aadhaar QR code and extract demographic data
 */
router.post('/parse-qr', async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ error: 'QR data is required' });
        }

        // Parse QR code
        const parsedData = parseAadhaarQR(qrData);
        
        // Verify UIDAI signature
        const isValid = await verifyAadhaarSignature(parsedData);
        
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid Aadhaar signature' });
        }

        // Generate identity commitment (hash of sensitive data)
        const commitment = generateIdentityCommitment(parsedData);

        // Return sanitized data (no personal info)
        res.json({
            success: true,
            commitment,
            hasValidSignature: true,
            // Only return non-sensitive metadata
            metadata: {
                timestamp: parsedData.timestamp,
                version: parsedData.version
            }
        });

    } catch (error) {
        logger.error('Error parsing QR code:', error);
        res.status(500).json({ error: 'Failed to parse QR code' });
    }
});

/**
 * POST /api/identity/register
 * Register identity commitment on-chain
 */
router.post('/register', async (req, res) => {
    try {
        const { walletAddress, commitment, merkleRoot, txSignature } = req.body;

        if (!walletAddress || !commitment || !merkleRoot) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Store identity mapping in database
        await storeIdentity({
            wallet_address: walletAddress,
            identity_commitment: commitment,
            merkle_root: merkleRoot,
            transaction_signature: txSignature,
            is_verified: false
        });

        res.json({
            success: true,
            message: 'Identity registered successfully'
        });

    } catch (error) {
        logger.error('Error registering identity:', error);
        res.status(500).json({ error: 'Failed to register identity' });
    }
});

/**
 * GET /api/identity/:walletAddress
 * Get identity information by wallet address
 */
router.get('/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;

        const identity = await getIdentity(walletAddress);

        if (!identity) {
            return res.status(404).json({ error: 'Identity not found' });
        }

        res.json({
            success: true,
            identity: {
                walletAddress: identity.wallet_address,
                isVerified: identity.is_verified,
                verificationTimestamp: identity.verification_timestamp,
                attributesVerified: identity.attributes_verified
            }
        });

    } catch (error) {
        logger.error('Error fetching identity:', error);
        res.status(500).json({ error: 'Failed to fetch identity' });
    }
});

export default router;
