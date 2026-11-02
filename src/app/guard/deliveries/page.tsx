'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  LogOut,
  Building,
  UserCheck,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { DeliveryRecord, DeliveryCategory, DeliveryStatus } from '@/services/delivery.service';

interface FlatOption {
  id: string;
  wing: string;
  flatNumber: string;
  residentName?: string;
}

export default function GuardDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [flats, setFlats] = useState<FlatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [formProvider, setFormProvider] = useState('Amazon');
  const [formCategory, setFormCategory] = useState<DeliveryCategory>('ECOMMERCE');
  const [formRecipient, setFormRecipient] = useState('');
  const [formFlatId, setFormFlatId] = useState('');
  const [formTracking, setFormTracking] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [regError, setRegError] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Handover Modal State
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryRecord | null>(null);
  const [collectorName, setCollectorName] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [handoverError, setHandoverError] = useState('');
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFlats();
    fetchDeliveries();
  }, []);

  async function fetchFlats() {
    try {
      const res = await fetch('/api/flats');
      if (res.ok) {
        const json = await res.json();
        const options: FlatOption[] = (json.flats || []).map((f: any) => ({
          id: f.id,
          wing: f.wing,
          flatNumber: f.flatNumber,
          residentName: f.residents?.[0]?.fullName || 'Resident',
        }));
        setFlats(options);
        if (options.length > 0 && !formFlatId) {
          setFormFlatId(options[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load flats', e);
    }
  }

  async function fetchDeliveries() {
    try {
      setLoading(true);
      const res = await fetch('/api/deliveries');
      if (res.ok) {
        const json = await res.json();
        setDeliveries(json.deliveries || []);
        setOverview(json.overview);
      }
    } catch (e) {
      console.error('Failed to load deliveries', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError('');
    setRegSubmitting(true);

    try {
      const res = await fetch('/api/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: formProvider,
          category: formCategory,
          recipientName: formRecipient,
          flatId: formFlatId,
          trackingNumber: formTracking || undefined,
          packageDescription: formDescription || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to register delivery');
      }

      setShowRegisterModal(false);
      setFormRecipient('');
      setFormTracking('');
      setFormDescription('');
      await fetchDeliveries();
    } catch (err: any) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegSubmitting(false);
    }
  }

  function openHandoverModal(del: DeliveryRecord) {
    setSelectedDelivery(del);
    setCollectorName(del.recipientName); // default to recipient name
    setHandoverNotes('');
    setHandoverError('');
  }

  async function handleHandoverSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDelivery) return;

    setHandoverError('');
    setHandoverSubmitting(true);

    try {
      const res = await fetch(`/api/deliveries/${selectedDelivery.id}/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectedByName: collectorName,
          notes: handoverNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to record collection');
      }

      setSelectedDelivery(null);
      await fetchDeliveries();
    } catch (err: any) {
      setHandoverError(err.message || 'Handover failed');
    } finally {
      setHandoverSubmitting(false);
    }
  }

  const pendingList = deliveries.filter(
    (d) => d.status === 'RECEIVED' || d.status === 'NOTIFIED' || d.status === 'READY_FOR_COLLECTION'
  );
  const historyList = deliveries.filter(
    (d) => d.status === 'COLLECTED' || d.status === 'RETURNED' || d.status === 'CANCELLED'
  );

  const displayedList = (activeTab === 'pending' ? pendingList : historyList).filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.provider.toLowerCase().includes(q) ||
      d.recipientName.toLowerCase().includes(q) ||
      d.flatNumber.includes(q) ||
      (d.trackingNumber && d.trackingNumber.toLowerCase().includes(q))
    );
  });

  return (
    <AppShell
      userName="Santosh Yadav"
      userRoleTitle="Security Guard • Gate 1 Main Access"
      activeRole="GUARD"
    >
      {/* Top Header & Console Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border-[1.5px] border-[#303044] shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Parcel & Courier Intake</h1>
            <Badge variant="green">In-App Notifications Active</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Real-time delivery logging, resident notifications, and verified collection handovers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDeliveries}
            className="gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="lime"
            size="sm"
            onClick={() => setShowRegisterModal(true)}
            className="gap-2 shadow-[2px_2px_0px_#303044]"
          >
            <Plus className="w-4 h-4" />
            <span>Log Incoming Parcel</span>
          </Button>
        </div>
      </div>

      {/* 4 PASTEL STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Arrivals"
          value={overview?.todayReceived ?? 0}
          subtitle="Packages Intake Today"
          variant="blue"
          icon={<Package className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Awaiting Pickup"
          value={overview?.pendingCollections ?? pendingList.length}
          subtitle="Held at Security Gate"
          variant="yellow"
          icon={<Clock className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Handed Over"
          value={overview?.collectedCount ?? 0}
          subtitle="Collected by Residents"
          variant="mint"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-800" />}
        />
        <StatCard
          title="Total Processed"
          value={overview?.totalDeliveries ?? deliveries.length}
          subtitle="Lifetime Delivery Logs"
          variant="lavender"
          icon={<Building className="w-5 h-5 text-[#4A329A]" />}
        />
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#303044]/20 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              activeTab === 'pending'
                ? 'bg-[#FAF7A7] text-[#20243A] border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#77798A] border-transparent hover:bg-slate-100'
            }`}
          >
            Awaiting Collection ({pendingList.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              activeTab === 'history'
                ? 'bg-[#E6DEFC] text-[#20243A] border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#77798A] border-transparent hover:bg-slate-100'
            }`}
          >
            Collected History ({historyList.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#77798A]" />
          <input
            type="text"
            placeholder="Search provider, flat, name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
          />
        </div>
      </div>

      {/* DELIVERIES LIST / QUEUE */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#20243A]">
              {activeTab === 'pending'
                ? `Packages Held at Gate 1 (${displayedList.length})`
                : `Completed Collections & Returns (${displayedList.length})`}
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              {activeTab === 'pending'
                ? 'Verify resident identity before clicking Handover'
                : 'Permanent delivery audit trail'}
            </p>
          </div>
          <Badge variant={activeTab === 'pending' ? 'yellow' : 'green'}>
            {displayedList.length} Records
          </Badge>
        </div>

        {displayedList.length === 0 ? (
          <div className="p-8 text-center text-sm font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
            {activeTab === 'pending'
              ? 'No packages currently held at security checkpoint.'
              : 'No completed collection history on record.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3">Provider & Package</th>
                  <th className="py-3 px-3">Recipient Flat</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Received At</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Gate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                {displayedList.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-[#20243A] flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-blue-600" />
                        <span>{del.provider}</span>
                      </div>
                      <div className="text-[10px] text-[#77798A]">
                        {del.trackingNumber ? `Track: ${del.trackingNumber}` : del.packageDescription || 'Standard Parcel'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#20243A]">
                        <span className="bg-[#FAF7A7] px-2 py-0.5 rounded border border-[#303044]/20 mr-1.5 font-black">
                          {del.wing}-{del.flatNumber}
                        </span>
                        <span>{del.recipientName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-black uppercase text-[#4A329A] bg-[#E6DEFC] px-1.5 py-0.5 rounded">
                        {del.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[#77798A]">
                      {new Date(del.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      {del.status === 'COLLECTED' ? (
                        <Badge variant="green">Collected</Badge>
                      ) : del.status === 'READY_FOR_COLLECTION' ? (
                        <Badge variant="green">Ready on Shelf</Badge>
                      ) : del.status === 'NOTIFIED' ? (
                        <Badge variant="yellow">Resident Notified</Badge>
                      ) : (
                        <Badge variant="neutral">{del.status}</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {del.status !== 'COLLECTED' && del.status !== 'RETURNED' && (
                        <Button
                          variant="lime"
                          size="sm"
                          onClick={() => openHandoverModal(del)}
                          className="gap-1.5 font-black text-xs shadow-[2px_2px_0px_#303044]"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Handover</span>
                        </Button>
                      )}
                      {del.status === 'COLLECTED' && (
                        <span className="text-[10px] text-emerald-800 font-bold block">
                          Picked up by {del.collectedByName}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REGISTER DELIVERY MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-2 border-[#303044] shadow-[6px_6px_0px_#303044] max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#303044]/20 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-[#20243A]">Log Incoming Parcel</h3>
                <p className="text-xs font-semibold text-[#77798A]">Resident receives instant in-app notification</p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="w-8 h-8 rounded-full border border-[#303044] flex items-center justify-center font-black hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {regError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{regError}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Delivery Company / Provider *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Amazon', 'Swiggy', 'Zomato', 'Flipkart', 'BlueDart', 'DTDC'].map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setFormProvider(p)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all ${
                        formProvider === p
                          ? 'bg-[#C9F36B] border-[#303044] text-[#20243A]'
                          : 'bg-slate-100 border-transparent text-[#77798A] hover:bg-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amazon, FedEx, Courier"
                  value={formProvider}
                  onChange={(e) => setFormProvider(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as DeliveryCategory)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  >
                    <option value="ECOMMERCE">E-commerce</option>
                    <option value="FOOD">Food Delivery</option>
                    <option value="GROCERY">Grocery</option>
                    <option value="COURIER">Courier / Parcel</option>
                    <option value="DOCUMENTS">Documents</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Destination Flat *
                  </label>
                  <select
                    value={formFlatId}
                    onChange={(e) => {
                      setFormFlatId(e.target.value);
                      const f = flats.find((fl) => fl.id === e.target.value);
                      if (f?.residentName) {
                        setFormRecipient(f.residentName);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  >
                    {flats.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.wing}-{f.flatNumber} ({f.residentName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jonathan Patel"
                  value={formRecipient}
                  onChange={(e) => setFormRecipient(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Tracking Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TBA887123999"
                  value={formTracking}
                  onChange={(e) => setFormTracking(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303044]/20">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRegisterModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="lime"
                  size="sm"
                  disabled={regSubmitting}
                  className="shadow-[2px_2px_0px_#303044]"
                >
                  {regSubmitting ? 'Recording...' : 'Register & Notify Resident'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HANDOVER MODAL */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-2 border-[#303044] shadow-[6px_6px_0px_#303044] max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#303044]/20 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-[#20243A]">Confirm Parcel Handover</h3>
                <p className="text-xs font-semibold text-[#77798A]">
                  Flat {selectedDelivery.wing}-{selectedDelivery.flatNumber} • {selectedDelivery.provider}
                </p>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="w-8 h-8 rounded-full border border-[#303044] flex items-center justify-center font-black hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {handoverError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{handoverError}</span>
              </div>
            )}

            <form onSubmit={handleHandoverSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#FAF9FF] border border-[#303044]/20 space-y-1 text-xs">
                <div className="font-bold text-[#77798A]">Intended Recipient:</div>
                <div className="font-black text-sm text-[#20243A]">{selectedDelivery.recipientName}</div>
                <div className="text-[11px] text-[#77798A]">
                  Category: {selectedDelivery.category} • Received:{' '}
                  {new Date(selectedDelivery.receivedAt).toLocaleTimeString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Name of Person Collecting *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jonathan Patel (Self) or Family Member"
                  value={collectorName}
                  onChange={(e) => setCollectorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Handover Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Handed to domestic help / verified phone"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303044]/20">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedDelivery(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="lime"
                  size="sm"
                  disabled={handoverSubmitting}
                  className="shadow-[2px_2px_0px_#303044]"
                >
                  {handoverSubmitting ? 'Confirming...' : 'Confirm Handover ✓'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
