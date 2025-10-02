import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// In-memory session store (use Redis in production)
const sessions = new Map();

/**
 * Create authentication session
 */
export async function createSession(walletAddress) {
    const sessionId = uuidv4();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    const session = {
        sessionId,
        walletAddress,
        token,
        createdAt: Date.now(),
        expiresAt,
        isActive: true
    };

    sessions.set(token, session);

    return session;
}

/**
 * Verify session token
 */
export async function verifySession(token) {
    const session = sessions.get(token);

    if (!session) {
        return { valid: false };
    }

    if (!session.isActive) {
        return { valid: false };
    }

    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return { valid: false };
    }

    return {
        valid: true,
        walletAddress: session.walletAddress,
        expiresAt: session.expiresAt
    };
}

/**
 * Close session
 */
export async function closeSession(token) {
    const session = sessions.get(token);
    
    if (session) {
        session.isActive = false;
        sessions.delete(token);
    }

    return true;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions() {
    const now = Date.now();
    
    for (const [token, session] of sessions.entries()) {
        if (now > session.expiresAt) {
            sessions.delete(token);
        }
    }
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);
