import { NextRequest, NextResponse } from 'next/server';
import { BillingService } from '@/services/billing.service';
import { SESSION_COOKIE_NAME, getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(
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
    // Find all invoices with this batchId or periodId
    const invoices = BillingService.getInvoices().filter(
      (inv) => inv.batchId === id || inv.billingPeriodId === id
    );

    if (invoices.length === 0) {
      return NextResponse.json({ error: 'No invoices found for this batch' }, { status: 404 });
    }

    const totalBatchPaise = invoices.reduce((sum, inv) => sum + inv.totalAmountPaise, 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Billing Batch ${id} - All Flats Merged Invoices</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #303044; background: #fff; margin: 0; padding: 0; }
    .bill-page { page-break-after: always; padding: 20px; box-sizing: border-box; }
    .header { border-bottom: 2px solid #303044; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start; }
    .society-name { font-size: 20px; font-weight: 900; }
    .society-sub { font-size: 11px; color: #666; margin-top: 3px; }
    .inv-badge { background: #FAF7A7; border: 2px solid #303044; padding: 4px 10px; font-weight: 900; border-radius: 6px; font-size: 12px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .card { border: 2px solid #303044; border-radius: 8px; padding: 10px; background: #fafafa; }
    .card h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #777; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { text-align: left; background: #f4f4f6; border-bottom: 2px solid #303044; padding: 8px 10px; }
    td { padding: 8px 10px; border-bottom: 1px solid #eee; font-weight: 600; }
    .text-right { text-align: right; }
    .total-box { margin-left: auto; width: 260px; border: 2px solid #303044; border-radius: 8px; padding: 12px; background: #C9F36B; }
    .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; margin-top: 4px; }
    .footer { margin-top: 25px; padding-top: 10px; border-top: 1px dashed #ccc; font-size: 10px; color: #777; text-align: center; }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 15px; background: #FAF7A7; border-bottom: 2px solid #303044; text-align: center;">
    <strong>Bulk Society Print Ready:</strong> ${invoices.length} flat invoices generated. Total: ${BillingService.formatPaiseToInr(totalBatchPaise)}.
    <button onclick="window.print()" style="margin-left: 20px; padding: 8px 16px; font-weight: bold; background: #303044; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Print Merged Batch PDF</button>
  </div>

  ${invoices
    .map(
      (inv) => `
  <div class="bill-page">
    <div class="header">
      <div>
        <div class="society-name">HEMRATAN CO-OPERATIVE HOUSING SOCIETY LTD</div>
        <div class="society-sub">Sector 14, Plot 8, Navi Mumbai • Reg: BOM/HSG/4421/2012</div>
      </div>
      <div class="inv-badge">INVOICE: ${inv.invoiceNumber}</div>
    </div>

    <div class="meta-grid">
      <div class="card">
        <h4>Member & Flat Details</h4>
        <div style="font-size: 15px; font-weight: 900;">Wing ${inv.wing} — Flat ${inv.flatNumber}</div>
        <div style="font-size: 11px; color: #666;">Carpet Area: ${inv.flatAreaSqFt} sq.ft.</div>
      </div>
      <div class="card">
        <h4>Billing Period</h4>
        <div style="font-size: 12px;">Cycle: Month ${inv.billingPeriodMonth} / ${inv.billingPeriodYear}</div>
        <div style="font-size: 12px; color: #9333ea;">Due Date: ${new Date(inv.dueDate).toLocaleDateString('en-IN')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Category</th>
          <th class="text-right">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${inv.calculationSnapshot.lineItems
          .map(
            (item) => `<tr>
          <td>${item.description}</td>
          <td>${item.category}</td>
          <td class="text-right">${BillingService.formatPaiseToInr(item.amountPaise)}</td>
        </tr>`
          )
          .join('')}
        ${
          inv.calculationSnapshot.gstAmountPaise > 0
            ? `<tr>
          <td>GST (${inv.calculationSnapshot.gstPercentage}%)</td>
          <td>TAX</td>
          <td class="text-right">${BillingService.formatPaiseToInr(inv.calculationSnapshot.gstAmountPaise)}</td>
        </tr>`
            : ''
        }
      </tbody>
    </table>

    <div class="total-box">
      <div style="display: flex; justify-content: space-between; font-size: 11px;">
        <span>Subtotal:</span>
        <span>${BillingService.formatPaiseToInr(inv.calculationSnapshot.subtotalPaise)}</span>
      </div>
      <div class="total-row">
        <span>Amount Payable:</span>
        <span>${BillingService.formatPaiseToInr(inv.totalAmountPaise)}</span>
      </div>
    </div>

    <div class="footer">
      Hemratan Apartment Manager • Merged Batch Record • Flat ${inv.wing}-${inv.flatNumber}
    </div>
  </div>`
    )
    .join('')}
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error rendering merged batch PDF:', error);
    return NextResponse.json({ error: 'Failed to render batch PDF' }, { status: 500 });
  }
}
