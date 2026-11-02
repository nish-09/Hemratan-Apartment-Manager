import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as updateConfigHandler, GET as getConfigHandler } from './config/route';
import { POST as calculateHandler } from './calculate/route';
import { POST as generateBatchHandler } from './generate/route';
import { GET as listInvoicesHandler } from './invoices/route';
import { GET as getInvoicePdfHandler } from './invoices/[id]/pdf/route';
import { GET as getBatchPdfHandler } from './batches/[id]/pdf/route';
import { POST as createOrderHandler } from '../payments/create-order/route';
import { POST as verifyPaymentHandler } from '../payments/verify/route';
import { GET as listReceiptsHandler } from '../receipts/route';
import { GET as getReceiptPdfHandler } from '../receipts/[id]/pdf/route';
import { POST as createExpenseHandler } from '../expenses/route';
import { POST as approveExpenseHandler } from '../expenses/[id]/approve/route';
import { POST as markPaidExpenseHandler } from '../expenses/[id]/mark-paid/route';
import { GET as financeSummaryHandler } from '../finance/summary/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { BillingService } from '@/services/billing.service';
import { ExpenseService } from '@/services/expense.service';
import { PaymentGatewayService } from '@/services/payment-gateway.service';

describe('Stage 6 — Financial Accounting Complete End-to-End User Flow', () => {
  let committeeToken: string;
  let residentToken: string;
  let adminToken: string;

  beforeEach(() => {
    BillingService._resetForTesting();
    ExpenseService._resetForTesting();
    PaymentGatewayService._resetForTesting();

    committeeToken = createSessionToken('committee@hemratan.com')!.token;
    residentToken = createSessionToken('resident@hemratan.com')!.token;
    adminToken = createSessionToken('admin@hemratan.com')!.token;
  });

  it('executes full end-to-end user story from batch generation to payment, receipt, expense, and analytics', async () => {
    // ----------------------------------------------------
    // STEP 1: Committee sets locked billing configuration
    // ----------------------------------------------------
    const configRes = await updateConfigHandler(
      new NextRequest('http://localhost:3000/api/billing/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          billingModel: 'HYBRID',
          fixedChargePaise: 200000, // ₹2,000.00
          ratePerSqFtPaise: 350, // ₹3.50 / sq.ft.
          gstHandling: 'MANUAL',
          gstPercentage: 0,
        }),
      })
    );
    expect(configRes.status).toBe(200);

    // ----------------------------------------------------
    // STEP 2: Committee tests Smart Calculator
    // ----------------------------------------------------
    const calcRes = await calculateHandler(
      new NextRequest('http://localhost:3000/api/billing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          flatAreaSqFt: 1100, // Flat A-402
          additionalCharges: [
            { description: 'Sinking Fund', amountPaise: 50000, category: 'SINKING_FUND', taxApplicable: false },
          ],
        }),
      })
    );
    expect(calcRes.status).toBe(200);
    const calcData = await calcRes.json();
    // Fixed ₹2,000 + 1100 * ₹3.50 (₹3,850) = ₹5,850 base + ₹500 sinking fund = ₹6,350 (635000 paise)
    expect(calcData.calculation.totalAmountPaise).toBe(635000);

    // ----------------------------------------------------
    // STEP 3: Committee Generates Society Batch for November 2026
    // ----------------------------------------------------
    const batchRes = await generateBatchHandler(
      new NextRequest('http://localhost:3000/api/billing/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          month: 11,
          year: 2026,
          dueDate: '2026-11-20',
        }),
      })
    );
    expect(batchRes.status).toBe(201);
    const batchData = await batchRes.json();
    expect(batchData.batch.batchNumber).toContain('BATCH-202611');
    expect(batchData.invoices.length).toBe(7);

    // Verify Merged Printable PDF route works
    const mergedPdfRes = await getBatchPdfHandler(
      new NextRequest(`http://localhost:3000/api/billing/batches/${batchData.batch.batchNumber}/pdf`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      }),
      { params: Promise.resolve({ id: batchData.batch.batchNumber }) }
    );
    expect(mergedPdfRes.status).toBe(200);
    const mergedHtml = await mergedPdfRes.text();
    expect(mergedHtml).toContain('HEMRATAN CO-OPERATIVE HOUSING SOCIETY LTD');
    expect(mergedHtml).toContain('page-break-after: always');

    // ----------------------------------------------------
    // STEP 4: Resident Jonathan Patel accesses his invoice (Flat A-402)
    // ----------------------------------------------------
    const resInvoices = await listInvoicesHandler(
      new NextRequest('http://localhost:3000/api/billing/invoices', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      })
    );
    expect(resInvoices.status).toBe(200);
    const resInvData = await resInvoices.json();
    expect(resInvData.invoices.length).toBe(1);
    const myBill = resInvData.invoices[0];
    expect(myBill.flatId).toBe('flat-a-402');
    expect(myBill.invoiceNumber).toBe('INV-202611-A402');
    // ₹2,000 fixed + 1,100 * ₹3.50 (₹3,850) = ₹5,850 (585000 paise)
    expect(myBill.totalAmountPaise).toBe(585000);
    expect(myBill.status).toBe('GENERATED');

    // Verify Individual Printable PDF route works
    const singlePdfRes = await getInvoicePdfHandler(
      new NextRequest(`http://localhost:3000/api/billing/invoices/${myBill.id}/pdf`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      }),
      { params: Promise.resolve({ id: myBill.id }) }
    );
    expect(singlePdfRes.status).toBe(200);
    const singleHtml = await singlePdfRes.text();
    expect(singleHtml).toContain('MAINTENANCE INVOICE: INV-202611-A402');
    expect(singleHtml).toContain('Wing A — Flat 402');

    // ----------------------------------------------------
    // STEP 5: Resident Pays Bill Online via Gateway
    // ----------------------------------------------------
    const orderRes = await createOrderHandler(
      new NextRequest('http://localhost:3000/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          invoiceId: myBill.id,
          amountPaise: myBill.totalAmountPaise,
        }),
      })
    );
    expect(orderRes.status).toBe(201);
    const orderData = await orderRes.json();
    expect(orderData.order.orderId).toBeDefined();

    // Verify payment with provider signature
    const verifyRes = await verifyPaymentHandler(
      new NextRequest('http://localhost:3000/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          orderId: orderData.order.orderId,
          paymentId: 'pay_online_success_123',
          signature: 'valid_mock_signature',
          invoiceId: myBill.id,
          amountPaise: myBill.totalAmountPaise,
        }),
      })
    );
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.invoice.status).toBe('PAID');
    expect(verifyData.invoice.outstandingBalancePaise).toBe(0);
    expect(verifyData.receipt).toBeDefined();

    // ----------------------------------------------------
    // STEP 6: Resident Downloads Confirmed Receipt
    // ----------------------------------------------------
    const receiptsRes = await listReceiptsHandler(
      new NextRequest('http://localhost:3000/api/receipts', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      })
    );
    expect(receiptsRes.status).toBe(200);
    const receiptsData = await receiptsRes.json();
    expect(receiptsData.receipts.length).toBe(1);
    const receipt = receiptsData.receipts[0];
    expect(receipt.invoiceNumber).toBe('INV-202611-A402');
    expect(receipt.amountReceivedPaise).toBe(585000);
    expect(receipt.remainingBalancePaise).toBe(0);

    // Printable Receipt HTML
    const recPdfRes = await getReceiptPdfHandler(
      new NextRequest(`http://localhost:3000/api/receipts/${receipt.id}/pdf`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      }),
      { params: Promise.resolve({ id: receipt.id }) }
    );
    expect(recPdfRes.status).toBe(200);
    const recHtml = await recPdfRes.text();
    expect(recHtml).toContain('RECEIPT:');
    expect(recHtml).toContain(receipt.receiptNumber);

    // ----------------------------------------------------
    // STEP 7: Committee records an Expense & Approvals
    // ----------------------------------------------------
    const expenseRes = await createExpenseHandler(
      new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          title: 'Overhead Tank Sanitization',
          category: 'WATER',
          vendorName: 'PureAqua Services',
          amountPaise: 1250000, // ₹12,500.00
          expenseDate: '2026-11-06',
          description: 'Quarterly cleaning and chemical treatment',
        }),
      })
    );
    expect(expenseRes.status).toBe(201);
    const { expense } = await expenseRes.json();
    expect(expense.status).toBe('SUBMITTED');

    // Self-approval violation check: Committee Rosa Palmour cannot approve her own voucher
    const selfApproveRes = await approveExpenseHandler(
      new NextRequest(`http://localhost:3000/api/expenses/${expense.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: expense.id }) }
    );
    expect(selfApproveRes.status).toBe(400);

    // Authorized independent approval: Super Admin Rajesh Sharma approves
    const adminApproveRes = await approveExpenseHandler(
      new NextRequest(`http://localhost:3000/api/expenses/${expense.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        },
        body: JSON.stringify({ comments: 'Verified job completion certificate.' }),
      }),
      { params: Promise.resolve({ id: expense.id }) }
    );
    expect(adminApproveRes.status).toBe(200);

    // Committee marks approved expense as paid
    const markPaidRes = await markPaidExpenseHandler(
      new NextRequest(`http://localhost:3000/api/expenses/${expense.id}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          paymentMethod: 'BANK_TRANSFER',
          paymentReference: 'NEFT-88392100',
        }),
      }),
      { params: Promise.resolve({ id: expense.id }) }
    );
    expect(markPaidRes.status).toBe(200);
    const { expense: paidExpense } = await markPaidRes.json();
    expect(paidExpense.status).toBe('PAID');

    // ----------------------------------------------------
    // STEP 8: Financial Dashboard derives real records
    // ----------------------------------------------------
    const financeRes = await financeSummaryHandler(
      new NextRequest('http://localhost:3000/api/finance/summary', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      })
    );
    expect(financeRes.status).toBe(200);
    const financeData = await financeRes.json();
    expect(financeData.billing.totalBilledPaise).toBe(3832500); // 7 flats total
    expect(financeData.billing.totalCollectedPaise).toBe(585000); // Jonathan paid
    expect(financeData.billing.totalOutstandingPaise).toBe(3832500 - 585000);
    expect(financeData.expenses.paidPaise).toBe(2100000); // Seed paid floodlights (850k) + newly paid tank sanitization (1250k)
    expect(financeData.recentPayments.length).toBeGreaterThan(0);
  });
});
