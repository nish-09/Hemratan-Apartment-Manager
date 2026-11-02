import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PaymentGatewayService } from '@/services/payment-gateway.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  invoiceId: z.string().min(1),
  amountPaise: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (user.role === 'GUARD') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = verifyPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const result = PaymentGatewayService.verifyAndProcessPayment({
      orderId: parsed.data.orderId,
      paymentId: parsed.data.paymentId,
      signature: parsed.data.signature,
      invoiceId: parsed.data.invoiceId,
      amountPaise: parsed.data.amountPaise,
      payerProfileId: user.id,
    });

    return NextResponse.json({
      success: true,
      payment: result.payment,
      invoice: result.invoice,
      receipt: result.receipt,
      message: 'Payment verified and transaction confirmed in society ledger.',
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Payment verification failed' },
      { status: 400 }
    );
  }
}
