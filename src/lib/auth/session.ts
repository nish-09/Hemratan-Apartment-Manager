import crypto from 'crypto';
import { SEED_USERS, AuthenticatedUser } from './mock-users';

const SESSION_COOKIE_NAME = 'hemratan_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days
const SESSION_SECRET = process.env.SESSION_SECRET || 'hemratan-production-conscious-session-secret-key-32b';

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

/**
 * Signs a session payload using HMAC-SHA256.
 */
export function signSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies a session token string, ensuring signature validity and checking expiry.
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
    if (Date.now() > payload.exp) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Creates a signed session for a user by id or email.
 */
export function createSessionToken(userId: string): { token: string; user: AuthenticatedUser } | null {
  const user = SEED_USERS.find((u) => u.id === userId || u.email === userId);
  if (!user || !user.isActive) return null;

  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const token = signSession({
    userId: user.id,
    email: user.email,
    role: user.role,
    exp,
  });

  return { token, user };
}

/**
 * Resolves the authenticated user from a session token.
 */
export function getAuthenticatedUser(token: string): AuthenticatedUser | null {
  const payload = verifySession(token);
  if (!payload) return null;

  const user = SEED_USERS.find((u) => u.id === payload.userId);
  if (!user || !user.isActive) return null;

  return user;
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
