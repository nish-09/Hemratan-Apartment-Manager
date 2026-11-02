import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BillingService, PaymentMethod } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const offlinePaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amountPaise: z.number().int().positive('Amount must be positive'),
  paymentMethod: z.enum(['UPI', 'BANK_TRANSFER', 'CHEQUE', 'CASH', 'OTHER']),
  transactionReference: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'COMMITTEE')) {
      return NextResponse.json({ error: 'Forbidden: Only committee members can record offline payments' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = offlinePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const result = BillingService.recordPayment({
      invoiceId: parsed.data.invoiceId,
      amountPaise: parsed.data.amountPaise,
      paymentMethod: parsed.data.paymentMethod as PaymentMethod,
      verifiedByProfileId: user.id,
      providerPaymentId: parsed.data.transactionReference,
      notes: parsed.data.notes || `Offline payment recorded by Committee Member ${user.fullName}`,
    });

    return NextResponse.json(
      {
        success: true,
        payment: result.payment,
        invoice: result.invoice,
        receipt: result.receipt,
        message: 'Offline payment verified and recorded into society ledger.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error recording offline payment:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record offline payment' },
      { status: 400 }
    );
  }
}
