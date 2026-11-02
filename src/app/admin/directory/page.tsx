'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  Plus,
  Phone,
  Eye,
  Lock,
  FileCheck,
  Users,
  Building,
  RotateCcw,
} from 'lucide-react';
import {
  ServiceProvider,
  DomesticWorker,
  DirectoryCategory,
  ServiceVerificationStatus,
} from '@/services/directory.service';

interface ContactAuditDisplay {
  id: string;
  providerName: string;
  category: string;
  accessedByUserName: string;
  accessedByFlatId?: string;
  reason: string;
  accessedAt: string;
}

const SAMPLE_AUDIT_LOGS: ContactAuditDisplay[] = [
  {
    id: 'aud-001',
    providerName: 'Santosh Plumbing Services',
    category: 'PLUMBER',
    accessedByUserName: 'Jonathan Patel',
    accessedByFlatId: 'Flat A-402',
    reason: 'Kitchen drain blockage inquiry',
    accessedAt: '2026-11-02T10:15:00.000Z',
  },
  {
    id: 'aud-002',
    providerName: 'Dilip Sharma Electricals',
    category: 'ELECTRICIAN',
    accessedByUserName: 'Rosa Palmour',
    accessedByFlatId: 'Flat A-201',
    reason: 'Main MCB switch trip inspection',
    accessedAt: '2026-11-02T09:40:00.000Z',
  },
];

export default function CommitteeDirectoryGovernancePage() {
  const [activeTab, setActiveTab] = useState<'PROVIDERS' | 'STAFF' | 'AUDIT'>('PROVIDERS');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [staffList, setStaffList] = useState<DomesticWorker[]>([]);
  const [auditLogs, setAuditLogs] = useState<ContactAuditDisplay[]>(SAMPLE_AUDIT_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');

  // Verify modal
  const [verifyTarget, setVerifyTarget] = useState<ServiceProvider | null>(null);
  const [verifyNotes, setVerifyNotes] = useState('Documents and credentials verified');
  const [policeChecked, setPoliceChecked] = useState(true);

  // Add Provider modal
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState<DirectoryCategory>('PLUMBER');
  const [newBio, setNewBio] = useState('');
  const [newHours, setNewHours] = useState('09:00 AM - 06:00 PM');
  const [newPolice, setNewPolice] = useState(false);

  useEffect(() => {
    fetchProviders();
    fetchStaff();
  }, []);

  async function fetchProviders() {
    try {
      const res = await fetch('/api/directory?includeAll=true');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to fetch directory:', err);
    }
  }

  async function fetchStaff() {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  }

  async function handleVerifySubmit() {
    if (!verifyTarget) return;
    try {
      const res = await fetch(`/api/directory/${verifyTarget.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'VERIFIED',
          notes: verifyNotes,
          policeVerification: policeChecked,
        }),
      });

      if (res.ok) {
        setVerifyTarget(null);
        fetchProviders();
      }
    } catch (err) {
      console.error('Failed to verify provider:', err);
    }
  }

  async function handleToggleConsent(provider: ServiceProvider) {
    try {
      const res = await fetch(`/api/directory/${provider.id}/consent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          withdraw: provider.isListingActive, // if active, withdraw it
          reason: 'Committee administrative toggle',
        }),
      });

      if (res.ok) {
        fetchProviders();
      }
    } catch (err) {
      console.error('Failed to toggle consent:', err);
    }
  }

  async function handleCreateProvider() {
    if (!newName || !newPhone) return;
    try {
      const res = await fetch('/api/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newName,
          phone: newPhone,
          category: newCategory,
          bio: newBio,
          workingHours: newHours,
          consentGiven: true,
        }),
      });

      if (res.ok) {
        setShowAddProviderModal(false);
        setNewName('');
        setNewPhone('');
        setNewBio('');
        fetchProviders();
      }
    } catch (err) {
      console.error('Failed to create provider:', err);
    }
  }

  const filteredProviders = providers.filter((p) => {
    if (statusFilter !== 'ALL' && p.verificationStatus !== statusFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.fullName.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  });

  const pendingCount = providers.filter((p) => p.verificationStatus === 'PENDING').length;
  const verifiedCount = providers.filter((p) => p.verificationStatus === 'VERIFIED').length;
  const staffInsideCount = staffList.filter((s) => s.isCurrentlyInside).length;

  return (
    <AppShell
      activeRole="COMMITTEE"
      userName="Rosa Palmour"
      userRoleTitle="Secretary (Managing Committee)"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-[#FAF7A7] border border-[#303044] rounded-lg">
                Directory & Staff Governance
              </span>
              <span className="text-xs font-bold text-gray-500">Managing Committee Oversight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#303044] mt-2">
              Service Directory Governance & Staff Audits
            </h1>
            <p className="text-sm font-medium text-gray-600 mt-1">
              Verify credentials, govern domestic worker consent, and inspect resident contact unlock audit logs.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddProviderModal(true)}
              className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black border-2 border-[#303044] shadow-[2px_2px_0px_#303044]"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Register Service Provider
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Verified Directory"
            value={verifiedCount.toString()}
            subtitle="Verified active directory listings"
            variant="yellow"
          />
          <StatCard
            title="Pending Approval"
            value={pendingCount.toString()}
            subtitle="Pending committee verification"
            variant="peach"
          />
          <StatCard
            title="Staff Inside"
            value={staffInsideCount.toString()}
            subtitle="Domestic staff inside premises right now"
            variant="mint"
          />
          <StatCard
            title="Privacy Audits"
            value={auditLogs.length.toString()}
            subtitle="Contact unlock access audit records"
            variant="lavender"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b-2 border-[#303044] pb-2">
          <button
            onClick={() => setActiveTab('PROVIDERS')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'PROVIDERS'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Service Providers ({providers.length})
          </button>
          <button
            onClick={() => setActiveTab('STAFF')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'STAFF'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Domestic Staff Roster ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Contact Access Audit Trail ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: SERVICE PROVIDERS */}
        {activeTab === 'PROVIDERS' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044] flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search provider name or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {(['ALL', 'VERIFIED', 'PENDING'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border border-[#303044] ${
                      statusFilter === st
                        ? 'bg-[#303044] text-white'
                        : 'bg-white text-[#303044] hover:bg-gray-50'
                    }`}
                  >
                    {st === 'ALL' ? 'All Statuses' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Providers Table */}
            <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044] overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead className="bg-gray-50 border-b-2 border-[#303044] text-[#303044] uppercase tracking-wider text-[11px] font-black">
                  <tr>
                    <th className="py-3 px-4">Provider Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Police Clear</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Listing Consent</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-black text-sm text-[#303044]">{provider.fullName}</div>
                        <div className="text-[11px] text-gray-500 line-clamp-1">{provider.bio}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#FAF7A7] border border-[#303044] text-[10px] font-black uppercase">
                          {provider.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-700">
                        {provider.phoneNumber}
                      </td>
                      <td className="py-3 px-4">
                        {provider.hasPoliceVerification ? (
                          <span className="text-emerald-700 font-bold">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            provider.verificationStatus === 'VERIFIED'
                              ? 'bg-[#C9F2DE] text-emerald-800 border border-emerald-500'
                              : 'bg-[#FCE1D8] text-rose-800 border border-rose-300'
                          }`}
                        >
                          {provider.verificationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {provider.isListingActive ? (
                          <span className="text-emerald-700 font-bold">Active</span>
                        ) : (
                          <span className="text-rose-600 font-bold">Consent Withdrawn</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {provider.verificationStatus === 'PENDING' && (
                          <Button
                            size="sm"
                            onClick={() => setVerifyTarget(provider)}
                            className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] text-[11px] font-black py-1 px-2 h-auto border border-[#303044]"
                          >
                            Verify
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleConsent(provider)}
                          className="text-[11px] font-black py-1 px-2 h-auto border border-[#303044]"
                        >
                          {provider.isListingActive ? 'Withdraw Consent' : 'Restore Listing'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DOMESTIC STAFF ROSTER */}
        {activeTab === 'STAFF' && (
          <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044] overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold">
              <thead className="bg-gray-50 border-b-2 border-[#303044] text-[#303044] uppercase tracking-wider text-[11px] font-black">
                <tr>
                  <th className="py-3 px-4">Worker Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Authorized Flats</th>
                  <th className="py-3 px-4">Current Gate Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staffList.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-black text-sm text-[#303044]">{worker.fullName}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#E6DEFC] border border-[#303044] text-[10px] font-black uppercase">
                        {worker.serviceType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-700">{worker.phoneNumber}</td>
                    <td className="py-3 px-4 text-[#303044]">
                      {worker.authorizedFlats.length > 0 ? worker.authorizedFlats.join(', ') : 'None'}
                    </td>
                    <td className="py-3 px-4">
                      {worker.isCurrentlyInside ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#C9F36B] text-[#303044] border border-[#303044]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Inside Premises
                        </span>
                      ) : (
                        <span className="text-gray-400 font-bold">Outside</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CONTACT ACCESS AUDIT TRAIL */}
        {activeTab === 'AUDIT' && (
          <div className="bg-white rounded-2xl border-2 border-[#303044] p-6 shadow-[4px_4px_0px_#303044] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#303044]">Resident Contact Unmasking Audit Register</h2>
                <p className="text-xs font-semibold text-gray-500">
                  Immutable audit records captured whenever a resident requests to unlock a service worker&apos;s contact number.
                </p>
              </div>
            </div>

            <div className="divide-y-2 border-2 border-[#303044] rounded-xl overflow-hidden">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white hover:bg-gray-50 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-[#303044]">{log.accessedByUserName}</span>
                      <span className="px-2 py-0.5 rounded bg-[#FAF7A7] border border-[#303044] text-[10px] font-bold">
                        {log.accessedByFlatId}
                      </span>
                      <span className="text-gray-400">unlocked contact for</span>
                      <span className="font-black text-[#303044]">{log.providerName}</span>
                      <span className="text-[10px] text-gray-500">({log.category})</span>
                    </div>
                    <div className="text-gray-600 font-medium">
                      Declared Reason: &quot;{log.reason}&quot;
                    </div>
                  </div>

                  <div className="text-right text-[11px] font-mono text-gray-400">
                    {new Date(log.accessedAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: VERIFY PROVIDER */}
        {verifyTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[8px_8px_0px_#303044] max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-black text-[#303044]">
                Verify Service Provider: {verifyTarget.fullName}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">
                    Verification Notes
                  </label>
                  <textarea
                    rows={2}
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="policeClearance"
                    checked={policeChecked}
                    onChange={(e) => setPoliceChecked(e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-[#303044]"
                  />
                  <label htmlFor="policeClearance" className="text-xs font-black text-[#303044]">
                    Police Verification & ID Documents Verified
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setVerifyTarget(null)}
                  className="border-2 border-[#303044] text-xs font-black"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifySubmit}
                  className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border-2 border-[#303044]"
                >
                  Confirm Verification
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD PROVIDER */}
        {showAddProviderModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[8px_8px_0px_#303044] max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-black text-[#303044]">Register Service Provider</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ramesh Carpentry"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  >
                    <option value="PLUMBER">Plumber</option>
                    <option value="ELECTRICIAN">Electrician</option>
                    <option value="MAID">Maid / Housekeeping</option>
                    <option value="COOK">Cook</option>
                    <option value="CARPENTER">Carpenter</option>
                    <option value="DRIVER">Driver</option>
                    <option value="SECURITY">Security / Lift</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. 9820011111"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Service Description</label>
                  <input
                    type="text"
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    placeholder="e.g. Furniture repairs, door lock fixes"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddProviderModal(false)}
                  className="border-2 border-[#303044] text-xs font-black"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProvider}
                  disabled={!newName || !newPhone}
                  className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border-2 border-[#303044]"
                >
                  Create & Verify
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
