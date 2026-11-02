import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExpenseService } from '@/services/expense.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const approveExpenseSchema = z.object({
  comments: z.string().optional(),
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
      return NextResponse.json({ error: 'Forbidden: Committee or Admin required' }, { status: 403 });
    }

    const { id } = await params;
    let comments: string | undefined;
    try {
      const body = await request.json();
      const parsed = approveExpenseSchema.safeParse(body);
      if (parsed.success) {
        comments = parsed.data.comments;
      }
    } catch {
      // Body is optional
    }

    const expense = ExpenseService.approveExpense({
      expenseId: id,
      approverProfileId: user.id,
      comments,
    });

    return NextResponse.json({
      success: true,
      expense,
      message: `Expense ${expense.expenseNumber} approved successfully.`,
    });
  } catch (error: any) {
    console.error('Error approving expense:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to approve expense' },
      { status: 400 }
    );
  }
}
