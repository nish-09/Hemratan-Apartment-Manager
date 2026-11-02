import { describe, it, expect } from 'vitest';
import { OtpService, mockOtpProvider } from './otp-service';

describe('OTP Generation, Verification & Brute-Force Protection', () => {
  it('generates a 6-digit numeric OTP within 100000 - 999999', () => {
    const rawOtp = OtpService.generateRawOtp();
    expect(rawOtp).toMatch(/^\d{6}$/);
    const num = parseInt(rawOtp, 10);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThanOrEqual(999999);
  });

  it('successfully verifies a valid OTP matching the hash and salt', () => {
    const record = OtpService.createOtpRecord();
    const result = OtpService.verifyOtp(record.rawOtp, record);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects incorrect OTP and decrements remaining attempts', () => {
    const record = OtpService.createOtpRecord();
    const result = OtpService.verifyOtp('000000', record);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid OTP');
    expect(result.remainingAttempts).toBe(2);
  });

  it('locks out after 3 failed verification attempts (brute-force protection)', () => {
    const record = OtpService.createOtpRecord();
    record.attemptsCount = 3; // simulated 3 previous failed attempts

    const result = OtpService.verifyOtp(record.rawOtp, record);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Maximum OTP verification attempts exceeded');
  });

  it('rejects expired OTP', () => {
    const record = OtpService.createOtpRecord();
    record.expiresAt = new Date(Date.now() - 1000); // 1 second in the past

    const result = OtpService.verifyOtp(record.rawOtp, record);
    expect(result.success).toBe(false);
    expect(result.error).toContain('expired');
  });

  it('rejects already used OTP (replay protection)', () => {
    const record = OtpService.createOtpRecord();
    record.isVerified = true;

    const result = OtpService.verifyOtp(record.rawOtp, record);
    expect(result.success).toBe(false);
    expect(result.error).toContain('already been used');
  });

  it('dispatches mock SMS delivery and records message in development queue', async () => {
    const mobile = '+91 98765 43210';
    const otp = '458921';
    const delivery = await mockOtpProvider.sendOtp(mobile, otp, {
      visitorName: 'Rohan Sharma',
      flatNumber: 'A-402',
    });

    expect(delivery.success).toBe(true);
    expect(delivery.deliveredTo).toBe(mobile);
    expect(mockOtpProvider.getLastSentOtpForMobile(mobile)).toBe(otp);
  });
});
