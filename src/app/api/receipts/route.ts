import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('invoiceId') || undefined;
    const flatIdParam = url.searchParams.get('flatId') || undefined;

    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (userFlats.length === 0) {
        return NextResponse.json({ receipts: [], total: 0 });
      }

      if (flatIdParam && !userFlats.includes(flatIdParam)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const receipts = BillingService.getReceipts({ invoiceId }).filter((r) =>
        userFlats.includes(r.flatId)
      );

      return NextResponse.json({ receipts, total: receipts.length });
    }

    // Committee / SuperAdmin
    const receipts = BillingService.getReceipts({ flatId: flatIdParam, invoiceId });
    return NextResponse.json({ receipts, total: receipts.length });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return NextResponse.json({ error: 'Failed to fetch receipts' }, { status: 500 });
  }
}
