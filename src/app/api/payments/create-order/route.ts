import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { PaymentGatewayService } from '@/services/payment-gateway.service';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const createOrderSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  amountPaise: z.number().int().positive('Amount must be positive'),
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
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const invoice = BillingService.getInvoiceById(parsed.data.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Flat isolation check for residents
    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (!userFlats.includes(invoice.flatId)) {
        return NextResponse.json(
          { error: 'Forbidden: You cannot pay another flat invoice' },
          { status: 403 }
        );
      }
    }

    const order = await PaymentGatewayService.createOrder({
      amountPaise: parsed.data.amountPaise,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      flatId: invoice.flatId,
      notes: {
        flatNumber: invoice.flatNumber,
        wing: invoice.wing,
        userEmail: user.email,
      },
    });

    return NextResponse.json({
      success: true,
      order,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create payment order' },
      { status: 400 }
    );
  }
}
