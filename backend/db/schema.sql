-- Solstice Protocol Database Schema
-- PostgreSQL Schema for Identity Verification System

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS verification_sessions CASCADE;
DROP TABLE IF EXISTS identity_verifications CASCADE;
DROP TABLE IF EXISTS identities CASCADE;

-- Identities table - stores identity commitments and wallet mappings
CREATE TABLE identities (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) NOT NULL UNIQUE,
    identity_commitment VARCHAR(66) NOT NULL UNIQUE,
    merkle_root VARCHAR(66),
    nullifier_hash VARCHAR(66),
    is_verified BOOLEAN DEFAULT false,
    attributes_verified INTEGER DEFAULT 0, -- Bitmap: 1=age, 2=nationality, 4=uniqueness
    transaction_signature VARCHAR(88),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Identity verifications table - stores individual ZK proof verifications
CREATE TABLE identity_verifications (
    id SERIAL PRIMARY KEY,
    identity_id INTEGER REFERENCES identities(id) ON DELETE CASCADE,
    wallet_address VARCHAR(44) NOT NULL,
    attribute_type VARCHAR(20) NOT NULL CHECK (attribute_type IN ('age', 'nationality', 'uniqueness')),
    proof_data JSONB NOT NULL,
    public_signals JSONB NOT NULL,
    transaction_signature VARCHAR(88) NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Verification sessions table - tracks active authentication sessions
CREATE TABLE verification_sessions (
    id SERIAL PRIMARY KEY,
    session_token VARCHAR(256) NOT NULL UNIQUE,
    wallet_address VARCHAR(44) NOT NULL,
    identity_id INTEGER REFERENCES identities(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Audit log for important operations
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX idx_identities_wallet ON identities(wallet_address);
CREATE INDEX idx_identities_commitment ON identities(identity_commitment);
CREATE INDEX idx_identities_verified ON identities(is_verified);
CREATE INDEX idx_verifications_identity ON identity_verifications(identity_id);
CREATE INDEX idx_verifications_wallet ON identity_verifications(wallet_address);
CREATE INDEX idx_verifications_type ON identity_verifications(attribute_type);
CREATE INDEX idx_verifications_timestamp ON identity_verifications(verified_at DESC);
CREATE INDEX idx_sessions_token ON verification_sessions(session_token);
CREATE INDEX idx_sessions_wallet ON verification_sessions(wallet_address);
CREATE INDEX idx_sessions_expires ON verification_sessions(expires_at);
CREATE INDEX idx_sessions_active ON verification_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_audit_wallet ON audit_log(wallet_address);
CREATE INDEX idx_audit_timestamp ON audit_log(created_at DESC);

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on identities table
CREATE TRIGGER update_identities_updated_at 
    BEFORE UPDATE ON identities
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM verification_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Table comments for documentation
COMMENT ON TABLE identities IS 'Stores identity commitments from Aadhaar QR codes mapped to Solana wallet addresses';
COMMENT ON TABLE identity_verifications IS 'Records of zero-knowledge proof verifications for specific identity attributes';
COMMENT ON TABLE verification_sessions IS 'Active authentication sessions for dApp integrations';
COMMENT ON TABLE audit_log IS 'Audit trail for security and compliance';

COMMENT ON COLUMN identities.attributes_verified IS 'Bitmap: 1=age verified, 2=nationality verified, 4=uniqueness verified, 7=all verified';
COMMENT ON COLUMN identities.identity_commitment IS 'Poseidon hash of identity attributes from Aadhaar';
COMMENT ON COLUMN identities.merkle_root IS 'Root of merkle tree for batch verification';

-- Insert initial data (optional)
-- You can add test data here if needed

-- Success message
DO $$
BEGIN
    RAISE NOTICE '  Solstice Protocol database schema created successfully!';
    RAISE NOTICE ' Tables created: identities, identity_verifications, verification_sessions, audit_log';
    RAISE NOTICE '🔍 Indexes created for performance optimization';
    RAISE NOTICE '⚡ Triggers and functions configured';
END $$;
