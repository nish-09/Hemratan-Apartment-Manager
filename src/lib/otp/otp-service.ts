import crypto from 'crypto';

export interface OtpDeliveryResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  deliveredTo: string;
  error?: string;
}

export interface IOtpProvider {
  name: string;
  sendOtp(mobile: string, otp: string, context: { visitorName: string; flatNumber: string }): Promise<OtpDeliveryResult>;
}

// Development Mock Provider
export class MockOtpProvider implements IOtpProvider {
  name = 'mock';
  public sentMessages: Array<{ mobile: string; otp: string; timestamp: Date }> = [];

  async sendOtp(mobile: string, otp: string, context: { visitorName: string; flatNumber: string }): Promise<OtpDeliveryResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'MockOtpProvider is restricted to development and testing environments only. Production must never use mock SMS delivery. Please configure a live SMS gateway provider.'
      );
    }

    // Record mock delivery
    this.sentMessages.push({
      mobile,
      otp,
      timestamp: new Date(),
    });

    return {
      success: true,
      provider: 'mock-sms',
      providerMessageId: `mock-msg-${crypto.randomUUID()}`,
      deliveredTo: mobile,
    };
  }

  getLastSentOtpForMobile(mobile: string): string | null {
    const records = this.sentMessages.filter((m) => m.mobile === mobile);
    return records.length > 0 ? records[records.length - 1].otp : null;
  }
}

export const mockOtpProvider = new MockOtpProvider();

export class OtpService {
  private static readonly OTP_VALIDITY_MS = 10 * 60 * 1000; // 10 minutes
  public static readonly MAX_ATTEMPTS = 3;
  public static readonly RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
  private static readonly resendTimestamps = new Map<string, number>();

  /**
   * Checks whether the recipient must wait before requesting another OTP.
   */
  static checkResendCooldown(mobile: string): void {
    const lastSent = this.resendTimestamps.get(mobile);
    if (lastSent) {
      const elapsed = Date.now() - lastSent;
      if (elapsed < this.RESEND_COOLDOWN_MS) {
        const remainingSec = Math.ceil((this.RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new Error(`Please wait ${remainingSec} second(s) before requesting a new OTP.`);
      }
    }
  }

  /**
   * Records the dispatch timestamp to enforce resend cooldowns.
   */
  static recordOtpSent(mobile: string): void {
    this.resendTimestamps.set(mobile, Date.now());
  }

  /**
   * Resets cooldown records (useful for automated testing).
   */
  static clearCooldowns(): void {
    this.resendTimestamps.clear();
  }

  /**
   * Generates a cryptographically strong 6-digit numeric OTP (100000 - 999999).
   */
  static generateRawOtp(): string {
    const min = 100000;
    const max = 999999;
    const randomInt = crypto.randomInt(min, max + 1);
    return randomInt.toString();
  }

  /**
   * Hashes an OTP using SHA-256 with a salt to ensure it is never stored in plaintext.
   */
  static hashOtp(rawOtp: string, salt: string = 'hemratan_otp_salt_v1'): string {
    return crypto.createHmac('sha256', salt).update(rawOtp.trim()).digest('hex');
  }

  /**
   * Prepares a new OTP record for a visitor visit.
   */
  static createOtpRecord(customSalt?: string) {
    const rawOtp = this.generateRawOtp();
    const salt = customSalt || crypto.randomBytes(8).toString('hex');
    const hashedOtp = this.hashOtp(rawOtp, salt);
    const expiresAt = new Date(Date.now() + this.OTP_VALIDITY_MS);

    return {
      rawOtp, // Transient only for SMS delivery; never saved to DB
      salt,
      hashedOtp,
      expiresAt,
      attemptsCount: 0,
      isVerified: false,
    };
  }

  /**
   * Timing-safe verification of the entered OTP against the stored record.
   */
  static verifyOtp(
    inputOtp: string,
    record: {
      hashedOtp: string;
      salt: string;
      expiresAt: Date;
      attemptsCount: number;
      isVerified: boolean;
    }
  ): {
    success: boolean;
    error?: string;
    remainingAttempts: number;
  } {
    // 1. Check if already verified
    if (record.isVerified) {
      return {
        success: false,
        error: 'OTP has already been used and cannot be reused',
        remainingAttempts: 0,
      };
    }

    // 2. Check brute-force attempt limits
    if (record.attemptsCount >= this.MAX_ATTEMPTS) {
      return {
        success: false,
        error: 'Maximum OTP verification attempts exceeded. Please request a new OTP.',
        remainingAttempts: 0,
      };
    }

    // 3. Check expiration
    if (new Date() > new Date(record.expiresAt)) {
      return {
        success: false,
        error: 'OTP has expired. Please request a new OTP.',
        remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - record.attemptsCount),
      };
    }

    // 4. Calculate timing-safe match
    const computedHash = this.hashOtp(inputOtp, record.salt);
    const expectedBuffer = Buffer.from(record.hashedOtp, 'hex');
    const actualBuffer = Buffer.from(computedHash, 'hex');

    const isMatch =
      expectedBuffer.length === actualBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, actualBuffer);

    if (!isMatch) {
      const remaining = Math.max(0, this.MAX_ATTEMPTS - (record.attemptsCount + 1));
      return {
        success: false,
        error: `Invalid OTP. ${remaining} attempt(s) remaining.`,
        remainingAttempts: remaining,
      };
    }

    return {
      success: true,
      remainingAttempts: Math.max(0, this.MAX_ATTEMPTS - record.attemptsCount),
    };
  }
}
