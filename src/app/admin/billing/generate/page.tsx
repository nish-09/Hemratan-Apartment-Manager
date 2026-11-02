'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  FileText,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Check,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface SocietyFlat {
  id: string;
  flatNumber: string;
  wing: string;
  areaSqFt: number;
  residentName: string;
}

const SOCIETY_FLATS: SocietyFlat[] = [
  { id: 'flat-a-101', flatNumber: '101', wing: 'A', areaSqFt: 850, residentName: 'Vikas Sharma' },
  { id: 'flat-a-201', flatNumber: '201', wing: 'A', areaSqFt: 950, residentName: 'Rosa Palmour' },
  { id: 'flat-a-301', flatNumber: '301', wing: 'A', areaSqFt: 950, residentName: 'Aarav Mehta' },
  { id: 'flat-a-402', flatNumber: '402', wing: 'A', areaSqFt: 1100, residentName: 'Jonathan Patel' },
  { id: 'flat-b-102', flatNumber: '102', wing: 'B', areaSqFt: 850, residentName: 'Meera Sen' },
  { id: 'flat-b-201', flatNumber: '201', wing: 'B', areaSqFt: 1000, residentName: 'Kunal Kapoor' },
  { id: 'flat-c-304', flatNumber: '304', wing: 'C', areaSqFt: 1250, residentName: 'Pooja Hegde' },
];

export default function BulkBillGenerationPage() {
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [dueDate, setDueDate] = useState<string>('2026-11-20');

  // Per flat custom metric overrides
  const [flatAdjustments, setFlatAdjustments] = useState<Record<string, number>>({});
  const [flatCustomFunds, setFlatCustomFunds] = useState<Record<string, number>>({});

  // Batch generation status
  const [generating, setGenerating] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Default config preview
  const fixedRatePaise = 200000; // ₹2,000
  const ratePerSqFtPaise = 350; // ₹3.50

  function formatInr(paise: number): string {
    const rupees = (paise / 100).toFixed(2);
    const [intPart, decPart] = rupees.split('.');
    const lastThree = intPart.slice(-3);
    const otherNumbers = intPart.slice(0, -3);
    const formatted = otherNumbers !== '' ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree : lastThree;
    return `₹${formatted}.${decPart}`;
  }

  function calculateEstimatedTotal(flat: SocietyFlat): number {
    const base = fixedRatePaise + flat.areaSqFt * ratePerSqFtPaise;
    const adj = (flatAdjustments[flat.id] || 0) * 100;
    const fund = (flatCustomFunds[flat.id] || 0) * 100;
    return Math.max(0, base + adj + fund);
  }

  const grandProjectedTotal = SOCIETY_FLATS.reduce(
    (sum, f) => sum + calculateEstimatedTotal(f),
    0
  );

  async function handleGenerateBatch() {
    setGenerating(true);
    setErrorMessage('');
    setBatchResult(null);

    try {
      const customFlatMetrics: Record<string, any> = {};
      for (const flat of SOCIETY_FLATS) {
        const additionalItems = [];
        if (flatCustomFunds[flat.id]) {
          additionalItems.push({
            description: 'Special Fund / Water Surcharge',
            amountPaise: Math.round(flatCustomFunds[flat.id] * 100),
            category: 'WATER',
          });
        }
        customFlatMetrics[flat.id] = {
          adjustmentsPaise: Math.round((flatAdjustments[flat.id] || 0) * 100),
          additionalItems,
        };
      }

      const res = await fetch('/api/billing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          dueDate,
          customFlatMetrics,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate billing batch');
      }

      setBatchResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during invoice generation');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <AppShell activeRole="COMMITTEE" userName="Rosa Palmour" userRoleTitle="Managing Committee (Treasurer)">
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE5FA] border border-[#20243A] text-xs font-bold text-[#20243A] mb-2">
              <Layers className="w-3.5 h-3.5" /> Society Batch Dispatch
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#20243A]">
              Bulk Maintenance Bill Generation
            </h1>
            <p className="text-sm text-[#77798A] mt-1">
              Generate stamped invoices for all society flats, apply per-flat metrics, and export merged printable PDF bundles.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateBatch}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C9F36B] hover:bg-[#b5e356] border-2 border-[#20243A] font-black text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {generating ? 'Generating Batch...' : 'Generate Society Batch'}
            </button>
          </div>
        </div>

        {/* Error / Conflict Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl border-2 border-[#20243A] bg-rose-100 font-bold text-sm text-rose-900 flex items-center gap-2 shadow-[3px_3px_0px_#20243A]">
            <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Banner & Merged Download */}
        {batchResult && (
          <div className="p-6 rounded-2xl border-3 border-[#20243A] bg-[#C9F2DE] shadow-[5px_5px_0px_#20243A] space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#20243A] text-xs font-black text-[#20243A] mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Batch Generated Successfully
                </div>
                <h3 className="text-xl font-black text-[#20243A]">
                  Batch #{batchResult.batchNumber || batchResult.batch?.batchNumber}
                </h3>
                <p className="text-xs font-bold text-[#20243A]/80 mt-1">
                  Created {batchResult.invoicesCount || batchResult.invoices?.length} flat invoices totaling{' '}
                  <span className="font-black text-base">{batchResult.formattedTotal}</span>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`/api/billing/batches/${batchResult.batchNumber || 'current'}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#FAF7A7] hover:bg-[#eae78a] border-2 border-[#20243A] font-black text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] transition-all"
                >
                  <Download className="w-4 h-4" /> Download Merged Printable PDF
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Cycle Parameter Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 rounded-2xl border-2 border-[#20243A] bg-white shadow-[4px_4px_0px_#20243A]">
          <div>
            <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
              Billing Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold bg-[#EAE5FA]/50 focus:outline-none"
            >
              <option value={10}>October</option>
              <option value={11}>November</option>
              <option value={12}>December</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
              Billing Year
            </label>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold bg-[#EAE5FA]/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
              Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
              Projected Society Billing
            </label>
            <div className="p-2 border-2 border-[#20243A] rounded-xl bg-[#FAF7A7] text-right font-black text-base text-[#20243A]">
              {formatInr(grandProjectedTotal)}
            </div>
          </div>
        </div>

        {/* Flat Roster & Custom Metrics Table */}
        <div className="border-2 border-[#20243A] rounded-2xl bg-white shadow-[4px_4px_0px_#20243A] overflow-hidden">
          <div className="p-5 border-b-2 border-[#20243A] bg-[#EAE5FA]/40 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-[#20243A]">Society Flat Roster & Custom Metrics</h3>
              <p className="text-xs text-[#77798A]">Enter any flat-specific water surcharges or arrears prior to generation</p>
            </div>
            <span className="text-xs font-black px-3 py-1 bg-white border border-[#20243A] rounded-full">
              {SOCIETY_FLATS.length} Flats Active
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-[#20243A] bg-neutral-50 text-xs font-black text-[#20243A]">
                  <th className="py-3 px-4">Flat / Wing</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Area (sq.ft)</th>
                  <th className="py-3 px-4">Formula Base</th>
                  <th className="py-3 px-4">Special Surcharge (₹)</th>
                  <th className="py-3 px-4">Adjustments (₹)</th>
                  <th className="py-3 px-4 text-right">Projected Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {SOCIETY_FLATS.map((flat) => {
                  const basePaise = fixedRatePaise + flat.areaSqFt * ratePerSqFtPaise;
                  const totalEst = calculateEstimatedTotal(flat);

                  return (
                    <tr key={flat.id} className="hover:bg-[#EAE5FA]/20 transition-colors">
                      <td className="py-3 px-4 font-black text-[#20243A]">
                        Wing {flat.wing} — {flat.flatNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#77798A]">{flat.residentName}</td>
                      <td className="py-3 px-4 font-bold text-[#20243A]">{flat.areaSqFt} sq.ft.</td>
                      <td className="py-3 px-4 font-bold text-[#77798A]">{formatInr(basePaise)}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          placeholder="0"
                          value={flatCustomFunds[flat.id] || ''}
                          onChange={(e) =>
                            setFlatCustomFunds({
                              ...flatCustomFunds,
                              [flat.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-24 px-2 py-1 border border-[#20243A] rounded-lg text-xs font-bold bg-white focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          placeholder="0"
                          value={flatAdjustments[flat.id] || ''}
                          onChange={(e) =>
                            setFlatAdjustments({
                              ...flatAdjustments,
                              [flat.id]: Number(e.target.value) || 0,
                            })
                          }
                          className="w-24 px-2 py-1 border border-[#20243A] rounded-lg text-xs font-bold bg-white focus:outline-none"
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#20243A]">
                        {formatInr(totalEst)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3 h-3" /> Ready
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
