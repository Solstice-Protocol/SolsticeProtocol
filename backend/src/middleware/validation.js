import { logger } from '../utils/logger.js';

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address) {
    if (!address || typeof address !== 'string') {
        return false;
    }
    // Solana addresses are base58 encoded and 32-44 characters
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate commitment hash format
 */
export function isValidCommitment(commitment) {
    if (!commitment || typeof commitment !== 'string') {
        return false;
    }
    // 64 character hex string
    return /^[a-fA-F0-9]{64}$/.test(commitment);
}

/**
 * Validate transaction signature format
 */
export function isValidTxSignature(signature) {
    if (!signature || typeof signature !== 'string') {
        return false;
    }
    // Base58 encoded signature, typically 87-88 characters
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Validate proof type
 */
export function isValidProofType(proofType) {
    const validTypes = ['age', 'nationality', 'uniqueness'];
    return validTypes.includes(proofType);
}

/**
 * Validate attribute type bitmap
 */
export function isValidAttributeType(attributeType) {
    return typeof attributeType === 'number' && attributeType >= 1 && attributeType <= 7;
}

/**
 * Sanitize string input
 * Removes HTML tags and limits length
 * Uses multiple passes to ensure all tags are removed
 */
export function sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') {
        return '';
    }
    
    let sanitized = input;
    let previousLength;
    
    // Keep removing HTML tags until no more tags are found
    do {
        previousLength = sanitized.length;
        sanitized = sanitized.replace(/<[^>]*>/g, '');
    } while (sanitized.length !== previousLength);
    
    return sanitized.substring(0, maxLength).trim();
}

/**
 * Middleware to validate wallet address parameter
 */
export function validateWalletAddress(req, res, next) {
    const walletAddress = req.params.walletAddress || req.body.walletAddress;
    
    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }
    
    if (!isValidWalletAddress(walletAddress)) {
        logger.warn(`Invalid wallet address format: ${walletAddress}`);
        return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    
    next();
}

/**
 * Middleware to validate request body size
 */
export function validateBodySize(maxSize = 10 * 1024 * 1024) { // 10MB default
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        
        if (contentLength && parseInt(contentLength) > maxSize) {
            logger.warn(`Request body too large: ${contentLength} bytes`);
            return res.status(413).json({ error: 'Request body too large' });
        }
        
        next();
    };
}

/**
 * Middleware to validate content type
 */
export function validateContentType(req, res, next) {
    const contentType = req.get('content-type');
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({ error: 'Content-Type must be application/json' });
        }
    }
    
    next();
}

/**
 * Validate signature format (base58 encoded, 87-88 characters)
 */
export function isValidSignature(signature) {
    if (!signature || typeof signature !== 'string') {
        return false;
    }
    // Base58 encoded signature, typically 87-88 characters
    return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(signature);
}

/**
 * Validate timestamp is recent (within 5 minutes)
 */
export function isValidTimestamp(timestamp) {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (typeof timestamp !== 'number' || timestamp < 0) {
        return false;
    }
    
    const diff = Math.abs(now - timestamp);
    return diff <= fiveMinutes;
}
