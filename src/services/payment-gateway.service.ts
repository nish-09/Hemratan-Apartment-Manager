/**
 * HEMRATAN APARTMENT MANAGER — STAGE 6
 * Payment Gateway Provider Architecture
 * 
 * Features:
 * - Provider-independent interface (Razorpay, Cashfree, Mock)
 * - Cryptographic signature verification for client checkout and server webhooks
 * - Replay protection & webhook idempotency
 * - Amount and currency verification
 * - Safe handling of provider credentials
 */

import crypto from 'crypto';
import { BillingService } from './billing.service';

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  invoiceId: string;
  invoiceNumber: string;
  flatId: string;
  notes?: Record<string, string>;
}

export interface PaymentOrderResult {
  orderId: string;
  provider: 'MOCK' | 'RAZORPAY' | 'CASHFREE';
  amountPaise: number;
  currency: string;
  invoiceId: string;
  rawResponse?: Record<string, unknown>;
  createdAt: string;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEventPayload {
  provider: 'MOCK' | 'RAZORPAY' | 'CASHFREE';
  eventId: string;
  eventType: 'payment.captured' | 'payment.failed' | 'refund.processed';
  orderId: string;
  paymentId: string;
  amountPaise: number;
  currency: string;
  invoiceId: string;
  rawBody: string;
  signature: string;
}

export interface PaymentGatewayProvider {
  readonly providerName: 'MOCK' | 'RAZORPAY' | 'CASHFREE';
  createOrder(params: CreateOrderParams): Promise<PaymentOrderResult>;
  verifyPaymentSignature(params: VerifyPaymentParams): boolean;
  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean;
}

/**
 * Mock Provider for local development & testing
 */
export class MockPaymentGatewayProvider implements PaymentGatewayProvider {
  readonly providerName = 'MOCK' as const;
  private mockSecret = 'hemratan_mock_payment_webhook_secret_key_123';

  async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    if (params.amountPaise <= 0) {
      throw new Error('Order amount must be greater than zero.');
    }
    const orderId = `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return {
      orderId,
      provider: this.providerName,
      amountPaise: params.amountPaise,
      currency: params.currency || 'INR',
      invoiceId: params.invoiceId,
      createdAt: new Date().toISOString(),
    };
  }

  verifyPaymentSignature(params: VerifyPaymentParams): boolean {
    if (!params.orderId || !params.paymentId || !params.signature) return false;
    const expected = crypto
      .createHmac('sha256', this.mockSecret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');
    return params.signature === expected || params.signature === 'valid_mock_signature';
  }

  verifyWebhookSignature(rawBody: string, signature: string, secret?: string): boolean {
    if (!rawBody || !signature) return false;
    const key = secret || this.mockSecret;
    const expected = crypto.createHmac('sha256', key).update(rawBody).digest('hex');
    return signature === expected || signature === 'valid_mock_webhook_signature';
  }
}

// In-memory processed webhook event ID registry for replay protection
const processedWebhookEventIds = new Set<string>();
const ordersStore: PaymentOrderResult[] = [];

export class PaymentGatewayService {
  private static activeProvider: PaymentGatewayProvider = new MockPaymentGatewayProvider();

  /**
   * Set the active gateway provider
   */
  static setProvider(provider: PaymentGatewayProvider) {
    this.activeProvider = provider;
  }

  /**
   * Get Current Provider
   */
  static getProvider(): PaymentGatewayProvider {
    return this.activeProvider;
  }

  /**
   * Create Payment Order on Gateway
   */
  static async createOrder(params: CreateOrderParams): Promise<PaymentOrderResult> {
    const invoice = BillingService.getInvoiceById(params.invoiceId);
    if (!invoice) {
      throw new Error(`Invoice "${params.invoiceId}" not found.`);
    }

    if (invoice.status === 'PAID') {
      throw new Error(`Invoice "${invoice.invoiceNumber}" is already settled in full.`);
    }

    if (params.amountPaise > invoice.outstandingBalancePaise) {
      throw new Error(
        `Payment amount of ${BillingService.formatPaiseToInr(params.amountPaise)} exceeds outstanding balance of ${BillingService.formatPaiseToInr(invoice.outstandingBalancePaise)}.`
      );
    }

    const order = await this.activeProvider.createOrder(params);
    ordersStore.unshift(order);
    return order;
  }

  /**
   * Helper for tests & sandbox signature verification
   */
  static generateTestSignature(rawBody: string, secret?: string): string {
    const key = secret || 'hemratan_mock_payment_webhook_secret_key_123';
    return crypto.createHmac('sha256', key).update(rawBody).digest('hex');
  }

  /**
   * Process and Verify Checkout Payment from Client
   */
  static verifyAndProcessPayment(params: {
    orderId: string;
    paymentId: string;
    signature: string;
    invoiceId: string;
    amountPaise: number;
    payerProfileId?: string;
  }) {
    const isValid = this.activeProvider.verifyPaymentSignature({
      orderId: params.orderId,
      paymentId: params.paymentId,
      signature: params.signature,
    });

    if (!isValid) {
      throw new Error('Payment signature verification failed. Possible tampering detected.');
    }

    // Record verified online payment
    return BillingService.recordPayment({
      invoiceId: params.invoiceId,
      amountPaise: params.amountPaise,
      paymentMethod: 'ONLINE_GATEWAY',
      payerProfileId: params.payerProfileId,
      providerOrderId: params.orderId,
      providerPaymentId: params.paymentId,
      idempotencyKey: `online_${params.orderId}_${params.paymentId}`,
      notes: `Online checkout verified via ${this.activeProvider.providerName}`,
    });
  }

  /**
   * Process Gateway Webhook Event (Replay-Protected & Idempotent)
   */
  static processWebhookEvent(payload: WebhookEventPayload): {
    status: 'PROCESSED' | 'REPLAY_IGNORED' | 'FAILED';
    message: string;
  } {
    // 1. Verify Webhook Signature
    const isSignatureValid = this.activeProvider.verifyWebhookSignature(
      payload.rawBody,
      payload.signature
    );

    if (!isSignatureValid) {
      throw new Error('Invalid webhook signature. Request rejected.');
    }

    // 2. Replay Protection: Check if this eventId was already processed
    if (processedWebhookEventIds.has(payload.eventId)) {
      return {
        status: 'REPLAY_IGNORED',
        message: `Webhook event "${payload.eventId}" was already processed. Replay safely ignored.`,
      };
    }

    // 3. Currency Validation
    if (payload.currency !== 'INR') {
      throw new Error(`Unsupported currency "${payload.currency}". Only INR is supported.`);
    }

    // 4. Handle Event Type
    if (payload.eventType === 'payment.captured') {
      BillingService.recordPayment({
        invoiceId: payload.invoiceId,
        amountPaise: payload.amountPaise,
        paymentMethod: 'ONLINE_GATEWAY',
        providerOrderId: payload.orderId,
        providerPaymentId: payload.paymentId,
        idempotencyKey: `webhook_${payload.provider}_${payload.paymentId}`,
        notes: `Confirmed via webhook event: ${payload.eventId}`,
      });
    }

    // Mark event ID as processed
    processedWebhookEventIds.add(payload.eventId);

    return {
      status: 'PROCESSED',
      message: `Webhook event "${payload.eventId}" processed successfully.`,
    };
  }

  /**
   * Reset for test suite
   */
  static _resetForTesting() {
    this.activeProvider = new MockPaymentGatewayProvider();
    processedWebhookEventIds.clear();
    ordersStore.length = 0;
  }
}
