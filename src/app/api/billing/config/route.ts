import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BillingService, BillingModel, GstHandlingMode } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const updateConfigSchema = z.object({
  billingModel: z.enum(['FIXED', 'AREA_BASED', 'HYBRID']).optional(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'ANNUALLY']).optional(),
  fixedChargePaise: z.number().int().min(0, 'Fixed charge cannot be negative').optional(),
  ratePerSqFtPaise: z.number().int().min(0, 'Rate per sq ft cannot be negative').optional(),
  lateFeePercentage: z.number().min(0, 'Late fee percentage cannot be negative').optional(),
  gracePeriodDays: z.number().int().min(0).optional(),
  gstHandling: z.enum(['NOT_APPLICABLE', 'MANUAL', 'AUTOMATIC']).optional(),
  gstPercentage: z.number().min(0).optional(),
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
      return NextResponse.json({ error: 'Forbidden: Guards have no financial access' }, { status: 403 });
    }

    const config = BillingService.getBillingConfiguration();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching billing configuration:', error);
    return NextResponse.json({ error: 'Failed to fetch billing configuration' }, { status: 500 });
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
    const parsed = updateConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const updated = BillingService.updateBillingConfiguration(parsed.data);

    return NextResponse.json({
      success: true,
      config: updated,
      message: 'Billing configuration updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating billing configuration:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update configuration' },
      { status: 400 }
    );
  }
}
