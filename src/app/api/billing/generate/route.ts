import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

const generateInvoicesSchema = z.object({
  billingPeriodId: z.string().optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  dueDate: z.string().optional(),
  mode: z.enum(['BULK_SOCIETY', 'SINGLE_FLAT']).default('BULK_SOCIETY'),
  singleFlat: z
    .object({
      flatId: z.string().min(1),
      flatNumber: z.string().min(1),
      wing: z.string().min(1),
      areaSqFt: z.number().positive(),
      additionalItems: z.array(z.any()).optional(),
      adjustmentsPaise: z.number().int().optional(),
    })
    .optional(),
  customFlatMetrics: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = getAuthenticatedUser(sessionCookie.value);
    if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'COMMITTEE')) {
      return NextResponse.json({ error: 'Forbidden: Committee or Admin authorization required' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = generateInvoicesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues?.[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    let periodId = parsed.data.billingPeriodId;
    if (!periodId && parsed.data.month && parsed.data.year) {
      const existing = BillingService.listBillingPeriods().find(
        (p) => p.month === parsed.data.month && p.year === parsed.data.year
      );
      if (existing) {
        periodId = existing.id;
      } else {
        const newPeriod = BillingService.createBillingPeriod({
          month: parsed.data.month,
          year: parsed.data.year,
          financialYear: `${parsed.data.year}-${parsed.data.year + 1}`,
          billingDate: `${parsed.data.year}-${String(parsed.data.month).padStart(2, '0')}-01`,
          dueDate: parsed.data.dueDate || `${parsed.data.year}-${String(parsed.data.month).padStart(2, '0')}-15`,
        });
        periodId = newPeriod.id;
      }
    }

    if (!periodId) {
      return NextResponse.json({ error: 'Billing period ID or month/year is required' }, { status: 400 });
    }

    if (parsed.data.mode === 'SINGLE_FLAT' && parsed.data.singleFlat) {
      const flat = parsed.data.singleFlat;
      const invoice = BillingService.generateInvoice({
        flatId: flat.flatId,
        flatNumber: flat.flatNumber,
        wing: flat.wing,
        areaSqFt: flat.areaSqFt,
        billingPeriodId: periodId,
        additionalItems: flat.additionalItems,
        adjustmentsPaise: flat.adjustmentsPaise,
      });

      return NextResponse.json(
        {
          success: true,
          mode: 'SINGLE_FLAT',
          invoice,
          message: `Invoice ${invoice.invoiceNumber} generated successfully.`,
        },
        { status: 201 }
      );
    }

    // Bulk Society Generation
    const batch = BillingService.generateBillingBatch({
      billingPeriodId: periodId,
      generatedByProfileId: user.id,
      customFlatMetrics: parsed.data.customFlatMetrics,
    });

    return NextResponse.json(
      {
        success: true,
        mode: 'BULK_SOCIETY',
        batch,
        batchNumber: batch.batchNumber,
        invoicesCount: batch.invoices.length,
        totalAmountPaise: batch.totalAmountPaise,
        formattedTotal: BillingService.formatPaiseToInr(batch.totalAmountPaise),
        invoices: batch.invoices,
        message: `Generated billing batch ${batch.batchNumber} with ${batch.invoices.length} flat invoices.`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    const errorMsg = error?.message || 'Failed to generate maintenance invoices';
    if (errorMsg.toLowerCase().includes('already')) {
      return NextResponse.json({ error: errorMsg }, { status: 409 });
    }
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
