import { getPool } from './connection.js';

/**
 * Store identity commitment in database
 */
export async function storeIdentity(identityData) {
    const pool = getPool();
    
    const query = `
        INSERT INTO identities (
            wallet_address, 
            identity_commitment, 
            merkle_root, 
            transaction_signature
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
            identity_commitment = EXCLUDED.identity_commitment,
            merkle_root = EXCLUDED.merkle_root,
            transaction_signature = EXCLUDED.transaction_signature,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *
    `;
    
    const values = [
        identityData.wallet_address,
        identityData.identity_commitment,
        identityData.merkle_root,
        identityData.transaction_signature
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Get identity by wallet address
 */
export async function getIdentity(walletAddress) {
    const pool = getPool();
    
    const query = `
        SELECT * FROM identities 
        WHERE wallet_address = $1
    `;
    
    const result = await pool.query(query, [walletAddress]);
    return result.rows[0];
}

/**
 * Update identity verification status
 */
export async function updateIdentityVerification(walletAddress, attributeBit, txSignature) {
    const pool = getPool();
    
    const query = `
        UPDATE identities 
        SET 
            is_verified = TRUE,
            verification_timestamp = EXTRACT(EPOCH FROM NOW())::BIGINT,
            attributes_verified = attributes_verified | $2,
            transaction_signature = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = $1
        RETURNING *
    `;
    
    const result = await pool.query(query, [walletAddress, attributeBit, txSignature]);
    return result.rows[0];
}

/**
 * Store verification proof in audit trail
 */
export async function storeVerificationProof(proofData) {
    const pool = getPool();
    
    // First, get identity_id from wallet_address
    const identityQuery = `SELECT id FROM identities WHERE wallet_address = $1`;
    const identityResult = await pool.query(identityQuery, [proofData.wallet_address]);
    
    if (identityResult.rows.length === 0) {
        throw new Error('Identity not found');
    }
    
    const identityId = identityResult.rows[0].id;
    
    const query = `
        INSERT INTO verification_proofs (
            identity_id,
            proof_hash,
            public_inputs_hash,
            attribute_type,
            transaction_signature,
            verifier_address
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
    `;
    
    const values = [
        identityId,
        proofData.proof_hash,
        proofData.public_inputs_hash,
        proofData.attribute_type,
        proofData.transaction_signature,
        proofData.verifier_address
    ];
    
    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Get all identities (with pagination)
 */
export async function getAllIdentities(limit = 100, offset = 0) {
    const pool = getPool();
    
    const query = `
        SELECT * FROM identities 
        ORDER BY created_at DESC 
        LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
}

/**
 * Get verification statistics
 */
export async function getVerificationStats() {
    const pool = getPool();
    
    const query = `
        SELECT 
            COUNT(*) as total_identities,
            COUNT(*) FILTER (WHERE is_verified = TRUE) as verified_identities,
            COUNT(*) FILTER (WHERE attributes_verified & 1 > 0) as age_verified,
            COUNT(*) FILTER (WHERE attributes_verified & 2 > 0) as nationality_verified,
            COUNT(*) FILTER (WHERE attributes_verified & 4 > 0) as uniqueness_verified
        FROM identities
    `;
    
    const result = await pool.query(query);
    return result.rows[0];
}
