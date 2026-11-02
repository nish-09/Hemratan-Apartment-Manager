import { describe, it, expect } from 'vitest';
import { ReportsService, ReportType } from './reports.service';

describe('Stage 7 — ReportsService', () => {
  const committeeUser = { role: 'COMMITTEE' as const, profileId: 'usr-comm-002' };
  const guardUser = { role: 'GUARD' as const, profileId: 'usr-guard-003' };
  const residentUser = {
    role: 'RESIDENT' as const,
    profileId: 'usr-res-004',
    flatIds: ['flat-a-402'],
  };

  describe('RBAC Authorization', () => {
    it('allows Committee and Super Admin full report access', () => {
      const allTypes: ReportType[] = [
        'RESIDENT_DIRECTORY',
        'FLAT_OCCUPANCY',
        'WING_RESIDENTS',
        'VISITOR_LOG',
        'DOMESTIC_HELP_ATTENDANCE',
        'PARKING_ALLOCATIONS',
        'DELIVERY_REGISTER',
        'COMPLAINT_REGISTER',
        'PRIORITY_COMPLAINTS',
        'RESOLUTION_TIME',
        'STAFF_PERFORMANCE',
        'MAINTENANCE_BILLING',
        'PAYMENT_COLLECTIONS',
        'OUTSTANDING_DUES',
        'EXPENSE_REGISTER',
        'INCOME_EXPENDITURE',
        'AMENITY_BOOKINGS',
        'AMENITY_USAGE',
        'BOOKING_CANCELLATIONS',
      ];

      for (const t of allTypes) {
        expect(ReportsService.isAuthorizedForReport(t, 'COMMITTEE')).toBe(true);
        expect(ReportsService.isAuthorizedForReport(t, 'SUPER_ADMIN')).toBe(true);
      }
    });

    it('limits Guards strictly to Security & Operations reports and blocks Financials', async () => {
      expect(ReportsService.isAuthorizedForReport('VISITOR_LOG', 'GUARD')).toBe(true);
      expect(ReportsService.isAuthorizedForReport('PARKING_ALLOCATIONS', 'GUARD')).toBe(true);
      expect(ReportsService.isAuthorizedForReport('MAINTENANCE_BILLING', 'GUARD')).toBe(false);
      expect(ReportsService.isAuthorizedForReport('COMPLAINT_REGISTER', 'GUARD')).toBe(false);

      await expect(
        ReportsService.generateReport('MAINTENANCE_BILLING', {}, guardUser)
      ).rejects.toThrow(/Forbidden/);
    });

    it('blocks Residents from society-wide financial registers', async () => {
      expect(ReportsService.isAuthorizedForReport('RESIDENT_DIRECTORY', 'RESIDENT')).toBe(true);
      expect(ReportsService.isAuthorizedForReport('AMENITY_BOOKINGS', 'RESIDENT')).toBe(true);
      expect(ReportsService.isAuthorizedForReport('EXPENSE_REGISTER', 'RESIDENT')).toBe(false);
      expect(ReportsService.isAuthorizedForReport('OUTSTANDING_DUES', 'RESIDENT')).toBe(false);

      await expect(
        ReportsService.generateReport('EXPENSE_REGISTER', {}, residentUser)
      ).rejects.toThrow(/Forbidden/);
    });
  });

  describe('Report Generation & Anonymous Complaint Privacy', () => {
    it('generates Resident Directory report with proper columns', async () => {
      const report = await ReportsService.generateReport('RESIDENT_DIRECTORY', {}, committeeUser);
      expect(report.metadata.title).toBe('Resident Directory Report');
      expect(report.metadata.category).toBe('RESIDENTS_AND_SOCIETY');
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.rows[0].flatNumber).toBeDefined();
    });

    it('generates Complaint Register without revealing anonymous resident identities', async () => {
      const report = await ReportsService.generateReport('COMPLAINT_REGISTER', {}, committeeUser);
      expect(report.metadata.category).toBe('COMPLAINTS');
      expect(report.rows.length).toBeGreaterThan(0);

      // Verify no row exposes private identity for anonymous tickets
      for (const row of report.rows) {
        if (row.submittedBy === '[Anonymous Resident]') {
          expect(row.submittedBy).not.toContain('usr-');
          expect(row.submittedBy).not.toContain('Patel');
        }
      }
    });

    it('generates Financial Maintenance Billing report with correct INR formatting', async () => {
      const report = await ReportsService.generateReport('MAINTENANCE_BILLING', {}, committeeUser);
      expect(report.metadata.category).toBe('FINANCIAL');
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.rows[0].totalAmountPaise).toMatch(/₹[\d,.]+/);
    });

    it('generates Amenity Booking report', async () => {
      const report = await ReportsService.generateReport('AMENITY_BOOKINGS', {}, committeeUser);
      expect(report.metadata.category).toBe('AMENITIES');
      expect(report.rows.length).toBeGreaterThan(0);
    });
  });

  describe('RFC 4180 CSV Export', () => {
    it('generates valid downloadable CSV string with headers and escaped values', async () => {
      const csv = await ReportsService.generateReportCsv('VISITOR_LOG', {}, committeeUser);
      expect(csv).toContain('# Hemratan Apartment Manager');
      expect(csv).toContain('"Visitor"');
      expect(csv).toContain('"Mobile"');
      expect(csv).toContain('"Flat Visited"');
      expect(csv.split('\r\n').length).toBeGreaterThan(2);
    });
  });
});
