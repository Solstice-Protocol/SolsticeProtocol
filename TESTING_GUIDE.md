# Solstice Protocol - Testing Guide

##  Quick Start Testing

### Prerequisites Checklist
-  Solana Devnet wallet with SOL (get from https://faucet.solana.com/)
-  PostgreSQL installed and running
-  Node.js v18+ installed
-  Chrome/Firefox browser (for camera access)

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd SolsticeProtocol

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install circuit dependencies
cd ../circuits
npm install
```

### 2. Environment Configuration

**Backend (.env)**
```env
# Database
DATABASE_URL=postgresql://localhost:5432/solstice_protocol

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
PROGRAM_ID=8jrTVUyvHrL5WTWyDoa6PTJRhh3MwbvLZXeGT81YjJjz

# Server
PORT=3000
NODE_ENV=development
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3000
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
VITE_PROGRAM_ID=8jrTVUyvHrL5WTWyDoa6PTJRhh3MwbvLZXeGT81YjJjz
VITE_REGISTRY_PDA=7dvtJtRPv522TLgwibTiuz1NVbuzkQKcWAXWiFaTvy8A
```

### 3. Database Setup

```bash
# Create database
createdb solstice_protocol

# Run migrations
cd backend
psql -d solstice_protocol -f db/schema.sql
```

### 4. Compile ZK Circuits (if needed)

```bash
cd circuits

# Compile all circuits (age, nationality, uniqueness)
npm run compile:all

# Generate proving/verification keys
npm run setup:all

# Copy artifacts to frontend
mkdir -p ../frontend/public/circuits
cp build/age_proof_js/age_proof.wasm ../frontend/public/circuits/
cp build/nationality_proof_js/nationality_proof.wasm ../frontend/public/circuits/
cp build/uniqueness_proof_js/uniqueness_proof.wasm ../frontend/public/circuits/
cp build/age_proof_final.zkey ../frontend/public/circuits/
cp build/nationality_proof_final.zkey ../frontend/public/circuits/
cp build/uniqueness_proof_final.zkey ../frontend/public/circuits/
```

### 5. Start Development Servers

**Terminal 1: Backend**
```bash
cd backend
node src/index.js
# Should see: "Solstice Protocol API running on port 3000"
```

**Terminal 2: Frontend**
```bash
cd frontend
npm run dev
# Should see: "Local: http://localhost:5173/"
```

## Testing Workflows

### Test 1: Identity Registration (QR Upload)

1. **Open Frontend**: Navigate to http://localhost:5173/
2. **Connect Wallet**: Click "Select Wallet" → Choose Phantom/Solflare
3. **Approve Connection**: Confirm in wallet popup
4. **Navigate to QR Scanner**: Click "Scan QR" tab
5. **Upload Aadhaar QR**: 
   - Click "Upload from device"
   - Select an Aadhaar QR code image
   - System should detect and parse QR data
6. **Register Identity**:
   - Click "Register Identity on Solana"
   - Approve transaction in wallet
   - Wait for confirmation (~1-2 seconds on devnet)
7. **Verify Registration**:
   - Should see success message
   - Transaction link should be displayed
   - Check wallet for transaction

**Expected Results**:
-  QR data parsed successfully
-  Identity hash generated (Keccak256)
-  Transaction confirmed on-chain
-  Identity account created at PDA

### Test 2: Camera QR Scanning

1. **Open QR Scanner Tab**
2. **Click "Use Camera"**
3. **Grant Camera Permission**: Allow browser camera access
4. **Position QR Code**: Hold Aadhaar QR in front of camera
5. **Wait for Detection**: 
   - Camera scans at ~60fps
   - Purple scanning line animation visible
   - Should detect QR within 1-2 seconds
6. **Automatic Registration**: System auto-registers once QR detected
7. **Close Camera**: Click X button when done

**Expected Results**:
-  Camera opens with live feed
-  Scanning animation shows
-  QR detected automatically
-  Registration triggered without manual click

### Test 3: ZK Proof Generation

1. **After Registration**: Wait 2-3 seconds for proof generation
2. **Check Progress**: Should see loading indicators:
   - "Generating age proof..."
   - "Generating nationality proof..."
   - "Generating uniqueness proof..."
3. **Navigate to "My Proofs" Tab**
4. **Verify Proofs Displayed**:
   - Age Proof: ✓ Valid (green)
   - Nationality Proof: ✓ Valid (green)
   - Uniqueness Proof: ✓ Valid (green)
5. **Test Share Feature**:
   - Click "Share" on any proof
   - Should copy JSON to clipboard
   - Paste somewhere to verify format
6. **Test Regenerate**:
   - Click "Regenerate Proofs"
   - All proofs should regenerate
   - Timestamps should update

**Expected Results**:
-  All 3 proofs generated successfully
-  Proofs stored in IndexedDB (7-day expiration)
-  Share copies valid JSON
-  Regenerate creates fresh proofs

### Test 4: Proof Expiration

1. **Open Browser DevTools**: F12 → Application → IndexedDB
2. **Navigate to**: SolsticeProofs → proofs
3. **Inspect Proof**: Should have `expiresAt` timestamp
4. **Manually Expire**:
   - Edit `expiresAt` to past date
   - Refresh page
5. **Check Proof Status**: Should show "⚠️ Expired"
6. **Regenerate**: Click "Regenerate Proofs"
7. **Verify New Expiration**: New `expiresAt` should be 7 days future

**Expected Results**:
-  Expired proofs show warning
-  Regenerate creates new valid proofs
-  New expiration is 7 days from now

### Test 5: Backend Authentication

```bash
# Test authentication flow with curl

# 1. Create session (sign message with wallet)
curl -X POST http://localhost:3000/api/auth/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET_ADDRESS",
    "signature": "SIGNATURE_FROM_WALLET",
    "message": "Sign this message to authenticate with Solstice Protocol"
  }'

# Expected: {"token": "...", "expiresAt": "..."}

# 2. Verify session
curl -X POST http://localhost:3000/api/auth/verify-session \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_FROM_STEP_1"}'

# Expected: {"valid": true, "walletAddress": "..."}

# 3. Close session
curl -X POST http://localhost:3000/api/auth/close-session \
  -H "Content-Type: application/json" \
  -d '{"token": "TOKEN_FROM_STEP_1"}'

# Expected: {"message": "Session closed successfully"}
```

### Test 6: On-Chain Verification

```bash
# Check if identity exists on-chain
cd contracts/scripts
ts-node check-identity-exists.ts <YOUR_WALLET_ADDRESS>

# Should show:
# - Identity exists: true/false
# - Identity hash: 0x...
# - Timestamp: ...
# - Is verified: true/false
```

## Common Issues & Troubleshooting

### Issue: "AccountNotEnoughKeys" Error
**Solution**: This was fixed in the architecture update. Ensure you're using the latest code.

### Issue: Camera Not Working
**Symptoms**: Button exists but nothing happens
**Solution**: 
- Check browser permissions (camera access required)
- Use HTTPS or localhost (camera requires secure context)
- Try different browser (Chrome/Firefox recommended)

### Issue: Proofs Not Generating
**Symptoms**: Stuck on "Generating proofs..."
**Solution**:
1. Check circuit artifacts exist: `ls frontend/public/circuits/`
2. Should see: `age_proof.wasm`, `nationality_proof.wasm`, `uniqueness_proof.wasm`, `*.zkey` files
3. If missing, run: `cd circuits && npm run build`

### Issue: Transaction Fails
**Symptoms**: "Transaction failed" error
**Solution**:
1. Check wallet has SOL: `solana balance -u devnet`
2. Get devnet SOL: https://faucet.solana.com/
3. Check program deployed: `solana program show -u devnet 8jrTVUyvHrL5WTWyDoa6PTJRhh3MwbvLZXeGT81YjJjz`

### Issue: Backend Won't Start
**Symptoms**: "PostgreSQL connection failed"
**Solution**:
1. Check PostgreSQL running: `pg_isready`
2. Check database exists: `psql -l | grep solstice_protocol`
3. Create if missing: `createdb solstice_protocol`
4. Run migrations: `psql -d solstice_protocol -f db/schema.sql`

### Issue: "Invalid QR Code" Error
**Symptoms**: QR upload fails
**Solution**:
- Use valid Aadhaar Secure QR code (generated after 2019)
- QR must contain XML data (starts with `<?xml`)
- Try different QR image (clear, well-lit photo)

##  Performance Benchmarks

### Expected Timings
- **QR Upload & Parse**: < 500ms
- **Identity Registration**: 1-2 seconds (devnet)
- **Proof Generation (all 3)**: 3-5 seconds
- **Camera QR Detection**: 1-2 seconds
- **IndexedDB Write**: < 100ms

### Resource Usage
- **Circuit Artifacts**: ~2 MB total
- **IndexedDB Storage**: ~50 KB per proof set
- **Memory Usage**: ~100 MB (frontend)
- **Network**: ~50 KB upload per registration

## Debug Mode

### Enable Verbose Logging

**Frontend (App.tsx)**
```typescript
// Add to top of file
const DEBUG = true;

// Logs will show:
// - QR parsing details
// - Proof generation progress
// - Transaction IDs
// - Error stack traces
```

**Backend (src/index.js)**
```javascript
// Already enabled in development
// Check logs/combined.log for full details
// Check logs/error.log for errors only
```

### Inspect Network Traffic

1. Open DevTools → Network tab
2. Filter: XHR
3. Watch for:
   - `/api/auth/create-session` (POST)
   - Solana RPC calls (POST to RPC URL)
4. Check status codes (200 = success)

### Inspect IndexedDB

1. DevTools → Application → IndexedDB
2. Navigate to: SolsticeProofs → proofs
3. Inspect stored proofs:
   - `age_proof`: Contains proof, publicSignals
   - `nationality_proof`: Contains proof, publicSignals
   - `uniqueness_proof`: Contains proof, publicSignals
   - Each has `generatedAt` and `expiresAt` timestamps
