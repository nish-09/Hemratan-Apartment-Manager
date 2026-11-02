import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { GET as getSocietyAnalytics } from './analytics/society/route';
import { GET as getReports } from './reports/route';
import { GET as exportReports } from './reports/export/route';
import { GET as getSystemOverview } from './admin/system-overview/route';

describe('Stage 7 — Analytics & Reports REST APIs', () => {
  let committeeToken: string;
  let superAdminToken: string;
  let guardToken: string;
  let residentToken: string;

  beforeEach(() => {
    committeeToken = createSessionToken('committee@hemratan.com')!.token;
    superAdminToken = createSessionToken('admin@hemratan.com')!.token;
    guardToken = createSessionToken('guard@hemratan.com')!.token;
    residentToken = createSessionToken('resident@hemratan.com')!.token;
  });

  describe('1. Society-Wide Analytics API (/api/analytics/society)', () => {
    it('rejects unauthenticated requests with 401', async () => {
      const req = new NextRequest('http://localhost:3000/api/analytics/society');
      const res = await getSocietyAnalytics(req);
      expect(res.status).toBe(401);
    });

    it('rejects Guards and Residents with 403 Forbidden', async () => {
      const guardReq = new NextRequest('http://localhost:3000/api/analytics/society', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const guardRes = await getSocietyAnalytics(guardReq);
      expect(guardRes.status).toBe(403);

      const resReq = new NextRequest('http://localhost:3000/api/analytics/society', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const resRes = await getSocietyAnalytics(resReq);
      expect(resRes.status).toBe(403);
    });

    it('returns full society KPI analytics for Committee members', async () => {
      const req = new NextRequest('http://localhost:3000/api/analytics/society?range=30D', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const res = await getSocietyAnalytics(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.data).toBeDefined();
      expect(json.data.flats.totalFlats).toBeGreaterThanOrEqual(100);
      expect(json.data.visitors).toBeDefined();
      expect(json.data.parking).toBeDefined();
      expect(json.data.finances.totalBilledPaise).toBeGreaterThan(0);
      expect(json.data.amenities).toBeDefined();
    });
  });

  describe('2. Reports Center API (/api/reports)', () => {
    it('rejects requests without type parameter with 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const res = await getReports(req);
      expect(res.status).toBe(400);
    });

    it('blocks Guards from requesting Financial reports with 403', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports?type=MAINTENANCE_BILLING', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const res = await getReports(req);
      expect(res.status).toBe(403);
    });

    it('allows Guards to request Security reports like VISITOR_LOG', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports?type=VISITOR_LOG', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const res = await getReports(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.report.metadata.title).toBe('Visitor Entry & Exit Register');
      expect(json.report.rows).toBeDefined();
    });

    it('allows Committee to request MAINTENANCE_BILLING report', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports?type=MAINTENANCE_BILLING', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const res = await getReports(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.report.metadata.category).toBe('FINANCIAL');
      expect(json.report.rows.length).toBeGreaterThan(0);
    });
  });

  describe('3. CSV Reports Export API (/api/reports/export)', () => {
    it('returns downloadable CSV with proper attachment headers for authorized users', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports/export?type=FLAT_OCCUPANCY', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const res = await exportReports(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/csv');
      expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="hemratan_flat_occupancy_');

      const csv = await res.text();
      expect(csv).toContain('# Hemratan Apartment Manager');
      expect(csv).toContain('"Flat Number"');
    });

    it('blocks Residents from exporting society financial registers', async () => {
      const req = new NextRequest('http://localhost:3000/api/reports/export?type=OUTSTANDING_DUES', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const res = await exportReports(req);
      expect(res.status).toBe(403);
    });
  });

  describe('4. Super Admin System Overview API (/api/admin/system-overview)', () => {
    it('blocks non-Super Admin roles with 403', async () => {
      const commReq = new NextRequest('http://localhost:3000/api/admin/system-overview', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const commRes = await getSystemOverview(commReq);
      expect(commRes.status).toBe(403);
    });

    it('returns system health, telemetry, and security events for Super Admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/system-overview', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${superAdminToken}` },
      });
      const res = await getSystemOverview(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.overview.users.totalUsers).toBeGreaterThan(0);
      expect(json.overview.databaseHealth.status).toBeDefined();
      expect(json.overview.apiHealth.overallStatus).toBe('OPERATIONAL');
      expect(json.overview.storageConfigStatus.totalBuckets).toBe(4);
      expect(json.overview.securityAuditEvents.length).toBeGreaterThan(0);
      expect(json.overview.backgroundJobs).toBeDefined();

      // Ensure NO password hashes or secrets are exposed
      const serialized = JSON.stringify(json);
      expect(serialized).not.toContain('passwordHash');
      expect(serialized).not.toContain('SESSION_SECRET');
    });
  });
});
