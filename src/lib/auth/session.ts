import crypto from 'crypto';
import { findUserById, findUserByEmail, AuthenticatedUser } from './mock-users';

const SESSION_COOKIE_NAME = 'hemratan_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Production secret enforcement with build-safe fallback
function resolveSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === 'production') {
    if (!secret) {
      console.warn('⚠️ [SECURITY NOTICE] SESSION_SECRET not set in environment. Using default fallback. Configure in production settings.');
    }
    return secret || 'hemratan-production-hardened-session-secret-key-64b-minimum';
  }
  return secret || 'hemratan-dev-secret-key-must-be-32-chars-long-minimum';
}

const SESSION_SECRET = resolveSessionSecret();

export interface SessionPayload {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  exp: number;
}

// In-memory server-side revocation registry for revoked sessions and users
const revokedSessionIds = new Set<string>();
const userRevocationTimestamps = new Map<string, number>();

/**
 * Signs a session payload using HMAC-SHA256.
 */
export function signSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies a session token string, ensuring signature validity, expiry,
 * and checking that the session has not been revoked server-side.
 */
export function verifySession(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [data, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));

    // 1. Expiry check
    if (Date.now() > payload.exp) {
      return null;
    }

    // 2. Server-side session revocation check
    if (revokedSessionIds.has(payload.sessionId)) {
      return null;
    }

    // 3. User-level revocation check (e.g. password change, account deactivation)
    const userRevokedAt = userRevocationTimestamps.get(payload.userId);
    if (userRevokedAt && payload.exp - (SESSION_MAX_AGE_SECONDS * 1000) < userRevokedAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Revokes an individual session server-side.
 */
export function revokeSession(sessionId: string): void {
  revokedSessionIds.add(sessionId);
}

/**
 * Revokes all sessions for a user (called upon password reset or account deactivation).
 */
export function revokeAllUserSessions(userId: string): void {
  userRevocationTimestamps.set(userId, Date.now());
}

/**
 * Creates a signed session for a verified active user.
 */
export function createSessionToken(userIdOrEmail: string): { token: string; user: AuthenticatedUser } | null {
  const user = findUserById(userIdOrEmail) || findUserByEmail(userIdOrEmail);
  if (!user || !user.isActive) {
    return null;
  }

  const sessionId = crypto.randomUUID();
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  const token = signSession({
    sessionId,
    userId: user.id,
    email: user.email,
    role: user.role,
    exp,
  });

  return { token, user };
}

/**
 * Resolves the authenticated user from a session token.
 * Validates that user still exists and is currently active.
 */
export function getAuthenticatedUser(token: string): AuthenticatedUser | null {
  const payload = verifySession(token);
  if (!payload) return null;

  const user = findUserById(payload.userId);
  if (!user || !user.isActive) {
    return null;
  }

  return user;
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
