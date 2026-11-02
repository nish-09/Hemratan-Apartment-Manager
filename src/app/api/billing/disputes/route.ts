import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { BillingService } from '@/services/billing.service';

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

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId') || undefined;

    let flatId: string | undefined = searchParams.get('flatId') || undefined;
    if (user.role === 'RESIDENT') {
      const allowedFlats = user.assignedFlatIds || [];
      if (flatId && !allowedFlats.includes(flatId)) {
        return NextResponse.json({ error: 'Forbidden flat access' }, { status: 403 });
      }
      if (!flatId && allowedFlats.length > 0) {
        flatId = allowedFlats[0];
      }
    }

    const disputes = BillingService.listDisputes({ invoiceId, flatId });
    return NextResponse.json({ disputes });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

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
    const { invoiceId, title, description } = body;

    if (!invoiceId || !title || !description) {
      return NextResponse.json({ error: 'invoiceId, title, and description are required' }, { status: 400 });
    }

    const invoice = BillingService.getInvoiceById(invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Strict flat-isolation: Resident must be assigned to this flat
    if (user.role === 'RESIDENT') {
      const allowedFlats = user.assignedFlatIds || [];
      if (!allowedFlats.includes(invoice.flatId)) {
        return NextResponse.json({ error: 'Forbidden: You cannot dispute another flat\'s bill' }, { status: 403 });
      }
    }

    const dispute = BillingService.raiseDispute({
      invoiceId: invoice.id,
      flatId: invoice.flatId,
      complainantProfileId: user.id,
      complainantName: user.fullName || 'Resident',
      title,
      description,
    });

    return NextResponse.json({ dispute }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
