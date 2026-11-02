'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Search,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Home,
  AlertTriangle,
  Lock,
  Unlock,
  Plus,
  Info,
  Calendar,
  ExternalLink,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import {
  DirectoryCategory,
  ServiceProvider,
  DomesticWorker,
  StaffAttendanceLog,
} from '@/services/directory.service';

const CATEGORIES: { label: string; value: DirectoryCategory | 'ALL' }[] = [
  { label: 'All Services', value: 'ALL' },
  { label: 'Plumbers', value: 'PLUMBER' },
  { label: 'Electricians', value: 'ELECTRICIAN' },
  { label: 'Maids & Cleaning', value: 'MAID' },
  { label: 'Cooks & Meals', value: 'COOK' },
  { label: 'Drivers', value: 'DRIVER' },
  { label: 'Housekeeping', value: 'HOUSEKEEPING' },
  { label: 'Carpenters', value: 'CARPENTER' },
  { label: 'Lift & Security', value: 'SECURITY' },
];

export default function ResidentDirectoryPage() {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'MY_STAFF' | 'EMERGENCY'>('DIRECTORY');
  const [categoryFilter, setCategoryFilter] = useState<DirectoryCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [myStaff, setMyStaff] = useState<DomesticWorker[]>([]);
  const [myAttendance, setMyAttendance] = useState<StaffAttendanceLog[]>([]);
  const [loading, setLoading] = useState(false);

  // Unmask contact modal
  const [unmaskTarget, setUnmaskTarget] = useState<ServiceProvider | null>(null);
  const [accessReason, setAccessReason] = useState('Need assistance with flat maintenance');
  const [unmaskedPhone, setUnmaskedPhone] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockSuccess, setUnlockSuccess] = useState(false);

  // Authorize new staff modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'MAID' | 'COOK' | 'DRIVER' | 'OTHER'>('MAID');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [addingStaff, setAddingStaff] = useState(false);

  // Fetch directory
  useEffect(() => {
    fetchDirectory();
    fetchMyStaff();
  }, [categoryFilter]);

  async function fetchDirectory() {
    setLoading(true);
    try {
      const catParam = categoryFilter !== 'ALL' ? `?category=${categoryFilter}` : '';
      const res = await fetch(`/api/directory${catParam}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMyStaff() {
    try {
      const res = await fetch('/api/staff/my-staff');
      if (res.ok) {
        const data = await res.json();
        setMyStaff(data.staff || []);
        setMyAttendance(data.recentAttendance || []);
      }
    } catch (err) {
      console.error('Failed to load my staff:', err);
    }
  }

  async function handleUnlockContact() {
    if (!unmaskTarget) return;
    setUnlocking(true);
    try {
      const res = await fetch(`/api/directory/${unmaskTarget.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: accessReason }),
      });
      if (res.ok) {
        const data = await res.json();
        setUnmaskedPhone(data.phone);
        setUnlockSuccess(true);
        // Also update local provider listing with full phone
        setProviders((prev) =>
          prev.map((p) => (p.id === unmaskTarget.id ? { ...p, phoneNumber: data.phone } : p))
        );
      }
    } catch (err) {
      console.error('Failed to unlock contact:', err);
    } finally {
      setUnlocking(false);
    }
  }

  async function handleRegisterAndAuthorizeStaff() {
    if (!newStaffName || !newStaffPhone) return;
    setAddingStaff(true);
    try {
      // 1. Register worker
      const regRes = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newStaffName,
          phone: newStaffPhone,
          roleTitle: newStaffRole,
        }),
      });

      if (regRes.ok) {
        const regData = await regRes.json();
        // 2. Authorize for resident's Flat A-402
        await fetch('/api/staff/flats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staffId: regData.staff.id,
            flatId: 'flat-a-402',
            flatNumber: '402',
            wing: 'A',
          }),
        });

        setShowAddStaffModal(false);
        setNewStaffName('');
        setNewStaffPhone('');
        fetchMyStaff();
      }
    } catch (err) {
      console.error('Failed to authorize staff:', err);
    } finally {
      setAddingStaff(false);
    }
  }

  // Filtered providers by search
  const filteredProviders = providers.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.bio?.toLowerCase().includes(q) ||
      p.languages.toLowerCase().includes(q)
    );
  });

  const insideCount = myStaff.filter((s) => s.isCurrentlyInside).length;

  return (
    <AppShell
      activeRole="RESIDENT"
      userName="Jonathan Patel"
      userRoleTitle="Resident (Wing A - Flat 402)"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-[#FAF7A7] border border-[#303044] rounded-lg">
                Society Directory & Domestic Help
              </span>
              <span className="text-xs font-bold text-gray-500">Flat A-402 Verified Access</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#303044] mt-2">
              Community Directory & Domestic Staff
            </h1>
            <p className="text-sm font-medium text-gray-600 mt-1">
              Connect with verified service professionals and monitor real-time domestic staff gate attendance.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddStaffModal(true)}
              className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black border-2 border-[#303044] shadow-[2px_2px_0px_#303044]"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Add Domestic Staff
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Service Directory"
            value={providers.length.toString()}
            subtitle="Verified service professionals"
            variant="yellow"
          />
          <StatCard
            title="Flat Authorizations"
            value={myStaff.length.toString()}
            subtitle="Domestic workers authorized for Flat A-402"
            variant="lavender"
          />
          <StatCard
            title="Active Attendance"
            value={insideCount.toString()}
            subtitle="Domestic staff currently inside premises"
            variant="mint"
          />
          <StatCard
            title="Privacy & Auditing"
            value="100% Audited"
            subtitle="Strict worker privacy & consent enforcement"
            variant="blue"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b-2 border-[#303044] pb-2">
          <button
            onClick={() => setActiveTab('DIRECTORY')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'DIRECTORY'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Verified Service Providers ({providers.length})
          </button>
          <button
            onClick={() => setActiveTab('MY_STAFF')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'MY_STAFF'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            My Domestic Help ({myStaff.length})
          </button>
          <button
            onClick={() => setActiveTab('EMERGENCY')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'EMERGENCY'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Society Emergency Contacts
          </button>
        </div>

        {/* TAB 1: SERVICE PROVIDER DIRECTORY */}
        {activeTab === 'DIRECTORY' && (
          <div className="space-y-4">
            {/* Search and Category Filter */}
            <div className="bg-white p-4 rounded-xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044] flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name, skill, language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategoryFilter(cat.value)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border border-[#303044] transition-all ${
                      categoryFilter === cat.value
                        ? 'bg-[#303044] text-white shadow-[1px_1px_0px_#303044]'
                        : 'bg-white text-[#303044] hover:bg-gray-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Provider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProviders.map((provider) => {
                const isMasked = provider.phoneNumber.includes('XXX');
                return (
                  <div
                    key={provider.id}
                    className="bg-white rounded-2xl border-2 border-[#303044] p-5 shadow-[4px_4px_0px_#303044] flex flex-col justify-between hover:translate-y-[-2px] transition-transform"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 text-[11px] font-black uppercase rounded bg-[#FAF7A7] border border-[#303044]">
                            {provider.category}
                          </span>
                          <h3 className="text-lg font-black text-[#303044] mt-1">
                            {provider.fullName}
                          </h3>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-[#C9F2DE] px-2 py-0.5 rounded-full border border-emerald-700">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                          {provider.hasPoliceVerification && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              Police Cleared
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-medium text-gray-600 line-clamp-2">
                        {provider.bio || 'Society verified resident service professional.'}
                      </p>

                      <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          <span>{provider.workingHours}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-bold">Languages:</span>
                          <span>{provider.languages}</span>
                        </div>
                      </div>
                    </div>

                    {/* Phone Number / Contact Unlock */}
                    <div className="mt-4 pt-3 border-t-2 border-[#303044] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-[#303044]" />
                        <span className="font-mono text-xs font-bold text-[#303044]">
                          {provider.phoneNumber}
                        </span>
                      </div>

                      {isMasked ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setUnmaskTarget(provider);
                            setUnmaskedPhone(null);
                            setUnlockSuccess(false);
                          }}
                          className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border border-[#303044] shadow-[1px_1px_0px_#303044] py-1 px-2.5 h-auto"
                        >
                          <Lock className="w-3 h-3 mr-1" />
                          View Contact
                        </Button>
                      ) : (
                        <a
                          href={`tel:${provider.phoneNumber.replace(/\s+/g, '')}`}
                          className="inline-flex items-center text-xs font-black text-emerald-800 bg-[#C9F2DE] hover:bg-emerald-200 border border-emerald-800 px-2.5 py-1 rounded shadow-[1px_1px_0px_#303044]"
                        >
                          <Phone className="w-3 h-3 mr-1" />
                          Call Now
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MY DOMESTIC HELP (FLAT ISOLATION) */}
        {activeTab === 'MY_STAFF' && (
          <div className="space-y-4">
            <div className="bg-[#FAF7A7] p-4 rounded-xl border-2 border-[#303044] flex items-start gap-3">
              <Info className="w-5 h-5 text-[#303044] shrink-0 mt-0.5" />
              <div className="text-xs font-semibold text-[#303044]">
                <span className="font-black">Strict Flat Privacy Isolation:</span> You are viewing domestic helpers authorized specifically for Flat A-402. Gate attendance logs update automatically whenever the security guard records entry or exit.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myStaff.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-white rounded-2xl border-2 border-[#303044] p-5 shadow-[4px_4px_0px_#303044] space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2.5 py-0.5 text-xs font-black uppercase rounded bg-[#E6DEFC] border border-[#303044]">
                        {worker.serviceType}
                      </span>
                      <h3 className="text-xl font-black text-[#303044] mt-1">{worker.fullName}</h3>
                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-gray-600 mt-1">
                        <Phone className="w-3 h-3" />
                        {worker.phoneNumber}
                      </div>
                    </div>

                    {/* Live Presence Badge */}
                    <div>
                      {worker.isCurrentlyInside ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#C9F36B] text-[#303044] border border-[#303044] animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                          Inside Society
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gray-100 text-gray-600 border border-gray-300">
                          <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                          Off Premises
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs font-medium space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Authorized Flat:</span>
                      <span className="font-bold text-[#303044]">Wing A - Flat 402</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Access Schedule:</span>
                      <span className="font-bold text-[#303044]">Morning & Evening Slots</span>
                    </div>
                    {worker.emergencyContact && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Emergency Contact:</span>
                        <span className="font-bold text-[#303044]">{worker.emergencyContact}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Flat Attendance Logs */}
            <div className="bg-white rounded-2xl border-2 border-[#303044] p-5 shadow-[4px_4px_0px_#303044] space-y-3">
              <h3 className="text-base font-black text-[#303044]">Recent Gate Check-In & Check-Out History</h3>
              {myAttendance.length === 0 ? (
                <p className="text-xs text-gray-500 font-medium">No recent gate records today for authorized domestic help.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {myAttendance.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#303044]">{log.staffName}</span>
                        <span className="text-gray-500 ml-2">({log.serviceType})</span>
                        <div className="text-[11px] text-gray-400">Gate: {log.entryGate}</div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded font-black text-[10px] ${
                          log.status === 'INSIDE' ? 'bg-[#C9F36B] text-[#303044]' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {log.status === 'INSIDE' ? 'Checked In' : 'Completed'}
                        </span>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {new Date(log.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SOCIETY EMERGENCY CONTACTS */}
        {activeTab === 'EMERGENCY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Security Gate 1 (Main Gate)', phone: '+91 98200 77889', desc: 'Main vehicle entry & visitor clearance' },
              { title: 'Security Gate 2 (Service Gate)', phone: '+91 98200 77890', desc: 'Domestic staff & heavy cargo intake' },
              { title: 'Lift Breakdown Hotline (Schindler)', phone: '+91 1800 200 1234', desc: '24x7 Emergency passenger entrapment' },
              { title: 'Water Pump & Tank Attendant', phone: '+91 98201 12345', desc: 'Borewell & overhead tank water supply' },
              { title: 'Society Electrical Substation', phone: '+91 98202 23456', desc: 'Distribution panel & generator backup' },
              { title: 'Society Manager Office (Rajesh)', phone: '+91 98200 11223', desc: 'Administrative & urgent committee escalation' },
            ].map((contact, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border-2 border-[#303044] p-5 shadow-[4px_4px_0px_#303044] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-sm text-[#303044]">{contact.title}</h3>
                  <Badge variant="yellow" className="text-[10px] text-[#303044]">
                    24x7
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 font-medium">{contact.desc}</p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-[#303044]">{contact.phone}</span>
                  <a
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center text-xs font-black text-[#303044] bg-[#C9F36B] hover:bg-[#b8e858] px-2.5 py-1 rounded border border-[#303044] shadow-[1px_1px_0px_#303044]"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MODAL: UNMASK CONTACT DETAILS WITH AUDIT */}
        {unmaskTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[8px_8px_0px_#303044] max-w-md w-full p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-gray-500">Contact Access Authorization</span>
                  <h3 className="text-xl font-black text-[#303044] mt-0.5">
                    {unmaskTarget.fullName}
                  </h3>
                </div>
                <button
                  onClick={() => setUnmaskTarget(null)}
                  className="text-gray-400 hover:text-[#303044] font-black text-lg"
                >
                  ✕
                </button>
              </div>

              {!unlockSuccess ? (
                <div className="space-y-4">
                  <div className="bg-[#FAF7A7] p-3 rounded-xl border border-[#303044] text-xs font-medium text-[#303044]">
                    <span className="font-black">Worker Privacy Policy:</span> In compliance with society privacy rules, accessing phone numbers is audited. Your name and flat number will be logged in the immutable directory audit register.
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#303044] mb-1">
                      Reason for Contacting (Mandatory for Audit Trail)
                    </label>
                    <input
                      type="text"
                      value={accessReason}
                      onChange={(e) => setAccessReason(e.target.value)}
                      placeholder="e.g. Bathroom pipe leak, AC service, etc."
                      className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button
                      variant="outline"
                      onClick={() => setUnmaskTarget(null)}
                      className="border-2 border-[#303044] text-xs font-black"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUnlockContact}
                      disabled={unlocking || !accessReason.trim()}
                      className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border-2 border-[#303044] shadow-[2px_2px_0px_#303044]"
                    >
                      <Unlock className="w-3.5 h-3.5 mr-1" />
                      {unlocking ? 'Auditing & Unlocking...' : 'Accept & Reveal Number'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="w-12 h-12 rounded-full bg-[#C9F2DE] border-2 border-[#303044] flex items-center justify-center mx-auto text-[#303044]">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500">Contact Number Unlocked</div>
                    <div className="text-2xl font-black font-mono text-[#303044] mt-1">
                      {unmaskedPhone}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Audit Log ID recorded for Flat A-402
                    </div>
                  </div>

                  <div className="flex gap-2 justify-center pt-2">
                    <a
                      href={`tel:${unmaskedPhone?.replace(/\s+/g, '')}`}
                      className="inline-flex items-center px-4 py-2 text-sm font-black text-[#303044] bg-[#C9F36B] border-2 border-[#303044] rounded-xl shadow-[2px_2px_0px_#303044]"
                    >
                      <Phone className="w-4 h-4 mr-1.5" />
                      Call Number
                    </a>
                    <Button
                      variant="outline"
                      onClick={() => setUnmaskTarget(null)}
                      className="border-2 border-[#303044] text-xs font-black"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: AUTHORIZE NEW DOMESTIC HELP */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[8px_8px_0px_#303044] max-w-md w-full p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-gray-500">Flat A-402 Authorization</span>
                  <h3 className="text-xl font-black text-[#303044] mt-0.5">
                    Authorize Domestic Helper
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddStaffModal(false)}
                  className="text-gray-400 hover:text-[#303044] font-black text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Geeta Devi"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Service Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  >
                    <option value="MAID">House Maid / Cleaner</option>
                    <option value="COOK">Cook / Meal Prep</option>
                    <option value="DRIVER">Personal Driver</option>
                    <option value="OTHER">Other Caregiver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">10-Digit Mobile Number</label>
                  <input
                    type="tel"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="e.g. 9820122222"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div className="bg-[#FAF7A7] p-2.5 rounded-lg border border-[#303044] text-[11px] font-semibold text-[#303044]">
                  Gate security guards will automatically verify their identity upon arrival and permit entry for Flat A-402.
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddStaffModal(false)}
                  className="border-2 border-[#303044] text-xs font-black"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegisterAndAuthorizeStaff}
                  disabled={addingStaff || !newStaffName || !newStaffPhone}
                  className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border-2 border-[#303044] shadow-[2px_2px_0px_#303044]"
                >
                  {addingStaff ? 'Authorizing...' : 'Authorize Flat Access'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
