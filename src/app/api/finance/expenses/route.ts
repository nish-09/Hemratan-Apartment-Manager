import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';
import { ExpenseService } from '@/services/expense.service';

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

    if (user.role === 'GUARD' || user.role === 'RESIDENT') {
      return NextResponse.json(
        { error: 'Forbidden: Financial records are restricted to Committee and Admin' },
        { status: 403 }
      );
    }

    const summary = ExpenseService.getExpenseSummary();
    const expenses = ExpenseService.listExpenses();

    return NextResponse.json({
      summary,
      expenses,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
