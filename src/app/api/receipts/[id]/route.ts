import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(
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

    if (user.role === 'GUARD') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const receipt = BillingService.getReceiptById(id);
    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (!userFlats.includes(receipt.flatId)) {
        return NextResponse.json({ error: 'Forbidden: Access to another flat receipt denied' }, { status: 403 });
      }
    }

    return NextResponse.json({ receipt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json({ error: 'Failed to fetch receipt' }, { status: 500 });
  }
}
