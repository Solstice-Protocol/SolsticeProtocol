import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { challengeManager, rateLimiter } from '../utils/redis.js';

const router = express.Router();

// No longer using in-memory storage - using Redis instead

/**
 * POST /api/challenges/create
 * Create a new verification challenge
 */
router.post('/create', async (req, res) => {
  try {
    const { appId, appName, proofType, params, expirationSeconds, callbackUrl } = req.body;

    if (!appId || !appName || !proofType) {
      return res.status(400).json({
        error: 'Missing required fields: appId, appName, proofType'
      });
    }

    // Rate limiting - 30 challenges per hour per appId
    const limit = await rateLimiter.checkLimit(`challenge:${appId}`, 30, 3600);
    if (!limit.allowed) {
      return res.status(429).json({ 
        error: 'Too many challenge creation requests. Try again later.',
        resetTime: limit.resetTime
      });
    }

    const challengeId = uuidv4();
    const now = Date.now();
    const expirySeconds = expirationSeconds || 300; // Default 5 minutes
    const expiresAt = now + (expirySeconds * 1000);

    const challenge = {
      challengeId,
      appId,
      appName,
      proofType,
      params: params || {},
      expiresAt,
      callbackUrl,
      nonce: uuidv4(),
      createdAt: now,
      status: 'pending', // pending, completed, expired
      proofResponse: null
    };

    // Store in Redis with TTL (auto-expires)
    await challengeManager.setChallenge(challengeId, JSON.stringify(challenge), expirySeconds);

    logger.info(`Created challenge ${challengeId} for app ${appId}`);

    res.json({
      success: true,
      challenge: {
        challengeId: challenge.challengeId,
        appId: challenge.appId,
        appName: challenge.appName,
        proofType: challenge.proofType,
        params: challenge.params,
        expiresAt: challenge.expiresAt,
        callbackUrl: challenge.callbackUrl,
        nonce: challenge.nonce,
        createdAt: challenge.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating challenge:', error);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

/**
 * GET /api/challenges/:id/status
 * Get challenge status (for polling)
 */
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const challengeData = await challengeManager.getAndDeleteChallenge(id);

    if (!challengeData) {
      return res.status(404).json({ error: 'Challenge not found or expired' });
    }

    const challenge = JSON.parse(challengeData);

    // Check expiration
    if (Date.now() > challenge.expiresAt && challenge.status === 'pending') {
      challenge.status = 'expired';
    }

    // If not consuming (just checking status), put it back
    if (challenge.status === 'pending') {
      const ttl = Math.floor((challenge.expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        await challengeManager.setChallenge(id, JSON.stringify(challenge), ttl);
      }
    }

    res.json({
      challengeId: challenge.challengeId,
      status: challenge.status,
      proofResponse: challenge.proofResponse,
      expiresAt: challenge.expiresAt
    });
  } catch (error) {
    logger.error('Error getting challenge status:', error);
    res.status(500).json({ error: 'Failed to get challenge status' });
  }
});

/**
 * POST /api/challenges/:id/respond
 * Submit a proof response (from main Solstice app)
 */
router.post('/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const proofResponse = req.body;

    const challengeData = await challengeManager.getAndDeleteChallenge(id);

    if (!challengeData) {
      return res.status(404).json({ error: 'Challenge not found or expired' });
    }

    const challenge = JSON.parse(challengeData);

    if (challenge.status !== 'pending') {
      logger.warn(`Challenge ${id} is ${challenge.status}, expected pending`);
      return res.status(400).json({ error: `Challenge is ${challenge.status}` });
    }

    if (Date.now() > challenge.expiresAt) {
      return res.status(400).json({ error: 'Challenge has expired' });
    }

    // Validate proof response structure
    if (!proofResponse.challengeId || !proofResponse.proof || !proofResponse.identityCommitment) {
      logger.error('Invalid proof response format:', {
        hasChallengeId: !!proofResponse.challengeId,
        hasProof: !!proofResponse.proof,
        hasIdentityCommitment: !!proofResponse.identityCommitment
      });
      return res.status(400).json({ error: 'Invalid proof response format' });
    }

    // Verify challenge ID matches
    if (proofResponse.challengeId !== id) {
      return res.status(400).json({ error: 'Challenge ID mismatch' });
    }

    // Update challenge with proof response
    challenge.status = 'completed';
    challenge.proofResponse = proofResponse;
    challenge.completedAt = Date.now();
    
    // Store completed challenge for verification (30 minute TTL)
    await challengeManager.setChallenge(id, JSON.stringify(challenge), 1800);

    logger.info(`Challenge ${id} completed with proof`);

    // If callback URL is provided, send notification (optional)
    if (challenge.callbackUrl) {
      try {
        // In production, use a proper HTTP client
        logger.info(`Would send callback to: ${challenge.callbackUrl}`);
        // await fetch(challenge.callbackUrl, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ challengeId: id, proofResponse })
        // });
      } catch (callbackError) {
        logger.error('Callback failed:', callbackError);
        // Don't fail the request if callback fails
      }
    }

    res.json({
      success: true,
      challengeId: id,
      status: 'completed'
    });
  } catch (error) {
    logger.error('Error submitting proof response:', error);
    res.status(500).json({ error: 'Failed to submit proof response' });
  }
});

/**
 * POST /api/challenges/:id/verify
 * Verify a proof response (for third-party apps)
 */
router.post('/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;

    const challengeData = await challengeManager.getAndDeleteChallenge(id);

    if (!challengeData) {
      return res.status(404).json({ error: 'Challenge not found or expired' });
    }

    const challenge = JSON.parse(challengeData);

    if (challenge.status !== 'completed') {
      // Put it back if not completed
      const ttl = Math.floor((challenge.expiresAt - Date.now()) / 1000);
      if (ttl > 0) {
        await challengeManager.setChallenge(id, JSON.stringify(challenge), ttl);
      }
      return res.status(400).json({
        error: `Challenge is ${challenge.status}`,
        verified: false
      });
    }

    // Use the stored proof response from the challenge
    const proofResponse = challenge.proofResponse;

    if (!proofResponse) {
      return res.status(400).json({
        error: 'No proof response available',
        verified: false
      });
    }

    // Basic verification (in production, verify ZK proof cryptographically)
    const isValid = 
      proofResponse.challengeId === id &&
      proofResponse.proof &&
      proofResponse.proof.pi_a &&
      proofResponse.proof.publicSignals &&
      proofResponse.identityCommitment;

    logger.info(`Proof verification for challenge ${id}: ${isValid ? 'PASSED' : 'FAILED'}`);

    res.json({
      verified: isValid,
      challengeId: id,
      metadata: {
        proofType: challenge.proofType,
        identityCommitment: proofResponse.identityCommitment,
        timestamp: challenge.completedAt
      }
    });
  } catch (error) {
    logger.error('Error verifying proof:', error);
    res.status(500).json({ error: 'Failed to verify proof' });
  }
});

/**
 * GET /api/challenges/:id
 * Get full challenge details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const challengeData = await challengeManager.getAndDeleteChallenge(id);

    if (!challengeData) {
      return res.status(404).json({ error: 'Challenge not found or expired' });
    }

    const challenge = JSON.parse(challengeData);
    
    // Put it back with remaining TTL
    const ttl = Math.floor((challenge.expiresAt - Date.now()) / 1000);
    if (ttl > 0) {
      await challengeManager.setChallenge(id, challengeData, ttl);
    }

    // Don't expose proof response in public endpoint
    const { proofResponse, ...publicChallenge } = challenge;

    res.json({
      success: true,
      challenge: publicChallenge
    });
  } catch (error) {
    logger.error('Error getting challenge:', error);
    res.status(500).json({ error: 'Failed to get challenge' });
  }
});

/**
 * GET /api/challenges
 * List all challenges (for debugging in development)
 */
router.get('/', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: 'Endpoint only available in development' });
    }

    const allChallenges = Array.from(challenges.values()).map(c => ({
      challengeId: c.challengeId,
      appName: c.appName,
      status: c.status,
      proofType: c.proofType,
      createdAt: c.createdAt,
      expiresAt: c.expiresAt
    }));

    res.json({
      success: true,
      count: allChallenges.length,
      challenges: allChallenges
    });
  } catch (error) {
    logger.error('Error listing challenges:', error);
    res.status(500).json({ error: 'Failed to list challenges' });
  }
});

export default router;
