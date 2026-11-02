import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/resident/complaints',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import ResidentComplaintsPage from './resident/complaints/page';
import CommitteeComplaintsPage from './admin/complaints/page';
import StaffTaskConsolePage from './guard/staff/page';

describe('Stage 4 UI Pages (Complaints & Task Management)', () => {
  it('renders Resident Complaints Portal with submission trigger and active requests', () => {
    const html = renderToString(<ResidentComplaintsPage />);
    expect(html).toContain('Flat A-402 Complaints &amp; Maintenance');
    expect(html).toContain('Private Resident Portal');
    expect(html).toContain('Raise New Complaint');
    expect(html).toContain('My Active Service Requests');
    expect(html).toContain('Resolved Complaints History');
  });

  it('renders Committee Complaints Cockpit with triage ledger, score metrics, and dispatch controls', () => {
    const html = renderToString(<CommitteeComplaintsPage />);
    expect(html).toContain('Society Complaints &amp; Task Cockpit');
    expect(html).toContain('Operations Triage');
    expect(html).toContain('Complaints Triage Ledger');
    expect(html).toContain('Immediate Action Required');
    expect(html).toContain('Resolution Within 24 Hours');
  });

  it('renders Staff Task Console with operational queue, status controls, and resolution actions', () => {
    const html = renderToString(<StaffTaskConsolePage />);
    expect(html).toContain('Staff Task Execution Console');
    expect(html).toContain('Operational Duty Active');
    expect(html).toContain('Active Assignment Queue');
    expect(html).toContain('Assigned to Gate 1 Staff');
  });
});
