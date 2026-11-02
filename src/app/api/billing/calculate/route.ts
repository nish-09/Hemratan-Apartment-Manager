import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const lineItemSchema = z.object({
  description: z.string().min(2),
  amountPaise: z.number().int().min(0),
  category: z.enum([
    'FIXED',
    'AREA_BASED',
    'WATER',
    'ELECTRICITY',
    'PARKING',
    'LIFT',
    'SINKING_FUND',
    'REPAIR_FUND',
    'AMENITY',
    'CUSTOM',
  ]).default('CUSTOM'),
  taxApplicable: z.boolean().optional(),
});

const calculateBillSchema = z.object({
  flatId: z.string().default('flat-sample'),
  flatNumber: z.string().default('402'),
  wing: z.string().default('A'),
  areaSqFt: z.number().positive('Flat area must be a positive number').optional(),
  flatAreaSqFt: z.number().positive('Flat area must be a positive number').optional(),
  additionalItems: z.array(lineItemSchema).optional(),
  additionalCharges: z.array(lineItemSchema).optional(),
  adjustmentsPaise: z.number().int().optional(),
  previousOutstandingPaise: z.number().int().optional(),
  isLate: z.boolean().optional(),
  manualGstPaise: z.number().int().optional(),
  manualGstPercentage: z.number().min(0).optional(),
  gstHandling: z.enum(['NOT_APPLICABLE', 'MANUAL', 'AUTOMATIC']).optional(),
  discountCreditsPaise: z.number().int().optional(),
});

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
    const parsed = calculateBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const resolvedArea = data.areaSqFt ?? data.flatAreaSqFt ?? 1000;
    const resolvedItems = data.additionalItems ?? data.additionalCharges ?? [];

    const config = { ...BillingService.getBillingConfiguration() };
    if (data.gstHandling) {
      config.gstHandling = data.gstHandling;
    }
    if (data.manualGstPercentage !== undefined) {
      config.gstPercentage = data.manualGstPercentage;
      config.gstHandling = 'MANUAL';
    }

    const snapshot = BillingService.calculateMaintenanceBill({
      flatId: data.flatId,
      flatNumber: data.flatNumber,
      wing: data.wing,
      areaSqFt: resolvedArea,
      additionalItems: resolvedItems,
      adjustmentsPaise: data.adjustmentsPaise,
      previousOutstandingPaise: data.previousOutstandingPaise,
      isLate: data.isLate,
      manualGstPaise: data.manualGstPaise,
      discountCreditsPaise: data.discountCreditsPaise,
      billingConfig: config,
    });

    return NextResponse.json({
      success: true,
      calculation: {
        ...snapshot,
        baseMaintenancePaise: snapshot.baseFixedPaise + snapshot.baseAreaPaise,
        finalBillAmountPaise: snapshot.totalAmountPaise,
      },
      formattedTotal: BillingService.formatPaiseToInr(snapshot.totalAmountPaise),
    });
  } catch (error: any) {
    console.error('Error calculating maintenance bill:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to calculate bill' },
      { status: 400 }
    );
  }
}
