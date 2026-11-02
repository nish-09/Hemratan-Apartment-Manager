import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/guard/parking',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import GuardParkingPage from './guard/parking/page';
import GuardDeliveriesPage from './guard/deliveries/page';
import ResidentDeliveriesPage from './resident/deliveries/page';
import CommitteeParkingDeliveriesPage from './admin/parking/page';

describe('Stage 3 UI Pages (Parking & Deliveries)', () => {
  it('renders Guard Parking Console with slot grid, allocation modal trigger, and active vehicle list', () => {
    const html = renderToString(<GuardParkingPage />);
    expect(html).toContain('Society Visitor Parking');
    expect(html).toContain('Live Bay Monitoring');
    expect(html).toContain('Allocate Parking');
    expect(html).toContain('Dynamic capacity management');
  });

  it('renders Guard Deliveries Console with intake modal trigger, parcel search, and handover actions', () => {
    const html = renderToString(<GuardDeliveriesPage />);
    expect(html).toContain('Parcel &amp; Courier Intake');
    expect(html).toContain('In-App Notifications Active');
    expect(html).toContain('Log Incoming Parcel');
    expect(html).toContain('Held at Security Gate');
  });

  it('renders Resident Deliveries Page with flat isolation, awaiting pickup queue, and visitor parking info', () => {
    const html = renderToString(<ResidentDeliveriesPage />);
    expect(html).toContain('Flat A-402 Deliveries &amp; Parking');
    expect(html).toContain('Private Flat Records');
    expect(html).toContain('Awaiting Collection at Gate 1');
    expect(html).toContain('Visitor Parking for Flat A-402');
  });

  it('renders Committee Parking & Deliveries Console with capacity controls and delivery ledger', () => {
    const html = renderToString(<CommitteeParkingDeliveriesPage />);
    expect(html).toContain('Society Operations');
    expect(html).toContain('Visitor Bays &amp; Parcel Tracking');
    expect(html).toContain('Configurable Parking Duration');
    expect(html).toContain('Dynamic Capacity Management');
    expect(html).toContain('Configure New Bay');
  });
});
