import { NextRequest, NextResponse } from 'next/server';
import { PaymentGatewayService } from '@/services/payment-gateway.service';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get('x-provider-signature') ||
      request.headers.get('x-razorpay-signature') ||
      request.headers.get('x-webhook-signature') ||
      '';

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventId = payload.id || payload.eventId || `evt_${Date.now()}`;
    const eventType = payload.event || payload.eventType || 'payment.captured';
    const paymentEntity = payload.payload?.payment?.entity || payload.payment || {};

    const orderId = paymentEntity.order_id || payload.providerOrderId || payload.orderId || '';
    const paymentId = paymentEntity.id || payload.providerPaymentId || payload.paymentId || '';
    const amountPaise = paymentEntity.amount || payload.amountPaise || 0;
    const currency = paymentEntity.currency || payload.currency || 'INR';
    const invoiceId = paymentEntity.notes?.invoiceId || payload.metadata?.invoiceId || payload.invoiceId || '';

    const result = PaymentGatewayService.processWebhookEvent({
      provider: 'MOCK',
      eventId,
      eventType: eventType as any,
      orderId,
      paymentId,
      amountPaise,
      currency,
      invoiceId,
      rawBody,
      signature,
    });

    return NextResponse.json({
      success: true,
      processed: result.status === 'PROCESSED',
      idempotent: result.status === 'REPLAY_IGNORED',
      paymentId,
      status: result.status,
      message: result.message,
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error?.message || 'Webhook verification failed' },
      { status: 400 }
    );
  }
}
