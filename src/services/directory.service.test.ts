import { describe, it, expect, beforeEach } from 'vitest';
import { DirectoryService } from './directory.service';

describe('DirectoryService (Stage 5 Unit Tests)', () => {
  beforeEach(() => {
    DirectoryService._resetForTesting();
  });

  describe('1. Service Provider Directory & Privacy Masking', () => {
    it('returns verified active directory listings with phone numbers masked', () => {
      const directory = DirectoryService.getDirectory();
      expect(directory.length).toBeGreaterThanOrEqual(4);

      for (const provider of directory) {
        expect(provider.isListingActive).toBe(true);
        expect(provider.verificationStatus).toBe('VERIFIED');
        expect(provider.phoneNumber).toMatch(/\+91 \d{2}XXX X\d{4}/); // Masked
      }
    });

    it('filters directory by category correctly', () => {
      const plumbers = DirectoryService.getDirectory({ category: 'PLUMBER' });
      expect(plumbers.length).toBeGreaterThanOrEqual(1);
      for (const p of plumbers) {
        expect(p.category).toBe('PLUMBER');
      }

      const cooks = DirectoryService.getDirectory({ category: 'COOK' });
      expect(cooks.length).toBeGreaterThanOrEqual(1);
      for (const c of cooks) {
        expect(c.category).toBe('COOK');
      }
    });

    it('allows resident to unlock full phone number and logs audit record', () => {
      const res = DirectoryService.accessProviderContact({
        serviceProviderId: 'sp-001',
        userProfileId: 'u-resident-patel',
        userName: 'Jonathan Patel',
        flatId: 'flat-a-402',
        reason: 'Kitchen drain blockage inquiry',
      });

      expect(res.fullPhoneNumber).toBe('+91 98201 12345');
      expect(res.auditLogId).toBeDefined();
    });
  });

  describe('2. Worker Consent Management & Withdrawal', () => {
    it('excludes provider immediately when worker withdraws consent', () => {
      // Initially in directory
      const initial = DirectoryService.getDirectory({ category: 'PLUMBER' });
      expect(initial.some((p) => p.id === 'sp-001')).toBe(true);

      // Worker withdraws consent
      const updated = DirectoryService.setProviderConsent('sp-001', false);
      expect(updated.isListingActive).toBe(false);
      expect(updated.consentWithdrawnAt).toBeDefined();

      // No longer listed
      const after = DirectoryService.getDirectory({ category: 'PLUMBER' });
      expect(after.some((p) => p.id === 'sp-001')).toBe(false);

      // Attempting to access contact throws error
      expect(() =>
        DirectoryService.accessProviderContact({
          serviceProviderId: 'sp-001',
          userProfileId: 'u-resident-patel',
          userName: 'Jonathan Patel',
        })
      ).toThrow('withdrawn their listing');
    });

    it('re-activates listing when consent is renewed', () => {
      DirectoryService.setProviderConsent('sp-001', false);
      const renewed = DirectoryService.setProviderConsent('sp-001', true);
      expect(renewed.isListingActive).toBe(true);
      expect(renewed.consentWithdrawnAt).toBeUndefined();

      const after = DirectoryService.getDirectory({ category: 'PLUMBER' });
      expect(after.some((p) => p.id === 'sp-001')).toBe(true);
    });
  });

  describe('3. Domestic Staff Multi-Flat Authorization', () => {
    it('maps domestic worker to multiple authorized flats', () => {
      const worker = DirectoryService.registerDomesticWorker({
        fullName: 'Lata Shinde',
        serviceType: 'MAID',
        phoneNumber: '+91 98111 22334',
        initialFlatId: 'flat-a-402',
      });

      expect(worker.authorizedFlats).toContain('flat-a-402');

      // Authorize second flat (B-201)
      const auth2 = DirectoryService.authorizeFlat({
        domesticStaffId: worker.id,
        flatId: 'flat-b-201',
        flatNumber: '201',
        wing: 'B',
      });

      expect(auth2.status).toBe('APPROVED');
      expect(worker.authorizedFlats).toContain('flat-b-201');
    });
  });

  describe('4. Guard Gate Attendance (Check-In & Check-Out)', () => {
    it('records gate check-in and updates live inside status', () => {
      // Kamla Bai (dw-001) is initially outside
      const log = DirectoryService.recordStaffCheckIn({
        domesticStaffId: 'dw-001',
        guardId: 'u-guard-001',
        gateName: 'Gate 1 Main Access',
      });

      expect(log.status).toBe('INSIDE');
      expect(log.staffName).toBe('Kamla Bai');
      expect(log.authorizedFlatNumbers).toEqual(['A-402', 'B-201']);

      // Live inside list includes Kamla Bai
      const insideList = DirectoryService.getActiveStaffInside();
      expect(insideList.some((a) => a.domesticStaffId === 'dw-001')).toBe(true);
    });

    it('rejects duplicate check-in if worker is already inside', () => {
      // Sunita Ben (dw-002) is already seeded as inside
      expect(() =>
        DirectoryService.recordStaffCheckIn({
          domesticStaffId: 'dw-002',
          guardId: 'u-guard-001',
        })
      ).toThrow('already checked in and inside the society');
    });

    it('records check-out and completes attendance record', () => {
      // Check out Sunita Ben
      const exitLog = DirectoryService.recordStaffCheckOut({
        domesticStaffId: 'dw-002',
        guardId: 'u-guard-001',
        notes: 'Evening cooking completed',
      });

      expect(exitLog.status).toBe('COMPLETED');
      expect(exitLog.exitTime).toBeDefined();

      // No longer in active inside list
      const insideList = DirectoryService.getActiveStaffInside();
      expect(insideList.some((a) => a.domesticStaffId === 'dw-002')).toBe(false);
    });

    it('rejects check-out if worker is not checked in', () => {
      // Ramesh Sawant (dw-003) is outside
      expect(() =>
        DirectoryService.recordStaffCheckOut({
          domesticStaffId: 'dw-003',
          guardId: 'u-guard-001',
        })
      ).toThrow('not currently checked in');
    });
  });

  describe('5. Resident Flat Isolation for Domestic Attendance', () => {
    it('strictly isolates domestic attendance records to resident flat', () => {
      // Flat A-402 has Kamla Bai (dw-001) and Sunita Ben (dw-002)
      const res402 = DirectoryService.getDomesticStaffForResident('flat-a-402');
      expect(res402.workers.length).toBe(2);
      expect(res402.workers.map((w) => w.fullName)).toContain('Kamla Bai');
      expect(res402.workers.map((w) => w.fullName)).toContain('Sunita Ben');

      // Flat B-201 has Kamla Bai (dw-001) and Ramesh Sawant (dw-003)
      const res201 = DirectoryService.getDomesticStaffForResident('flat-b-201');
      expect(res201.workers.length).toBe(1); // Seed had dw-001
      expect(res201.workers.some((w) => w.fullName === 'Sunita Ben')).toBe(false); // Does not leak Sunita Ben
    });
  });

  describe('6. Committee Verification Governance', () => {
    it('allows committee to update verification status and police badge', () => {
      const updated = DirectoryService.verifyServiceProvider(
        'sp-004',
        'VERIFIED',
        'Police verification certificate submitted and approved',
        true
      );

      expect(updated.verificationStatus).toBe('VERIFIED');
      expect(updated.hasPoliceVerification).toBe(true);
      expect(updated.verificationNotes).toContain('Police verification certificate');
    });
  });
});
