import { describe, it, expect, beforeEach } from 'vitest';
import { VisitorService } from './visitor.service';
import { SocietyService } from './society.service';

describe('VisitorService', () => {
  let sampleFlatId: string;

  beforeEach(() => {
    const flat = SocietyService.getFlats()[0];
    sampleFlatId = flat.id;
  });

  describe('Validation & Registration', () => {
    it('validates Indian mobile numbers correctly', () => {
      expect(VisitorService.isValidMobileNumber('9876543210')).toBe(true);
      expect(VisitorService.isValidMobileNumber('+91 9876543210')).toBe(true);
      expect(VisitorService.isValidMobileNumber('919876543210')).toBe(true);
      expect(VisitorService.isValidMobileNumber('12345')).toBe(false);
      expect(VisitorService.isValidMobileNumber('abcdefghij')).toBe(false);
      expect(VisitorService.isValidMobileNumber('1234567890')).toBe(false); // Does not start with 6-9
    });

    it('rejects short visitor full names', async () => {
      await expect(
        VisitorService.registerVisitor({
          fullName: 'A',
          mobileNumber: '9876543210',
          ageRange: '18_TO_30',
          flatId: sampleFlatId,
          purpose: 'Delivery',
        })
      ).rejects.toThrow('Visitor full name must be at least 2 characters');
    });

    it('rejects invalid mobile numbers during registration', async () => {
      await expect(
        VisitorService.registerVisitor({
          fullName: 'John Doe',
          mobileNumber: '0000000000',
          ageRange: '31_TO_50',
          flatId: sampleFlatId,
          purpose: 'Maintenance',
        })
      ).rejects.toThrow('Invalid mobile number format');
    });

    it('rejects nonexistent target flats', async () => {
      await expect(
        VisitorService.registerVisitor({
          fullName: 'John Doe',
          mobileNumber: '9876543210',
          ageRange: '31_TO_50',
          flatId: 'flat-nonexistent-999',
          purpose: 'Maintenance',
        })
      ).rejects.toThrow('Target flat with ID flat-nonexistent-999 does not exist');
    });

    it('enforces maximum photo size limit of 10MB', async () => {
      await expect(
        VisitorService.registerVisitor({
          fullName: 'John Doe',
          mobileNumber: '9876543210',
          ageRange: '31_TO_50',
          flatId: sampleFlatId,
          purpose: 'Maintenance',
          photoData: {
            storagePath: '/storage/visitors/oversized.jpg',
            fileSizeBytes: 11 * 1024 * 1024, // 11MB
            mimeType: 'image/jpeg',
          },
        })
      ).rejects.toThrow('exceeds maximum permitted size of 10 MB');
    });

    it('enforces allowed photograph mime types', async () => {
      await expect(
        VisitorService.registerVisitor({
          fullName: 'John Doe',
          mobileNumber: '9876543210',
          ageRange: '31_TO_50',
          flatId: sampleFlatId,
          purpose: 'Maintenance',
          photoData: {
            storagePath: '/storage/visitors/script.exe',
            fileSizeBytes: 2048,
            mimeType: 'application/x-msdownload',
          },
        })
      ).rejects.toThrow('Invalid photograph file type');
    });

    it('successfully registers a visitor and generates an OTP', async () => {
      const registration = await VisitorService.registerVisitor({
        fullName: 'Aarav Sharma',
        mobileNumber: '9820098200',
        ageRange: '18_TO_30',
        flatId: sampleFlatId,
        purpose: 'Social Visit',
      });

      expect(registration.visit).toBeDefined();
      expect(registration.visit.visitor.fullName).toBe('Aarav Sharma');
      expect(registration.visit.visitor.ageRange).toBe('18_TO_30');
      expect(registration.visit.status).toBe('PENDING_CHECKS');
      expect(registration.rawOtp).toHaveLength(6);
      expect(/^\d{6}$/.test(registration.rawOtp)).toBe(true);
    });
  });

  describe('Dual-Check Independent Verification & Entry Enforcement', () => {
    it('verifies valid OTP independently', async () => {
      const { visit, rawOtp } = await VisitorService.registerVisitor({
        fullName: 'Priya Nair',
        mobileNumber: '9811122233',
        ageRange: '31_TO_50',
        flatId: sampleFlatId,
        purpose: 'Consultation',
      });

      const res = VisitorService.verifyOtp(visit.id, rawOtp);
      expect(res.success).toBe(true);

      const updated = VisitorService.getVisitById(visit.id);
      expect(updated?.otpVerified).toBe(true);
      expect(updated?.status).toBe('OTP_VERIFIED');
    });

    it('handles incorrect OTP with attempts decrement and lockout after 3 attempts', async () => {
      const { visit } = await VisitorService.registerVisitor({
        fullName: 'Vikram Seth',
        mobileNumber: '9822233344',
        ageRange: '51_TO_65',
        flatId: sampleFlatId,
        purpose: 'Personal Visit',
      });

      const attempt1 = VisitorService.verifyOtp(visit.id, '000000');
      expect(attempt1.success).toBe(false);
      expect(attempt1.remainingAttempts).toBe(2);

      const attempt2 = VisitorService.verifyOtp(visit.id, '111111');
      expect(attempt2.success).toBe(false);
      expect(attempt2.remainingAttempts).toBe(1);

      const attempt3 = VisitorService.verifyOtp(visit.id, '222222');
      expect(attempt3.success).toBe(false);
      expect(attempt3.remainingAttempts).toBe(0);

      // 4th attempt should be locked out
      const attempt4 = VisitorService.verifyOtp(visit.id, '333333');
      expect(attempt4.success).toBe(false);
      expect(attempt4.error).toContain('Maximum OTP verification attempts exceeded');
    });

    it('records resident intercom approval independently', async () => {
      const { visit } = await VisitorService.registerVisitor({
        fullName: 'Suresh Raina',
        mobileNumber: '9833344455',
        ageRange: '31_TO_50',
        flatId: sampleFlatId,
        purpose: 'Delivery',
      });

      VisitorService.recordApproval(visit.id, {
        channel: 'GODREJ_INTERCOM',
        status: 'APPROVED',
        notes: 'Godrej audio call accepted by resident',
      });

      const updated = VisitorService.getVisitById(visit.id);
      expect(updated?.residentApproved).toBe(true);
      expect(updated?.status).toBe('RESIDENT_APPROVED');
      expect(updated?.approvalRecord?.channel).toBe('GODREJ_INTERCOM');
    });

    it('blocks entry if only OTP is verified but resident has not approved', async () => {
      const { visit, rawOtp } = await VisitorService.registerVisitor({
        fullName: 'Sunil Gavaskar',
        mobileNumber: '9844455566',
        ageRange: 'ABOVE_65',
        flatId: sampleFlatId,
        purpose: 'Guest',
      });

      VisitorService.verifyOtp(visit.id, rawOtp);

      expect(() => VisitorService.confirmEntry(visit.id, 'usr-guard-001')).toThrow(
        'Entry denied: Resident intercom or app approval has not been recorded'
      );
    });

    it('blocks entry if resident approved but OTP is NOT verified', async () => {
      const { visit } = await VisitorService.registerVisitor({
        fullName: 'Kapil Dev',
        mobileNumber: '9855566677',
        ageRange: '51_TO_65',
        flatId: sampleFlatId,
        purpose: 'Guest',
      });

      VisitorService.recordApproval(visit.id, {
        channel: 'RESIDENT_APP',
        status: 'APPROVED',
      });

      expect(() => VisitorService.confirmEntry(visit.id, 'usr-guard-001')).toThrow(
        'Entry denied: Visitor OTP verification has not been completed'
      );
    });

    it('blocks entry if resident REJECTED the visit', async () => {
      const { visit, rawOtp } = await VisitorService.registerVisitor({
        fullName: 'Unknown Visitor',
        mobileNumber: '9866677788',
        ageRange: '18_TO_30',
        flatId: sampleFlatId,
        purpose: 'Cold sales',
      });

      VisitorService.verifyOtp(visit.id, rawOtp);
      VisitorService.recordApproval(visit.id, {
        channel: 'GODREJ_INTERCOM',
        status: 'REJECTED',
        notes: 'Resident declined entry',
      });

      expect(() => VisitorService.confirmEntry(visit.id, 'usr-guard-001')).toThrow(
        'Entry denied: Visit request was rejected by the resident'
      );
    });

    it('permits gate entry when BOTH OTP and resident approval are verified', async () => {
      const { visit, rawOtp } = await VisitorService.registerVisitor({
        fullName: 'Rohit Sharma',
        mobileNumber: '9877788899',
        ageRange: '31_TO_50',
        flatId: sampleFlatId,
        purpose: 'Family friend',
      });

      VisitorService.verifyOtp(visit.id, rawOtp);
      VisitorService.recordApproval(visit.id, {
        channel: 'GODREJ_INTERCOM',
        status: 'APPROVED',
      });

      const insideVisit = VisitorService.confirmEntry(visit.id, 'usr-guard-001');

      expect(insideVisit.status).toBe('INSIDE');
      expect(insideVisit.entryTime).toBeDefined();
      expect(insideVisit.guardId).toBe('usr-guard-001');
    });

    it('handles checkout / exit properly', async () => {
      const { visit, rawOtp } = await VisitorService.registerVisitor({
        fullName: 'Jasprit Bumrah',
        mobileNumber: '9888899900',
        ageRange: '18_TO_30',
        flatId: sampleFlatId,
        purpose: 'Guest',
      });

      VisitorService.verifyOtp(visit.id, rawOtp);
      VisitorService.recordApproval(visit.id, { channel: 'RESIDENT_APP', status: 'APPROVED' });
      VisitorService.confirmEntry(visit.id);

      const completedVisit = VisitorService.confirmExit(visit.id);
      expect(completedVisit.status).toBe('COMPLETED');
      expect(completedVisit.exitTime).toBeDefined();

      // Attempting checkout again should fail
      expect(() => VisitorService.confirmExit(visit.id)).toThrow('Cannot checkout: Visitor status is "COMPLETED"');
    });
  });

  describe('Isolation and Listing', () => {
    it('filters visits by flatId for flat-level privacy', () => {
      const flats = SocietyService.getFlats();
      const flat1 = flats[0];
      const flat2 = flats[1];

      const visitsForFlat1 = VisitorService.getVisits({ flatId: flat1.id });
      for (const v of visitsForFlat1) {
        expect(v.flatId).toBe(flat1.id);
        expect(v.flatId).not.toBe(flat2.id);
      }
    });

    it('returns currently inside visitors list', () => {
      const inside = VisitorService.getCurrentlyInsideVisitors();
      expect(Array.isArray(inside)).toBe(true);
      for (const v of inside) {
        expect(v.status).toBe('INSIDE');
      }
    });
  });
});
