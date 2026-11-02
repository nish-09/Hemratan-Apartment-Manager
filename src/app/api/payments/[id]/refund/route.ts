import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const refundSchema = z.object({
  refundAmountPaise: z.number().int().positive('Refund amount must be positive integer paise').optional(),
  reason: z.string().min(5, 'A detailed reason is mandatory for processing a refund'),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    if (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Authorised committee or admin workflow only' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = refundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid refund parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = BillingService.refundPayment({
      paymentId: id,
      refundAmountPaise: parsed.data.refundAmountPaise,
      reason: parsed.data.reason,
      processedByProfileId: user.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process refund';
    console.error('Error processing refund:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
