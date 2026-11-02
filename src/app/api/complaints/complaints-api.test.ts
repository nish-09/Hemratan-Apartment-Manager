import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getComplaintsHandler, POST as submitComplaintHandler } from './route';
import { PATCH as overridePriorityHandler } from './[id]/priority/route';
import { POST as assignTaskHandler } from './[id]/tasks/route';
import { PATCH as confirmEtaHandler } from './[id]/eta/route';
import { POST as reopenHandler } from './[id]/reopen/route';
import { POST as feedbackHandler } from './[id]/feedback/route';
import { PATCH as updateTaskProgressHandler } from './tasks/[taskId]/route';
import { POST as revealIdentityHandler } from './[id]/reveal-identity/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { ComplaintService } from '@/services/complaint.service';

describe('Complaints & Task Management API Endpoints', () => {
  let residentToken: string;
  let committeeToken: string;
  let superAdminToken: string;
  let guardToken: string;

  beforeEach(() => {
    ComplaintService._resetForTesting();
    residentToken = createSessionToken('resident@hemratan.com')!.token;
    committeeToken = createSessionToken('committee@hemratan.com')!.token;
    superAdminToken = createSessionToken('admin@hemratan.com')!.token;
    guardToken = createSessionToken('guard@hemratan.com')!.token;
  });

  describe('GET /api/complaints', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/complaints');
      const res = await getComplaintsHandler(req);
      expect(res.status).toBe(401);
    });

    it('returns flat-scoped complaints for Resident and society-wide for Committee', async () => {
      // Seed a complaint for resident
      await ComplaintService.submitComplaint({
        title: 'Water tap leaking in kitchen',
        description: 'Continuous dripping from mixer unit.',
        category: 'PLUMBING',
        severity: 'LOW',
        urgency: 'MEDIUM',
        flatId: 'flat-a-402',
        complainantProfileId: 'u-resident-001',
        complainantName: 'Jonathan Patel',
      });

      // Resident request
      const resReq = new NextRequest('http://localhost:3000/api/complaints', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const resRes = await getComplaintsHandler(resReq);
      expect(resRes.status).toBe(200);
      const resData = await resRes.json();
      expect(Array.isArray(resData.complaints)).toBe(true);

      // Committee request
      const comReq = new NextRequest('http://localhost:3000/api/complaints', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const comRes = await getComplaintsHandler(comReq);
      expect(comRes.status).toBe(200);
      const comData = await comRes.json();
      expect(comData.complaints.length).toBeGreaterThanOrEqual(1);
      expect(comData.metrics).toBeDefined();
    });
  });

  describe('POST /api/complaints (Submission)', () => {
    it('allows resident to submit complaint with deterministic priority scoring', async () => {
      const req = new NextRequest('http://localhost:3000/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          title: 'Ceiling plaster peeling in corridor',
          description: 'Large chunk fell near lift landing area.',
          category: 'STRUCTURAL',
          severity: 'HIGH',
          urgency: 'HIGH',
          affectedFlatsCount: 4,
          propertyDamage: false,
          recurrence: true,
        }),
      });

      const res = await submitComplaintHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.complaint).toBeDefined();
      expect(data.complaint.referenceNo).toMatch(/^CMP-\d{8}-\d{4}$/);
      expect(data.complaint.computedScore).toBeGreaterThanOrEqual(65);
      expect(data.complaint.priorityBand).toBe('HIGH');
    });

    it('rejects complaint submission with insufficient title length', async () => {
      const req = new NextRequest('http://localhost:3000/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          title: 'Leak',
          description: 'Water dripping everywhere.',
          category: 'PLUMBING',
          severity: 'LOW',
          urgency: 'LOW',
        }),
      });

      const res = await submitComplaintHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Title must be at least 5 characters');
    });
  });

  describe('PATCH /api/complaints/[id]/priority (Committee Override)', () => {
    it('allows Committee to override priority and rejects non-committee roles', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Clubhouse gym sound system faulty',
        description: 'Speakers humming loudly during use.',
        category: 'AMENITIES',
        severity: 'LOW',
        urgency: 'LOW',
        complainantProfileId: 'u-resident-001',
        complainantName: 'Jonathan Patel',
      });

      // Resident attempt -> 403 Forbidden
      const resReq = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/priority`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          newPriority: 'CRITICAL',
          reason: 'I want this fixed immediately now',
        }),
      });
      const resRes = await overridePriorityHandler(resReq, { params: Promise.resolve({ id: complaint.id }) });
      expect(resRes.status).toBe(403);

      // Committee attempt -> 200 OK
      const comReq = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/priority`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          newPriority: 'HIGH',
          reason: 'Annual General Meeting being hosted in clubhouse tomorrow evening',
        }),
      });
      const comRes = await overridePriorityHandler(comReq, { params: Promise.resolve({ id: complaint.id }) });
      expect(comRes.status).toBe(200);
      const data = await comRes.json();
      expect(data.complaint.committeePriority).toBe('HIGH');
      expect(data.complaint.effectivePriority).toBe('HIGH');
    });
  });

  describe('POST /api/complaints/[id]/tasks (Task Creation)', () => {
    it('creates and assigns task to staff member with proposed ETA', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Streetlight pole 4 flickering',
        description: 'Bulb blinks constantly at north boundary wall.',
        category: 'ELECTRICAL',
        severity: 'MEDIUM',
        urgency: 'LOW',
        complainantProfileId: 'u-resident-001',
        complainantName: 'Jonathan Patel',
      });

      const req = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          title: 'Replace Pole 4 Choke and Bulb',
          assignedStaffId: 'staff-003', // Dilip Electrician
        }),
      });

      const res = await assignTaskHandler(req, { params: Promise.resolve({ id: complaint.id }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.task).toBeDefined();
      expect(data.task.assignedStaffName).toBe('Dilip Electrician');
      expect(data.task.etaStatus).toBe('PROPOSED');
    });
  });

  describe('PATCH /api/complaints/[id]/eta (Committee Confirmation)', () => {
    it('confirms official ETA for complaint and updates task status', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Sewage line inspection',
        description: 'Inspection chamber lid cracked near gate 2.',
        category: 'PLUMBING',
        severity: 'HIGH',
        urgency: 'HIGH',
        complainantProfileId: 'u-resident-001',
        complainantName: 'Jonathan Patel',
      });

      await ComplaintService.assignTask({
        complaintId: complaint.id,
        title: 'Replace chamber lid',
        assignedStaffId: 'staff-002',
      });

      const confirmedDate = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
      const req = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/eta`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          confirmedEtaDate: confirmedDate,
          notes: 'Civil team dispatched with replacement cement slab',
        }),
      });

      const res = await confirmEtaHandler(req, { params: Promise.resolve({ id: complaint.id }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.complaint.confirmedEta).toBe(confirmedDate);
    });
  });

  describe('POST /api/complaints/[id]/reopen & /feedback', () => {
    it('handles resolution, feedback, and reopening lifecycle', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Clubhouse gym water cooler cooling issue',
        description: 'Dispensing room temperature water.',
        category: 'AMENITIES',
        severity: 'LOW',
        urgency: 'LOW',
        complainantProfileId: 'u-resident-001',
        complainantName: 'Jonathan Patel',
      });

      const task = await ComplaintService.assignTask({
        complaintId: complaint.id,
        title: 'Check thermostat',
        assignedStaffId: 'staff-003',
      });

      // Resolve Task
      const progReq = new NextRequest(`http://localhost:3000/api/complaints/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${guardToken}`,
        },
        body: JSON.stringify({
          statusUpdate: 'RESOLVED',
          notes: 'Thermostat reset and compressor gas topped up.',
          resolutionNotes: 'Water chilled to 10C.',
        }),
      });
      const progRes = await updateTaskProgressHandler(progReq, { params: Promise.resolve({ taskId: task.id }) });
      expect(progRes.status).toBe(200);

      // Submit Resident Feedback
      const fbReq = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          rating: 5,
          feedbackComments: 'Super fast turnaround! Water is cold now.',
        }),
      });
      const fbRes = await feedbackHandler(fbReq, { params: Promise.resolve({ id: complaint.id }) });
      expect(fbRes.status).toBe(201);

      // Reopen
      const reopenReq = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          reason: 'Compressor tripped again after 30 minutes of running.',
        }),
      });
      const reopenRes = await reopenHandler(reopenReq, { params: Promise.resolve({ id: complaint.id }) });
      expect(reopenRes.status).toBe(200);
      const reopenData = await reopenRes.json();
      expect(reopenData.complaint.status).toBe('REOPENED');
      expect(reopenData.complaint.reopenedCount).toBe(1);
    });
  });

  describe('POST /api/complaints/[id]/reveal-identity (Super Admin Exclusive)', () => {
    it('strictly denies Committee and allows Super Admin with legal justification', async () => {
      const complaint = await ComplaintService.submitComplaint({
        title: 'Unauthorized pet breeding in parking',
        description: 'Puppies kept in cage near car bay P4.',
        category: 'PARKING',
        severity: 'MEDIUM',
        urgency: 'HIGH',
        isAnonymous: true,
        flatId: 'flat-a-402',
        complainantProfileId: 'u-resident-001',
        complainantName: 'Jonathan Patel',
      });

      // Committee attempt -> 403 Forbidden
      const comReq = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/reveal-identity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          legalReason: 'Committee wants to know who complained about this',
        }),
      });
      const comRes = await revealIdentityHandler(comReq, { params: Promise.resolve({ id: complaint.id }) });
      expect(comRes.status).toBe(403);

      // Super Admin attempt -> 200 OK
      const saReq = new NextRequest(`http://localhost:3000/api/complaints/${complaint.id}/reveal-identity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}`,
        },
        body: JSON.stringify({
          legalReason: 'Police inquiry sub-poena regarding animal cruelty case corroboration',
        }),
      });
      const saRes = await revealIdentityHandler(saReq, { params: Promise.resolve({ id: complaint.id }) });
      expect(saRes.status).toBe(200);
      const data = await saRes.json();
      expect(data.identity.complainantName).toBe('Jonathan Patel');
    });
  });
});
