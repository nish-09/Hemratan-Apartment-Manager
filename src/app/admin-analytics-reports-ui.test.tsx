import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/analytics',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import AdminAnalyticsPage from './admin/analytics/page';
import ReportsCentrePage from './admin/reports/page';

describe('Stage 7 — Admin Analytics & Reports Centre UI', () => {
  it('renders Society-Wide Analytics Cockpit with filters and header', () => {
    const html = renderToString(<AdminAnalyticsPage />);
    expect(html).toContain('Society-Wide Analytics Cockpit');
    expect(html).toContain('Last 30 Days');
    expect(html).toContain('Today');
    expect(html).toContain('Refresh Data');
  });

  it('renders Reports Centre with category tabs and export buttons', () => {
    const html = renderToString(<ReportsCentrePage />);
    expect(html).toContain('Reports Centre');
    expect(html).toContain('Residents &amp; Society');
    expect(html).toContain('Security &amp; Operations');
    expect(html).toContain('Complaints');
    expect(html).toContain('Financial Accounting');
    expect(html).toContain('Amenities');
    expect(html).toContain('Export CSV');
    expect(html).toContain('Print Report');
  });
});
