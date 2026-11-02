'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  Calculator,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  Percent,
} from 'lucide-react';

interface ChargeItem {
  description: string;
  amountRupees: number;
  category: 'FIXED' | 'AREA_BASED' | 'WATER' | 'ELECTRICITY' | 'PARKING' | 'LIFT' | 'SINKING_FUND' | 'REPAIR_FUND' | 'AMENITY' | 'CUSTOM';
  taxApplicable: boolean;
}

export default function MaintenanceCalculatorPage() {
  // Configuration
  const [billingModel, setBillingModel] = useState<'HYBRID' | 'FIXED' | 'AREA_BASED'>('HYBRID');
  const [fixedChargeRupees, setFixedChargeRupees] = useState<number>(2000);
  const [ratePerSqFtRupees, setRatePerSqFtRupees] = useState<number>(3.5);
  const [flatAreaSqFt, setFlatAreaSqFt] = useState<number>(1000);

  // Additional charges
  const [additionalItems, setAdditionalItems] = useState<ChargeItem[]>([
    { description: 'Sinking Fund Contribution', amountRupees: 500, category: 'SINKING_FUND', taxApplicable: false },
    { description: 'Lift & Power Backup Maintenance', amountRupees: 350, category: 'LIFT', taxApplicable: false },
  ]);

  // Tax & adjustments
  const [gstHandling, setGstHandling] = useState<'NOT_APPLICABLE' | 'MANUAL' | 'AUTOMATIC'>('MANUAL');
  const [gstPercentage, setGstPercentage] = useState<number>(0);
  const [adjustmentsRupees, setAdjustmentsRupees] = useState<number>(0);
  const [previousOutstandingRupees, setPreviousOutstandingRupees] = useState<number>(0);
  const [discountCreditsRupees, setDiscountCreditsRupees] = useState<number>(0);

  // Live calculation results
  const [calculation, setCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    runCalculation();
  }, [
    billingModel,
    fixedChargeRupees,
    ratePerSqFtRupees,
    flatAreaSqFt,
    additionalItems,
    gstHandling,
    gstPercentage,
    adjustmentsRupees,
    previousOutstandingRupees,
    discountCreditsRupees,
  ]);

  async function runCalculation() {
    setLoading(true);
    try {
      const items = additionalItems.map((item) => ({
        description: item.description,
        amountPaise: Math.round(item.amountRupees * 100),
        category: item.category,
        taxApplicable: item.taxApplicable,
      }));

      const res = await fetch('/api/billing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flatAreaSqFt,
          additionalCharges: items,
          adjustmentsPaise: Math.round(adjustmentsRupees * 100),
          previousOutstandingPaise: Math.round(previousOutstandingRupees * 100),
          discountCreditsPaise: Math.round(discountCreditsRupees * 100),
          gstHandling,
          manualGstPercentage: gstPercentage,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCalculation(data.calculation);
      }
    } catch (err) {
      console.error('Calculation error:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddCharge() {
    setAdditionalItems([
      ...additionalItems,
      {
        description: 'Water / Utility Charge',
        amountRupees: 250,
        category: 'WATER',
        taxApplicable: false,
      },
    ]);
  }

  function handleRemoveCharge(index: number) {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
  }

  async function handleSaveAsDefault() {
    setSaveSuccess('');
    try {
      const res = await fetch('/api/billing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billingModel,
          fixedChargePaise: Math.round(fixedChargeRupees * 100),
          ratePerSqFtPaise: Math.round(ratePerSqFtRupees * 100),
          gstHandling,
          gstPercentage,
        }),
      });

      if (res.ok) {
        setSaveSuccess('Default society billing formula saved successfully!');
        setTimeout(() => setSaveSuccess(''), 3000);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save configuration');
      }
    } catch (err: any) {
      alert(err.message || 'Save failed');
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

  return (
    <AppShell activeRole="COMMITTEE" userName="Rosa Palmour" userRoleTitle="Managing Committee (Treasurer)">
      <div className="space-y-6">
        {/* Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF7A7] border border-[#20243A] text-xs font-bold text-[#20243A] mb-2">
              <Calculator className="w-3.5 h-3.5" /> Maintenance Calculation Sandbox
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#20243A]">
              Smart Maintenance Bill Calculator
            </h1>
            <p className="text-sm text-[#77798A] mt-1">
              Test rate revisions, utility line items, manual GST configurations, and live formula projections.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAsDefault}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C9F36B] hover:bg-[#b5e356] border-2 border-[#20243A] font-extrabold text-sm text-[#20243A] shadow-[3px_3px_0px_#20243A] active:translate-x-0.5 active:translate-y-0.5 transition-all"
            >
              <Save className="w-4 h-4" /> Save as Default Config
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-xl border-2 border-[#20243A] bg-[#C9F2DE] font-bold text-sm text-[#20243A] flex items-center gap-2 shadow-[3px_3px_0px_#20243A]">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
            {saveSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1: Base Formula */}
            <div className="border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A] space-y-4">
              <h3 className="font-extrabold text-base text-[#20243A] flex items-center gap-2 border-b-2 border-[#20243A] pb-3">
                <Building className="w-4 h-4" /> 1. Base Maintenance Model & Rates
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Billing Model
                  </label>
                  <select
                    value={billingModel}
                    onChange={(e: any) => setBillingModel(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold bg-[#EAE5FA]/50 focus:outline-none"
                  >
                    <option value="HYBRID">Hybrid (Fixed + Area)</option>
                    <option value="FIXED">Fixed Only</option>
                    <option value="AREA_BASED">Area Based Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Fixed Charge (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={fixedChargeRupees}
                    onChange={(e) => setFixedChargeRupees(Number(e.target.value))}
                    disabled={billingModel === 'AREA_BASED'}
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none disabled:bg-neutral-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Rate per Sq. Ft. (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.10"
                    value={ratePerSqFtRupees}
                    onChange={(e) => setRatePerSqFtRupees(Number(e.target.value))}
                    disabled={billingModel === 'FIXED'}
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none disabled:bg-neutral-100 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#EAE5FA]/40 rounded-xl border border-[#20243A] flex items-center justify-between text-xs font-bold text-[#20243A]">
                <span>Sample Flat Carpet Area:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    step="50"
                    value={flatAreaSqFt}
                    onChange={(e) => setFlatAreaSqFt(Number(e.target.value))}
                    className="w-24 px-2 py-1 border-2 border-[#20243A] rounded-lg text-sm font-extrabold text-right focus:outline-none bg-white"
                  />
                  <span>sq.ft.</span>
                </div>
              </div>
            </div>

            {/* Section 2: Additional Metrics & Custom Charges */}
            <div className="border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A] space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#20243A] pb-3">
                <h3 className="font-extrabold text-base text-[#20243A] flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" /> 2. Additional Utility Charges & Funds
                </h3>
                <button
                  onClick={handleAddCharge}
                  className="flex items-center gap-1 px-3 py-1 bg-[#FAF7A7] hover:bg-[#eae78a] border-2 border-[#20243A] rounded-lg text-xs font-black text-[#20243A] shadow-[2px_2px_0px_#20243A]"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Charge Item
                </button>
              </div>

              <div className="space-y-3">
                {additionalItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-neutral-50 border-2 border-[#20243A] rounded-xl"
                  >
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...additionalItems];
                        copy[idx].description = e.target.value;
                        setAdditionalItems(copy);
                      }}
                      className="flex-1 w-full px-3 py-1.5 border border-[#20243A] rounded-lg text-xs font-bold bg-white"
                      placeholder="Charge description"
                    />

                    <select
                      value={item.category}
                      onChange={(e: any) => {
                        const copy = [...additionalItems];
                        copy[idx].category = e.target.value;
                        setAdditionalItems(copy);
                      }}
                      className="px-2 py-1.5 border border-[#20243A] rounded-lg text-xs font-bold bg-white"
                    >
                      <option value="SINKING_FUND">Sinking Fund</option>
                      <option value="REPAIR_FUND">Repair Fund</option>
                      <option value="WATER">Water Charges</option>
                      <option value="ELECTRICITY">Electricity</option>
                      <option value="PARKING">Parking</option>
                      <option value="LIFT">Lift Maintenance</option>
                      <option value="AMENITY">Amenity</option>
                      <option value="CUSTOM">Custom</option>
                    </select>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={item.amountRupees}
                        onChange={(e) => {
                          const copy = [...additionalItems];
                          copy[idx].amountRupees = Number(e.target.value);
                          setAdditionalItems(copy);
                        }}
                        className="w-24 px-2 py-1.5 border border-[#20243A] rounded-lg text-xs font-extrabold text-right bg-white"
                      />
                      <button
                        onClick={() => handleRemoveCharge(idx)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Tax & Adjustments */}
            <div className="border-2 border-[#20243A] rounded-2xl p-6 bg-white shadow-[4px_4px_0px_#20243A] space-y-4">
              <h3 className="font-extrabold text-base text-[#20243A] flex items-center gap-2 border-b-2 border-[#20243A] pb-3">
                <Percent className="w-4 h-4" /> 3. GST Treatment & Adjustments
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    GST Treatment
                  </label>
                  <select
                    value={gstHandling}
                    onChange={(e: any) => setGstHandling(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold bg-[#EAE5FA]/50 focus:outline-none"
                  >
                    <option value="NOT_APPLICABLE">GST Not Applicable</option>
                    <option value="MANUAL">Manual GST Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="28"
                    step="1"
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(Number(e.target.value))}
                    disabled={gstHandling === 'NOT_APPLICABLE'}
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none disabled:bg-neutral-100 disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Adjustments / Arrears (₹)
                  </label>
                  <input
                    type="number"
                    value={adjustmentsRupees}
                    onChange={(e) => setAdjustmentsRupees(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-[#20243A] mb-1">
                    Discount / Credits (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={discountCreditsRupees}
                    onChange={(e) => setDiscountCreditsRupees(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-3 py-2 border-2 border-[#20243A] rounded-xl text-sm font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Column */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 border-2 border-[#20243A] rounded-2xl p-6 bg-[#FAF7A7] shadow-[4px_4px_0px_#20243A] space-y-5">
              <div className="flex items-center justify-between border-b-2 border-[#20243A] pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-[#20243A]/70">
                  Live Preview Snapshot
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white border border-[#20243A]">
                  Deterministic
                </span>
              </div>

              {calculation ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-[#20243A]/20">
                    <span className="text-[#77798A] font-bold">Fixed Monthly Component:</span>
                    <span className="font-extrabold text-[#20243A]">{formatInr(calculation.baseFixedPaise)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#20243A]/20">
                    <span className="text-[#77798A] font-bold">Area Based Component:</span>
                    <span className="font-extrabold text-[#20243A]">{formatInr(calculation.baseAreaPaise)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#20243A]/20">
                    <span className="text-[#77798A] font-bold">Additional Charges & Funds:</span>
                    <span className="font-extrabold text-[#20243A]">
                      {formatInr(calculation.additionalChargesPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#20243A]/20">
                    <span className="text-[#77798A] font-bold">Adjustments & Late Fees:</span>
                    <span className="font-extrabold text-[#20243A]">
                      {formatInr(calculation.adjustmentsPaise + calculation.lateFeePaise)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 font-bold text-neutral-800">
                    <span>Subtotal Before Tax:</span>
                    <span className="font-black">{formatInr(calculation.subtotalPaise)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#20243A]/20 text-[#20243A]">
                    <span className="text-[#77798A] font-bold">GST ({calculation.gstPercentage}%):</span>
                    <span className="font-black text-[#20243A]">{formatInr(calculation.gstAmountPaise)}</span>
                  </div>

                  {calculation.discountCreditsPaise > 0 && (
                    <div className="flex justify-between py-1 border-b border-[#20243A]/20 text-emerald-800">
                      <span className="font-bold">Discount Credits:</span>
                      <span className="font-black">-{formatInr(calculation.discountCreditsPaise)}</span>
                    </div>
                  )}

                  {/* Net Payable Highlight */}
                  <div className="p-4 rounded-xl border-2 border-[#20243A] bg-[#C9F36B] shadow-[2px_2px_0px_#20243A]">
                    <div className="text-[10px] font-black uppercase text-[#20243A]/70">
                      Total Projected Bill
                    </div>
                    <div className="text-2xl font-black text-[#20243A]">
                      {formatInr(calculation.totalAmountPaise)}
                    </div>
                    <div className="text-[10px] font-bold text-[#20243A]/80 mt-1">
                      Exact snapshot for {flatAreaSqFt} sq.ft.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-[#77798A] text-xs font-bold">
                  Calculating real-time snapshot...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
