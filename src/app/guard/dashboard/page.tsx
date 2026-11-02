'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  UserPlus,
  Package,
  Car,
  Users,
  LogOut,
  Phone,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

interface ActiveVisitor {
  id: string;
  name: string;
  mobile: string;
  flat: string;
  purpose: string;
  entryTime: string;
  otpVerified: boolean;
  intercomApproved: boolean;
}

export default function GuardDashboard() {
  const [visitors, setVisitors] = useState<ActiveVisitor[]>([
    {
      id: 'v-001',
      name: 'Ramesh Verma',
      mobile: '+91 98765 43210',
      flat: 'A-402 (Jonathan Patel)',
      purpose: 'Guest / Personal',
      entryTime: '01:15 pm',
      otpVerified: true,
      intercomApproved: true,
    },
    {
      id: 'v-002',
      name: 'Suresh Kumar',
      mobile: '+91 98222 33445',
      flat: 'B-201 (Sunita Rao)',
      purpose: 'Courier Delivery (Swiggy)',
      entryTime: '01:45 pm',
      otpVerified: true,
      intercomApproved: true,
    },
    {
      id: 'v-003',
      name: 'Dr. Anita Joshi',
      mobile: '+91 98111 22334',
      flat: 'C-304 (Dr. Joshi)',
      purpose: 'Doctor Home Visit',
      entryTime: '02:00 pm',
      otpVerified: true,
      intercomApproved: true,
    },
  ]);

  function handleCheckOut(id: string) {
    setVisitors((prev) => prev.filter((v) => v.id !== id));
  }

  return (
    <AppShell
      userName="Santosh Yadav"
      userRoleTitle="Security Guard • Gate 1 Main Access"
      activeRole="GUARD"
    >
      {/* 1. LARGE HIGH-CONTRAST ACTION BUTTONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/guard/visitors" className="w-full">
          <Button
            variant="lime"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-black shadow-[3px_3px_0px_#303044]"
          >
            <UserPlus className="w-5 h-5" />
            <span>Register Visitor (OTP)</span>
          </Button>
        </Link>

        <Link href="/guard/deliveries" className="w-full">
          <Button
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-black bg-[#FAF7A7]"
          >
            <Package className="w-5 h-5 text-[#20243A]" />
            <span>Record Courier / Delivery</span>
          </Button>
        </Link>

        <Link href="/guard/staff" className="w-full">
          <Button
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-black bg-[#C9F2DE]"
          >
            <Users className="w-5 h-5 text-[#136338]" />
            <span>Staff Attendance Log</span>
          </Button>
        </Link>

        <Link href="/guard/parking" className="w-full">
          <Button
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2 py-4 text-sm font-black bg-[#E6DEFC]"
          >
            <Car className="w-5 h-5 text-[#4A329A]" />
            <span>Visitor Parking (P1-P5)</span>
          </Button>
        </Link>
      </div>

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Inside Society"
          value={visitors.length}
          subtitle="Visitors Currently Inside"
          variant="yellow"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Courier Held"
          value="4"
          subtitle="Packages Awaiting Pickup"
          variant="peach"
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          title="Staff Present"
          value="8"
          subtitle="Domestic Workers Inside"
          variant="mint"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <StatCard
          title="Parking Slots"
          value="3 / 5"
          subtitle="P2, P4, P5 Available"
          variant="blue"
          icon={<Car className="w-5 h-5" />}
        />
      </div>

      {/* 3. CURRENTLY INSIDE VISITORS TABLE */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#20243A]">
              Currently Inside Society ({visitors.length})
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Real-time gate access log • Independent OTP & Godrej intercom verification
            </p>
          </div>
          <Badge variant="green">{visitors.length} Active Badges</Badge>
        </div>

        {visitors.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
            No active visitors inside society right now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Visitor Name</th>
                  <th className="py-3 px-3">Destination Flat</th>
                  <th className="py-3 px-3">Purpose</th>
                  <th className="py-3 px-3">Entry Time</th>
                  <th className="py-3 px-3">Security Checks</th>
                  <th className="py-3 px-3 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                {visitors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <div className="font-extrabold">{v.name}</div>
                      <div className="text-[10px] text-[#77798A] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {v.mobile}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[#20243A] bg-[#FAF7A7] px-2 py-0.5 rounded border border-[#303044]/20">
                        {v.flat}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#77798A]">{v.purpose}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 text-[#77798A]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{v.entryTime}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> OTP Verified
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Intercom Approved
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCheckOut(v.id)}
                        className="gap-1 border-[#303044] hover:bg-rose-100 hover:text-rose-900"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check Out</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
