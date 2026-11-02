import { describe, it, expect } from 'vitest';
import {
  signSession,
  verifySession,
  createSessionToken,
  getAuthenticatedUser,
} from './session';

describe('Cryptographic Session Management', () => {
  it('creates and verifies a valid signed session', () => {
    const payload = {
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

  it('rejects tampered session tokens', () => {
    const payload = {
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
      userId: 'usr-res-004',
      email: 'resident@hemratan.com',
      role: 'RESIDENT',
      exp: Date.now() - 1000, // expired 1s ago
    };

    const token = signSession(expiredPayload);
    expect(verifySession(token)).toBeNull();
  });

  it('resolves authenticated user for valid session', () => {
    const session = createSessionToken('resident@hemratan.com');
    expect(session).not.toBeNull();

    const user = getAuthenticatedUser(session!.token);
    expect(user).not.toBeNull();
    expect(user?.email).toBe('resident@hemratan.com');
    expect(user?.role).toBe('RESIDENT');
    expect(user?.assignedFlatIds).toContain('flat-a-402');
  });

  it('returns null for nonexistent user session', () => {
    const session = createSessionToken('nonexistent@hemratan.com');
    expect(session).toBeNull();
  });
});
