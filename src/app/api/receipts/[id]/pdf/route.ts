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
    const receipts = BillingService.getReceipts();
    const receipt = receipts.find((r) => r.id === id || r.receiptNumber === id);

    if (!receipt) {
      return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
    }

    if (user.role === 'RESIDENT') {
      const userFlats = user.assignedFlatIds || [];
      if (!userFlats.includes(receipt.flatId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${receipt.receiptNumber} - Hemratan Apartment</title>
  <style>
    @page { size: A5 landscape; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #303044; background: #fff; margin: 0; padding: 25px; }
    .header { border-bottom: 2px solid #303044; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 18px; font-weight: 900; }
    .receipt-no { background: #C9F2DE; border: 2px solid #303044; padding: 4px 10px; border-radius: 6px; font-weight: 900; font-size: 13px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px; font-size: 12px; }
    .box { border: 1.5px solid #303044; border-radius: 8px; padding: 10px; background: #fafafa; }
    .amount-box { background: #FAF7A7; border: 2px solid #303044; border-radius: 8px; padding: 12px; text-align: center; margin-bottom: 15px; }
    .amount-val { font-size: 24px; font-weight: 900; }
    .footer { font-size: 10px; color: #777; text-align: center; border-top: 1px dashed #ccc; padding-top: 8px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; text-align: right;">
    <button onclick="window.print()" style="padding: 6px 12px; font-weight: bold; background: #303044; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Print Receipt</button>
  </div>
  <div class="header">
    <div>
      <div class="title">HEMRATAN CO-OPERATIVE HOUSING SOCIETY LTD</div>
      <div style="font-size: 11px; color: #666;">OFFICIAL PAYMENT ACKNOWLEDGEMENT RECEIPT</div>
    </div>
    <div class="receipt-no">RECEIPT: ${receipt.receiptNumber}</div>
  </div>

  <div class="grid">
    <div class="box">
      <div><strong>Received From:</strong> Wing ${receipt.wing} — Flat ${receipt.flatNumber}</div>
      <div><strong>Against Invoice:</strong> ${receipt.invoiceNumber}</div>
    </div>
    <div class="box">
      <div><strong>Payment Mode:</strong> ${receipt.paymentMethod}</div>
      <div><strong>Transaction Ref:</strong> ${receipt.transactionReference}</div>
      <div><strong>Date:</strong> ${new Date(receipt.paymentDate).toLocaleDateString('en-IN')}</div>
    </div>
  </div>

  <div class="amount-box">
    <div style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #555;">Amount Successfully Received</div>
    <div class="amount-val">${BillingService.formatPaiseToInr(receipt.amountReceivedPaise)}</div>
    <div style="font-size: 11px; margin-top: 3px;">Remaining Balance: ${BillingService.formatPaiseToInr(receipt.remainingBalancePaise)}</div>
  </div>

  <div class="footer">
    This is an authorized system receipt generated for Hemratan CHS Ltd. Thank you for your timely contribution.
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
    console.error('Error rendering receipt PDF:', error);
    return NextResponse.json({ error: 'Failed to render receipt' }, { status: 500 });
  }
}
