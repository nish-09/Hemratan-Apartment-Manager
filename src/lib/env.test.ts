import { describe, it, expect, vi } from 'vitest';
import { validateEnv, getServerSecret } from './env';

describe('Environment Validation & Secret Handling', () => {
  it('should validate with default values when empty env is supplied', () => {
    const config = validateEnv({});
    expect(config.APP_URL).toBe('http://localhost:3000');
    expect(config.OTP_PROVIDER).toBe('mock');
    expect(config.OTP_DEVELOPMENT_MODE).toBe(true);
    expect(config.STORAGE_BUCKET_VISITORS).toBe('visitor-media');
  });

  it('should correctly parse overridden variables', () => {
    const config = validateEnv({
      APP_URL: 'https://hemratan.vercel.app',
      OTP_PROVIDER: 'mock',
      OTP_DEVELOPMENT_MODE: 'false',
      STORAGE_BUCKET_VISITORS: 'custom-visitors',
    });
    expect(config.APP_URL).toBe('https://hemratan.vercel.app');
    expect(config.OTP_DEVELOPMENT_MODE).toBe(false);
    expect(config.STORAGE_BUCKET_VISITORS).toBe('custom-visitors');
  });

  it('should reject invalid URL values', () => {
    expect(() =>
      validateEnv({
        APP_URL: 'not-a-valid-url',
      })
    ).toThrow();
  });

  it('should retrieve server secret in server-side context', () => {
    const secret = getServerSecret('SUPABASE_SERVICE_ROLE_KEY');
    expect(secret).toBeDefined();
  });

  it('should throw security error if server secret is accessed in window context', () => {
    vi.stubGlobal('window', {});
    try {
      expect(() => getServerSecret('SUPABASE_SERVICE_ROLE_KEY')).toThrow(/SECURITY ALERT/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
