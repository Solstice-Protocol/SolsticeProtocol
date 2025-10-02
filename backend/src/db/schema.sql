-- Solstice Protocol Database Schema

-- Identity commitments table
CREATE TABLE IF NOT EXISTS identities (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(44) UNIQUE NOT NULL,
    identity_commitment VARCHAR(64) NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    tx_signature VARCHAR(88),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_timestamp BIGINT,
    attributes_verified SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on wallet address for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallet_address ON identities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_is_verified ON identities(is_verified);

-- Verification proofs audit trail
CREATE TABLE IF NOT EXISTS verification_proofs (
    id SERIAL PRIMARY KEY,
    identity_id INTEGER REFERENCES identities(id),
    proof_hash VARCHAR(64) NOT NULL,
    public_inputs_hash VARCHAR(64) NOT NULL,
    attribute_type SMALLINT NOT NULL,
    tx_signature VARCHAR(88),
    verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verifier_address VARCHAR(44)
);

CREATE INDEX IF NOT EXISTS idx_identity_id ON verification_proofs(identity_id);

-- Sessions table (for authentication)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID UNIQUE NOT NULL,
    wallet_address VARCHAR(44) NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_session_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_session_wallet ON sessions(wallet_address);

-- API request logs
CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    wallet_address VARCHAR(44),
    status_code INTEGER,
    response_time INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_logs_wallet ON api_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
