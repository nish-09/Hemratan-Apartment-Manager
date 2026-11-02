'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  BarChart3,
  Users,
  ShieldCheck,
  ClipboardList,
  Wallet,
  Car,
  Package,
  Calendar,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { SocietyAnalyticsData, AnalyticsRange } from '@/services/analytics.service';
import { BillingService } from '@/services/billing.service';

export default function AdminAnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState<AnalyticsRange>('30D');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState<SocietyAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        let url = `/api/analytics/society?range=${selectedRange}`;
        if (selectedRange === 'CUSTOM' && startDate && endDate) {
          url += `&startDate=${startDate}&endDate=${endDate}`;
        }
        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch society analytics');
        }
        const data = await res.json();
        if (!ignore) {
          setAnalytics(data.data);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading analytics');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      ignore = true;
    };
  }, [selectedRange, startDate, endDate]);

  const ranges: Array<{ id: AnalyticsRange; label: string }> = [
    { id: 'TODAY', label: 'Today' },
    { id: '7D', label: 'Last 7 Days' },
    { id: '30D', label: 'Last 30 Days' },
    { id: 'THIS_MONTH', label: 'This Month' },
    { id: 'PREV_MONTH', label: 'Previous Month' },
    { id: 'CUSTOM', label: 'Custom Range' },
  ];

  return (
    <AppShell
      activeRole="COMMITTEE"
      userName="Rosa Palmour"
      userRoleTitle="Managing Committee (Treasurer)"
    >
      <div className="flex-1 overflow-y-auto bg-[#EAE5FA] p-4 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-[#C9F36B] border border-[#20243A] text-[#20243A]">
                Society Intelligence
              </span>
              <span className="text-xs text-[#77798A] font-medium">
                Hemratan Cooperative Housing Society
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-[#20243A] tracking-tight">
              Society-Wide Analytics Cockpit
            </h1>
            <p className="text-sm text-[#77798A] font-medium mt-1">
              Real-time governance telemetry across units, gate operations, maintenance collections, and facility usage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                // Trigger refresh by toggling state
                setSelectedRange((prev) => prev);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#FAF7A7] border-[1.5px] border-[#20243A] rounded-xl font-bold text-xs text-[#20243A] shadow-[2px_2px_0px_#20243A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="bg-white border-[1.5px] border-[#20243A] p-4 rounded-2xl shadow-[2px_2px_0px_#20243A] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-[#20243A] uppercase tracking-wider flex items-center gap-1.5 mr-2">
              <Calendar className="w-3.5 h-3.5 text-[#20243A]" />
              Time Window:
            </span>
            {ranges.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRange(r.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border-[1.5px] transition-all ${
                  selectedRange === r.id
                    ? 'bg-[#C9F36B] border-[#20243A] text-[#20243A] shadow-[2px_2px_0px_#20243A]'
                    : 'bg-white border-[#20243A] text-[#77798A] hover:bg-[#EAE5FA]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {selectedRange === 'CUSTOM' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1 text-xs font-semibold border-[1.5px] border-[#20243A] rounded-lg bg-white"
              />
              <span className="text-xs text-[#77798A] font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1 text-xs font-semibold border-[1.5px] border-[#20243A] rounded-lg bg-white"
              />
            </div>
          )}

          {analytics && (
            <div className="text-xs font-semibold text-[#77798A]">
              Active Scope:{' '}
              <span className="font-black text-[#20243A]">
                {analytics.timeRange.label}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-[1.5px] border-red-500 rounded-xl text-red-800 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            {error}
          </div>
        )}

        {loading && !analytics && (
          <div className="p-12 text-center bg-white border-[1.5px] border-[#20243A] rounded-2xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#20243A] mb-3" />
            <p className="text-sm font-bold text-[#20243A]">Calculating Society Telemetry...</p>
          </div>
        )}

        {analytics && (
          <div className="space-y-6">
            {/* Top 4 Primary KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Occupancy Rate */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    Occupancy Rate
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#C9F2DE] border border-[#20243A] flex items-center justify-center">
                    <Building className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-3xl font-black text-[#20243A]">
                  {analytics.flats.occupancyPercentage}%
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-[#77798A] mt-2">
                  <span>{analytics.flats.occupiedFlats} Occupied</span>
                  <span>{analytics.flats.vacantFlats} Vacant</span>
                </div>
                <div className="w-full bg-[#EAE5FA] h-2 rounded-full overflow-hidden mt-3 border border-[#20243A]">
                  <div
                    className="bg-[#C9F36B] h-full"
                    style={{ width: `${analytics.flats.occupancyPercentage}%` }}
                  />
                </div>
              </div>

              {/* 2. Gate Traffic */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    Visitor Inflow
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#DCD2FA] border border-[#20243A] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-3xl font-black text-[#20243A]">
                  {analytics.visitors.totalVisitors}
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-[#77798A] mt-2">
                  <span className="text-green-700 font-bold">
                    {analytics.visitors.currentlyInside} Inside Now
                  </span>
                  <span>{analytics.domesticHelp.currentlyInside} Domestic Staff</span>
                </div>
                <div className="text-[11px] text-[#77798A] mt-3 pt-2 border-t border-[#EAE5FA]">
                  100% verified via intercom & SMS OTP
                </div>
              </div>

              {/* 3. Maintenance Realization */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    Collection Rate
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#FAF7A7] border border-[#20243A] flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-3xl font-black text-[#20243A]">
                  {analytics.finances.collectionPercentage}%
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-[#77798A] mt-2">
                  <span>
                    Collected: {BillingService.formatPaiseToInr(analytics.finances.totalCollectedPaise)}
                  </span>
                </div>
                <div className="text-[11px] text-red-700 font-semibold mt-3 pt-2 border-t border-[#EAE5FA]">
                  Outstanding Dues: {BillingService.formatPaiseToInr(analytics.finances.outstandingDuesPaise)}
                </div>
              </div>

              {/* 4. Grievance Turnaround */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    Turnaround SLA
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#C9F36B] border border-[#20243A] flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-3xl font-black text-[#20243A]">
                  {analytics.complaints.averageResolutionHours}h
                </div>
                <div className="flex items-center justify-between text-xs font-medium text-[#77798A] mt-2">
                  <span>{analytics.complaints.pendingComplaints} Pending Triage</span>
                  <span className="text-green-700 font-bold">
                    {analytics.complaints.resolvedComplaints} Resolved
                  </span>
                </div>
                <div className="text-[11px] text-[#77798A] mt-3 pt-2 border-t border-[#EAE5FA]">
                  Priority triage engine active
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: Wings & Operations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Wing Distribution */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Wing-Wise Flat Occupancy
                  </h2>
                  <span className="text-xs font-bold text-[#77798A]">
                    {analytics.flats.totalFlats} Registered Flats
                  </span>
                </div>

                <div className="space-y-4">
                  {analytics.flats.wingDistribution.map((w) => {
                    const pct = Math.round((w.occupied / (w.total || 1)) * 100);
                    return (
                      <div key={w.wing} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#20243A]">Wing {w.wing}</span>
                          <span className="text-[#77798A]">
                            {w.occupied} / {w.total} flats occupied ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#EAE5FA] h-3 rounded-full overflow-hidden border border-[#20243A]">
                          <div
                            className="bg-[#C9F36B] h-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Gate Security & Visitor Categories */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Visitor Inflow & Categories
                  </h2>
                  <span className="text-xs font-bold text-[#77798A]">
                    {analytics.visitors.totalVisitors} Logged Visits
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {Object.entries(analytics.visitors.byPurpose).map(([purpose, count]) => (
                    <div
                      key={purpose}
                      className="p-3 bg-[#EAE5FA] border border-[#20243A] rounded-xl flex items-center justify-between"
                    >
                      <span className="text-xs font-bold text-[#20243A]">{purpose}</span>
                      <span className="text-xs font-black text-[#20243A] px-2 py-0.5 bg-white rounded-md border border-[#20243A]">
                        {count}
                      </span>
                    </div>
                  ))}
                  {Object.keys(analytics.visitors.byPurpose).length === 0 && (
                    <p className="text-xs text-[#77798A] col-span-2">
                      No visits recorded in this time window.
                    </p>
                  )}
                </div>

                <div className="p-3 bg-[#C9F2DE] border-[1.5px] border-[#20243A] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#20243A]" />
                    <span className="text-xs font-black text-[#20243A]">
                      Domestic Staff Inside: {analytics.domesticHelp.currentlyInside} active
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[#20243A]">
                    Total Registered: {analytics.domesticHelp.totalStaff}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: Parking & Grievance Priority */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Parking Occupancy & Deliveries */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Parking & Gate Deliveries
                  </h2>
                  <span className="text-xs font-bold text-[#77798A]">
                    {analytics.parking.totalSlots} Slots Inventory
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="p-3 bg-white border border-[#20243A] rounded-xl text-center">
                    <div className="text-xl font-black text-[#20243A]">
                      {analytics.parking.occupiedSlots}
                    </div>
                    <div className="text-[11px] font-bold text-[#77798A] uppercase">Occupied</div>
                  </div>
                  <div className="p-3 bg-[#C9F2DE] border border-[#20243A] rounded-xl text-center">
                    <div className="text-xl font-black text-[#20243A]">
                      {analytics.parking.vacantSlots}
                    </div>
                    <div className="text-[11px] font-bold text-[#20243A] uppercase">Available</div>
                  </div>
                  <div className="p-3 bg-[#FAF7A7] border border-[#20243A] rounded-xl text-center">
                    <div className="text-xl font-black text-[#20243A]">
                      {analytics.parking.occupancyPercentage}%
                    </div>
                    <div className="text-[11px] font-bold text-[#20243A] uppercase">Utilized</div>
                  </div>
                </div>

                <div className="border-t border-[#EAE5FA] pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#20243A] flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      Parcels at Gate: {analytics.deliveries.pendingAtGate} Pending Pickup
                    </span>
                    <span className="text-xs font-semibold text-[#77798A]">
                      {analytics.deliveries.collected} Collected
                    </span>
                  </div>
                </div>
              </div>

              {/* Complaints & Grievance Priority Bands */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Complaints by Priority & Urgency
                  </h2>
                  <span className="text-xs font-bold text-[#77798A]">
                    {analytics.complaints.totalComplaints} Grievances
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="p-2.5 bg-red-100 border border-red-500 rounded-xl text-center">
                    <div className="text-lg font-black text-red-900">
                      {analytics.complaints.priorityBreakdown.CRITICAL}
                    </div>
                    <div className="text-[10px] font-black text-red-800 uppercase">Critical</div>
                  </div>
                  <div className="p-2.5 bg-orange-100 border border-orange-400 rounded-xl text-center">
                    <div className="text-lg font-black text-orange-900">
                      {analytics.complaints.priorityBreakdown.HIGH}
                    </div>
                    <div className="text-[10px] font-black text-orange-800 uppercase">High</div>
                  </div>
                  <div className="p-2.5 bg-[#FAF7A7] border border-[#20243A] rounded-xl text-center">
                    <div className="text-lg font-black text-[#20243A]">
                      {analytics.complaints.priorityBreakdown.MEDIUM}
                    </div>
                    <div className="text-[10px] font-black text-[#20243A] uppercase">Medium</div>
                  </div>
                  <div className="p-2.5 bg-[#C9F2DE] border border-[#20243A] rounded-xl text-center">
                    <div className="text-lg font-black text-[#20243A]">
                      {analytics.complaints.priorityBreakdown.LOW}
                    </div>
                    <div className="text-[10px] font-black text-[#20243A] uppercase">Low</div>
                  </div>
                </div>

                {/* Staff Workload */}
                <div className="border-t border-[#EAE5FA] pt-3">
                  <span className="text-xs font-bold text-[#77798A] uppercase tracking-wide block mb-2">
                    Maintenance Staff Workload
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {analytics.complaints.staffWorkload.map((sw) => (
                      <div
                        key={sw.staffName}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#EAE5FA] border border-[#20243A]"
                      >
                        <span className="font-bold text-[#20243A]">{sw.staffName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-orange-800 font-bold">
                            {sw.activeTasks} active
                          </span>
                          <span className="text-[#77798A]">|</span>
                          <span className="text-green-800 font-bold">
                            {sw.completedTasks} done
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Accounting & Cash Movement */}
            <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Financial Accounting & Operating Cash Movement
                </h2>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-[#C9F36B] border border-[#20243A]">
                  Net Operating Surplus: {BillingService.formatPaiseToInr(analytics.finances.netCashFlowPaise)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-[#EAE5FA] border border-[#20243A] rounded-xl">
                  <div className="text-xs font-bold text-[#77798A]">Total Billed</div>
                  <div className="text-xl font-black text-[#20243A] mt-1">
                    {BillingService.formatPaiseToInr(analytics.finances.totalBilledPaise)}
                  </div>
                </div>
                <div className="p-4 bg-[#C9F2DE] border border-[#20243A] rounded-xl">
                  <div className="text-xs font-bold text-[#20243A]">Total Collections Realised</div>
                  <div className="text-xl font-black text-[#20243A] mt-1">
                    {BillingService.formatPaiseToInr(analytics.finances.totalCollectedPaise)}
                  </div>
                </div>
                <div className="p-4 bg-red-50 border border-red-500 rounded-xl">
                  <div className="text-xs font-bold text-red-800">Outstanding Resident Dues</div>
                  <div className="text-xl font-black text-red-900 mt-1">
                    {BillingService.formatPaiseToInr(analytics.finances.outstandingDuesPaise)}
                  </div>
                </div>
                <div className="p-4 bg-[#FAF7A7] border border-[#20243A] rounded-xl">
                  <div className="text-xs font-bold text-[#20243A]">Operating Expenses Paid</div>
                  <div className="text-xl font-black text-[#20243A] mt-1">
                    {BillingService.formatPaiseToInr(analytics.finances.paidExpensesPaise)}
                  </div>
                </div>
              </div>

              {/* Expense Category Breakdown */}
              <div>
                <span className="text-xs font-bold text-[#77798A] uppercase tracking-wide block mb-3">
                  Expense Distribution by Category
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(analytics.finances.expenseByCategory).map(([cat, amtPaise]) => (
                    <div
                      key={cat}
                      className="p-3 bg-white border border-[#20243A] rounded-xl shadow-[2px_2px_0px_#20243A]"
                    >
                      <div className="text-xs font-bold text-[#77798A] truncate">{cat}</div>
                      <div className="text-sm font-black text-[#20243A] mt-1">
                        {BillingService.formatPaiseToInr(amtPaise)}
                      </div>
                    </div>
                  ))}
                  {Object.keys(analytics.finances.expenseByCategory).length === 0 && (
                    <p className="text-xs text-[#77798A] col-span-5">No expenses recorded in this period.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Amenity Statistics */}
            <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Amenity Bookings & Facility Utilization
                </h2>
                <span className="text-xs font-bold text-[#77798A]">
                  Clubhouse, Badminton, Pool & Terrace
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-[#EAE5FA] border border-[#20243A] rounded-xl text-center">
                  <div className="text-2xl font-black text-[#20243A]">
                    {analytics.amenities.totalBookings}
                  </div>
                  <div className="text-xs font-bold text-[#77798A] mt-1">Total Reservations</div>
                </div>
                <div className="p-4 bg-[#C9F2DE] border border-[#20243A] rounded-xl text-center">
                  <div className="text-2xl font-black text-[#20243A]">
                    {analytics.amenities.activeBookings}
                  </div>
                  <div className="text-xs font-bold text-[#20243A] mt-1">Confirmed / Active</div>
                </div>
                <div className="p-4 bg-[#FAF7A7] border border-[#20243A] rounded-xl text-center">
                  <div className="text-2xl font-black text-[#20243A]">
                    {analytics.amenities.cancellationRate}%
                  </div>
                  <div className="text-xs font-bold text-[#20243A] mt-1">Cancellation Rate</div>
                </div>
                <div className="p-4 bg-white border border-[#20243A] rounded-xl text-center shadow-[2px_2px_0px_#20243A]">
                  <div className="text-2xl font-black text-[#20243A]">
                    {BillingService.formatPaiseToInr(analytics.amenities.totalRevenuePaise)}
                  </div>
                  <div className="text-xs font-bold text-[#77798A] mt-1">Amenity Revenue</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
