import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    if (user.role === 'GUARD') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const invoice = BillingService.getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Strict Flat Isolation
    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (!userFlats.includes(invoice.flatId)) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have permission to view this invoice' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      invoice,
      formattedTotal: BillingService.formatPaiseToInr(invoice.totalAmountPaise),
      formattedOutstanding: BillingService.formatPaiseToInr(invoice.outstandingBalancePaise),
    });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice details' }, { status: 500 });
  }
}
