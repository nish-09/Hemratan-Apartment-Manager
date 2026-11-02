import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/guard/visitors',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import GuardVisitorsPage from './guard/visitors/page';
import ResidentVisitorsPage from './resident/visitors/page';

describe('Visitor Management UI Pages', () => {
  it('renders Guard Visitor Console with dual-check controls and registration trigger', () => {
    const html = renderToString(<GuardVisitorsPage />);
    expect(html).toContain('Visitor Gate Console');
    expect(html).toContain('Dual-Check Security Enforced');
    expect(html).toContain('New Arrival Registration');
    expect(html).toContain('Gate Verification Queue');
    expect(html).toContain('Currently Inside');
  });

  it('renders Resident Visitors Page with flat isolation and pre-approve actions', () => {
    const html = renderToString(<ResidentVisitorsPage />);
    expect(html).toContain('Flat A-402 Visitors');
    expect(html).toContain('Private Flat Access');
    expect(html).toContain('Pre-Approve Guest');
    expect(html).toContain('Currently Visiting Flat A-402');
  });
});
