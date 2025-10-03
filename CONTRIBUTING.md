`# Contributing to Solstice Protocol

Thank you for your interest in contributing to Solstice Protocol! This document provides guidelines and standards for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

##  Getting Started

### 1. Fork and Clone

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/SolsticeProtocol.git
cd SolsticeProtocol

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/SolsticeProtocol.git
```

### 2. Set Up Development Environment

Follow the setup instructions in `TESTING_GUIDE.md`:
- Install dependencies (Node.js, PostgreSQL, Solana CLI)
- Configure environment variables
- Set up database
- Compile circuits
- Start development servers

### 3. Create a Branch

```bash
# Always branch from main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or bug fix branch
git checkout -b fix/issue-number-description
```

## 📝 Development Workflow

### Project Structure

```
SolsticeProtocol/
├── backend/          # Express.js API server
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── db/                # Database queries
│   │   └── routes/            # API routes
│   └── db/
│       └── schema.sql         # Database schema
├── frontend/         # React + TypeScript UI
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── lib/               # Utility functions
│   │   └── contexts/          # React contexts
│   └── public/
│       └── circuits/          # ZK circuit artifacts
├── circuits/         # Zero-knowledge circuits
│   ├── *.circom              # Circuit definitions
│   └── build/                # Compiled artifacts
└── contracts/        # Solana smart contracts
    ├── programs/
    │   └── contracts/
    │       └── src/
    │           ├── lib.rs     # Program entry
    │           └── instructions.rs  # Instructions
    └── target/idl/           # Generated IDL
```

### Code Style Guidelines

#### TypeScript/JavaScript

```typescript
//  Good: Use functional components with hooks
export function MyComponent({ prop }: Props) {
  const [state, setState] = useState<string>('');
  
  useEffect(() => {
    // Side effects here
  }, []);
  
  return <div>{state}</div>;
}

//  Bad: Class components
export class MyComponent extends React.Component {
  // Don't use class components
}

//  Good: Named exports for utilities
export function calculateHash(data: string): string {
  return keccak256(data);
}

//  Good: Async/await with error handling
async function fetchData() {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

//  Bad: Unhandled promises
async function fetchData() {
  return fetch(url).then(r => r.json()); // No error handling
}
```

#### Rust (Smart Contracts)

```rust
//  Good: Clear instruction naming
#[derive(Accounts)]
pub struct RegisterIdentity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init,
        payer = user,
        space = 8 + Identity::SIZE,
        seeds = [b"identity", user.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, Identity>,
    
    pub system_program: Program<'info, System>,
}

//  Good: Proper error handling
pub fn register_identity(ctx: Context<RegisterIdentity>, identity_hash: [u8; 32]) -> Result<()> {
    require!(
        identity_hash != [0u8; 32],
        ErrorCode::InvalidIdentityHash
    );
    
    let identity = &mut ctx.accounts.identity;
    identity.owner = ctx.accounts.user.key();
    identity.identity_hash = identity_hash;
    identity.created_at = Clock::get()?.unix_timestamp;
    
    Ok(())
}

//  Bad: Missing validation
pub fn register_identity(ctx: Context<RegisterIdentity>, identity_hash: [u8; 32]) -> Result<()> {
    ctx.accounts.identity.identity_hash = identity_hash; // No validation!
    Ok(())
}
```

#### Circom (ZK Circuits)

```circom
//  Good: Well-documented circuits
pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * AgeProof - Proves age is above minimum without revealing exact age
 * 
 * Inputs:
 *   - age: Actual age (private)
 *   - salt: Random salt for privacy (private)
 *   - minAge: Minimum required age (public)
 * 
 * Outputs:
 *   - ageCommitment: Poseidon(age, salt) (public)
 *   - isAboveMin: 1 if age >= minAge, 0 otherwise (public)
 */
template AgeProof() {
    signal input age;
    signal input salt;
    signal input minAge;
    
    signal output ageCommitment;
    signal output isAboveMin;
    
    // Commitment using Poseidon hash
    component hasher = Poseidon(2);
    hasher.inputs[0] <== age;
    hasher.inputs[1] <== salt;
    ageCommitment <== hasher.out;
    
    // Age comparison
    component gte = GreaterEqThan(8); // 8 bits = max age 255
    gte.in[0] <== age;
    gte.in[1] <== minAge;
    isAboveMin <== gte.out;
}

component main = AgeProof();
```

### Naming Conventions

- **Components**: PascalCase (`QRScanner`, `ProofsDashboard`)
- **Functions**: camelCase (`generateProof`, `storeProofs`)
- **Constants**: UPPER_SNAKE_CASE (`SOLANA_RPC_URL`, `MAX_AGE`)
- **Files**: kebab-case (`qr-scanner.tsx`, `proof-generator.ts`)
- **Database**: snake_case (`identity_hash`, `created_at`)
- **Solana**: snake_case for instructions (`register_identity`, `verify_proof`)

### Testing Requirements

#### Unit Tests

```typescript
// frontend/src/lib/__tests__/proofGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generateAgeProof } from '../proofGenerator';

describe('generateAgeProof', () => {
  it('should generate valid age proof', async () => {
    const proof = await generateAgeProof({
      age: 25,
      salt: '12345',
      minAge: 18
    });
    
    expect(proof).toBeDefined();
    expect(proof.publicSignals).toHaveLength(3);
    expect(proof.proof).toBeDefined();
  });
  
  it('should fail for invalid age', async () => {
    await expect(generateAgeProof({
      age: -1,
      salt: '12345',
      minAge: 18
    })).rejects.toThrow();
  });
});
```

#### Integration Tests

```typescript
// backend/tests/auth.test.js
import request from 'supertest';
import app from '../src/index.js';

describe('Auth API', () => {
  describe('POST /api/auth/create-session', () => {
    it('should create session with valid signature', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          walletAddress: 'VALID_ADDRESS',
          signature: 'VALID_SIGNATURE',
          message: 'Sign this message'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expiresAt');
    });
    
    it('should reject invalid signature', async () => {
      const response = await request(app)
        .post('/api/auth/create-session')
        .send({
          walletAddress: 'VALID_ADDRESS',
          signature: 'INVALID_SIGNATURE',
          message: 'Sign this message'
        });
      
      expect(response.status).toBe(401);
    });
  });
});
```

#### E2E Tests (Playwright)

```typescript
// frontend/e2e/registration.spec.ts
import { test, expect } from '@playwright/test';

test('complete identity registration flow', async ({ page }) => {
  // 1. Navigate to app
  await page.goto('http://localhost:5173');
  
  // 2. Connect wallet
  await page.click('text=Select Wallet');
  await page.click('text=Phantom');
  // Handle wallet popup...
  
  // 3. Upload QR
  await page.click('text=Scan QR');
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-data/sample-qr.png');
  
  // 4. Register identity
  await page.click('text=Register Identity');
  await expect(page.locator('text=Registration successful')).toBeVisible();
  
  // 5. Verify proofs generated
  await page.click('text=My Proofs');
  await expect(page.locator('text=Age Proof')).toBeVisible();
  await expect(page.locator('text=✓ Valid')).toBeVisible();
});
```

### Commit Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat:     # New feature
fix:      # Bug fix
docs:     # Documentation changes
style:    # Code style (formatting, semicolons, etc.)
refactor: # Code refactoring
perf:     # Performance improvements
test:     # Adding/updating tests
chore:    # Maintenance tasks

# Examples:
git commit -m "feat(frontend): add camera QR scanning"
git commit -m "fix(contracts): resolve AccountNotEnoughKeys error"
git commit -m "docs(readme): update installation instructions"
git commit -m "refactor(backend): improve auth middleware"
git commit -m "test(circuits): add age proof unit tests"
```

### Pull Request Process

1. **Update Your Branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-branch
   git rebase main
   ```

2. **Run Tests**
   ```bash
   # Frontend tests
   cd frontend && npm test
   
   # Backend tests
   cd backend && npm test
   
   # Contract tests
   cd contracts && anchor test
   ```

3. **Check Code Quality**
   ```bash
   # Linting
   npm run lint
   
   # Type checking
   npm run type-check
   
   # Format code
   npm run format
   ```

4. **Create Pull Request**
   - Use descriptive title (follows commit convention)
   - Fill out PR template completely
   - Link related issues (`Fixes #123`, `Closes #456`)
   - Add screenshots/videos for UI changes
   - Request review from maintainers

5. **PR Template**
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   
   ## Screenshots (if applicable)
   [Add screenshots here]
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings generated
   - [ ] Tests added for new features
   ```

## Reporting Bugs

### Before Submitting

1. Check existing issues to avoid duplicates
2. Verify it's reproducible on latest `main` branch
3. Gather debug information (logs, screenshots, steps)

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
Add screenshots if applicable.

**Environment:**
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120]
- Node.js: [e.g., v18.17.0]
- Solana CLI: [e.g., 1.16.0]

**Additional context**
Any other relevant information.

**Logs**
```
[Paste relevant logs here]
```
```

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives considered**
Other solutions you've considered.

**Additional context**
Mockups, examples, or other relevant info.
```

## Documentation

### Documentation Standards

- Keep README.md up-to-date with setup instructions
- Document all public APIs and functions
- Add inline comments for complex logic
- Update WHITEPAPER.md for protocol changes
- Create architecture diagrams for major features

### JSDoc Example

```typescript
/**
 * Generates a zero-knowledge proof for age verification
 * 
 * @param params - Proof generation parameters
 * @param params.age - User's actual age (private)
 * @param params.salt - Random salt for privacy (private)
 * @param params.minAge - Minimum required age (public)
 * @returns Promise resolving to the generated proof
 * @throws {Error} If proof generation fails
 * 
 * @example
 * ```typescript
 * const proof = await generateAgeProof({
 *   age: 25,
 *   salt: '0x12345...',
 *   minAge: 18
 * });
 * ```
 */
export async function generateAgeProof(params: AgeProofParams): Promise<Proof> {
  // Implementation...
}
```

## Security

### Reporting Security Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead:
1. Email security@solsticeprotocol.com
2. Include detailed description
3. Provide steps to reproduce
4. Suggest a fix if possible

We'll respond within 48 hours.

### Security Guidelines

- Never commit private keys or secrets
- Use environment variables for sensitive data
- Validate all user inputs
- Sanitize data before database queries
- Use prepared statements (prevent SQL injection)
- Implement rate limiting on APIs
- Use HTTPS in production
- Keep dependencies updated

## UI/UX Guidelines

- Follow existing design patterns
- Ensure mobile responsiveness
- Test on different screen sizes
- Use Tailwind CSS utility classes
- Maintain consistent spacing (4px grid)
- Use semantic HTML elements
- Ensure keyboard navigation works
- Add loading states for async operations
- Show clear error messages
- Provide visual feedback for user actions

## Release Process

Maintainers will:
1. Create release branch (`release/v1.2.0`)
2. Update version numbers
3. Update CHANGELOG.md
4. Create GitHub release
5. Tag commit (`v1.2.0`)
6. Deploy to production


Thank you for contributing to Solstice Protocol! We appreciate your efforts to make this project better.
