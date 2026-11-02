import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  createSessionToken,
  getAuthenticatedUser,
  revokeSession,
  revokeAllUserSessions,
} from './session';
import { setUserActiveStatus } from './mock-users';

describe('Cryptographic Session Management & Revocation', () => {
  it('creates and verifies a valid signed session', () => {
    const payload = {
      sessionId: 'sess-uuid-1',
      userId: 'usr-res-004',
      email: 'resident@hemratan.com',
      role: 'RESIDENT',
      exp: Date.now() + 60000,
    };

    const token = signSession(payload);
    expect(typeof token).toBe('string');
    expect(token).toContain('.');

    const verified = verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('usr-res-004');
    expect(verified?.role).toBe('RESIDENT');
  });

  it('rejects session token after server-side revocation', () => {
    const payload = {
      sessionId: 'sess-to-revoke-123',
      userId: 'usr-res-004',
      email: 'resident@hemratan.com',
      role: 'RESIDENT',
      exp: Date.now() + 60000,
    };

    const token = signSession(payload);
    expect(verifySession(token)).not.toBeNull();

    // Revoke server-side
    revokeSession('sess-to-revoke-123');
    expect(verifySession(token)).toBeNull();
  });

  it('rejects tampered session tokens', () => {
    const payload = {
      sessionId: 'sess-uuid-2',
      userId: 'usr-res-004',
      email: 'resident@hemratan.com',
      role: 'RESIDENT',
      exp: Date.now() + 60000,
    };

    const token = signSession(payload);
    const [data] = token.split('.');
    const tampered = `${data}.tamperedSignatureString`;

    expect(verifySession(tampered)).toBeNull();
  });

  it('rejects expired session tokens', () => {
    const expiredPayload = {
      sessionId: 'sess-uuid-3',
      userId: 'usr-res-004',
      email: 'resident@hemratan.com',
      role: 'RESIDENT',
      exp: Date.now() - 1000,
    };

    const token = signSession(expiredPayload);
    expect(verifySession(token)).toBeNull();
  });

  it('denies session creation for deactivated accounts', () => {
    const session = createSessionToken('inactive@hemratan.com');
    expect(session).toBeNull();
  });

  it('immediately invalidates active user sessions upon account deactivation', () => {
    const session = createSessionToken('resident@hemratan.com');
    expect(session).not.toBeNull();

    // Verify valid initial access
    expect(getAuthenticatedUser(session!.token)).not.toBeNull();

    // Deactivate account
    setUserActiveStatus('usr-res-004', false);
    try {
      expect(getAuthenticatedUser(session!.token)).toBeNull();
    } finally {
      // Re-enable for subsequent tests
      setUserActiveStatus('usr-res-004', true);
    }
  });
});
