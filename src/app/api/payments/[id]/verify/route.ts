import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

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
      return NextResponse.json({ error: 'Forbidden: Committee access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const payment = BillingService.verifyOfflinePayment(id, user.id);

    return NextResponse.json({ success: true, payment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to verify payment';
    console.error('Error verifying payment:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
