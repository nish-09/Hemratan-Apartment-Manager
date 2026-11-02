import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/resident/directory',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import ResidentDirectoryPage from './resident/directory/page';
import StaffTaskConsolePage from './guard/staff/page';
import CommitteeDirectoryGovernancePage from './admin/directory/page';

describe('Stage 5 UI Pages (Directory & Domestic Help Attendance)', () => {
  it('renders Resident Directory & Domestic Help Console', () => {
    const html = renderToString(<ResidentDirectoryPage />);
    expect(html).toContain('Community Directory &amp; Domestic Staff');
    expect(html).toContain('Society Directory &amp; Domestic Help');
    expect(html).toContain('Verified Service Providers');
    expect(html).toContain('My Domestic Help');
    expect(html).toContain('Society Emergency Contacts');
    expect(html).toContain('Add Domestic Staff');
  });

  it('renders Guard Security Gate Attendance & Staff Duties Console', () => {
    const html = renderToString(<StaffTaskConsolePage />);
    expect(html).toContain('Staff Task Execution Console &amp; Security Gate Attendance');
    expect(html).toContain('Gate Attendance Roster');
    expect(html).toContain('Currently Inside Premises');
    expect(html).toContain('Assigned Society Tasks');
    expect(html).toContain('Register Domestic Worker');
  });

  it('renders Committee Directory Governance & Staff Audit Console', () => {
    const html = renderToString(<CommitteeDirectoryGovernancePage />);
    expect(html).toContain('Service Directory Governance &amp; Staff Audits');
    expect(html).toContain('Managing Committee Oversight');
    expect(html).toContain('Service Providers');
    expect(html).toContain('Domestic Staff Roster');
    expect(html).toContain('Contact Access Audit Trail');
    expect(html).toContain('Register Service Provider');
  });
});
