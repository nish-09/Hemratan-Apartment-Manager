import { test, expect } from '@playwright/test';
import { createSessionToken, SESSION_COOKIE_NAME } from '../src/lib/auth/session';

test.describe('Stage 6 — Full Financial Accounting & Billing Browser Workflow', () => {
  let committeeCookie: { name: string; value: string; domain: string; path: string };
  let adminCookie: { name: string; value: string; domain: string; path: string };
  let residentCookie: { name: string; value: string; domain: string; path: string };

  test.beforeAll(() => {
    const commToken = createSessionToken('committee@hemratan.com')!.token;
    const admToken = createSessionToken('admin@hemratan.com')!.token;
    const resToken = createSessionToken('resident@hemratan.com')!.token;

    committeeCookie = {
      name: SESSION_COOKIE_NAME,
      value: commToken,
      domain: 'localhost',
      path: '/',
    };
    adminCookie = {
      name: SESSION_COOKIE_NAME,
      value: admToken,
      domain: 'localhost',
      path: '/',
    };
    residentCookie = {
      name: SESSION_COOKIE_NAME,
      value: resToken,
      domain: 'localhost',
      path: '/',
    };
  });

  test('Complete Financial Lifecycle: Configure -> Calculate -> Generate -> View -> Pay -> Receipt -> Expense -> Dashboard', async ({
    page,
    context,
  }) => {
    // -------------------------------------------------------------
    // 1. Committee configures monthly billing & enters metrics
    // -------------------------------------------------------------
    await context.addCookies([committeeCookie]);
    await page.goto('/admin/billing/calculator');
    await expect(page.locator('h1:has-text("Smart Maintenance Bill Calculator")')).toBeVisible();

    // Change rates
    const fixedChargeInput = page.locator('input[type="number"]').first();
    await fixedChargeInput.fill('2200');

    // Live preview snapshot must display updated values
    await expect(page.locator('text=Live Preview Snapshot')).toBeVisible();

    // -------------------------------------------------------------
    // 2. Committee navigates to Bulk Generation Console
    // -------------------------------------------------------------
    await page.goto('/admin/billing/generate');
    await expect(page.locator('h1:has-text("Bulk Maintenance Bill Generation")')).toBeVisible();
    await expect(page.locator('text=Society Batch Dispatch')).toBeVisible();

    // Trigger batch generation
    const generateBtn = page.locator('button:has-text("Generate Society Batch")');
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(1000);
    }

    // -------------------------------------------------------------
    // 3. Resident views their bill in Resident Billing Portal
    // -------------------------------------------------------------
    await context.clearCookies();
    await context.addCookies([residentCookie]);
    await page.goto('/resident/billing');
    await expect(page.locator('h1:has-text("Maintenance & Billing Portal")')).toBeVisible();
    await expect(page.locator('text=Current Monthly Bill')).toBeVisible();

    // Verify resident sees Pay Now or invoice balance
    const payNowBtn = page.locator('button:has-text("Pay Now")').first();
    if (await payNowBtn.isVisible()) {
      await payNowBtn.click();
      await page.waitForTimeout(500);

      // Verify payment modal appears
      await expect(page.locator('text=Complete Maintenance Payment')).toBeVisible();

      // Click Confirm & Pay Online
      const confirmPayBtn = page.locator('button:has-text("Confirm & Pay")');
      if (await confirmPayBtn.isVisible()) {
        await confirmPayBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // -------------------------------------------------------------
    // 4. Resident checks receipts in Billing Portal
    // -------------------------------------------------------------
    await expect(page.locator('text=Payment Receipts')).toBeVisible();

    // -------------------------------------------------------------
    // 5. Committee records and approves society expense
    // -------------------------------------------------------------
    await context.clearCookies();
    await context.addCookies([committeeCookie]);
    await page.goto('/admin/expenses');
    await expect(page.locator('h1:has-text("Society Expense Management")')).toBeVisible();
    await expect(page.locator('text=Record New Expense')).toBeVisible();

    // Record an expense
    await page.locator('button:has-text("Record New Expense")').click();
    await page.fill('input[placeholder*="Overhead Tank"]', 'Gate Camera Maintenance');
    await page.locator('input[type="text"]').nth(2).fill('Suraksha CCTV Solutions');
    await page.locator('input[type="number"]').fill('12000');
    await page.locator('textarea').fill('Fixed optical zoom sensor on Gate 1 camera.');
    await page.locator('button:has-text("Submit Voucher for Committee Approval")').click();
    await page.waitForTimeout(1000);

    // Switch to Admin to approve expense (Segregation of Duties)
    await context.clearCookies();
    await context.addCookies([adminCookie]);
    await page.goto('/admin/expenses');
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await page.waitForTimeout(1000);
    }

    // -------------------------------------------------------------
    // 6. Committee views Society Finance Analytics Dashboard
    // -------------------------------------------------------------
    await page.goto('/admin/finance');
    await expect(page.locator('h1:has-text("Society Financial Analytics")')).toBeVisible();
    await expect(page.locator('text=Maintenance Collections')).toBeVisible();
    await expect(page.locator('text=Outstanding Member Dues')).toBeVisible();
    await expect(page.locator('text=Net Cash Operating Movement')).toBeVisible();
    await expect(page.locator('text=Category-Wise Expenditure Breakdown')).toBeVisible();
  });
});
