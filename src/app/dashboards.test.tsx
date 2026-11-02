import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import ResidentDashboard from './resident/dashboard/page';
import GuardDashboard from './guard/dashboard/page';
import CommitteeDashboard from './admin/dashboard/page';
import SuperAdminDashboard from './super-admin/dashboard/page';

describe('Role-Specific Dashboards', () => {
  it('renders Resident Dashboard with dues and resident actions', () => {
    const html = renderToString(<ResidentDashboard />);
    expect(html).toContain('Jonathan');
    expect(html).toContain('Pre-Approve Visitor');
    expect(html).toContain('Raise Complaint');
    expect(html).toContain('2,46,428');
  });

  it('renders Guard Dashboard with gate access and visitor logs', () => {
    const html = renderToString(<GuardDashboard />);
    expect(html).toContain('Santosh');
    expect(html).toContain('Register Visitor (OTP)');
    expect(html).toContain('Currently Inside Society');
    expect(html).toContain('Ramesh Verma');
  });

  it('renders Committee Dashboard with billing and complaints triage', () => {
    const html = renderToString(<CommitteeDashboard />);
    expect(html).toContain('Rosa');
    expect(html).toContain('Generate Monthly Bills');
    expect(html).toContain('Complaints Requiring Committee Action');
    expect(html).toContain('Wing A');
  });

  it('renders Super Admin Dashboard with user matrix and audit trail', () => {
    const html = renderToString(<SuperAdminDashboard />);
    expect(html).toContain('Rajesh');
    expect(html).toContain('System Users');
    expect(html).toContain('Security Audit Trail');
  });
});
