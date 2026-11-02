import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getDirectoryHandler, POST as postDirectoryHandler } from './route';
import { POST as accessContactHandler } from './[id]/contact/route';
import { PATCH as consentHandler } from './[id]/consent/route';
import { POST as verifyHandler } from './[id]/verify/route';
import { GET as getStaffHandler, POST as postStaffHandler } from '../staff/route';
import { POST as mapStaffFlatHandler } from '../staff/flats/route';
import { GET as getMyStaffHandler } from '../staff/my-staff/route';
import { POST as checkInHandler } from '../attendance/check-in/route';
import { POST as checkOutHandler } from '../attendance/check-out/route';
import { GET as getActiveAttendanceHandler } from '../attendance/active/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { DirectoryService } from '@/services/directory.service';

describe('Directory, Domestic Help & Gate Attendance API Endpoints', () => {
  let residentToken: string;
  let committeeToken: string;
  let superAdminToken: string;
  let guardToken: string;

  beforeEach(() => {
    DirectoryService._resetForTesting();
    residentToken = createSessionToken('resident@hemratan.com')!.token;
    committeeToken = createSessionToken('committee@hemratan.com')!.token;
    superAdminToken = createSessionToken('admin@hemratan.com')!.token;
    guardToken = createSessionToken('guard@hemratan.com')!.token;
  });

  describe('Directory APIs (/api/directory)', () => {
    it('returns masked phone numbers for residents and unauthenticated requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/directory', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const res = await getDirectoryHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.providers.length).toBeGreaterThan(0);
      expect(data.providers[0].phoneNumber).toContain('XXX');
    });

    it('allows committee members to see full phone numbers and unverified providers', async () => {
      const req = new NextRequest('http://localhost:3000/api/directory?includeAll=true', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const res = await getDirectoryHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.providers.length).toBeGreaterThan(0);
      expect(data.providers[0].phoneNumber).not.toContain('XXX');
    });

    it('rejects provider registration if consent is not explicitly granted', async () => {
      const req = new NextRequest('http://localhost:3000/api/directory', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          fullName: 'Test Plumber',
          phone: '9820199999',
          category: 'PLUMBER',
          consentGiven: false,
        }),
      });
      const res = await postDirectoryHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('consent');
    });

    it('allows registering a verified service provider directly by committee', async () => {
      const req = new NextRequest('http://localhost:3000/api/directory', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          fullName: 'Committee Verified Plumber',
          phone: '9820188888',
          category: 'PLUMBER',
          consentGiven: true,
          bio: 'Emergency plumbing repairs',
        }),
      });
      const res = await postDirectoryHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.provider.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('Contact Access & Consent (/api/directory/[id])', () => {
    it('unmasks contact and generates audit log for authenticated residents', async () => {
      const providers = DirectoryService.getDirectory();
      const targetProvider = providers[0];

      const req = new NextRequest(`http://localhost:3000/api/directory/${targetProvider.id}/contact`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({ reason: 'Kitchen pipe leakage repair' }),
      });

      const res = await accessContactHandler(req, { params: Promise.resolve({ id: targetProvider.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.phone).not.toContain('XXX');
      expect(data.accessLoggedAt).toBeDefined();
    });

    it('withdraws consent and immediately hides provider from directory', async () => {
      const providers = DirectoryService.getDirectory();
      const target = providers[0];

      const patchReq = new NextRequest(`http://localhost:3000/api/directory/${target.id}/consent`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({ withdraw: true, reason: 'Worker relocated out of city' }),
      });

      const patchRes = await consentHandler(patchReq, { params: Promise.resolve({ id: target.id }) });
      expect(patchRes.status).toBe(200);

      // Verify no longer in active directory
      const activeProviders = DirectoryService.getDirectory();
      expect(activeProviders.find((p) => p.id === target.id)).toBeUndefined();
    });

    it('allows committee to verify a pending provider', async () => {
      // Create pending provider
      const pending = DirectoryService.registerServiceProvider({
        fullName: 'Pending Carpenter',
        phoneNumber: '9820177777',
        category: 'CARPENTER',
        consentGiven: true,
      });

      const verifyReq = new NextRequest(`http://localhost:3000/api/directory/${pending.id}/verify`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({ notes: 'Documents verified physically', status: 'VERIFIED' }),
      });

      const verifyRes = await verifyHandler(verifyReq, { params: Promise.resolve({ id: pending.id }) });
      expect(verifyRes.status).toBe(200);
      const data = await verifyRes.json();
      expect(data.provider.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('Domestic Staff & Flat Authorization (/api/staff)', () => {
    it('registers domestic staff and maps authorization to a flat', async () => {
      const regReq = new NextRequest('http://localhost:3000/api/staff', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          fullName: 'Geeta Devi',
          phone: '9820122222',
          roleTitle: 'MAID',
        }),
      });
      const regRes = await postStaffHandler(regReq);
      expect(regRes.status).toBe(201);
      const regData = await regRes.json();
      const staffId = regData.staff.id;

      // Authorize for resident flat (Jonathan Patel is flat-a-402 in mock auth)
      const mapReq = new NextRequest('http://localhost:3000/api/staff/flats', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          staffId,
          flatId: 'flat-a-402',
          flatNumber: '402',
          wing: 'A',
        }),
      });
      const mapRes = await mapStaffFlatHandler(mapReq);
      expect(mapRes.status).toBe(201);

      // Verify resident can see them in /api/staff/my-staff
      const myStaffReq = new NextRequest('http://localhost:3000/api/staff/my-staff', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const myStaffRes = await getMyStaffHandler(myStaffReq);
      expect(myStaffRes.status).toBe(200);
      const myStaffData = await myStaffRes.json();
      expect(myStaffData.staff.some((s: any) => s.id === staffId)).toBe(true);
    });

    it('rejects flat authorization if resident attempts to map another flat', async () => {
      const staffList = DirectoryService.getAllDomesticStaff();
      const staffId = staffList[0].id;

      const forbiddenReq = new NextRequest('http://localhost:3000/api/staff/flats', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          staffId,
          flatId: 'flat-b-999', // Resident does not own this flat
        }),
      });
      const res = await mapStaffFlatHandler(forbiddenReq);
      expect(res.status).toBe(403);
    });
  });

  describe('Gate Attendance Check-In / Check-Out (/api/attendance)', () => {
    it('allows security guard to check in domestic staff and blocks duplicate check-in', async () => {
      const staffList = DirectoryService.getAllDomesticStaff();
      // Pick staff that is not currently inside (dw-001)
      const staff = staffList.find((s) => !s.isCurrentlyInside) || staffList[0];

      // Guard checks in staff
      const inReq = new NextRequest('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
        },
        body: JSON.stringify({
          staffId: staff.id,
          gateNumber: 'Gate 2',
        }),
      });
      const inRes = await checkInHandler(inReq);
      expect(inRes.status).toBe(201);

      // Verify active inside API includes staff
      const activeReq = new NextRequest('http://localhost:3000/api/attendance/active', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const activeRes = await getActiveAttendanceHandler(activeReq);
      expect(activeRes.status).toBe(200);
      const activeData = await activeRes.json();
      expect(activeData.activeInside.some((s: any) => s.domesticStaffId === staff.id)).toBe(true);

      // Attempt duplicate check-in -> MUST FAIL
      const dupReq = new NextRequest('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
        },
        body: JSON.stringify({
          staffId: staff.id,
          gateNumber: 'Gate 1',
        }),
      });
      const dupRes = await checkInHandler(dupReq);
      expect(dupRes.status).toBe(400);
      const dupData = await dupRes.json();
      expect(dupData.error).toContain('already checked in');

      // Now Check-Out
      const outReq = new NextRequest('http://localhost:3000/api/attendance/check-out', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
        },
        body: JSON.stringify({
          staffId: staff.id,
          remarks: 'Shift finished',
        }),
      });
      const outRes = await checkOutHandler(outReq);
      expect(outRes.status).toBe(200);

      // Attempt duplicate check-out -> MUST FAIL
      const dupOutReq = new NextRequest('http://localhost:3000/api/attendance/check-out', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
        },
        body: JSON.stringify({
          staffId: staff.id,
        }),
      });
      const dupOutRes = await checkOutHandler(dupOutReq);
      expect(dupOutRes.status).toBe(400);
      const dupOutData = await dupOutRes.json();
      expect(dupOutData.error).toContain('not currently checked in');
    });

    it('rejects check-in requests from unauthorized resident users', async () => {
      const staffList = DirectoryService.getAllDomesticStaff();
      const req = new NextRequest('http://localhost:3000/api/attendance/check-in', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({ staffId: staffList[0].id }),
      });
      const res = await checkInHandler(req);
      expect(res.status).toBe(403);
    });
  });
});
