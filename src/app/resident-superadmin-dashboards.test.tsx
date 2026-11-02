import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/resident/dashboard',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import ResidentDashboard from './resident/dashboard/page';
import SuperAdminAnalyticsPage from './super-admin/analytics/page';

describe('Stage 7 — Resident Dashboard Personal Insights & Super Admin Analytics', () => {
  it('renders Resident Dashboard with scoped personal insights and preserved baseline keys', () => {
    const html = renderToString(<ResidentDashboard />);
    // Preserved baseline assertions from dashboards.test.tsx
    expect(html).toContain('Jonathan');
    expect(html).toContain('Pre-Approve Visitor');
    expect(html).toContain('Raise Complaint');
    expect(html).toContain('2,46,428');

    // Stage 7 personal insights
    expect(html).toContain('Current Maintenance Bill');
    expect(html).toContain('Outstanding Balance');
    expect(html).toContain('Recent Visitors');
    expect(html).toContain('Flat A-402');
    expect(html).toContain('Household Staff Status');
    expect(html).toContain('My Facility Bookings');
    expect(html).toContain('Society Notices');
  });

  it('renders Super Admin System Analytics page with governance telemetry', () => {
    const html = renderToString(<SuperAdminAnalyticsPage />);
    expect(html).toContain('Super Admin System Overview');
    expect(html).toContain('Poll Telemetry');
    expect(html).toContain('Platform Governance');
  });
});
