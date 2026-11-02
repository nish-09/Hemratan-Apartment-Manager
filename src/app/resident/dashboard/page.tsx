import React from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  IndianRupee,
  ShieldCheck,
  Users,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  BellRing,
  Plus,
  Calendar,
  Package,
  Car,
  ClipboardList,
  Sparkles,
  CheckCircle2,
  Clock,
  Wallet,
  Building,
} from 'lucide-react';
import Link from 'next/link';
import { BillingService } from '@/services/billing.service';
import { VisitorService } from '@/services/visitor.service';
import { DirectoryService } from '@/services/directory.service';
import { AmenityService } from '@/services/amenity.service';
import { AnnouncementService } from '@/services/announcement.service';

export default function ResidentDashboard() {
  const residentFlatId = 'flat-a-402';
  const residentFlatNo = 'A-402';

  // 1. Scoped Financials for Flat A-402
  const invoices = BillingService.listInvoices({ flatId: residentFlatId });
  const currentInvoice = invoices[0] || {
    invoiceNumber: 'INV-202611-A402',
    billingPeriodName: 'November 2026',
    totalAmountPaise: 290000,
    balanceAmountPaise: 290000,
    dueDate: '2026-11-15',
    status: 'ISSUED',
  };
  const payments = BillingService.listPayments({ flatId: residentFlatId });

  // 2. Scoped Visitors for Flat A-402
  const flatVisits = VisitorService.getVisits({ flatId: residentFlatId }).slice(0, 3);

  // 3. Scoped Domestic Staff for Flat A-402
  const { workers, recentAttendance } = DirectoryService.getDomesticStaffForResident(residentFlatId);

  // 4. Scoped Amenity Bookings for Flat A-402
  const flatBookings = AmenityService.getBookings({ flatId: residentFlatId }).slice(0, 3);

  // 5. Society Circulars & Announcements
  const announcements = AnnouncementService.getAnnouncements().slice(0, 3);

  return (
    <AppShell
      userName="Jonathan Patel"
      userRoleTitle="Resident • Flat A-402"
      activeRole="RESIDENT"
    >
      <div className="space-y-6">
        {/* Quick Action Pill Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF9FF] p-3 rounded-2xl border border-[#303044]/20 shadow-[2px_2px_0px_#303044]">
          <div className="flex items-center gap-2">
            <Badge variant="green">Verified Resident</Badge>
            <span className="text-xs font-bold text-[#77798A]">
              Wing A • 4th Floor • 1,450 sq.ft • Intercom #1402
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/resident/billing">
              <Button variant="outline" size="sm" className="gap-1.5 bg-[#FAF7A7] font-bold">
                <Wallet className="w-3.5 h-3.5 text-[#20243A]" />
                <span>Pay Maintenance</span>
              </Button>
            </Link>
            <Link href="/resident/deliveries">
              <Button variant="outline" size="sm" className="gap-1.5 font-bold">
                <Package className="w-3.5 h-3.5 text-[#20243A]" />
                <span>Deliveries &amp; Parking</span>
              </Button>
            </Link>
            <Link href="/resident/visitors">
              <Button variant="outline" size="sm" className="gap-1.5 font-bold">
                <Plus className="w-3.5 h-3.5" />
                <span>Pre-Approve Visitor</span>
              </Button>
            </Link>
            <Link href="/resident/complaints">
              <Button variant="lime" size="sm" className="gap-1.5 font-bold">
                <Plus className="w-3.5 h-3.5" />
                <span>Raise Complaint</span>
              </Button>
            </Link>
          </div>
        </div>

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
            title="Current Maintenance Bill"
            value={BillingService.formatPaiseToInr(currentInvoice.totalAmountPaise)}
            subtitle={`Current Maintenance Bill (${currentInvoice.billingPeriodName})`}
            variant="lavender"
            icon={<Receipt className="w-5 h-5 text-[#20243A]" />}
          />
          <StatCard
            title="Outstanding Balance"
            value={BillingService.formatPaiseToInr(currentInvoice.balanceAmountPaise)}
            subtitle={`Outstanding Balance: ${currentInvoice.balanceAmountPaise > 0 ? 'Pending Payment' : 'All Clear'}`}
            variant="blue"
            icon={<Wallet className="w-5 h-5 text-[#20243A]" />}
          />
          <StatCard
            title="Domestic Staff"
            value={workers.length.toString()}
            subtitle={`${workers.filter((w) => w.isCurrentlyInside).length} Currently Inside Society`}
            variant="mint"
            icon={<Users className="w-5 h-5 text-[#20243A]" />}
          />
        </div>

        {/* 2. PERSONAL DASHBOARD INSIGHTS (FLAT SCOPED) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (8 cols): Visitors, Complaints & Amenity Bookings */}
          <div className="lg:col-span-8 space-y-5">
            {/* Recent Gate Visitors */}
            <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 sm:p-6 bg-white shadow-[2px_2px_0px_#303044]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#303044]/10">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#20243A]" />
                  <h2 className="text-base font-black text-[#20243A]">Recent Visitors for Flat {residentFlatNo}</h2>
                </div>
                <Link href="/resident/visitors" className="text-xs font-bold text-[#20243A] hover:underline">
                  View All Log &rarr;
                </Link>
              </div>

              <div className="divide-y divide-[#303044]/10">
                {flatVisits.map((v) => (
                  <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#20243A] text-sm">{v.visitor.fullName}</div>
                      <div className="text-[#77798A] mt-0.5">
                        {v.purpose} • {v.visitor.mobileNumber}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] border border-[#20243A] ${
                          v.status === 'INSIDE'
                            ? 'bg-[#C9F36B] text-[#20243A]'
                            : v.status === 'COMPLETED'
                            ? 'bg-[#C9F2DE] text-[#20243A]'
                            : 'bg-[#FAF7A7] text-[#20243A]'
                        }`}
                      >
                        {v.status}
                      </span>
                      <div className="text-[10px] text-[#77798A]">
                        {v.entryTime ? new Date(v.entryTime).toLocaleTimeString('en-IN') : 'Expected'}
                      </div>
                    </div>
                  </div>
                ))}
                {flatVisits.length === 0 && (
                  <p className="text-xs text-[#77798A] py-3">No recent visitors logged for your unit.</p>
                )}
              </div>
            </div>

            {/* Active Amenity Reservations */}
            <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 sm:p-6 bg-white shadow-[2px_2px_0px_#303044]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#303044]/10">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#20243A]" />
                  <h2 className="text-base font-black text-[#20243A]">My Facility Bookings</h2>
                </div>
                <span className="text-xs font-bold text-[#77798A]">Flat {residentFlatNo}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {flatBookings.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-[#EAE5FA] border-[1.5px] border-[#303044] rounded-xl shadow-[1px_1px_0px_#303044] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-[#20243A] font-black">{b.amenityName}</strong>
                      <span className="px-2 py-0.5 rounded-full bg-[#C9F36B] border border-[#20243A] font-black text-[10px]">
                        {b.status}
                      </span>
                    </div>
                    <div className="text-[#77798A] font-semibold">
                      Date: {b.bookingDate} • {b.slot}
                    </div>
                    <div className="text-[#20243A] font-bold">
                      Fee: {BillingService.formatPaiseToInr(b.feePaise)}
                    </div>
                  </div>
                ))}
                {flatBookings.length === 0 && (
                  <p className="text-xs text-[#77798A] col-span-2 py-2">
                    No active amenity bookings. You can reserve the Clubhouse, Badminton court, or Pool.
                  </p>
                )}
              </div>
            </div>

            {/* Payment History Log */}
            <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 sm:p-6 bg-white shadow-[2px_2px_0px_#303044]">
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#303044]/10">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#20243A]" />
                  <h2 className="text-base font-black text-[#20243A]">Maintenance Payment Receipts</h2>
                </div>
                <Link href="/resident/billing" className="text-xs font-bold text-[#20243A] hover:underline">
                  Billing Hub &rarr;
                </Link>
              </div>

              <div className="space-y-2">
                {payments.slice(0, 2).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-[#303044] rounded-xl text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#20243A]">
                        {BillingService.formatPaiseToInr(p.amountPaise)} ({p.paymentMethod})
                      </div>
                      <div className="text-[11px] text-[#77798A]">
                        Receipt #{p.receiptNumber} • {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <Badge variant="green">{p.status}</Badge>
                  </div>
                ))}
                {payments.length === 0 && (
                  <p className="text-xs text-[#77798A]">No prior payments recorded for this flat.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (4 cols): Domestic Staff & Announcements */}
          <div className="lg:col-span-4 space-y-5">
            {/* Domestic Help On Duty */}
            <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 bg-white shadow-[2px_2px_0px_#303044] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#303044]/10">
                <h2 className="text-sm font-black text-[#20243A] flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Household Staff Status
                </h2>
                <Link href="/resident/directory" className="text-[11px] font-bold text-[#20243A] hover:underline">
                  Directory &rarr;
                </Link>
              </div>

              <div className="space-y-2.5">
                {workers.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-xl border border-[#303044] bg-[#EAE5FA] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#20243A]">{w.fullName}</div>
                      <div className="text-[11px] text-[#77798A] font-semibold">{w.serviceType}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full font-black text-[10px] border border-[#20243A] ${
                        w.isCurrentlyInside
                          ? 'bg-[#C9F36B] text-[#20243A]'
                          : 'bg-white text-[#77798A]'
                      }`}
                    >
                      {w.isCurrentlyInside ? 'Inside Society' : 'Not In Society'}
                    </span>
                  </div>
                ))}
                {workers.length === 0 && (
                  <p className="text-xs text-[#77798A]">No domestic workers assigned to your flat.</p>
                )}
              </div>
            </div>

            {/* Society Announcements & Circulars */}
            <div className="rounded-2xl border-[1.5px] border-[#303044] p-5 bg-[#FAF7A7] shadow-[2px_2px_0px_#303044] space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#303044]/20">
                <BellRing className="w-4 h-4 text-[#20243A]" />
                <h2 className="text-sm font-black text-[#20243A]">Society Notices &amp; Circulars</h2>
              </div>

              <div className="space-y-3">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 bg-white border border-[#303044] rounded-xl shadow-[1px_1px_0px_#303044] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-[#20243A] line-clamp-1">{a.title}</span>
                      {a.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-black text-[9px] border border-red-400">
                          URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#77798A] font-medium leading-relaxed line-clamp-2">
                      {a.content}
                    </p>
                    <div className="text-[10px] text-[#77798A] font-bold pt-1">
                      By {a.authorName} • {new Date(a.publishedAt).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
