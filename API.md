# API Documentation

## Base URL
- Development: `http://localhost:3000`
- Production: `https://api.solsticeprotocol.com` (configure in `.env`)

## Authentication

Most endpoints require authentication via session token obtained from `/api/auth/create-session`.

Include the token in the `Authorization` header:
```
Authorization: Bearer <token>
```

## Rate Limits

- **Strict endpoints** (auth): 5 requests per 15 minutes
- **Standard endpoints** (API): 100 requests per 15 minutes  
- **Lenient endpoints** (public): 300 requests per 15 minutes

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: When the rate limit window resets

## Endpoints

### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "Solstice Protocol API"
}
```

---

### Identity Endpoints

#### POST /api/identity/parse-qr
Parse Aadhaar QR code and generate identity commitment.

**Request:**
```json
{
  "qrData": "base64_encoded_qr_data"
}
```

**Response:**
```json
{
  "success": true,
  "commitment": "64_char_hex_string",
  "hasValidSignature": true,
  "metadata": {
    "timestamp": 1234567890,
    "version": "2.0"
  }
}
```

**Errors:**
- `400`: Invalid or missing QR data
- `400`: Invalid Aadhaar signature
- `500`: Server error

#### POST /api/identity/register
Register identity commitment on-chain.

**Request:**
```json
{
  "walletAddress": "solana_wallet_address",
  "commitment": "64_char_hex_commitment",
  "merkleRoot": "64_char_hex_merkle_root",
  "txSignature": "transaction_signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Identity registered successfully"
}
```

**Errors:**
- `400`: Missing required fields
- `400`: Invalid wallet address format
- `400`: Invalid commitment format
- `500`: Server error

#### GET /api/identity/:walletAddress
Get identity information by wallet address.

**Response:**
```json
{
  "success": true,
  "identity": {
    "walletAddress": "solana_wallet_address",
    "isVerified": true,
    "verificationTimestamp": 1234567890,
    "attributesVerified": 7
  }
}
```

**Errors:**
- `400`: Invalid wallet address format
- `404`: Identity not found
- `500`: Server error

---

### Proof Endpoints

#### POST /api/proof/generate
Generate zero-knowledge proof (queued for async processing).

**Request:**
```json
{
  "attributeType": "age",
  "privateInputs": {
    "age": 25,
    "nonce": "random_nonce"
  },
  "publicInputs": {
    "minAge": 18,
    "commitment": "commitment_hash"
  }
}
```

**Response:**
```json
{
  "success": true,
  "proofId": "uuid",
  "proof": { ... },
  "publicSignals": [ ... ],
  "message": "Proof generated successfully"
}
```

**Errors:**
- `400`: Missing required fields
- `400`: Invalid attribute type (must be: age, nationality, uniqueness)
- `500`: Server error

#### POST /api/proof/verify
Verify zero-knowledge proof off-chain.

**Request:**
```json
{
  "proof": { ... },
  "publicSignals": [ ... ],
  "attributeType": "age"
}
```

**Response:**
```json
{
  "success": true,
  "isValid": true,
  "message": "Proof is valid"
}
```

**Errors:**
- `400`: Missing required fields
- `500`: Server error

#### POST /api/proof/submit
Submit proof verification to update on-chain status.

**Request:**
```json
{
  "walletAddress": "solana_wallet_address",
  "attributeType": "age",
  "txSignature": "transaction_signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification submitted successfully"
}
```

**Errors:**
- `400`: Missing required fields
- `400`: Invalid wallet address
- `400`: Invalid proof type
- `500`: Server error

---

### Authentication Endpoints

#### POST /api/auth/create-session
Create authentication session.

**Request:**
```json
{
  "walletAddress": "solana_wallet_address",
  "signature": "base58_signature",
  "timestamp": 1234567890
}
```

**Note**: The signature should be created by signing the message:
```
Sign this message to authenticate with Solstice Protocol: {timestamp}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "token": "session_token",
  "expiresAt": 1234567890
}
```

**Errors:**
- `400`: Missing required fields
- `400`: Invalid wallet address format
- `400`: Invalid signature format
- `401`: Timestamp too old (must be within 5 minutes)
- `401`: Invalid signature
- `403`: Identity not verified
- `500`: Server error

#### POST /api/auth/verify-session
Verify session token.

**Request:**
```json
{
  "token": "session_token"
}
```

**Response:**
```json
{
  "success": true,
  "walletAddress": "solana_wallet_address",
  "expiresAt": 1234567890
}
```

**Errors:**
- `400`: Token required
- `401`: Invalid or expired session
- `500`: Server error

#### POST /api/auth/close-session
Close authentication session.

**Request:**
```json
{
  "token": "session_token"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session closed successfully"
}
```

**Errors:**
- `400`: Token required
- `404`: Session not found
- `500`: Server error

---

### Challenge Endpoints

#### POST /api/challenges/create
Create verification challenge for third-party apps.

**Request:**
```json
{
  "appId": "your_app_id",
  "appName": "Your App Name",
  "proofType": "age",
  "params": {
    "minAge": 18
  },
  "expirationSeconds": 300,
  "callbackUrl": "https://yourapp.com/callback"
}
```

**Response:**
```json
{
  "success": true,
  "challenge": {
    "challengeId": "uuid",
    "appId": "your_app_id",
    "appName": "Your App Name",
    "proofType": "age",
    "params": { "minAge": 18 },
    "expiresAt": 1234567890,
    "nonce": "uuid",
    "createdAt": 1234567890
  }
}
```

**Errors:**
- `400`: Missing required fields
- `400`: Invalid proof type
- `400`: Invalid expiration (60-3600 seconds)
- `500`: Server error

#### GET /api/challenges/:id/status
Get challenge status.

**Response:**
```json
{
  "challengeId": "uuid",
  "status": "pending",
  "proofResponse": null,
  "expiresAt": 1234567890
}
```

**Errors:**
- `400`: Invalid challenge ID format
- `404`: Challenge not found
- `500`: Server error

#### POST /api/challenges/:id/respond
Submit proof response to challenge.

**Request:**
```json
{
  "challengeId": "uuid",
  "proof": { ... },
  "identityCommitment": "commitment_hash",
  "publicSignals": [ ... ]
}
```

**Response:**
```json
{
  "success": true,
  "challengeId": "uuid",
  "status": "completed"
}
```

**Errors:**
- `400`: Invalid challenge ID format
- `400`: Invalid proof response format
- `400`: Challenge expired
- `404`: Challenge not found
- `500`: Server error

#### POST /api/challenges/:id/verify
Verify proof response.

**Response:**
```json
{
  "verified": true,
  "challengeId": "uuid",
  "metadata": {
    "proofType": "age",
    "identityCommitment": "commitment_hash",
    "timestamp": 1234567890
  }
}
```

**Errors:**
- `400`: Challenge not completed
- `404`: Challenge not found
- `500`: Server error

#### GET /api/challenges/:id
Get full challenge details.

**Response:**
```json
{
  "success": true,
  "challenge": {
    "challengeId": "uuid",
    "appId": "your_app_id",
    "appName": "Your App Name",
    "proofType": "age",
    "params": {},
    "expiresAt": 1234567890,
    "nonce": "uuid",
    "status": "pending"
  }
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message description"
}
```

In development, stack traces may be included:
```json
{
  "error": "Error message",
  "stack": "..."
}
```

## Common HTTP Status Codes

- `200`: Success
- `400`: Bad Request (validation error)
- `401`: Unauthorized (auth failure)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `413`: Payload Too Large
- `415`: Unsupported Media Type
- `429`: Too Many Requests (rate limit)
- `500`: Internal Server Error
