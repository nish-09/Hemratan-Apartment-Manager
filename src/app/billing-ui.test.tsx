import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  usePathname: () => '/resident/billing',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import ResidentBillingPage from './resident/billing/page';
import MaintenanceCalculatorPage from './admin/billing/calculator/page';
import BulkBillGenerationPage from './admin/billing/generate/page';
import ExpensesManagementPage from './admin/expenses/page';
import SocietyFinanceDashboard from './admin/finance/page';

describe('Stage 6 Financial Accounting & Billing UI Pages', () => {
  it('renders Resident Billing Portal with bills, breakdowns, and payment actions', () => {
    const html = renderToString(<ResidentBillingPage />);
    expect(html).toContain('Maintenance &amp; Billing Portal');
    expect(html).toContain('Current Monthly Bill');
    expect(html).toContain('Bill Archive');
    expect(html).toContain('Payment Receipts');
  });

  it('renders Smart Maintenance Bill Calculator with hybrid parameters and live preview', () => {
    const html = renderToString(<MaintenanceCalculatorPage />);
    expect(html).toContain('Smart Maintenance Bill Calculator');
    expect(html).toContain('1. Base Maintenance Model &amp; Rates');
    expect(html).toContain('2. Additional Utility Charges &amp; Funds');
    expect(html).toContain('3. GST Treatment &amp; Adjustments');
    expect(html).toContain('Live Preview Snapshot');
  });

  it('renders Bulk Bill Generation Console with flat roster, overrides, and merged PDF trigger', () => {
    const html = renderToString(<BulkBillGenerationPage />);
    expect(html).toContain('Bulk Maintenance Bill Generation');
    expect(html).toContain('Society Batch Dispatch');
    expect(html).toContain('Society Flat Roster &amp; Custom Metrics');
    expect(html).toContain('Generate Society Batch');
  });

  it('renders Society Expense Management Console with categories and voucher workflow', () => {
    const html = renderToString(<ExpensesManagementPage />);
    expect(html).toContain('Society Expense Management');
    expect(html).toContain('Record New Expense');
    expect(html).toContain('Total Expenses Logged');
    expect(html).toContain('Pending Approval');
  });

  it('renders Society Financial Analytics Dashboard with derived figures and category charts', () => {
    const html = renderToString(<SocietyFinanceDashboard />);
    expect(html).toContain('Society Financial Analytics');
    expect(html).toContain('Maintenance Collections');
    expect(html).toContain('Outstanding Member Dues');
    expect(html).toContain('Net Cash Operating Movement');
    expect(html).toContain('Category-Wise Expenditure Breakdown');
  });
});
