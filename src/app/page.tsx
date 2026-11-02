import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { IndianRupee, ShieldCheck, Users, Receipt, ArrowUpRight, ArrowDownRight, BellRing } from 'lucide-react';

export default function HomePage() {
  return (
    <AppShell
      userName="Jonathan Patel"
      userRoleTitle="Resident • Flat A-402"
      activeRole="RESIDENT"
    >
      {/* 1. TOP 4 PASTEL STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Bank balance"
          value="₹2,46,428"
          subtitle="Society Maintenance Reserve"
          variant="yellow"
          icon={<IndianRupee className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Monthly savings"
          value="₹4,124"
          subtitle="Your Advance Fund Credit"
          variant="blue"
          icon={<Receipt className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Staff on duty"
          value="8"
          subtitle="Verified Staff Working Today"
          variant="mint"
          icon={<Users className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Current bill"
          value="₹2,186.28"
          subtitle="April Maintenance Dues"
          variant="lavender"
          icon={<ShieldCheck className="w-5 h-5 text-[#20243A]" />}
        />
      </div>

      {/* 2. MIDDLE SECTION: STAT WIDGETS + TREND CHART */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Sub-column: 2 Compact Metric Cards */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 bg-white shadow-[2px_2px_0px_rgba(48,48,68,0.12)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#77798A] uppercase tracking-wider">
                Occupied Flats
              </div>
              <div className="text-3xl font-extrabold text-[#20243A] mt-1">36</div>
            </div>
            <div className="flex items-center gap-1 bg-[#C9F2DE] border border-[#303044]/30 text-[#136338] text-xs font-extrabold px-2.5 py-1 rounded-full">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+12.4%</span>
            </div>
          </div>

          <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 bg-white shadow-[2px_2px_0px_rgba(48,48,68,0.12)] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#77798A] uppercase tracking-wider">
                Pending Requests
              </div>
              <div className="text-3xl font-extrabold text-[#20243A] mt-1">8</div>
            </div>
            <div className="flex items-center gap-1 bg-[#FCE1D8] border border-[#303044]/30 text-[#9A2D1F] text-xs font-extrabold px-2.5 py-1 rounded-full">
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>-4.8%</span>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="rounded-2xl border-[1.5px] border-[#303044] p-4 bg-[#FAF7A7] shadow-[2px_2px_0px_rgba(48,48,68,0.12)] flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-[#303044] flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 text-[#20243A]" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#20243A]">Water Tank Cleaning Notice</div>
              <p className="text-[11px] text-[#77798A] mt-0.5 font-medium leading-relaxed">
                Overhead tank maintenance scheduled for Sunday, 10:00 AM to 02:00 PM.
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right Sub-column: Activity & Collection Trend Chart */}
        <div className="lg:col-span-8 rounded-2xl border-[1.5px] border-[#303044] p-6 bg-white shadow-[2px_2px_0px_rgba(48,48,68,0.12)] flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#20243A]">
                Maintenance Collection Trend
              </h2>
              <span className="text-xs font-medium text-[#77798A]">
                Last 7 days VS prior week
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#77798A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#BCA9F2] inline-block border border-[#303044]" />
                This Week
              </span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#77798A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C9F36B] inline-block border border-[#303044]" />
                Prior Week
              </span>
            </div>
          </div>

          {/* Neo-Brutalist SVG Multi-line Chart matching visual reference */}
          <div className="relative w-full h-44 sm:h-52 flex items-end">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 600 200"
              preserveAspectRatio="none"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Horizontal faint grid lines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="#303044" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="#303044" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="#303044" strokeOpacity="0.08" strokeDasharray="3 3" />
              <line x1="0" y1="190" x2="600" y2="190" stroke="#303044" strokeOpacity="0.15" />

              {/* Green Line (Prior week) */}
              <path
                d="M 10 120 C 60 110, 80 145, 120 135 C 160 125, 180 170, 230 160 C 270 150, 310 100, 360 115 C 410 130, 440 160, 490 125 C 530 100, 560 130, 590 120"
                stroke="#6BCB77"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Purple Line (This week) */}
              <path
                d="M 10 90 C 50 75, 80 110, 120 95 C 170 80, 200 130, 250 115 C 290 105, 300 65, 340 70 C 390 75, 410 45, 450 60 C 490 75, 520 120, 560 90 C 580 80, 590 85, 595 82"
                stroke="#BCA9F2"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Highlight Pin Indicator at Peak */}
              <circle cx="340" cy="70" r="5" fill="#BCA9F2" stroke="#303044" strokeWidth="2" />
            </svg>

            {/* Floating Value Pill */}
            <div className="absolute left-[54%] top-[22%] -translate-x-1/2 -translate-y-full">
              <span className="bg-[#BCA9F2] text-[#20243A] font-extrabold text-[11px] px-2 py-0.5 rounded-full border border-[#303044] shadow-[1px_1px_0px_#303044]">
                ₹16k
              </span>
            </div>
          </div>

          {/* Chart X-axis Labels */}
          <div className="flex justify-between text-[11px] font-bold text-[#77798A] mt-2 pt-2 border-t border-[#303044]/10">
            <span>Apr 20</span>
            <span>Apr 21</span>
            <span>Apr 22</span>
            <span>Apr 23</span>
            <span>Apr 24</span>
            <span>Apr 25</span>
            <span>Apr 26</span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM SECTION: RECENT MESSAGES & NOTICES */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 sm:p-6 bg-white shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-extrabold text-[#20243A]">New Messages & Notices</h2>
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center">
            3
          </span>
        </div>

        <div className="divide-y divide-[#303044]/10">
          {/* Message Row 1 */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 rounded-xl px-2 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#303044] bg-[#FAF7A7] flex items-center justify-center font-bold text-xs text-[#20243A] shrink-0">
                RP
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#20243A]">Rosa Palmour (Committee)</div>
                <div className="text-xs text-[#77798A] font-medium line-clamp-1">
                  AGM agenda and audited financial statements for FY 2025-26 are now available.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:self-center self-end">
              <Badge variant="lavender">Committee</Badge>
              <span className="text-xs font-semibold text-[#77798A]">2:34 pm</span>
            </div>
          </div>

          {/* Message Row 2 */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 rounded-xl px-2 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#303044] bg-[#C9F2DE] flex items-center justify-center font-bold text-xs text-[#20243A] shrink-0">
                SG
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#20243A]">Security Gate (Gate 1)</div>
                <div className="text-xs text-[#77798A] font-medium line-clamp-1">
                  Visitor courier package from Amazon received and held at Gate 1 security desk.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:self-center self-end">
              <Badge variant="green">Security</Badge>
              <span className="text-xs font-semibold text-[#77798A]">1:15 pm</span>
            </div>
          </div>

          {/* Message Row 3 */}
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/80 rounded-xl px-2 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#303044] bg-[#E6DEFC] flex items-center justify-center font-bold text-xs text-[#20243A] shrink-0">
                MD
              </div>
              <div>
                <div className="font-extrabold text-sm text-[#20243A]">Maintenance Desk</div>
                <div className="text-xs text-[#77798A] font-medium line-clamp-1">
                  Plumbing repair complaint #PL-104 status updated to Resolved. Please verify and rate.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:self-center self-end">
              <Badge variant="peach">Maintenance</Badge>
              <span className="text-xs font-semibold text-[#77798A]">11:20 am</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
