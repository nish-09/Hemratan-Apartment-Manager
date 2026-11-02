import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getConfigHandler, POST as updateConfigHandler } from './config/route';
import { POST as calculateHandler } from './calculate/route';
import { POST as generateHandler } from './generate/route';
import { GET as listInvoicesHandler } from './invoices/route';
import { GET as getInvoiceHandler } from './invoices/[id]/route';
import { GET as getInvoicePdfHandler } from './invoices/[id]/pdf/route';
import { POST as offlinePaymentHandler } from '../payments/offline/route';
import { POST as webhookHandler } from '../payments/webhook/route';
import { GET as listReceiptsHandler } from '../receipts/route';
import { GET as listExpensesHandler, POST as createExpenseHandler } from '../expenses/route';
import { POST as approveExpenseHandler } from '../expenses/[id]/approve/route';
import { GET as financeSummaryHandler } from '../finance/summary/route';
import { POST as disputeHandler } from './disputes/route';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { BillingService } from '@/services/billing.service';
import { ExpenseService } from '@/services/expense.service';
import { PaymentGatewayService } from '@/services/payment-gateway.service';

describe('Financial Accounting & Billing REST APIs', () => {
  let residentToken: string;
  let committeeToken: string;
  let adminToken: string;
  let guardToken: string;

  beforeEach(() => {
    BillingService._resetForTesting();
    ExpenseService._resetForTesting();
    PaymentGatewayService._resetForTesting();

    residentToken = createSessionToken('resident@hemratan.com')!.token;
    committeeToken = createSessionToken('committee@hemratan.com')!.token;
    adminToken = createSessionToken('admin@hemratan.com')!.token;
    guardToken = createSessionToken('guard@hemratan.com')!.token;
  });

  describe('Billing Configuration & Calculator APIs', () => {
    it('returns 401 when unauthenticated', async () => {
      const req = new NextRequest('http://localhost:3000/api/billing/config');
      const res = await getConfigHandler(req);
      expect(res.status).toBe(401);
    });

    it('denies access to Guards (403 Forbidden)', async () => {
      const req = new NextRequest('http://localhost:3000/api/billing/config', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${guardToken}` },
      });
      const res = await getConfigHandler(req);
      expect(res.status).toBe(403);
    });

    it('allows Committee to read and update billing configuration', async () => {
      // 1. Read
      const getReq = new NextRequest('http://localhost:3000/api/billing/config', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const getRes = await getConfigHandler(getReq);
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.config.billingModel).toBe('HYBRID');
      expect(getData.config.fixedChargePaise).toBe(200000);

      // 2. Update
      const postReq = new NextRequest('http://localhost:3000/api/billing/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          fixedChargePaise: 250000,
          ratePerSqFtPaise: 400,
        }),
      });
      const postRes = await updateConfigHandler(postReq);
      expect(postRes.status).toBe(200);
      const postData = await postRes.json();
      expect(postData.config.fixedChargePaise).toBe(250000);
      expect(postData.config.ratePerSqFtPaise).toBe(400);
    });

    it('POST /api/billing/calculate performs live hybrid calculation', async () => {
      const req = new NextRequest('http://localhost:3000/api/billing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          flatAreaSqFt: 1000,
          additionalCharges: [
            { description: 'Sinking Fund', amountPaise: 50000, category: 'SINKING_FUND' },
          ],
          gstHandling: 'MANUAL',
          manualGstPercentage: 18,
        }),
      });
      const res = await calculateHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      // Base: ₹2,000 (200000) + 1000 * ₹3.50 (350000) = 550000
      // Subtotal: 550000 + 50000 = 600000
      // GST 18%: 108000
      // Total: 708000
      expect(data.calculation.baseMaintenancePaise).toBe(550000);
      expect(data.calculation.subtotalPaise).toBe(600000);
      expect(data.calculation.gstAmountPaise).toBe(99000);
      expect(data.calculation.finalBillAmountPaise).toBe(699000);
    });
  });

  describe('Batch Generation & Invoice Isolation', () => {
    it('generates bills for active flats and prevents duplicate generation', async () => {
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
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
      });
      const genRes = await generateHandler(genReq);
      expect(genRes.status).toBe(201);
      const genData = await genRes.json();
      expect(genData.batch).toBeDefined();
      expect(genData.invoices.length).toBeGreaterThan(0);

      // Attempt duplicate generation for same period -> 409 Conflict
      const dupReq = new NextRequest('http://localhost:3000/api/billing/generate', {
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
      });
      const dupRes = await generateHandler(dupReq);
      expect(dupRes.status).toBe(409);
    });

    it('enforces strict flat isolation when residents list invoices', async () => {
      // First generate invoices
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
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
      });
      await generateHandler(genReq);

      // Resident request: Jonathan Patel (flat-a-402)
      const resReq = new NextRequest('http://localhost:3000/api/billing/invoices', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const resRes = await listInvoicesHandler(resReq);
      expect(resRes.status).toBe(200);
      const resData = await resRes.json();
      expect(resData.invoices.length).toBe(1);
      expect(resData.invoices[0].flatId).toBe('flat-a-402');

      // Committee request: sees all society flats
      const comReq = new NextRequest('http://localhost:3000/api/billing/invoices', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const comRes = await listInvoicesHandler(comReq);
      expect(comRes.status).toBe(200);
      const comData = await comRes.json();
      expect(comData.invoices.length).toBeGreaterThan(1);
    });

    it('prevents a resident from viewing another flat invoice via GET /api/billing/invoices/[id]', async () => {
      // Generate invoices
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
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
      });
      const genRes = await generateHandler(genReq);
      const { invoices } = await genRes.json();
      const otherFlatInvoice = invoices.find((inv: { flatId: string }) => inv.flatId !== 'flat-a-402');
      expect(otherFlatInvoice).toBeDefined();

      // Resident tries to access other flat's invoice
      const getReq = new NextRequest(`http://localhost:3000/api/billing/invoices/${otherFlatInvoice.id}`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const res = await getInvoiceHandler(getReq, { params: Promise.resolve({ id: otherFlatInvoice.id }) });
      expect(res.status).toBe(403);
    });

    it('renders printable HTML bill via GET /api/billing/invoices/[id]/pdf', async () => {
      // Generate invoices
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
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
      });
      const genRes = await generateHandler(genReq);
      const { invoices } = await genRes.json();
      const myInvoice = invoices.find((inv: { flatId: string }) => inv.flatId === 'flat-a-402');

      const pdfReq = new NextRequest(`http://localhost:3000/api/billing/invoices/${myInvoice.id}/pdf`, {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const pdfRes = await getInvoicePdfHandler(pdfReq, { params: Promise.resolve({ id: myInvoice.id }) });
      expect(pdfRes.status).toBe(200);
      expect(pdfRes.headers.get('content-type')).toContain('text/html');
      const htmlText = await pdfRes.text();
      expect(htmlText).toContain('MAINTENANCE INVOICE');
      expect(htmlText).toContain(myInvoice.invoiceNumber);
    });
  });

  describe('Offline Payments, Webhooks & Receipts', () => {
    it('allows Committee to record offline payment and reduces invoice balance', async () => {
      // Generate invoices
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
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
      });
      const genRes = await generateHandler(genReq);
      const { invoices } = await genRes.json();
      const targetInvoice = invoices[0];

      // Committee records offline cheque payment
      const payReq = new NextRequest('http://localhost:3000/api/payments/offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          invoiceId: targetInvoice.id,
          amountPaise: targetInvoice.totalAmountPaise,
          paymentMethod: 'CHEQUE',
          transactionReference: 'CHQ-982104',
          paymentDate: '2026-11-05',
          notes: 'Received in society office',
        }),
      });
      const payRes = await offlinePaymentHandler(payReq);
      expect(payRes.status).toBe(201);
      const payData = await payRes.json();
      expect(payData.payment.status).toBe('SUCCESS');
      expect(payData.receipt).toBeDefined();

      // Check updated invoice
      const updatedInvoice = BillingService.getInvoiceById(targetInvoice.id);
      expect(updatedInvoice?.status).toBe('PAID');
      expect(updatedInvoice?.outstandingBalancePaise).toBe(0);
    });

    it('rejects residents attempting to record offline payments (403 Forbidden)', async () => {
      const payReq = new NextRequest('http://localhost:3000/api/payments/offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          invoiceId: 'inv-dummy',
          amountPaise: 100000,
          paymentMethod: 'CASH',
        }),
      });
      const payRes = await offlinePaymentHandler(payReq);
      expect(payRes.status).toBe(403);
    });

    it('processes cryptographic payment webhook with signature and replay protection', async () => {
      // 1. Generate invoice
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
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
      });
      const genRes = await generateHandler(genReq);
      const { invoices } = await genRes.json();
      const testInvoice = invoices[0];

      // 2. Create payment order
      const order = await PaymentGatewayService.createOrder({
        invoiceId: testInvoice.id,
        invoiceNumber: testInvoice.invoiceNumber,
        flatId: testInvoice.flatId,
        amountPaise: testInvoice.totalAmountPaise,
      });

      // 3. Construct webhook payload and valid signature
      const webhookPayload = JSON.stringify({
        eventId: 'evt-test-webhook-101',
        providerOrderId: order.orderId,
        providerPaymentId: 'pay-test-12345',
        amountPaise: testInvoice.totalAmountPaise,
        currency: 'INR',
        status: 'SUCCESS',
        metadata: { invoiceId: testInvoice.id },
      });
      const signature = PaymentGatewayService.generateTestSignature(webhookPayload);

      // 4. Send webhook
      const webhookReq = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-provider-signature': signature,
        },
        body: webhookPayload,
      });
      const webhookRes = await webhookHandler(webhookReq);
      expect(webhookRes.status).toBe(200);
      const webhookData = await webhookRes.json();
      expect(webhookData.processed).toBe(true);
      expect(webhookData.paymentId).toBeDefined();

      // 5. Send same webhook payload again -> Replay protection should return idempotent: true
      const replayReq = new NextRequest('http://localhost:3000/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-provider-signature': signature,
        },
        body: webhookPayload,
      });
      const replayRes = await webhookHandler(replayReq);
      expect(replayRes.status).toBe(200);
      const replayData = await replayRes.json();
      expect(replayData.idempotent).toBe(true);
    });

    it('retrieves payment receipts with resident flat isolation', async () => {
      // Record payment for flat-a-402
      // 1. Generate invoices
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({ month: 11, year: 2026, dueDate: '2026-11-20' }),
      });
      const genRes = await generateHandler(genReq);
      const { invoices } = await genRes.json();
      const myInvoice = invoices.find((inv: { flatId: string }) => inv.flatId === 'flat-a-402');

      // Record offline payment
      await offlinePaymentHandler(
        new NextRequest('http://localhost:3000/api/payments/offline', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
          },
          body: JSON.stringify({
            invoiceId: myInvoice.id,
            amountPaise: myInvoice.totalAmountPaise,
            paymentMethod: 'UPI',
          }),
        })
      );

      // Resident lists receipts
      const recReq = new NextRequest('http://localhost:3000/api/receipts', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${residentToken}` },
      });
      const recRes = await listReceiptsHandler(recReq);
      expect(recRes.status).toBe(200);
      const recData = await recRes.json();
      expect(recData.receipts.length).toBe(1);
      expect(recData.receipts[0].flatId).toBe('flat-a-402');
    });
  });

  describe('Society Expense Management & Self-Approval Prevention', () => {
    it('allows committee to create an expense and enforces segregation of duties', async () => {
      // 1. Rosa Palmour (committee) creates an expense
      const createReq = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({
          title: 'Compound Wall Painting',
          category: 'REPAIRS',
          vendorName: 'Asian Paints Authorized Services',
          amountPaise: 4500000,
          expenseDate: '2026-11-04',
          description: 'Two coats of exterior weather-proof paint',
        }),
      });
      const createRes = await createExpenseHandler(createReq);
      expect(createRes.status).toBe(201);
      const { expense } = await createRes.json();
      expect(expense.id).toBeDefined();

      // 2. Rosa Palmour attempts to SELF-APPROVE her own expense -> Prohibited (400)
      const selfApproveReq = new NextRequest(`http://localhost:3000/api/expenses/${expense.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({}),
      });
      const selfApproveRes = await approveExpenseHandler(selfApproveReq, {
        params: Promise.resolve({ id: expense.id }),
      });
      expect(selfApproveRes.status).toBe(400);
      const selfApproveData = await selfApproveRes.json();
      expect(selfApproveData.error).toContain('Self-approval');

      // 3. Rajesh Sharma (Super Admin / different committee member) approves the expense -> Success (200)
      const adminApproveReq = new NextRequest(`http://localhost:3000/api/expenses/${expense.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
        },
        body: JSON.stringify({ notes: 'Verified vendor quote. Approved.' }),
      });
      const adminApproveRes = await approveExpenseHandler(adminApproveReq, {
        params: Promise.resolve({ id: expense.id }),
      });
      expect(adminApproveRes.status).toBe(200);
      const adminApproveData = await adminApproveRes.json();
      expect(adminApproveData.expense.status).toBe('APPROVED');
    });
  });

  describe('Financial Dashboard Summary & Dispute Endpoints', () => {
    it('GET /api/finance/summary returns derived financial aggregates', async () => {
      const req = new NextRequest('http://localhost:3000/api/finance/summary', {
        headers: { cookie: `${SESSION_COOKIE_NAME}=${committeeToken}` },
      });
      const res = await financeSummaryHandler(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.billing).toBeDefined();
      expect(data.expenses).toBeDefined();
      expect(typeof data.netCashMovementPaise).toBe('number');
    });

    it('POST /api/billing/disputes allows resident to dispute their own invoice and denies other flats', async () => {
      // 1. Generate invoices
      const genReq = new NextRequest('http://localhost:3000/api/billing/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${committeeToken}`,
        },
        body: JSON.stringify({ month: 11, year: 2026, dueDate: '2026-11-20' }),
      });
      const genRes = await generateHandler(genReq);
      const { invoices } = await genRes.json();
      const myInvoice = invoices.find((inv: { flatId: string }) => inv.flatId === 'flat-a-402');
      const otherInvoice = invoices.find((inv: { flatId: string }) => inv.flatId !== 'flat-a-402');

      // 2. Dispute own invoice -> 201 Created
      const ownDisputeReq = new NextRequest('http://localhost:3000/api/billing/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          invoiceId: myInvoice.id,
          title: 'Incorrect Water Charge',
          description: 'Flat was locked whole month.',
        }),
      });
      const ownDisputeRes = await disputeHandler(ownDisputeReq);
      expect(ownDisputeRes.status).toBe(201);
      const ownData = await ownDisputeRes.json();
      expect(ownData.dispute.status).toBe('OPEN');

      // 3. Attempt to dispute someone else's invoice -> 403 Forbidden
      const otherDisputeReq = new NextRequest('http://localhost:3000/api/billing/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${residentToken}`,
        },
        body: JSON.stringify({
          invoiceId: otherInvoice.id,
          title: 'Illegitimate dispute attempt',
          description: 'Trying to tamper with someone else bill.',
        }),
      });
      const otherDisputeRes = await disputeHandler(otherDisputeReq);
      expect(otherDisputeRes.status).toBe(403);
    });
  });
});
