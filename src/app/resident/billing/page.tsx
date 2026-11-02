'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileText,
  Building2,
  Receipt,
  X,
  RefreshCw,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  flatId: string;
  flatNumber: string;
  wing: string;
  billingPeriodMonth: number;
  billingPeriodYear: number;
  flatAreaSqFt: number;
  baseFixedPaise: number;
  baseAreaChargePaise: number;
  additionalChargesPaise: number;
  adjustmentsPaise: number;
  lateFeePaise: number;
  gstAmountPaise: number;
  totalAmountPaise: number;
  paidAmountPaise: number;
  outstandingBalancePaise: number;
  status: 'DRAFT' | 'GENERATED' | 'APPROVED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  calculationSnapshot?: {
    lineItems: Array<{
      description: string;
      amountPaise: number;
      category: string;
      taxApplicable: boolean;
    }>;
  };
}

interface PaymentReceiptItem {
  id: string;
  receiptNumber: string;
  invoiceNumber: string;
  flatNumber: string;
  wing: string;
  amountReceivedPaise: number;
  paymentMethod: string;
  transactionReference: string;
  remainingBalancePaise: number;
  paymentDate: string;
}

export default function ResidentBillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlat, setSelectedFlat] = useState<string>('flat-a-402');
  const [activeTab, setActiveTab] = useState<'current' | 'history' | 'receipts'>('current');

  // Modals
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccessMessage, setPaySuccessMessage] = useState('');

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeInvoice, setDisputeInvoice] = useState<Invoice | null>(null);
  const [disputeTitle, setDisputeTitle] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [invRes, recRes] = await Promise.all([
        fetch('/api/billing/invoices'),
        fetch('/api/receipts'),
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.invoices || []);
      }
      if (recRes.ok) {
        const recData = await recRes.json();
        setReceipts(recData.receipts || []);
      }
    } catch (err) {
      console.error('Error fetching resident billing data:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatInr(paise: number): string {
    const rupees = (paise / 100).toFixed(2);
    const [intPart, decPart] = rupees.split('.');
    const lastThree = intPart.slice(-3);
    const otherNumbers = intPart.slice(0, -3);
    const formatted = otherNumbers !== '' ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
    return `₹${formatted}.${decPart}`;
  }

  // Active current bill
  const currentInvoice = invoices[0] || null;

  async function handleOnlinePayment() {
    if (!payingInvoice) return;
    setPayProcessing(true);
    setPaySuccessMessage('');

    try {
      // 1. Create Order
      const ordRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payingInvoice.id,
          amountPaise: payingInvoice.outstandingBalancePaise,
        }),
      });

      if (!ordRes.ok) {
        const err = await ordRes.json();
        throw new Error(err.error || 'Failed to create payment order');
      }

      const orderData = await ordRes.json();

      // 2. Verify / Settle (Mock Provider simulation)
      const verRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.order.orderId,
          paymentId: `pay_mock_${Date.now()}`,
          signature: 'valid_mock_signature',
          invoiceId: payingInvoice.id,
          amountPaise: payingInvoice.outstandingBalancePaise,
        }),
      });

      if (!verRes.ok) {
        const err = await verRes.json();
        throw new Error(err.error || 'Payment confirmation failed');
      }

      setPaySuccessMessage('Payment successful! Your receipt has been generated.');
      setTimeout(() => {
        setPayModalOpen(false);
        setPaySuccessMessage('');
        fetchData();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      alert(msg);
    } finally {
      setPayProcessing(false);
    }
  }

  async function handleDisputeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeInvoice) return;
    setDisputeSubmitting(true);
    setDisputeMessage('');

    try {
      const res = await fetch('/api/billing/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: disputeInvoice.id,
          title: disputeTitle,
          description: disputeDesc,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit dispute');
      }

      setDisputeMessage('Dispute submitted successfully. The managing committee has been notified.');
      setTimeout(() => {
        setDisputeModalOpen(false);
        setDisputeTitle('');
        setDisputeDesc('');
        setDisputeMessage('');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit dispute';
      alert(msg);
    } finally {
      setDisputeSubmitting(false);
    }
  }

  return (
    <AppShell activeRole="RESIDENT" userName="Jonathan Patel" userRoleTitle="Resident (Wing A - Flat 402)">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE5FA] border border-[#20243A] text-xs font-bold text-[#20243A] mb-2">
              <Building2 className="w-3.5 h-3.5" /> Hemratan Co-op Housing Society
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#20243A]">
              Maintenance & Billing Portal
            </h1>
            <p className="text-sm text-[#77798A] mt-1">
              View your monthly maintenance charges, download stamped invoices, and pay securely online.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#FAF7A7] border-2 border-[#20243A] rounded-xl px-4 py-2 font-bold text-sm text-[#20243A] shadow-[2px_2px_0px_#20243A]">
              <span>Active Flat:</span>
              <select
                value={selectedFlat}
                onChange={(e) => setSelectedFlat(e.target.value)}
                className="bg-transparent font-extrabold focus:outline-none cursor-pointer"
              >
                <option value="flat-a-402">Wing A — Flat 402</option>
              </select>
            </div>
            <button
              onClick={fetchData}
              title="Refresh Records"
              className="p-2 border-2 border-[#20243A] rounded-xl bg-white hover:bg-[#EAE5FA] shadow-[2px_2px_0px_#20243A] transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 border-b-2 border-[#20243A] pb-2">
          <button
            onClick={() => setActiveTab('current')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-[#20243A] transition-all ${
              activeTab === 'current'
                ? 'bg-[#C9F36B] shadow-[3px_3px_0px_#20243A]'
                : 'bg-white hover:bg-[#EAE5FA]'
            }`}
          >
            Current Monthly Bill
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-[#20243A] transition-all ${
              activeTab === 'history'
                ? 'bg-[#FAF7A7] shadow-[3px_3px_0px_#20243A]'
                : 'bg-white hover:bg-[#EAE5FA]'
            }`}
          >
            Bill Archive ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm border-2 border-[#20243A] transition-all ${
              activeTab === 'receipts'
                ? 'bg-[#C9F2DE] shadow-[3px_3px_0px_#20243A]'
                : 'bg-white hover:bg-[#EAE5FA]'
            }`}
          >
            Payment Receipts ({receipts.length})
          </button>
        </div>

        {/* TAB 1: CURRENT BILL */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {currentInvoice ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hero Bill Summary Card */}
                <div className="lg:col-span-1 border-2 border-[#20243A] rounded-2xl p-6 bg-[#FAF7A7] shadow-[4px_4px_0px_#20243A] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-black uppercase tracking-wider text-[#20243A]/70">
                        Monthly Maintenance
                      </span>
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full border border-[#20243A] ${
                          currentInvoice.status === 'PAID'
                            ? 'bg-[#C9F2DE] text-[#20243A]'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {currentInvoice.status}
                      </span>
                    </div>

                    <div className="text-3xl font-black text-[#20243A] mb-1">
                      {formatInr(currentInvoice.outstandingBalancePaise)}
                    </div>
                    <p className="text-xs font-bold text-[#77798A]">
                      {currentInvoice.outstandingBalancePaise === 0
                        ? 'Zero outstanding dues. All clear!'
                        : 'Outstanding amount payable before due date'}
                    </p>

                    <div className="my-6 border-t border-[#20243A]/20 pt-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#77798A]">Invoice No:</span>
                        <span className="font-extrabold text-[#20243A]">{currentInvoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#77798A]">Billing Period:</span>
                        <span className="font-bold text-[#20243A]">
                          Month {currentInvoice.billingPeriodMonth} / {currentInvoice.billingPeriodYear}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#77798A]">Due Date:</span>
                        <span className="font-extrabold text-rose-600">{currentInvoice.dueDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#77798A]">Total Billed:</span>
                        <span className="font-bold text-[#20243A]">{formatInr(currentInvoice.totalAmountPaise)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#77798A]">Amount Paid:</span>
                        <span className="font-bold text-[#20243A]">{formatInr(currentInvoice.paidAmountPaise)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    {currentInvoice.outstandingBalancePaise > 0 ? (
                      <button
                        onClick={() => {
                          setPayingInvoice(currentInvoice);
                          setPayModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#C9F36B] hover:bg-[#b5e356] border-2 border-[#20243A] font-extrabold text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                      >
                        <CreditCard className="w-4 h-4" /> Pay Online ({formatInr(currentInvoice.outstandingBalancePaise)})
                      </button>
                    ) : (
                      <div className="w-full py-2.5 px-4 rounded-xl bg-[#C9F2DE] border-2 border-[#20243A] font-bold text-center text-xs text-[#20243A]">
                        ✓ Fully Settled for this Month
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`/api/billing/invoices/${currentInvoice.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-neutral-50 border-2 border-[#20243A] font-bold text-xs text-[#20243A] shadow-[2px_2px_0px_#20243A] transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF Bill
                      </a>
                      <button
                        onClick={() => {
                          setDisputeInvoice(currentInvoice);
                          setDisputeModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-neutral-50 border-2 border-[#20243A] font-bold text-xs text-[#20243A] shadow-[2px_2px_0px_#20243A] transition-all"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Dispute
                      </button>
                    </div>
                  </div>
                </div>

                {/* Itemized Breakdown Card */}
                <div className="lg:col-span-2 border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A] space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-[#20243A] pb-3">
                    <h3 className="font-extrabold text-base text-[#20243A] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#20243A]" /> Stamped Calculation Breakdown
                    </h3>
                    <span className="text-xs font-bold text-[#77798A]">
                      Carpet Area: {currentInvoice.flatAreaSqFt} sq.ft.
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b-2 border-[#20243A] bg-[#EAE5FA]/50 text-xs text-[#20243A]">
                          <th className="py-2.5 px-3 font-extrabold">Item Description</th>
                          <th className="py-2.5 px-3 font-extrabold">Category</th>
                          <th className="py-2.5 px-3 font-extrabold text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {currentInvoice.calculationSnapshot?.lineItems?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#EAE5FA]/20">
                            <td className="py-2.5 px-3 font-bold text-[#20243A]">{item.description}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FAF7A7] border border-[#20243A]">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-extrabold text-[#20243A]">
                              {formatInr(item.amountPaise)}
                            </td>
                          </tr>
                        )) || (
                          <>
                            <tr>
                              <td className="py-2.5 px-3 font-bold text-[#20243A]">Fixed Monthly Charge</td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FAF7A7] border border-[#20243A]">
                                  FIXED
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-[#20243A]">
                                {formatInr(currentInvoice.baseFixedPaise)}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-2.5 px-3 font-bold text-[#20243A]">
                                Area Based Charge ({currentInvoice.flatAreaSqFt} sq.ft @ ₹3.50/sq.ft)
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FAF7A7] border border-[#20243A]">
                                  AREA_BASED
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-[#20243A]">
                                {formatInr(currentInvoice.baseAreaChargePaise)}
                              </td>
                            </tr>
                          </>
                        )}
                        {currentInvoice.gstAmountPaise > 0 && (
                          <tr className="bg-[#FAF7A7]/20 font-bold">
                            <td className="py-2.5 px-3">Goods & Services Tax (GST)</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#C9F36B] border border-[#20243A]">
                                TAX
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-[#20243A]">
                              {formatInr(currentInvoice.gstAmountPaise)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Callout */}
                  <div className="p-4 rounded-xl border-2 border-[#20243A] bg-[#C9F2DE] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#20243A]/70 uppercase">Net Monthly Payable</div>
                      <div className="text-xl font-black text-[#20243A]">
                        {formatInr(currentInvoice.totalAmountPaise)}
                      </div>
                    </div>
                    <div className="text-right text-xs font-bold text-[#20243A]/80">
                      Payment Terms: Net 15 Days
                      <br />
                      Grace Period: 10 Days
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-[#20243A] rounded-2xl p-12 text-center bg-white shadow-[4px_4px_0px_#20243A]">
                <Clock className="w-12 h-12 text-[#77798A] mx-auto mb-3" />
                <h3 className="font-extrabold text-lg text-[#20243A]">No Invoices Available Yet</h3>
                <p className="text-sm text-[#77798A] max-w-md mx-auto mt-1">
                  The managing committee has not generated maintenance invoices for your flat in this cycle.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVOICE ARCHIVE */}
        {activeTab === 'history' && (
          <div className="border-2 border-[#20243A] rounded-2xl bg-white shadow-[4px_4px_0px_#20243A] overflow-hidden">
            <div className="p-5 border-b-2 border-[#20243A] bg-[#EAE5FA]/40 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#20243A]">Historical Invoices</h3>
                <p className="text-xs text-[#77798A]">All previous billing cycles for Wing A — Flat 402</p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-white border border-[#20243A] rounded-full">
                {invoices.length} Invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#20243A] bg-neutral-50 text-xs font-black text-[#20243A]">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Cycle</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4 text-right">Billed Amount</th>
                    <th className="py-3 px-4 text-right">Paid Amount</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#EAE5FA]/20 transition-colors">
                      <td className="py-3 px-4 font-black text-[#20243A]">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-bold text-[#77798A]">
                        {inv.billingPeriodMonth} / {inv.billingPeriodYear}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#77798A]">{inv.dueDate}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#20243A]">{formatInr(inv.totalAmountPaise)}</td>
                      <td className="py-3 px-4 text-right font-bold text-[#20243A]">{formatInr(inv.paidAmountPaise)}</td>
                      <td className="py-3 px-4 text-right font-black text-[#20243A]">
                        {formatInr(inv.outstandingBalancePaise)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border border-[#20243A] ${
                            inv.status === 'PAID'
                              ? 'bg-[#C9F2DE] text-[#20243A]'
                              : inv.status === 'OVERDUE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-[#FAF7A7] text-[#20243A]'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <a
                          href={`/api/billing/invoices/${inv.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white hover:bg-[#FAF7A7] border border-[#20243A] font-bold text-xs text-[#20243A] shadow-[1px_1px_0px_#20243A] transition-all"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PAYMENT RECEIPTS */}
        {activeTab === 'receipts' && (
          <div className="border-2 border-[#20243A] rounded-2xl bg-white shadow-[4px_4px_0px_#20243A] overflow-hidden">
            <div className="p-5 border-b-2 border-[#20243A] bg-[#C9F2DE]/40 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-[#20243A]">Confirmed Payment Receipts</h3>
                <p className="text-xs text-[#77798A]">Official electronic receipts for payments received</p>
              </div>
              <span className="text-xs font-black px-3 py-1 bg-white border border-[#20243A] rounded-full">
                {receipts.length} Receipts
              </span>
            </div>

            {receipts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#20243A] bg-neutral-50 text-xs font-black text-[#20243A]">
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Payment Date</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount Received</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {receipts.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#C9F2DE]/20 transition-colors">
                        <td className="py-3 px-4 font-black text-[#20243A]">{rec.receiptNumber}</td>
                        <td className="py-3 px-4 font-bold text-[#77798A]">{rec.invoiceNumber}</td>
                        <td className="py-3 px-4 font-bold text-[#77798A]">
                          {new Date(rec.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-[#FAF7A7] border border-[#20243A]">
                            {rec.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-bold text-[#20243A]">
                          {rec.transactionReference}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-800">
                          {formatInr(rec.amountReceivedPaise)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <a
                            href={`/api/receipts/${rec.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white hover:bg-[#C9F36B] border border-[#20243A] font-bold text-xs text-[#20243A] shadow-[1px_1px_0px_#20243A] transition-all"
                          >
                            <Download className="w-3 h-3" /> Receipt PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-[#77798A]">
                <Receipt className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm">No payment receipts issued yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ONLINE PAYMENT MODAL */}
      {payModalOpen && payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-3 border-[#20243A] rounded-2xl w-full max-w-md p-6 shadow-[6px_6px_0px_#20243A] relative">
            <button
              onClick={() => setPayModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-[#20243A] bg-white hover:bg-neutral-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#C9F36B] border-2 border-[#20243A] flex items-center justify-center font-black">
                <CreditCard className="w-5 h-5 text-[#20243A]" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#20243A]">Online Payment Checkout</h3>
                <p className="text-xs text-[#77798A]">Secure Payment Gateway Integration</p>
              </div>
            </div>

            {paySuccessMessage ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <p className="font-black text-emerald-800 text-sm">{paySuccessMessage}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border-2 border-[#20243A] bg-[#FAF7A7] space-y-1">
                  <div className="flex justify-between text-xs text-[#77798A]">
                    <span>Invoice:</span>
                    <span className="font-bold text-[#20243A]">{payingInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[#77798A]">
                    <span>Flat:</span>
                    <span className="font-bold text-[#20243A]">Wing A - Flat 402</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#20243A] pt-2 border-t border-[#20243A]/20">
                    <span>Amount Payable:</span>
                    <span className="text-base text-rose-700">{formatInr(payingInvoice.outstandingBalancePaise)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-[#20243A]">Select Payment Provider</label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                    <label className="flex items-center gap-2 p-3 border-2 border-[#20243A] rounded-xl bg-[#EAE5FA] cursor-pointer">
                      <input type="radio" name="provider" defaultChecked className="accent-[#20243A]" />
                      <span>Razorpay / Mock</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border-2 border-[#20243A] rounded-xl bg-white cursor-pointer opacity-70">
                      <input type="radio" name="provider" disabled className="accent-[#20243A]" />
                      <span>Cashfree (Future)</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-300 text-[11px] text-[#77798A] space-y-1">
                  <p className="font-bold text-[#20243A]">Security Guarantee:</p>
                  <p>All calculations verified server-side. No card or UPI credentials stored.</p>
                </div>

                <button
                  onClick={handleOnlinePayment}
                  disabled={payProcessing}
                  className="w-full py-3 rounded-xl bg-[#C9F36B] hover:bg-[#b5e356] border-2 border-[#20243A] font-black text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {payProcessing ? 'Processing Transaction...' : `Confirm & Pay ${formatInr(payingInvoice.outstandingBalancePaise)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISPUTE MODAL */}
      {disputeModalOpen && disputeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-3 border-[#20243A] rounded-2xl w-full max-w-md p-6 shadow-[6px_6px_0px_#20243A] relative">
            <button
              onClick={() => setDisputeModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-[#20243A] bg-white hover:bg-neutral-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7A7] border-2 border-[#20243A] flex items-center justify-center font-black">
                <HelpCircle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-black text-lg text-[#20243A]">Raise Billing Dispute</h3>
                <p className="text-xs text-[#77798A]">Invoice #{disputeInvoice.invoiceNumber}</p>
              </div>
            </div>

            {disputeMessage ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm text-emerald-800">{disputeMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleDisputeSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Dispute Title / Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={disputeTitle}
                    onChange={(e) => setDisputeTitle(e.target.value)}
                    placeholder="e.g. Discrepancy in water charge"
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Clarification Details
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={disputeDesc}
                    onChange={(e) => setDisputeDesc(e.target.value)}
                    placeholder="Please explain why this bill requires adjustment or review..."
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={disputeSubmitting}
                  className="w-full py-2.5 rounded-xl bg-[#FAF7A7] hover:bg-[#eae78a] border-2 border-[#20243A] font-black text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
                >
                  {disputeSubmitting ? 'Submitting...' : 'Submit Clarification Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
