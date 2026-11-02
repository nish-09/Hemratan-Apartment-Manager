import crypto from 'crypto';
import { OtpService, mockOtpProvider } from '@/lib/otp/otp-service';
import { SocietyService } from './society.service';
import { ParkingService } from './parking.service';

export type AgeRange = 'UNDER_18' | '18_TO_30' | '31_TO_50' | '51_TO_65' | 'ABOVE_65';

export type VisitStatus =
  | 'PENDING_CHECKS'
  | 'OTP_VERIFIED'
  | 'RESIDENT_APPROVED'
  | 'APPROVED'
  | 'INSIDE'
  | 'COMPLETED'
  | 'REJECTED';

export interface VisitorRecord {
  id: string;
  fullName: string;
  mobileNumber: string;
  ageRange: AgeRange;
  photoUrl?: string;
  createdAt: Date;
}

export interface VisitRecord {
  id: string;
  visitorId: string;
  visitor: VisitorRecord;
  flatId: string;
  flatNumber: string;
  wing: string;
  guardId?: string;
  purpose: string;
  status: VisitStatus;
  otpVerified: boolean;
  residentApproved: boolean;
  entryTime?: Date;
  exitTime?: Date;
  createdAt: Date;
  updatedAt: Date;
  otpRecord: {
    salt: string;
    hashedOtp: string;
    expiresAt: Date;
    attemptsCount: number;
    isVerified: boolean;
  };
  approvalRecord?: {
    channel: 'GODREJ_INTERCOM' | 'RESIDENT_APP' | 'COMMITTEE_CLEARANCE';
    status: 'APPROVED' | 'REJECTED';
    notes?: string;
    recordedAt: Date;
  };
}

// In-memory persistent visits store
let visitorsStore: VisitorRecord[] = [];
let visitsStore: VisitRecord[] = [];

// Seed default initial visit for testing
const initialVisitor: VisitorRecord = {
  id: 'vis-seed-001',
  fullName: 'Ramesh Verma',
  mobileNumber: '+91 98765 43210',
  ageRange: '31_TO_50',
  photoUrl: '/storage/visitors/sample-photo-1.webp',
  createdAt: new Date(),
};
visitorsStore.push(initialVisitor);

const initialOtpRecord = OtpService.createOtpRecord();
initialOtpRecord.isVerified = true;

visitsStore.push({
  id: 'visit-seed-001',
  visitorId: initialVisitor.id,
  visitor: initialVisitor,
  flatId: 'flat-a-402',
  flatNumber: '402',
  wing: 'A',
  guardId: 'usr-guard-003',
  purpose: 'Guest / Personal',
  status: 'INSIDE',
  otpVerified: true,
  residentApproved: true,
  entryTime: new Date(Date.now() - 3600000), // entered 1 hour ago
  createdAt: new Date(Date.now() - 3600000),
  updatedAt: new Date(),
  otpRecord: initialOtpRecord,
  approvalRecord: {
    channel: 'GODREJ_INTERCOM',
    status: 'APPROVED',
    notes: 'Intercom confirmed by resident Jonathan Patel',
    recordedAt: new Date(Date.now() - 3600000),
  },
});

export class VisitorService {
  /**
   * Validates standard Indian mobile phone number (10 digits with optional +91/91 prefix).
   */
  static isValidMobileNumber(phone: string): boolean {
    const cleaned = phone.replace(/[\s-]/g, '');
    const regex = /^(?:\+91|91)?[6-9]\d{9}$/;
    return regex.test(cleaned);
  }

  /**
   * Registers a new visitor, creates private media pointer, generates OTP,
   * and attempts SMS dispatch via provider abstraction.
   */
  static async registerVisitor(data: {
    fullName: string;
    mobileNumber: string;
    ageRange: AgeRange;
    photoData?: { storagePath: string; fileSizeBytes: number; mimeType: string };
    flatId: string;
    guardId?: string;
    purpose: string;
  }): Promise<{ visit: VisitRecord; rawOtp: string }> {
    // 1. Validation
    if (!data.fullName || data.fullName.trim().length < 2) {
      throw new Error('Visitor full name must be at least 2 characters');
    }

    if (!this.isValidMobileNumber(data.mobileNumber)) {
      throw new Error('Invalid mobile number format. Must be a valid 10-digit phone number.');
    }

    const flat = SocietyService.getFlatById(data.flatId);
    if (!flat) {
      throw new Error(`Target flat with ID ${data.flatId} does not exist`);
    }

    // Photo validation if supplied
    if (data.photoData) {
      if (data.photoData.fileSizeBytes > 10485760) {
        throw new Error('Visitor photograph exceeds maximum permitted size of 10 MB');
      }
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedMimes.includes(data.photoData.mimeType)) {
        throw new Error('Invalid photograph file type. Only JPEG, PNG, and WebP are allowed.');
      }
    }

    // 2. Prevent duplicate active visit if visitor is currently inside
    const alreadyInside = visitsStore.find(
      (v) => v.visitor.mobileNumber === data.mobileNumber && v.status === 'INSIDE'
    );
    if (alreadyInside) {
      throw new Error(
        `Visitor with mobile ${data.mobileNumber} is already recorded as inside society (Flat ${alreadyInside.wing}-${alreadyInside.flatNumber}). Must checkout before re-registering.`
      );
    }

    // 3. Enforce OTP resend cooldown (60 seconds minimum)
    OtpService.checkResendCooldown(data.mobileNumber);

    // 4. Lookup or create visitor master profile
    let visitor = visitorsStore.find((v) => v.mobileNumber === data.mobileNumber);
    if (!visitor) {
      visitor = {
        id: `vis-${crypto.randomUUID()}`,
        fullName: data.fullName.trim(),
        mobileNumber: data.mobileNumber,
        ageRange: data.ageRange,
        photoUrl: data.photoData?.storagePath,
        createdAt: new Date(),
      };
      visitorsStore.push(visitor);
    }

    // 5. Generate secure OTP
    const otpRecord = OtpService.createOtpRecord();

    // 6. Create visit log
    const visit: VisitRecord = {
      id: `visit-${crypto.randomUUID()}`,
      visitorId: visitor.id,
      visitor,
      flatId: flat.id,
      flatNumber: flat.flatNumber,
      wing: flat.wing,
      guardId: data.guardId,
      purpose: data.purpose,
      status: 'PENDING_CHECKS',
      otpVerified: false,
      residentApproved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      otpRecord: {
        salt: otpRecord.salt,
        hashedOtp: otpRecord.hashedOtp,
        expiresAt: otpRecord.expiresAt,
        attemptsCount: 0,
        isVerified: false,
      },
    };
    visitsStore.push(visit);

    // 7. Dispatch SMS OTP via provider abstraction
    await mockOtpProvider.sendOtp(data.mobileNumber, otpRecord.rawOtp, {
      visitorName: data.fullName,
      flatNumber: `${flat.wing}-${flat.flatNumber}`,
    });

    // Record dispatch timestamp for cooldown enforcement
    OtpService.recordOtpSent(data.mobileNumber);

    return { visit, rawOtp: otpRecord.rawOtp };
  }

  /**
   * Verifies the visitor OTP. Independent check.
   */
  static verifyOtp(visitId: string, inputOtp: string) {
    const visit = visitsStore.find((v) => v.id === visitId);
    if (!visit) {
      throw new Error(`Visit with ID ${visitId} not found`);
    }

    const verification = OtpService.verifyOtp(inputOtp, visit.otpRecord);
    visit.otpRecord.attemptsCount += 1;

    if (!verification.success) {
      return {
        success: false,
        error: verification.error,
        remainingAttempts: verification.remainingAttempts,
      };
    }

    // Mark OTP as verified
    visit.otpRecord.isVerified = true;
    visit.otpVerified = true;
    visit.updatedAt = new Date();

    if (visit.residentApproved) {
      visit.status = 'APPROVED';
    } else {
      visit.status = 'OTP_VERIFIED';
    }

    return {
      success: true,
      remainingAttempts: verification.remainingAttempts,
    };
  }

  /**
   * Records Godrej Intercom or Resident App approval / rejection.
   */
  static recordApproval(
    visitId: string,
    approval: {
      channel: 'GODREJ_INTERCOM' | 'RESIDENT_APP' | 'COMMITTEE_CLEARANCE';
      status: 'APPROVED' | 'REJECTED';
      notes?: string;
    }
  ) {
    const visit = visitsStore.find((v) => v.id === visitId);
    if (!visit) {
      throw new Error(`Visit with ID ${visitId} not found`);
    }

    visit.approvalRecord = {
      channel: approval.channel,
      status: approval.status,
      notes: approval.notes,
      recordedAt: new Date(),
    };
    visit.updatedAt = new Date();

    if (approval.status === 'REJECTED') {
      visit.status = 'REJECTED';
      visit.residentApproved = false;
      return visit;
    }

    visit.residentApproved = true;
    if (visit.otpVerified) {
      visit.status = 'APPROVED';
    } else {
      visit.status = 'RESIDENT_APPROVED';
    }

    return visit;
  }

  /**
   * Explicit gate entry confirmation.
   * STRICT ENFORCEMENT: Requires BOTH otpVerified === true AND residentApproved === true.
   */
  static confirmEntry(visitId: string, guardId?: string) {
    const visit = visitsStore.find((v) => v.id === visitId);
    if (!visit) {
      throw new Error(`Visit with ID ${visitId} not found`);
    }

    if (visit.status === 'INSIDE') {
      throw new Error('Visitor is already recorded as inside the society');
    }

    if (visit.status === 'COMPLETED') {
      throw new Error('This visit has already completed and checked out');
    }

    if (visit.status === 'REJECTED') {
      throw new Error('Entry denied: Visit request was rejected by the resident');
    }

    // Independent check 1: OTP
    if (!visit.otpVerified) {
      throw new Error('Entry denied: Visitor OTP verification has not been completed');
    }

    // Independent check 2: Resident approval
    if (!visit.residentApproved) {
      throw new Error('Entry denied: Resident intercom or app approval has not been recorded');
    }

    visit.status = 'INSIDE';
    visit.entryTime = new Date();
    visit.guardId = guardId || visit.guardId;
    visit.updatedAt = new Date();

    return visit;
  }

  /**
   * Explicit gate checkout confirmation.
   */
  static confirmExit(visitId: string) {
    const visit = visitsStore.find((v) => v.id === visitId);
    if (!visit) {
      throw new Error(`Visit with ID ${visitId} not found`);
    }

    if (visit.status !== 'INSIDE') {
      throw new Error(`Cannot checkout: Visitor status is "${visit.status}", not "INSIDE"`);
    }

    visit.status = 'COMPLETED';
    visit.exitTime = new Date();
    visit.updatedAt = new Date();

    // Release any linked active parking allocation automatically upon exit
    try {
      ParkingService.checkoutByVisitId(visitId, visit.guardId);
    } catch (err) {
      console.warn(`Parking release notice during visitor exit for visit ${visitId}:`, err);
    }

    return visit;
  }

  /**
   * Returns active visitors currently inside the premises.
   */
  static getCurrentlyInsideVisitors(): VisitRecord[] {
    return visitsStore.filter((v) => v.status === 'INSIDE');
  }

  /**
   * Returns filtered visit history with flat-level isolation support.
   */
  static getVisits(filters?: { flatId?: string; status?: VisitStatus; search?: string }): VisitRecord[] {
    let result = [...visitsStore];

    if (filters?.flatId) {
      result = result.filter((v) => v.flatId === filters.flatId);
    }

    if (filters?.status) {
      result = result.filter((v) => v.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.visitor.fullName.toLowerCase().includes(q) ||
          v.visitor.mobileNumber.includes(q) ||
          v.flatNumber.includes(q) ||
          v.purpose.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  static getVisitById(id: string): VisitRecord | null {
    return visitsStore.find((v) => v.id === id) || null;
  }

  static resetStore(): void {
    visitorsStore = [initialVisitor];
    visitsStore = [
      {
        id: 'visit-seed-001',
        visitorId: initialVisitor.id,
        visitor: initialVisitor,
        flatId: 'flat-a-402',
        flatNumber: '402',
        wing: 'A',
        guardId: 'usr-guard-003',
        purpose: 'Guest / Personal',
        status: 'INSIDE',
        otpVerified: true,
        residentApproved: true,
        entryTime: new Date(Date.now() - 3600000),
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(),
        otpRecord: initialOtpRecord,
        approvalRecord: {
          channel: 'GODREJ_INTERCOM',
          status: 'APPROVED',
          notes: 'Intercom confirmed by resident Jonathan Patel',
          recordedAt: new Date(Date.now() - 3600000),
        },
      },
    ];
  }
}
