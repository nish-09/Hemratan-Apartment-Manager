import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getVisitorsHandler, POST as registerVisitorHandler } from './route';
import { POST as verifyOtpHandler } from './[id]/verify-otp/route';
import { POST as approveHandler } from './[id]/approve/route';
import { POST as entryHandler } from './[id]/entry/route';
import { POST as exitHandler } from './[id]/exit/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { SocietyService } from '@/services/society.service';
import { VisitorService } from '@/services/visitor.service';
import { OtpService } from '@/lib/otp/otp-service';

describe('Visitor Management API Endpoints', () => {
  let guardToken: string;
  let residentToken: string;
  let sampleFlatId: string;
  let otherFlatId: string;

  beforeEach(() => {
    VisitorService.resetStore();
    OtpService.clearCooldowns();

    guardToken = createSessionToken('guard@hemratan.com')!.token;
    residentToken = createSessionToken('resident@hemratan.com')!.token;

    const flats = SocietyService.getFlats();
    sampleFlatId = 'flat-a-402'; // Resident Jonathan Patel's flat
    otherFlatId = flats.find((f) => f.id !== sampleFlatId)!.id;
  });

  describe('GET /api/visitors (with Flat-Level Isolation)', () => {
    it('returns 401 without valid session cookie', async () => {
      const req = new NextRequest('http://localhost:3000/api/visitors');
      const res = await getVisitorsHandler(req);
      expect(res.status).toBe(401);
    });

    it('enforces flat-level isolation for RESIDENT', async () => {
      const req = new NextRequest('http://localhost:3000/api/visitors', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
      });

      const res = await getVisitorsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.visits)).toBe(true);

      // Verify all visits returned belong exclusively to resident's flat
      for (const visit of data.visits) {
        expect(visit.flatId).toBe(sampleFlatId);
      }
    });

    it('allows GUARD to view society-wide visits', async () => {
      const req = new NextRequest('http://localhost:3000/api/visitors', {
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
        },
      });

      const res = await getVisitorsHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.visits)).toBe(true);
      expect(typeof data.currentlyInsideCount).toBe('number');
    });
  });

  describe('POST /api/visitors (Registration)', () => {
    it('allows GUARD to register a new visitor with age categorization and OTP generation', async () => {
      const payload = {
        fullName: 'Sameer Joshi',
        mobileNumber: '9890098900',
        ageRange: '31_TO_50',
        flatId: sampleFlatId,
        purpose: 'HVAC Servicing',
      };

      const req = new NextRequest('http://localhost:3000/api/visitors', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const res = await registerVisitorHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.visit.visitor.fullName).toBe('Sameer Joshi');
      expect(data.rawOtp).toBeDefined();
      expect(data.rawOtp).toHaveLength(6);
    });

    it('prevents RESIDENT from registering visitors for someone elses flat', async () => {
      const payload = {
        fullName: 'Intruder Pre-approval',
        mobileNumber: '9890098900',
        ageRange: '18_TO_30',
        flatId: otherFlatId,
        purpose: 'Delivery',
      };

      const req = new NextRequest('http://localhost:3000/api/visitors', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const res = await registerVisitorHandler(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain('Residents may only register visitors for their own flat');
    });
  });

  describe('End-to-End Workflow: OTP, Approval, Dual-Check Entry, Exit', () => {
    it('executes full visitor entry lifecycle with strict dual-check enforcement', async () => {
      // 1. Register visitor
      const regReq = new NextRequest('http://localhost:3000/api/visitors', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          fullName: 'Deepak Chahar',
          mobileNumber: '9812398123',
          ageRange: '18_TO_30',
          flatId: sampleFlatId,
          purpose: 'Friend Visit',
        }),
      });

      const regRes = await registerVisitorHandler(regReq);
      const regData = await regRes.json();
      const visitId = regData.visit.id;
      const rawOtp = regData.rawOtp;
      expect(visitId).toBeDefined();
      expect(rawOtp).toBeDefined();

      const paramsPromise = Promise.resolve({ id: visitId });

      // 2. Try entry BEFORE verification -> MUST FAIL
      const earlyEntryReq = new NextRequest(`http://localhost:3000/api/visitors/${visitId}/entry`, {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const earlyEntryRes = await entryHandler(earlyEntryReq, { params: paramsPromise });
      expect(earlyEntryRes.status).toBe(400);
      const earlyEntryData = await earlyEntryRes.json();
      expect(earlyEntryData.error).toContain('OTP verification has not been completed');

      // 3. Verify OTP with incorrect code -> fails
      const wrongOtpReq = new NextRequest(`http://localhost:3000/api/visitors/${visitId}/verify-otp`, {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ otp: '000000' }),
      });
      const wrongOtpRes = await verifyOtpHandler(wrongOtpReq, { params: paramsPromise });
      expect(wrongOtpRes.status).toBe(400);

      // 4. Verify OTP with correct code -> succeeds
      const validOtpReq = new NextRequest(`http://localhost:3000/api/visitors/${visitId}/verify-otp`, {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ otp: rawOtp }),
      });
      const validOtpRes = await verifyOtpHandler(validOtpReq, { params: paramsPromise });
      expect(validOtpRes.status).toBe(200);

      // 5. Try entry with ONLY OTP verified (missing resident approval) -> MUST FAIL
      const otpOnlyEntryRes = await entryHandler(earlyEntryReq, { params: paramsPromise });
      expect(otpOnlyEntryRes.status).toBe(400);
      const otpOnlyData = await otpOnlyEntryRes.json();
      expect(otpOnlyData.error).toContain('Resident intercom or app approval has not been recorded');

      // 6. Record Godrej Intercom approval
      const approveReq = new NextRequest(`http://localhost:3000/api/visitors/${visitId}/approve`, {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          channel: 'GODREJ_INTERCOM',
          status: 'APPROVED',
          notes: 'Audio call approved by Jonathan Patel',
        }),
      });
      const approveRes = await approveHandler(approveReq, { params: paramsPromise });
      expect(approveRes.status).toBe(200);

      // 7. Confirm gate entry -> BOTH checks are now green, entry MUST SUCCEED
      const finalEntryReq = new NextRequest(`http://localhost:3000/api/visitors/${visitId}/entry`, {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const finalEntryRes = await entryHandler(finalEntryReq, { params: paramsPromise });
      expect(finalEntryRes.status).toBe(200);
      const finalEntryData = await finalEntryRes.json();
      expect(finalEntryData.visit.status).toBe('INSIDE');
      expect(finalEntryData.visit.entryTime).toBeDefined();

      // 8. Confirm exit / departure
      const exitReq = new NextRequest(`http://localhost:3000/api/visitors/${visitId}/exit`, {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const exitRes = await exitHandler(exitReq, { params: paramsPromise });
      expect(exitRes.status).toBe(200);
      const exitData = await exitRes.json();
      expect(exitData.visit.status).toBe('COMPLETED');
      expect(exitData.visit.exitTime).toBeDefined();
    });
  });
});
