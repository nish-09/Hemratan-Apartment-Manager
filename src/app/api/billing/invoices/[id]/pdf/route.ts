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
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { id } = await params;
    const invoice = BillingService.getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Flat isolation check
    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (!userFlats.includes(invoice.flatId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const snapshot = invoice.calculationSnapshot;
    const formattedTotal = BillingService.formatPaiseToInr(invoice.totalAmountPaise);
    const formattedPaid = BillingService.formatPaiseToInr(invoice.paidAmountPaise);
    const formattedDue = BillingService.formatPaiseToInr(invoice.outstandingBalancePaise);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber} - Hemratan Apartment</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #303044; background: #fff; margin: 0; padding: 20px; }
    .header { border-bottom: 3px solid #303044; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .society-name { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .society-sub { font-size: 12px; color: #666; margin-top: 4px; }
    .inv-badge { background: #FAF7A7; border: 2px solid #303044; padding: 6px 12px; font-weight: 900; border-radius: 8px; font-size: 14px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .card { border: 2px solid #303044; border-radius: 12px; padding: 15px; background: #fdfdfd; box-shadow: 3px 3px 0px #303044; }
    .card h4 { margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #777; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
    th { text-align: left; background: #f4f4f6; border-bottom: 2px solid #303044; padding: 10px 12px; font-size: 12px; text-transform: uppercase; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e5e8; font-size: 13px; font-weight: 600; }
    .text-right { text-align: right; }
    .total-box { margin-left: auto; width: 300px; border: 2px solid #303044; border-radius: 12px; padding: 15px; background: #C9F36B; box-shadow: 4px 4px 0px #303044; }
    .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; margin-top: 6px; }
    .footer { margin-top: 40px; padding-top: 15px; border-top: 1px dashed #ccc; font-size: 11px; color: #666; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; font-weight: bold; background: #303044; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Print / Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <div class="society-name">HEMRATAN CO-OPERATIVE HOUSING SOCIETY LTD</div>
      <div class="society-sub">Registration No. BOM/HSG/4421/2012 • Sector 14, Plot 8, Navi Mumbai</div>
    </div>
    <div class="inv-badge">MAINTENANCE INVOICE: ${invoice.invoiceNumber}</div>
  </div>

  <div class="meta-grid">
    <div class="card">
      <h4>Billed To (Flat Member)</h4>
      <div style="font-size: 16px; font-weight: 900;">Wing ${invoice.wing} — Flat ${invoice.flatNumber}</div>
      <div style="font-size: 12px; color: #555; margin-top: 4px;">Carpet Area: ${invoice.flatAreaSqFt} sq.ft.</div>
      <div style="font-size: 12px; color: #555;">Status: <strong>${invoice.status}</strong></div>
    </div>
    <div class="card">
      <h4>Billing Cycle Details</h4>
      <div style="font-size: 13px;"><strong>Period:</strong> Month ${invoice.billingPeriodMonth} / ${invoice.billingPeriodYear}</div>
      <div style="font-size: 13px;"><strong>Issue Date:</strong> ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}</div>
      <div style="font-size: 13px; color: #c026d3;"><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>
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
      ${snapshot.lineItems
        .map(
          (item) => `<tr>
        <td>${item.description}</td>
        <td><span style="font-size: 10px; background: #eee; padding: 2px 6px; border-radius: 4px;">${item.category}</span></td>
        <td class="text-right">${BillingService.formatPaiseToInr(item.amountPaise)}</td>
      </tr>`
        )
        .join('')}
      ${
        snapshot.gstAmountPaise > 0
          ? `<tr>
        <td>Goods & Services Tax (GST @ ${snapshot.gstPercentage}%)</td>
        <td>TAX</td>
        <td class="text-right">${BillingService.formatPaiseToInr(snapshot.gstAmountPaise)}</td>
      </tr>`
          : ''
      }
      ${
        snapshot.discountCreditsPaise > 0
          ? `<tr>
        <td style="color: green;">Discount / Prior Credit Adjustment</td>
        <td>CREDIT</td>
        <td class="text-right" style="color: green;">-${BillingService.formatPaiseToInr(snapshot.discountCreditsPaise)}</td>
      </tr>`
          : ''
      }
    </tbody>
  </table>

  <div class="total-box">
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
      <span>Subtotal:</span>
      <span>${BillingService.formatPaiseToInr(snapshot.subtotalPaise)}</span>
    </div>
    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
      <span>Amount Paid:</span>
      <span>${formattedPaid}</span>
    </div>
    <div class="total-row">
      <span>Total Payable:</span>
      <span>${formattedDue}</span>
    </div>
  </div>

  <div class="footer">
    This is an immutable electronic invoice snapshot generated by Hemratan Apartment Manager.
    <br>Please make payments through the online resident portal or RTGS/NEFT to Society Account: 50200012345678 (IFSC: HDFC0000123).
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error rendering invoice PDF:', error);
    return NextResponse.json({ error: 'Failed to render PDF' }, { status: 500 });
  }
}
