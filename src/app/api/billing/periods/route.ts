import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const createPeriodSchema = z.object({
  financialYear: z.string().min(4, 'Financial year required (e.g. 2026-2027)'),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2025),
  billingDate: z.string().min(10),
  dueDate: z.string().min(10),
  status: z.enum(['OPEN', 'LOCKED', 'CLOSED']).default('OPEN'),
  notes: z.string().optional(),
});

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

    const periods = BillingService.getBillingPeriods();
    return NextResponse.json({ periods });
  } catch (error) {
    console.error('Error fetching billing periods:', error);
    return NextResponse.json({ error: 'Failed to fetch billing periods' }, { status: 500 });
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
    const parsed = createPeriodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const period = BillingService.createBillingPeriod(parsed.data);
    return NextResponse.json({ success: true, period }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating billing period:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create billing period' },
      { status: 400 }
    );
  }
}
