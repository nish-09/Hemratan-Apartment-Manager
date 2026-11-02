import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExpenseService, ExpenseCategory } from '@/services/expense.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const updateExpenseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').optional(),
  category: z.enum([
    'SECURITY',
    'HOUSEKEEPING',
    'ELECTRICITY',
    'WATER',
    'LIFT_MAINTENANCE',
    'REPAIRS',
    'PLUMBING',
    'ELECTRICAL',
    'GARDENING',
    'STAFF_SALARIES',
    'INSURANCE',
    'ADMINISTRATIVE',
    'EVENTS',
    'OTHER',
  ] as const).optional(),
  vendorName: z.string().min(2, 'Vendor name is required').optional(),
  description: z.string().optional(),
  amountPaise: z.number().int().positive('Amount must be positive integer paise').optional(),
  expenseDate: z.string().optional(),
  invoiceReference: z.string().optional(),
  paymentMethod: z.string().optional(),
  attachmentPath: z.string().optional(),
});

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

    if (user.role !== 'COMMITTEE' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Committee access required' }, { status: 403 });
    }

    const { id } = await context.params;
    const expense = ExpenseService.getExpenseById(id);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error fetching expense:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await request.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = ExpenseService.updateExpense({
      expenseId: id,
      ...parsed.data,
      category: parsed.data.category as ExpenseCategory | undefined,
      updatedByProfileId: user.id,
    });

    return NextResponse.json({ success: true, expense: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update expense';
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
