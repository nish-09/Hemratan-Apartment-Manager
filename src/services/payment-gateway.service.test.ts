import { describe, it, expect, beforeEach } from 'vitest';
import { PaymentGatewayService } from './payment-gateway.service';
import { BillingService } from './billing.service';

describe('PaymentGatewayService (Stage 6 Payment Gateway Architecture)', () => {
  beforeEach(() => {
    BillingService._resetForTesting();
    PaymentGatewayService._resetForTesting();
  });

  it('creates a payment gateway order with correct amount and currency', async () => {
    const invoice = BillingService.generateInvoice({
      flatId: 'flat-a-402',
      flatNumber: '402',
      wing: 'A',
      areaSqFt: 1100, // ₹5,850.00 = 585,000 paise
      billingPeriodId: 'bp-2026-11',
    });

    const order = await PaymentGatewayService.createOrder({
      amountPaise: 585000,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      flatId: invoice.flatId,
    });

    expect(order.orderId).toContain('order_mock_');
    expect(order.amountPaise).toBe(585000);
    expect(order.currency).toBe('INR');
  });

  it('rejects order creation if amount exceeds invoice outstanding balance', async () => {
    const invoice = BillingService.generateInvoice({
      flatId: 'flat-a-402',
      flatNumber: '402',
      wing: 'A',
      areaSqFt: 1000, // ₹5,500.00
      billingPeriodId: 'bp-2026-11',
    });

    await expect(
      PaymentGatewayService.createOrder({
        amountPaise: 600000, // Exceeds 550,000
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        flatId: invoice.flatId,
      })
    ).rejects.toThrow('exceeds outstanding balance');
  });

  it('verifies client checkout payment signature and settles invoice', async () => {
    const invoice = BillingService.generateInvoice({
      flatId: 'flat-a-402',
      flatNumber: '402',
      wing: 'A',
      areaSqFt: 1100,
      billingPeriodId: 'bp-2026-11',
    });

    const order = await PaymentGatewayService.createOrder({
      amountPaise: 585000,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      flatId: invoice.flatId,
    });

    // Valid mock signature
    const result = PaymentGatewayService.verifyAndProcessPayment({
      orderId: order.orderId,
      paymentId: 'pay_rzp_mock_112233',
      signature: 'valid_mock_signature',
      invoiceId: invoice.id,
      amountPaise: 585000,
      payerProfileId: 'u-patel',
    });

    expect(result.payment.status).toBe('SUCCESS');
    expect(result.invoice.status).toBe('PAID');
    expect(result.invoice.outstandingBalancePaise).toBe(0);
    expect(result.receipt).toBeDefined();
  });

  it('rejects checkout payment with invalid signature', async () => {
    const invoice = BillingService.generateInvoice({
      flatId: 'flat-a-402',
      flatNumber: '402',
      wing: 'A',
      areaSqFt: 1100,
      billingPeriodId: 'bp-2026-11',
    });

    expect(() =>
      PaymentGatewayService.verifyAndProcessPayment({
        orderId: 'order_123',
        paymentId: 'pay_123',
        signature: 'invalid_tampered_signature',
        invoiceId: invoice.id,
        amountPaise: 585000,
      })
    ).toThrow('tampering detected');
  });

  it('processes server-side webhook and ignores replayed webhook events', async () => {
    const invoice = BillingService.generateInvoice({
      flatId: 'flat-a-402',
      flatNumber: '402',
      wing: 'A',
      areaSqFt: 1100,
      billingPeriodId: 'bp-2026-11',
    });

    const webhookPayload = {
      provider: 'MOCK' as const,
      eventId: 'evt_test_unique_9988',
      eventType: 'payment.captured' as const,
      orderId: 'order_mock_12345',
      paymentId: 'pay_mock_12345',
      amountPaise: 585000,
      currency: 'INR',
      invoiceId: invoice.id,
      rawBody: '{"event":"payment.captured"}',
      signature: 'valid_mock_webhook_signature',
    };

    // First delivery -> PROCESSED
    const firstDelivery = PaymentGatewayService.processWebhookEvent(webhookPayload);
    expect(firstDelivery.status).toBe('PROCESSED');

    // Duplicate webhook delivery -> REPLAY_IGNORED
    const replayDelivery = PaymentGatewayService.processWebhookEvent(webhookPayload);
    expect(replayDelivery.status).toBe('REPLAY_IGNORED');

    // Verify invoice settled exactly once
    const updatedInvoice = BillingService.getInvoiceById(invoice.id);
    expect(updatedInvoice?.status).toBe('PAID');
    expect(updatedInvoice?.paidAmountPaise).toBe(585000);
  });
});
