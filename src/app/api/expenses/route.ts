import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExpenseService, ExpenseCategory, ExpenseStatus } from '@/services/expense.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const recordExpenseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
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
  ]),
  vendorName: z.string().min(2, 'Vendor name is required'),
  description: z.string().min(5, 'Description is required'),
  amountPaise: z.number().int().positive('Amount must be positive'),
  expenseDate: z.string().min(10, 'Valid date required'),
  invoiceReference: z.string().optional(),
  paymentMethod: z.string().default('BANK_TRANSFER'),
  attachmentPath: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'COMMITTEE')) {
      return NextResponse.json({ error: 'Forbidden: Committee or Admin required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category') as ExpenseCategory | null;
    const status = url.searchParams.get('status') as ExpenseStatus | null;
    const search = url.searchParams.get('search') || undefined;

    const expenses = ExpenseService.listExpenses({
      category: category || undefined,
      status: status || undefined,
      search,
    });

    const summary = ExpenseService.getExpenseSummary();

    return NextResponse.json({
      expenses,
      summary,
      total: expenses.length,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'COMMITTEE')) {
      return NextResponse.json({ error: 'Forbidden: Committee or Admin required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = recordExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const expense = ExpenseService.recordExpense({
      ...parsed.data,
      category: parsed.data.category as ExpenseCategory,
      enteredByProfileId: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        expense,
        message: 'Society expense recorded and submitted for committee approval.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error recording expense:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to record expense' },
      { status: 400 }
    );
  }
}
