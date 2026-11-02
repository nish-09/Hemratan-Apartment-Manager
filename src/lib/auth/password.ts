import crypto from 'crypto';

/**
 * Hashes a plaintext password using PBKDF2/scrypt with a cryptographically secure random salt.
 * Returns salt:hash in hex encoding.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;

    const [salt, expectedKey] = parts;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');

    const expectedBuffer = Buffer.from(expectedKey, 'hex');
    const actualBuffer = Buffer.from(derivedKey, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}

/**
 * Performs a dummy password verification calculation to neutralize timing differences
 * when an invalid/nonexistent email is queried.
 */
export function performDummyPasswordCheck(): void {
  const dummySalt = '00112233445566778899aabbccddeeff';
  crypto.scryptSync('dummy_timing_probe_string', dummySalt, 64);
}
