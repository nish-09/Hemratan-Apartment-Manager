import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('Password Hashing & Timing-Safe Verification', () => {
  it('generates unique salted hashes for the same password', () => {
    const p = 'SecretPass@2026';
    const hash1 = hashPassword(p);
    const hash2 = hashPassword(p);

    expect(hash1).not.toBe(hash2);
    expect(hash1).toContain(':');
    expect(hash2).toContain(':');
  });

  it('verifies correct password against hash', () => {
    const p = 'StrongAdminPass#88';
    const hash = hashPassword(p);

    expect(verifyPassword(p, hash)).toBe(true);
  });

  it('rejects incorrect password', () => {
    const hash = hashPassword('CorrectPassword123');
    expect(verifyPassword('WrongPassword123', hash)).toBe(false);
  });

  it('gracefully rejects malformed hash string without crashing', () => {
    expect(verifyPassword('AnyPass', 'not-a-valid-hash')).toBe(false);
    expect(verifyPassword('AnyPass', '')).toBe(false);
  });
});
