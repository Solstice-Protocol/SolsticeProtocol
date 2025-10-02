import crypto from 'crypto';

/**
 * Generate identity commitment from Aadhaar data
 * This creates a cryptographic commitment without revealing personal information
 */
export function generateIdentityCommitment(aadhaarData) {
    // Combine sensitive data fields
    const dataString = `${aadhaarData.name}|${aadhaarData.dob}|${aadhaarData.gender}|${aadhaarData.address}`;
    
    // Create SHA-256 hash as commitment
    const commitment = crypto
        .createHash('sha256')
        .update(dataString)
        .digest('hex');
    
    return commitment;
}

/**
 * Generate Merkle tree root for compressed accounts
 */
export function generateMerkleRoot(commitments) {
    if (commitments.length === 0) {
        return crypto.createHash('sha256').update('').digest('hex');
    }
    
    if (commitments.length === 1) {
        return commitments[0];
    }
    
    // Simple Merkle tree implementation
    let currentLevel = commitments.map(c => 
        Buffer.from(c, 'hex')
    );
    
    while (currentLevel.length > 1) {
        const nextLevel = [];
        
        for (let i = 0; i < currentLevel.length; i += 2) {
            if (i + 1 < currentLevel.length) {
                const combined = Buffer.concat([currentLevel[i], currentLevel[i + 1]]);
                const hash = crypto.createHash('sha256').update(combined).digest();
                nextLevel.push(hash);
            } else {
                nextLevel.push(currentLevel[i]);
            }
        }
        
        currentLevel = nextLevel;
    }
    
    return currentLevel[0].toString('hex');
}

/**
 * Generate random salt for hashing
 */
export function generateSalt(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash data with salt
 */
export function hashWithSalt(data, salt) {
    return crypto
        .createHash('sha256')
        .update(data + salt)
        .digest('hex');
}

/**
 * Encrypt sensitive data with AES-256
 */
export function encryptData(data, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
        encrypted,
        iv: iv.toString('hex')
    };
}

/**
 * Decrypt data encrypted with AES-256
 */
export function decryptData(encryptedData, key, iv) {
    const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(key, 'hex'),
        Buffer.from(iv, 'hex')
    );
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}
