import { describe, it, expect } from 'vitest';
import { validateEnv } from './env';

describe('Environment Validation', () => {
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
});
