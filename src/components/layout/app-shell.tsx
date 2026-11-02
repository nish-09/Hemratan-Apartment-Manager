'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  ShieldCheck,
  ClipboardList,
  Wallet,
  Car,
  BookOpen,
  Settings,
  LogOut,
  Search,
  Bell,
  Calendar as CalendarIcon,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Users,
} from 'lucide-react';
import { UserRole } from '@/types/roles';

interface AppShellProps {
  children?: React.ReactNode;
  activeRole?: UserRole;
  userName?: string;
  userRoleTitle?: string;
  showRightPanel?: boolean;
}

const ROLE_NAV_ITEMS: Record<UserRole, Array<{ label: string; href: string; icon: any }>> = {
  RESIDENT: [
    { label: 'Resident Home', href: '/resident/dashboard', icon: Home },
    { label: 'Visitors', href: '/resident/visitors', icon: ShieldCheck },
    { label: 'Complaints', href: '/resident/complaints', icon: ClipboardList },
    { label: 'Maintenance & Bills', href: '/resident/bills', icon: Wallet },
    { label: 'Parking & Deliveries', href: '/resident/parking', icon: Car },
    { label: 'Rules & Directory', href: '/resident/rules', icon: BookOpen },
  ],
  GUARD: [
    { label: 'Gate Control', href: '/guard/dashboard', icon: ShieldCheck },
    { label: 'Visitor Logs', href: '/guard/visitors', icon: Users },
    { label: 'Delivery Intake', href: '/guard/deliveries', icon: Car },
    { label: 'Staff Attendance', href: '/guard/staff', icon: ClipboardList },
    { label: 'Parking Slots', href: '/guard/parking', icon: Home },
  ],
  COMMITTEE: [
    { label: 'Operations Cockpit', href: '/admin/dashboard', icon: Home },
    { label: 'Flats & Members', href: '/admin/flats', icon: Users },
    { label: 'Complaints Triage', href: '/admin/complaints', icon: ClipboardList },
    { label: 'Maintenance Billing', href: '/admin/billing', icon: Wallet },
    { label: 'Financial Expenses', href: '/admin/expenses', icon: BookOpen },
    { label: 'Rules & Schedules', href: '/admin/rules', icon: Settings },
  ],
  SUPER_ADMIN: [
    { label: 'Governance Console', href: '/super-admin/dashboard', icon: Home },
    { label: 'User Roles & Access', href: '/super-admin/users', icon: Users },
    { label: 'Flat Configurations', href: '/super-admin/flats', icon: BookOpen },
    { label: 'Audit Trail', href: '/super-admin/audit', icon: ClipboardList },
    { label: 'System Config', href: '/super-admin/config', icon: Settings },
  ],
};

export function AppShell({
  children,
  activeRole = 'RESIDENT',
  userName = 'Jonathan Patel',
  userRoleTitle = 'Resident (Wing A - Flat 402)',
  showRightPanel = true,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = ROLE_NAV_ITEMS[activeRole] || ROLE_NAV_ITEMS.RESIDENT;

  // Extract initials
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Fallback
    }
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="w-full min-h-screen h-screen bg-white flex flex-col lg:flex-row overflow-hidden">
      {/* 1. LIME GREEN SIDEBAR (Desktop) */}
      <aside className="hidden lg:flex flex-col items-center justify-between w-[84px] bg-[#C9F36B] border-r-[1.5px] border-[#303044] py-6 px-2 select-none shrink-0 h-full">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-1">
          <Link
            href={navItems[0]?.href || '/'}
            aria-label="Hemratan Home"
            className="w-12 h-12 rounded-2xl bg-white border-[1.5px] border-[#303044] flex items-center justify-center font-black text-xl text-[#20243A] shadow-[2px_2px_0px_#303044] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            H
          </Link>
        </div>

        {/* Center Nav Icons */}
        <nav className="flex flex-col items-center gap-3 w-full" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === '/resident/dashboard' && pathname === '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-[#20243A] text-white border-[1.5px] border-[#303044] shadow-[2px_2px_0px_rgba(48,48,68,0.3)]'
                    : 'text-[#20243A] hover:bg-black/10'
                }`}
              >
                <Icon className="w-5 h-5 stroke-[2]" />
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/login"
            title="Switch User / Login"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#20243A] hover:bg-black/10 transition-colors"
          >
            <Settings className="w-5 h-5 stroke-[2]" />
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#20243A] hover:bg-rose-200/50 hover:text-rose-900 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#C9F36B] border-b-[1.5px] border-[#303044]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-white border-[1.5px] border-[#303044] flex items-center justify-center font-black text-lg text-[#20243A]">
            H
          </div>
          <span className="font-bold text-sm tracking-tight text-[#20243A]">Hemratan</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-[#303044] bg-white text-[#20243A]"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF9FF] border-b-[1.5px] border-[#303044] p-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-[#20243A] hover:bg-[#C9F36B] border border-transparent hover:border-[#303044] transition-all"
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-rose-800 hover:bg-rose-100 border border-transparent transition-all mt-2"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto">
        {/* Top Header */}
        <header className="px-6 sm:px-8 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#303044]/10 shrink-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#20243A] tracking-tight">
              Good evening, {userName.split(' ')[0]}!
            </h1>
            <p className="text-sm font-medium text-[#77798A] mt-0.5">
              Daily status from your home • <span className="font-semibold text-[#20243A]">{userRoleTitle}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input with Neo-brutalist border */}
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search anything"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white rounded-full border-[1.5px] border-[#303044] placeholder:text-[#77798A] text-[#20243A] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
              />
              <Search className="w-4 h-4 text-[#77798A] absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick action buttons */}
            <button
              type="button"
              aria-label="Calendar view"
              className="w-9 h-9 rounded-full border-[1.5px] border-[#303044] bg-white flex items-center justify-center text-[#20243A] hover:bg-[#FAF7A7] transition-colors"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Direct messages"
              className="w-9 h-9 rounded-full border-[1.5px] border-[#303044] bg-white flex items-center justify-center text-[#20243A] hover:bg-[#C9F2DE] transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative w-9 h-9 rounded-full border-[1.5px] border-[#303044] bg-white flex items-center justify-center text-[#20243A] hover:bg-[#E6DEFC] transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 border border-white" />
            </button>

            {/* User Avatar with Initials */}
            <Link
              href="/login"
              title="Click to Switch User Profile"
              className="w-9 h-9 rounded-full border-[1.5px] border-[#303044] overflow-hidden bg-[#FAF7A7] flex items-center justify-center font-bold text-xs text-[#20243A] hover:scale-105 transition-transform"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Dynamic Inner Body */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col gap-6">{children}</div>
      </div>

      {/* 3. RIGHT PANEL - CALENDAR & ACTIVITIES (Desktop/Tablet) */}
      {showRightPanel && (
        <aside className="hidden xl:flex flex-col w-[320px] bg-[#E7FAA4] border-l-[1.5px] border-[#303044] p-6 shrink-0 justify-between h-full overflow-y-auto">
          <div className="flex flex-col gap-6">
            {/* Panel Header Icons */}
            <div className="flex items-center justify-between pb-2 border-b border-[#303044]/20">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Calendar view"
                  className="w-8 h-8 rounded-lg border border-[#303044] bg-white/70 flex items-center justify-center text-[#20243A]"
                >
                  <CalendarIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Chat messages"
                  className="w-8 h-8 rounded-lg border border-[#303044] bg-white/70 flex items-center justify-center text-[#20243A]"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Alerts"
                  className="w-8 h-8 rounded-lg border border-[#303044] bg-white/70 flex items-center justify-center text-[#20243A]"
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>
              <div className="w-8 h-8 rounded-full border border-[#303044] bg-[#FAF7A7] flex items-center justify-center font-bold text-xs text-[#20243A]">
                {initials}
              </div>
            </div>

            {/* Calendar Widget */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-base text-[#20243A]">April, 28 Friday</h3>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous month"
                    className="p-1 rounded hover:bg-black/5 text-[#20243A]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    className="p-1 rounded hover:bg-black/5 text-[#20243A]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#77798A] mb-1">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Month Days Sample */}
              <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-semibold text-[#20243A]">
                <span className="text-[#77798A]/50 py-1">26</span>
                <span className="text-[#77798A]/50 py-1">27</span>
                <span className="text-[#77798A]/50 py-1">28</span>
                <span className="text-[#77798A]/50 py-1">29</span>
                <span className="text-[#77798A]/50 py-1">30</span>
                <span className="text-[#77798A]/50 py-1">31</span>
                <span className="py-1">1</span>

                <span className="py-1">2</span>
                <span className="py-1">3</span>
                <span className="py-1">4</span>
                <span className="py-1">5</span>
                <span className="py-1">6</span>
                <span className="py-1">7</span>
                <span className="py-1">8</span>

                <span className="py-1">9</span>
                <span className="py-1">10</span>
                <span className="py-1">11</span>
                <span className="w-6 h-6 mx-auto rounded-full border border-[#303044] bg-[#C9F2DE] flex items-center justify-center font-bold text-[11px]">
                  12
                </span>
                <span className="py-1">13</span>
                <span className="py-1">14</span>
                <span className="py-1">15</span>

                <span className="py-1">16</span>
                <span className="w-6 h-6 mx-auto rounded-full border border-[#303044] bg-[#FAF7A7] flex items-center justify-center font-bold text-[11px]">
                  17
                </span>
                <span className="py-1">18</span>
                <span className="py-1">19</span>
                <span className="py-1">20</span>
                <span className="py-1">21</span>
                <span className="py-1">22</span>

                <span className="py-1">23</span>
                <span className="py-1">24</span>
                <span className="py-1">25</span>
                <span className="py-1">26</span>
                <span className="py-1">27</span>
                <span className="w-6 h-6 mx-auto rounded-full border-[1.5px] border-[#303044] bg-[#BCA9F2] text-white flex items-center justify-center font-bold text-[11px]">
                  28
                </span>
                <span className="py-1">29</span>
              </div>
            </div>

            {/* My To-Do & Activities Timeline */}
            <div>
              <h3 className="font-extrabold text-base text-[#20243A] mb-3">Society Schedule</h3>
              <div className="flex flex-col gap-3 font-mono text-xs">
                {/* Slot 1 */}
                <div className="flex items-start gap-3">
                  <span className="text-[#77798A] pt-1">06:00</span>
                  <div className="flex-1 h-[1px] bg-[#303044]/20 mt-3" />
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#77798A] pt-1">06:30</span>
                  <div className="flex-1 bg-[#C9F2DE] border border-[#303044] rounded-xl p-2 font-sans shadow-[1px_1px_0px_#303044]">
                    <div className="font-bold text-[#20243A] text-xs">Gym / Fitness Hour</div>
                    <div className="text-[10px] text-[#20243A]/70">06:30 - 07:30 • Clubhouse</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#77798A] pt-1">08:00</span>
                  <div className="flex-1 bg-[#FAF7A7] border border-[#303044] rounded-xl p-2 font-sans shadow-[1px_1px_0px_#303044]">
                    <div className="font-bold text-[#20243A] text-xs">Water Supply Window</div>
                    <div className="text-[10px] text-[#20243A]/70">07:40 - 08:30 • Morning Supply</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#77798A] pt-1">09:30</span>
                  <div className="flex-1 bg-[#E6DEFC] border border-[#303044] rounded-xl p-2 font-sans shadow-[1px_1px_0px_#303044]">
                    <div className="font-bold text-[#20243A] text-xs">Housekeeping & Waste Pickup</div>
                    <div className="text-[10px] text-[#20243A]/70">09:10 - 10:00 • Door-to-Door</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
