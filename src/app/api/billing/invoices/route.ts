import { NextRequest, NextResponse } from 'next/server';
import { BillingService, InvoiceStatus } from '@/services/billing.service';
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
      return NextResponse.json({ error: 'Forbidden: Guards have no access to billing records' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as InvoiceStatus | null;
    const periodId = url.searchParams.get('periodId') || undefined;

    const flatIdParam = url.searchParams.get('flatId') || undefined;

    // Strict Flat Isolation: Residents can ONLY view their own authorized flat invoices
    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (userFlats.length === 0) {
        return NextResponse.json({ invoices: [], total: 0 });
      }

      // If resident requested a specific flat, ensure it's in their assigned list
      if (flatIdParam && !userFlats.includes(flatIdParam)) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have authorization to view this flat billing' },
          { status: 403 }
        );
      }

      // If no flat specified, fetch for their first flat or all their flats
      if (!flatIdParam) {
        const residentInvoices = BillingService.getInvoices({
          status: status || undefined,
          billingPeriodId: periodId,
        }).filter((inv) => userFlats.includes(inv.flatId));

        return NextResponse.json({
          invoices: residentInvoices,
          total: residentInvoices.length,
        });
      }
    }

    // Committee / SuperAdmin can view all flats or filter by flatId
    const invoices = BillingService.getInvoices({
      flatId: flatIdParam,
      status: status || undefined,
      billingPeriodId: periodId,
    });

    return NextResponse.json({
      invoices,
      total: invoices.length,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}
