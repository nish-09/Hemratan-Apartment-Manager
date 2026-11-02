'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Building,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  ShieldCheck,
  ClipboardList,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { ReportCategory, ReportType, ReportResult } from '@/services/reports.service';

interface ReportOption {
  type: ReportType;
  title: string;
  category: ReportCategory;
  description: string;
}

const REPORT_CATALOGUE: Record<ReportCategory, ReportOption[]> = {
  RESIDENTS_AND_SOCIETY: [
    {
      type: 'RESIDENT_DIRECTORY',
      title: 'Resident Directory Report',
      category: 'RESIDENTS_AND_SOCIETY',
      description: 'Directory of flats, occupants, membership categories, and intercom lines.',
    },
    {
      type: 'FLAT_OCCUPANCY',
      title: 'Flat Occupancy Report',
      category: 'RESIDENTS_AND_SOCIETY',
      description: 'Unit-by-unit inventory, carpet area (sq ft), and occupancy status.',
    },
    {
      type: 'WING_RESIDENTS',
      title: 'Building & Wing-Wise Resident Report',
      category: 'RESIDENTS_AND_SOCIETY',
      description: 'Aggregated resident population and unit occupancy distributed across Wings A, B, C, D.',
    },
  ],
  SECURITY_AND_OPERATIONS: [
    {
      type: 'VISITOR_LOG',
      title: 'Visitor Entry/Exit Register',
      category: 'SECURITY_AND_OPERATIONS',
      description: 'Gate log of visitor OTP check-ins, intercom clearances, and exit timestamps.',
    },
    {
      type: 'DOMESTIC_HELP_ATTENDANCE',
      title: 'Domestic Help Attendance Report',
      category: 'SECURITY_AND_OPERATIONS',
      description: 'Daily check-in and check-out ledger for maids, cooks, drivers, and cleaning staff.',
    },
    {
      type: 'PARKING_ALLOCATIONS',
      title: 'Parking Allocation Report',
      category: 'SECURITY_AND_OPERATIONS',
      description: 'Society parking slot allocations, vehicle numbers, and visitor parking occupancy.',
    },
    {
      type: 'DELIVERY_REGISTER',
      title: 'Delivery & Parcel Register',
      category: 'SECURITY_AND_OPERATIONS',
      description: 'Log of parcels received at the gate, courier partners, and resident collections.',
    },
  ],
  COMPLAINTS: [
    {
      type: 'COMPLAINT_REGISTER',
      title: 'Complaint Master Register',
      category: 'COMPLAINTS',
      description: 'Comprehensive grievance log with privacy-protected anonymous tickets.',
    },
    {
      type: 'PRIORITY_COMPLAINTS',
      title: 'Priority-Wise Complaints Report',
      category: 'COMPLAINTS',
      description: 'Emergency safety overrides, critical triage issues, and turnaround SLAs.',
    },
    {
      type: 'RESOLUTION_TIME',
      title: 'Resolution Time & SLA Report',
      category: 'COMPLAINTS',
      description: 'Average resolution velocity and SLA compliance benchmarks across grievance types.',
    },
    {
      type: 'STAFF_PERFORMANCE',
      title: 'Staff Task Performance Report',
      category: 'COMPLAINTS',
      description: 'Technician task assignments, completion ratios, and active operational workloads.',
    },
  ],
  FINANCIAL: [
    {
      type: 'MAINTENANCE_BILLING',
      title: 'Maintenance Billing Register',
      category: 'FINANCIAL',
      description: 'Unit charges, sinking fund, repair fund, late fees, and invoice balances.',
    },
    {
      type: 'PAYMENT_COLLECTIONS',
      title: 'Payment Collection Report',
      category: 'FINANCIAL',
      description: 'Online UPI/gateway settlements and offline cheque/NEFT verified receipts.',
    },
    {
      type: 'OUTSTANDING_DUES',
      title: 'Outstanding Maintenance Dues Report',
      category: 'FINANCIAL',
      description: 'Flats with pending balances, aging days overdue, and default notices.',
    },
    {
      type: 'EXPENSE_REGISTER',
      title: 'Society Expense Register',
      category: 'FINANCIAL',
      description: 'Operational vouchers, committee dual-approval audit trail, and disbursements.',
    },
    {
      type: 'INCOME_EXPENDITURE',
      title: 'Income vs Expenditure Statement',
      category: 'FINANCIAL',
      description: 'Statement of total realized collections versus operating expenses and net cash balance.',
    },
  ],
  AMENITIES: [
    {
      type: 'AMENITY_BOOKINGS',
      title: 'Amenity Booking Register',
      category: 'AMENITIES',
      description: 'Reservations, schedule time slots, and fees for clubhouse, banquet, and courts.',
    },
    {
      type: 'AMENITY_USAGE',
      title: 'Amenity Usage Trends Report',
      category: 'AMENITIES',
      description: 'Demand analysis, capacity utilization, and fee collection across society amenities.',
    },
    {
      type: 'BOOKING_CANCELLATIONS',
      title: 'Booking Cancellation Report',
      category: 'AMENITIES',
      description: 'Audit of cancelled reservations, release reasons, and schedule availability turnover.',
    },
  ],
};

const CATEGORIES: Array<{ id: ReportCategory; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'RESIDENTS_AND_SOCIETY', label: 'Residents & Society', icon: Users },
  { id: 'SECURITY_AND_OPERATIONS', label: 'Security & Operations', icon: ShieldCheck },
  { id: 'COMPLAINTS', label: 'Complaints', icon: ClipboardList },
  { id: 'FINANCIAL', label: 'Financial Accounting', icon: Wallet },
  { id: 'AMENITIES', label: 'Amenities', icon: Sparkles },
];

export default function ReportsCentrePage() {
  const [activeCategory, setActiveCategory] = useState<ReportCategory>('FINANCIAL');
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('MAINTENANCE_BILLING');
  const [selectedWing, setSelectedWing] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch report when report type, wing, or date range changes
  useEffect(() => {
    let ignore = false;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        let url = `/api/reports?type=${selectedReportType}`;
        if (selectedWing) url += `&wing=${selectedWing}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to fetch report');
        }
        const data = await res.json();
        if (!ignore) {
          setReportResult(data.report);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error generating report');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      ignore = true;
    };
  }, [selectedReportType, selectedWing, startDate, endDate]);

  function handleCategoryChange(cat: ReportCategory) {
    setActiveCategory(cat);
    const firstInCat = REPORT_CATALOGUE[cat][0]?.type;
    if (firstInCat) {
      setSelectedReportType(firstInCat);
    }
  }

  function handleExportCsv() {
    let url = `/api/reports/export?type=${selectedReportType}`;
    if (selectedWing) url += `&wing=${selectedWing}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    window.location.href = url;
  }

  function handlePrint() {
    window.print();
  }

  return (
    <AppShell
      activeRole="COMMITTEE"
      userName="Rosa Palmour"
      userRoleTitle="Managing Committee (Treasurer)"
    >
      <div className="flex-1 overflow-y-auto bg-[#EAE5FA] p-4 lg:p-8 space-y-6 print:p-0 print:bg-white">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A] print:hidden">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-[#C9F36B] border border-[#20243A] text-[#20243A]">
                Official Records
              </span>
              <span className="text-xs text-[#77798A] font-medium">
                Society Governance Registry
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-[#20243A] tracking-tight">
              Reports Centre
            </h1>
            <p className="text-sm text-[#77798A] font-medium mt-1">
              Official audit registers, financial balance sheets, gate logs, and resident occupancy reports.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#C9F36B] border-[1.5px] border-[#20243A] rounded-xl font-bold text-xs text-[#20243A] shadow-[2px_2px_0px_#20243A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <Download className="w-4 h-4 text-[#20243A]" />
              Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-[1.5px] border-[#20243A] rounded-xl font-bold text-xs text-[#20243A] shadow-[2px_2px_0px_#20243A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <Printer className="w-4 h-4 text-[#20243A]" />
              Print Report
            </button>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none print:hidden">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border-[1.5px] whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#20243A] border-[#20243A] text-white shadow-[2px_2px_0px_#C9F36B]'
                    : 'bg-white border-[#20243A] text-[#20243A] hover:bg-[#EAE5FA]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#C9F36B]' : 'text-[#20243A]'}`} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Report Sub-Type Pills & Filters */}
        <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[2px_2px_0px_#20243A] space-y-4 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black text-[#20243A] uppercase tracking-wider mr-2">
              Select Report:
            </span>
            {REPORT_CATALOGUE[activeCategory].map((rep) => (
              <button
                key={rep.type}
                onClick={() => setSelectedReportType(rep.type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  selectedReportType === rep.type
                    ? 'bg-[#C9F36B] border-[#20243A] text-[#20243A] shadow-[2px_2px_0px_#20243A]'
                    : 'bg-[#EAE5FA] border-[#20243A]/30 text-[#20243A] hover:border-[#20243A]'
                }`}
              >
                {rep.title}
              </button>
            ))}
          </div>

          {/* Secondary Filter Row: Wing & Dates */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#EAE5FA]">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#20243A]">
                <Building className="w-3.5 h-3.5" />
                Wing Filter:
                <select
                  value={selectedWing}
                  onChange={(e) => setSelectedWing(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold border-[1.5px] border-[#20243A] rounded-lg bg-white"
                >
                  <option value="">All Wings</option>
                  <option value="A">Wing A</option>
                  <option value="B">Wing B</option>
                  <option value="C">Wing C</option>
                  <option value="D">Wing D</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-[#20243A]">
                <Calendar className="w-3.5 h-3.5" />
                From:
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2 py-0.5 text-xs border-[1.5px] border-[#20243A] rounded-lg bg-white"
                />
                To:
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2 py-0.5 text-xs border-[1.5px] border-[#20243A] rounded-lg bg-white"
                />
              </div>
            </div>

            {reportResult && (
              <span className="text-xs font-bold text-[#77798A]">
                Total Records: <strong className="text-[#20243A]">{reportResult.metadata.totalRows}</strong>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-[1.5px] border-red-500 rounded-xl text-red-800 text-sm font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="p-12 text-center bg-white border-[1.5px] border-[#20243A] rounded-2xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#20243A] mb-2" />
            <p className="text-xs font-bold text-[#20243A]">Compiling official registry records...</p>
          </div>
        )}

        {/* Report Preview Surface */}
        {reportResult && !loading && (
          <div className="bg-white border-[1.5px] border-[#20243A] rounded-2xl shadow-[3px_3px_0px_#20243A] overflow-hidden">
            {/* Report Document Title Banner */}
            <div className="p-6 bg-white border-b-[1.5px] border-[#20243A] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#77798A] block">
                  {reportResult.metadata.category.replace(/_/g, ' ')}
                </span>
                <h2 className="text-xl font-black text-[#20243A] mt-0.5">
                  {reportResult.metadata.title}
                </h2>
                <p className="text-xs text-[#77798A] mt-1">
                  {reportResult.metadata.description}
                </p>
              </div>

              {/* Summary KPIs */}
              {reportResult.metadata.summary && (
                <div className="flex items-center gap-3 flex-wrap">
                  {Object.entries(reportResult.metadata.summary).map(([key, val]) => (
                    <div
                      key={key}
                      className="px-3.5 py-2 bg-[#EAE5FA] border border-[#20243A] rounded-xl text-center"
                    >
                      <div className="text-[10px] font-bold text-[#77798A] uppercase">{key}</div>
                      <div className="text-sm font-black text-[#20243A]">{val}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAF7A7] border-b-[1.5px] border-[#20243A]">
                    {reportResult.metadata.columns.map((col) => (
                      <th
                        key={col.key}
                        className={`p-3 font-black text-[#20243A] uppercase tracking-wider ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE5FA]">
                  {reportResult.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-[#EAE5FA]/50 transition-colors"
                    >
                      {reportResult.metadata.columns.map((col) => (
                        <td
                          key={col.key}
                          className={`p-3 text-[#20243A] font-medium ${
                            col.align === 'right'
                              ? 'text-right font-bold'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          }`}
                        >
                          {String(row[col.key] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {reportResult.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={reportResult.metadata.columns.length}
                        className="p-8 text-center text-[#77798A] font-semibold"
                      >
                        No records found matching the specified criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Report Footer */}
            <div className="p-4 bg-[#EAE5FA] border-t-[1.5px] border-[#20243A] flex items-center justify-between text-[11px] text-[#77798A]">
              <span>
                Generated: {new Date(reportResult.metadata.generatedAt).toLocaleString('en-IN')}
              </span>
              <span className="font-bold text-[#20243A]">
                Hemratan Cooperative Housing Society • Confidential Audit Record
              </span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
