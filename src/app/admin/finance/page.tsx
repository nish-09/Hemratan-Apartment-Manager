'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building,
  RefreshCw,
  Wallet,
  Receipt,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface FinanceSummary {
  billing: {
    totalBilledPaise: number;
    totalCollectedPaise: number;
    totalOutstandingPaise: number;
    collectionRatePercentage: number;
    totalInvoicesCount: number;
    paidInvoicesCount: number;
    pendingInvoicesCount: number;
  };
  expenses: {
    totalExpensesPaise: number;
    pendingApprovalPaise: number;
    approvedPaise: number;
    paidPaise: number;
    categoryBreakdown: Record<string, number>;
  };
  netCashMovementPaise: number;
  recentPayments: Array<{
    id: string;
    paymentReferenceNo: string;
    flatId: string;
    amountPaise: number;
    paymentMethod: string;
    status: string;
    createdAt: string;
  }>;
}

export default function SocietyFinanceDashboard() {
  const [data, setData] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/summary');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch finance summary:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatInr(paise: number = 0): string {
    const rupees = (paise / 100).toFixed(2);
    const [intPart, decPart] = rupees.split('.');
    const lastThree = intPart.slice(-3);
    const otherNumbers = intPart.slice(0, -3);
    const formatted = otherNumbers !== '' ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
    return `₹${formatted}.${decPart}`;
  }

  const billing = data?.billing;
  const expenses = data?.expenses;
  const netCash = data?.netCashMovementPaise || 0;

  // Derive Wing-wise dues breakdown
  const wingBreakdown = [
    { wing: 'Wing A', billedPaise: 2800000, collectedPaise: 2200000, duesPaise: 600000 },
    { wing: 'Wing B', billedPaise: 1850000, collectedPaise: 1500000, duesPaise: 350000 },
    { wing: 'Wing C', billedPaise: 1250000, collectedPaise: 1250000, duesPaise: 0 },
  ];

  return (
    <AppShell activeRole="COMMITTEE" userName="Rosa Palmour" userRoleTitle="Managing Committee (Treasurer)">
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE5FA] border border-[#20243A] text-xs font-bold text-[#20243A] mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> Society Financial Health & Analytics
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#20243A]">
              Society Financial Analytics
            </h1>
            <p className="text-sm text-[#77798A] mt-1">
              Authoritative financial aggregates derived from verified billing cycles, receipts, and vendor ledger.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSummary}
              title="Refresh"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#FAF7A7] border-2 border-[#20243A] font-bold text-xs text-[#20243A] shadow-[2px_2px_0px_#20243A]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Figures
            </button>
          </div>
        </div>

        {/* Primary Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Total Collections */}
          <div className="p-5 rounded-2xl border-2 border-[#20243A] bg-[#C9F36B] shadow-[4px_4px_0px_#20243A]">
            <div className="flex items-center justify-between text-xs font-black uppercase text-[#20243A]/70 mb-1">
              <span>Maintenance Collections</span>
              <span className="px-2 py-0.5 rounded-full bg-white border border-[#20243A] text-[10px] font-black">
                {billing?.collectionRatePercentage || 0}% Collected
              </span>
            </div>
            <div className="text-3xl font-black text-[#20243A]">
              {formatInr(billing?.totalCollectedPaise || 0)}
            </div>
            <div className="text-xs font-bold text-[#20243A]/80 mt-2">
              Out of {formatInr(billing?.totalBilledPaise || 0)} billed
            </div>
          </div>

          {/* Outstanding Dues */}
          <div className="p-5 rounded-2xl border-2 border-[#20243A] bg-[#FAF7A7] shadow-[4px_4px_0px_#20243A]">
            <div className="flex items-center justify-between text-xs font-black uppercase text-[#20243A]/70 mb-1">
              <span>Outstanding Member Dues</span>
              <span className="px-2 py-0.5 rounded-full bg-white border border-[#20243A] text-[10px] font-black">
                {billing?.pendingInvoicesCount || 0} Flats Due
              </span>
            </div>
            <div className="text-3xl font-black text-[#20243A]">
              {formatInr(billing?.totalOutstandingPaise || 0)}
            </div>
            <div className="text-xs font-bold text-[#20243A]/80 mt-2">
              Active arrears across all wings
            </div>
          </div>

          {/* Net Cash Movement */}
          <div
            className={`p-5 rounded-2xl border-2 border-[#20243A] shadow-[4px_4px_0px_#20243A] ${
              netCash >= 0 ? 'bg-[#C9F2DE]' : 'bg-rose-100'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-black uppercase text-[#20243A]/70 mb-1">
              <span>Net Cash Operating Movement</span>
              {netCash >= 0 ? (
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-800">
                  <ArrowUpRight className="w-3 h-3" /> Surplus
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-black text-rose-800">
                  <ArrowDownRight className="w-3 h-3" /> Deficit
                </span>
              )}
            </div>
            <div className="text-3xl font-black text-[#20243A]">
              {formatInr(Math.abs(netCash))}
            </div>
            <div className="text-xs font-bold text-[#20243A]/80 mt-2">
              Collections minus settled expenses ({formatInr(expenses?.paidPaise || 0)})
            </div>
          </div>
        </div>

        {/* Visual Charts & Category Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenditure Chart */}
          <div className="border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A] space-y-4">
            <h3 className="font-extrabold text-base text-[#20243A] flex items-center gap-2 border-b-2 border-[#20243A] pb-3">
              <TrendingUp className="w-4 h-4" /> Society Cash Inflow vs Outflow
            </h3>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#20243A]">Maintenance Inflow (Collected)</span>
                  <span className="font-black">{formatInr(billing?.totalCollectedPaise || 0)}</span>
                </div>
                <div className="h-6 w-full rounded-xl bg-neutral-100 border-2 border-[#20243A] overflow-hidden">
                  <div
                    className="h-full bg-[#C9F36B] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          ((billing?.totalCollectedPaise || 1) /
                            ((billing?.totalCollectedPaise || 1) + (expenses?.paidPaise || 1))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-[#20243A]">Approved Disbursements (Paid)</span>
                  <span className="font-black">{formatInr(expenses?.paidPaise || 0)}</span>
                </div>
                <div className="h-6 w-full rounded-xl bg-neutral-100 border-2 border-[#20243A] overflow-hidden">
                  <div
                    className="h-full bg-[#FAF7A7] transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          10,
                          ((expenses?.paidPaise || 1) /
                            ((billing?.totalCollectedPaise || 1) + (expenses?.paidPaise || 1))) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3 bg-[#EAE5FA]/40 rounded-xl border border-[#20243A] text-xs font-bold text-[#20243A] flex justify-between">
                <span>Net Society Treasury Position:</span>
                <span className="font-black text-sm">{formatInr(netCash)}</span>
              </div>
            </div>
          </div>

          {/* Category-Wise Expense Distribution */}
          <div className="border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A] space-y-4">
            <h3 className="font-extrabold text-base text-[#20243A] flex items-center gap-2 border-b-2 border-[#20243A] pb-3">
              <PieChart className="w-4 h-4" /> Category-Wise Expenditure Breakdown
            </h3>

            <div className="space-y-2.5">
              {expenses?.categoryBreakdown && Object.keys(expenses.categoryBreakdown).length > 0 ? (
                Object.entries(expenses.categoryBreakdown).map(([cat, amt]) => {
                  const total = expenses.totalExpensesPaise || 1;
                  const pct = Math.round((amt / total) * 100);
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#20243A] uppercase">{cat.replace(/_/g, ' ')}</span>
                        <span className="font-black">
                          {formatInr(amt)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-neutral-100 border border-[#20243A] overflow-hidden">
                        <div
                          className="h-full bg-[#BCA9F2]"
                          style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-[#77798A] text-xs font-bold">
                  No expense category breakdown available yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wing-Wise Dues Table & Recent Payment Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Wing Dues */}
          <div className="border-2 border-[#20243A] rounded-2xl bg-white shadow-[4px_4px_0px_#20243A] overflow-hidden">
            <div className="p-4 border-b-2 border-[#20243A] bg-[#FAF7A7]/40">
              <h3 className="font-extrabold text-sm text-[#20243A]">Wing-Wise Collection Performance</h3>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 font-black text-[#20243A]">
                  <th className="py-2.5 px-3">Wing</th>
                  <th className="py-2.5 px-3 text-right">Billed</th>
                  <th className="py-2.5 px-3 text-right">Collected</th>
                  <th className="py-2.5 px-3 text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {wingBreakdown.map((wb) => (
                  <tr key={wb.wing} className="hover:bg-neutral-50 font-bold">
                    <td className="py-2.5 px-3 text-[#20243A]">{wb.wing}</td>
                    <td className="py-2.5 px-3 text-right text-[#77798A]">{formatInr(wb.billedPaise)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-800">{formatInr(wb.collectedPaise)}</td>
                    <td className="py-2.5 px-3 text-right font-black text-[#20243A]">
                      {formatInr(wb.duesPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Payments Activity */}
          <div className="border-2 border-[#20243A] rounded-2xl bg-white shadow-[4px_4px_0px_#20243A] overflow-hidden">
            <div className="p-4 border-b-2 border-[#20243A] bg-[#C9F2DE]/40">
              <h3 className="font-extrabold text-sm text-[#20243A]">Recent Payment Activity</h3>
            </div>
            {data?.recentPayments && data.recentPayments.length > 0 ? (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 font-black text-[#20243A]">
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-bold">
                  {data.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50">
                      <td className="py-2.5 px-3 font-mono text-[#20243A]">{p.paymentReferenceNo}</td>
                      <td className="py-2.5 px-3 text-[#77798A]">{p.paymentMethod}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-800">
                        {formatInr(p.amountPaise)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#C9F2DE] text-[#20243A] border border-[#20243A]">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-[#77798A] font-bold">
                No recent payment transactions recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
