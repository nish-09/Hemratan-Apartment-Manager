'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  IndianRupee,
  ClipboardList,
  Home,
  Receipt,
  Plus,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export default function CommitteeDashboard() {
  const [complaints] = useState([
    {
      id: 'CMP-202',
      title: 'Water Seepage in Basement Parking near P2',
      category: 'Plumbing',
      flat: 'Common Area (Wing B)',
      priority: 'CRITICAL',
      score: 88,
      status: 'TRIAGED',
      reportedAt: 'Today, 10:15 am',
    },
    {
      id: 'CMP-198',
      title: 'Lift A-2 Intermittent Jerk on 5th Floor',
      category: 'Lift Malfunction',
      flat: 'Wing A Lift',
      priority: 'HIGH',
      score: 72,
      status: 'ASSIGNED',
      reportedAt: 'Yesterday, 04:30 pm',
    },
    {
      id: 'CMP-195',
      title: 'Gym Treadmill Belt Alignment Issue',
      category: 'Amenities',
      flat: 'Clubhouse',
      priority: 'MEDIUM',
      score: 45,
      status: 'IN_PROGRESS',
      reportedAt: '28 Apr, 11:00 am',
    },
  ]);

  return (
    <AppShell
      userName="Rosa Palmour"
      userRoleTitle="Managing Committee • Operations & Billing"
      activeRole="COMMITTEE"
    >
      {/* 1. COMMITTEE QUICK ACTIONS */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF9FF] p-3 rounded-2xl border border-[#303044]/20">
        <div className="flex items-center gap-2">
          <Badge variant="lavender">Committee Cockpit</Badge>
          <span className="text-xs font-bold text-[#77798A]">FY 2026-27 • Operations Ledger</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/billing">
            <Button variant="lime" size="sm" className="gap-1.5 font-bold">
              <FileText className="w-3.5 h-3.5" />
              <span>Generate Monthly Bills</span>
            </Button>
          </Link>
          <Link href="/admin/expenses">
            <Button variant="outline" size="sm" className="gap-1.5 font-bold">
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Maintenance"
          value="₹2,46,428"
          subtitle="88% Collected for April"
          variant="yellow"
          icon={<IndianRupee className="w-5 h-5" />}
        />
        <StatCard
          title="Open Complaints"
          value="5"
          subtitle="1 Critical • 2 High Priority"
          variant="peach"
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatCard
          title="Occupied Flats"
          value="36 / 100"
          subtitle="36% Society Occupancy"
          variant="mint"
          icon={<Home className="w-5 h-5" />}
        />
        <StatCard
          title="Monthly Expenses"
          value="₹68,450"
          subtitle="12 Vouchers Recorded"
          variant="blue"
          icon={<Receipt className="w-5 h-5" />}
        />
      </div>

      {/* 3. COMPLAINTS TRIAGE & PRIORITY OVERRIDES */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#20243A]">
              Complaints Requiring Committee Action
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Deterministic Priority Scoring • Safety Overrides & Vendor Task Assignment
            </p>
          </div>
          <Link href="/admin/complaints">
            <Button variant="secondary" size="sm" className="gap-1 text-xs">
              <span>View All Complaints</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Complaint Details</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Location / Flat</th>
                <th className="py-3 px-3">Priority Score</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Triage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
              {complaints.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3">
                    <div className="font-extrabold">{c.title}</div>
                    <div className="text-[10px] text-[#77798A] mt-0.5">
                      {c.id} • Reported {c.reportedAt}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-[#77798A]">{c.category}</span>
                  </td>
                  <td className="py-3 px-3">{c.flat}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={c.priority === 'CRITICAL' ? 'peach' : c.priority === 'HIGH' ? 'yellow' : 'neutral'}>
                        {c.priority} ({c.score})
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-[11px] font-bold text-[#20243A] bg-slate-100 px-2 py-0.5 rounded border border-[#303044]/20">
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" className="text-xs py-1">
                        Assign Staff
                      </Button>
                      <Button variant="lime" size="sm" className="text-xs py-1">
                        Resolve
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SOCIETY WINGS BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {['Wing A', 'Wing B', 'Wing C', 'Wing D'].map((w, idx) => (
          <div
            key={w}
            className="p-4 rounded-2xl border-[1.5px] border-[#303044] bg-white shadow-[2px_2px_0px_rgba(48,48,68,0.12)]"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-sm text-[#20243A]">{w}</span>
              <span className="text-xs font-bold text-[#77798A]">7 Floors • 28 Flats</span>
            </div>
            <div className="text-2xl font-black text-[#20243A]">{idx === 0 ? '14' : idx === 1 ? '10' : '6'} Occupied</div>
            <div className="w-full bg-slate-100 h-2 rounded-full border border-[#303044]/20 mt-2 overflow-hidden">
              <div
                className="bg-[#C9F36B] h-full"
                style={{ width: `${idx === 0 ? '50%' : idx === 1 ? '35%' : '21%'}` }}
              />
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
