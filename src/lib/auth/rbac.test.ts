import { describe, it, expect } from 'vitest';
import { hasPermission, canAccessFlat, PERMISSIONS } from './rbac';

describe('RBAC Permissions & Flat Access', () => {
  describe('hasPermission', () => {
    it('SUPER_ADMIN has all permissions', () => {
      expect(hasPermission('SUPER_ADMIN', PERMISSIONS.FLATS_MANAGE)).toBe(true);
      expect(hasPermission('SUPER_ADMIN', PERMISSIONS.BILLS_GENERATE)).toBe(true);
      expect(hasPermission('SUPER_ADMIN', PERMISSIONS.AUDIT_LOGS_VIEW)).toBe(true);
    });

    it('COMMITTEE can manage flats and generate bills, but cannot manage root users', () => {
      expect(hasPermission('COMMITTEE', PERMISSIONS.FLATS_MANAGE)).toBe(true);
      expect(hasPermission('COMMITTEE', PERMISSIONS.BILLS_GENERATE)).toBe(true);
      expect(hasPermission('COMMITTEE', PERMISSIONS.USERS_MANAGE)).toBe(false);
    });

    it('GUARD can register visitors and deliveries but cannot view or generate bills', () => {
      expect(hasPermission('GUARD', PERMISSIONS.VISITORS_REGISTER)).toBe(true);
      expect(hasPermission('GUARD', PERMISSIONS.DELIVERIES_MANAGE)).toBe(true);
      expect(hasPermission('GUARD', PERMISSIONS.BILLS_GENERATE)).toBe(false);
      expect(hasPermission('GUARD', PERMISSIONS.BILLS_VIEW_ALL)).toBe(false);
    });

    it('RESIDENT can only view own bills and create complaints, not view all', () => {
      expect(hasPermission('RESIDENT', PERMISSIONS.BILLS_VIEW_OWN)).toBe(true);
      expect(hasPermission('RESIDENT', PERMISSIONS.COMPLAINTS_CREATE)).toBe(true);
      expect(hasPermission('RESIDENT', PERMISSIONS.BILLS_VIEW_ALL)).toBe(false);
      expect(hasPermission('RESIDENT', PERMISSIONS.COMPLAINTS_TRIAGE)).toBe(false);
    });
  });

  describe('canAccessFlat (Flat-Level Data Isolation)', () => {
    const flatA = 'flat-uuid-101';
    const flatB = 'flat-uuid-102';

    it('allows resident to access their own flat', () => {
      expect(canAccessFlat('RESIDENT', [flatA], flatA)).toBe(true);
    });

    it('STRICT PREVENT: denies resident from accessing another flat', () => {
      expect(canAccessFlat('RESIDENT', [flatA], flatB)).toBe(false);
    });

    it('allows resident with multiple flats to access any of their assigned flats', () => {
      expect(canAccessFlat('RESIDENT', [flatA, flatB], flatB)).toBe(true);
    });

    it('allows COMMITTEE and SUPER_ADMIN to access any flat', () => {
      expect(canAccessFlat('COMMITTEE', [], flatA)).toBe(true);
      expect(canAccessFlat('SUPER_ADMIN', [], flatB)).toBe(true);
    });
  });
});
