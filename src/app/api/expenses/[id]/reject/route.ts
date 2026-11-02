import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExpenseService } from '@/services/expense.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const rejectExpenseSchema = z.object({
  reason: z.string().min(5, 'A detailed rejection reason is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'COMMITTEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = rejectExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const expense = ExpenseService.rejectExpense({
      expenseId: id,
      rejectorProfileId: user.id,
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      success: true,
      expense,
      message: `Expense ${expense.expenseNumber} rejected.`,
    });
  } catch (error: any) {
    console.error('Error rejecting expense:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to reject expense' },
      { status: 400 }
    );
  }
}
