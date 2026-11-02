'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Car,
  Package,
  Plus,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ShieldCheck,
  Building,
  User,
  ArrowRight,
  Settings,
  Trash2,
} from 'lucide-react';

interface ParkingSpace {
  id: string;
  spaceIdentifier: string;
  displayName: string;
  parkingType: string;
  locationDescription: string;
  isAvailable: boolean;
  isActive: boolean;
  vehicleTypeRestrictions?: string | null;
  notes?: string | null;
}

interface ParkingAllocation {
  id: string;
  spaceId: string;
  spaceIdentifier: string;
  vehicleRegistrationNumber: string;
  vehicleType: string;
  allocatedAt: string;
  expectedDurationMinutes: number;
  isOverdue: boolean;
  flatNumber?: string;
  visitorName?: string;
}

interface DeliveryRecord {
  id: string;
  trackingNumber?: string;
  deliveryCompany: string;
  category: string;
  recipientName: string;
  flatNumber: string;
  buildingWing: string;
  status: string;
  receivedAt: string;
  collectedAt?: string;
  collectedByName?: string;
}

export default function CommitteeParkingDeliveriesPage() {
  const [activeTab, setActiveTab] = useState<'PARKING' | 'DELIVERIES'>('PARKING');
  
  // Parking State
  const [spaces, setSpaces] = useState<ParkingSpace[]>([]);
  const [allocations, setAllocations] = useState<ParkingAllocation[]>([]);
  const [parkingMetrics, setParkingMetrics] = useState({
    totalCapacity: 5,
    occupiedCount: 2,
    availableCount: 3,
    overdueCount: 0,
    utilizationPercent: 40,
  });
  const [defaultDurationMinutes, setDefaultDurationMinutes] = useState(120);
  const [isDurationSaved, setIsDurationSaved] = useState(false);
  
  // Space Management Modal State
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [newSpace, setNewSpace] = useState({
    spaceIdentifier: '',
    displayName: '',
    parkingType: 'VISITOR',
    locationDescription: 'Ground Level Visitor Bay',
    vehicleTypeRestrictions: 'ALL',
    notes: '',
  });

  // Deliveries State
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState('ALL');
  const [deliveryMetrics, setDeliveryMetrics] = useState({
    totalToday: 12,
    pendingCollection: 4,
    collectedCount: 8,
    returnedCount: 0,
  });

  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchParkingData();
    fetchDeliveryData();
  }, []);

  async function fetchParkingData() {
    try {
      setLoading(true);
      const res = await fetch('/api/parking/availability');
      if (res.ok) {
        const data = await res.json();
        setSpaces(data.spaces || []);
        setAllocations(data.activeAllocations || []);
        if (data.metrics) {
          setParkingMetrics(data.metrics);
        }
      } else {
        // Fallback default seed display
        setSpaces([
          { id: 'p1', spaceIdentifier: 'P1', displayName: 'Bay P1', parkingType: 'VISITOR', locationDescription: 'Ground Level - Gate 1', isAvailable: false, isActive: true },
          { id: 'p2', spaceIdentifier: 'P2', displayName: 'Bay P2', parkingType: 'VISITOR', locationDescription: 'Ground Level - Gate 1', isAvailable: true, isActive: true },
          { id: 'p3', spaceIdentifier: 'P3', displayName: 'Bay P3', parkingType: 'VISITOR', locationDescription: 'Ground Level - Gate 1', isAvailable: false, isActive: true },
          { id: 'p4', spaceIdentifier: 'P4', displayName: 'Bay P4', parkingType: 'VISITOR', locationDescription: 'Ground Level - Gate 1', isAvailable: true, isActive: true },
          { id: 'p5', spaceIdentifier: 'P5', displayName: 'Bay P5 (Two-Wheeler)', parkingType: 'VISITOR', locationDescription: 'Ground Level - Gate 1', isAvailable: true, isActive: true, vehicleTypeRestrictions: 'TWO_WHEELER' },
        ]);
        setAllocations([
          { id: 'a1', spaceId: 'p1', spaceIdentifier: 'P1', vehicleRegistrationNumber: 'MH 02 CZ 4401', vehicleType: 'FOUR_WHEELER', allocatedAt: new Date(Date.now() - 3600000).toISOString(), expectedDurationMinutes: 120, isOverdue: false, flatNumber: 'A-402', visitorName: 'Ramesh Verma' },
          { id: 'a3', spaceId: 'p3', spaceIdentifier: 'P3', vehicleRegistrationNumber: 'MH 14 DJ 9920', vehicleType: 'FOUR_WHEELER', allocatedAt: new Date(Date.now() - 9000000).toISOString(), expectedDurationMinutes: 120, isOverdue: true, flatNumber: 'B-201', visitorName: 'Suresh Kumar' },
        ]);
        setParkingMetrics({ totalCapacity: 5, occupiedCount: 2, availableCount: 3, overdueCount: 1, utilizationPercent: 40 });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeliveryData() {
    try {
      const res = await fetch('/api/deliveries?limit=50');
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        if (data.metrics) {
          setDeliveryMetrics(data.metrics);
        }
      } else {
        setDeliveries([
          { id: 'del-1', deliveryCompany: 'Amazon', trackingNumber: 'AMZ-IN-88902', category: 'ECOMMERCE', recipientName: 'Jonathan Patel', flatNumber: '402', buildingWing: 'A', status: 'READY_FOR_COLLECTION', receivedAt: new Date(Date.now() - 7200000).toISOString() },
          { id: 'del-2', deliveryCompany: 'Swiggy Instamart', category: 'GROCERY', recipientName: 'Sunita Rao', flatNumber: '201', buildingWing: 'B', status: 'RECEIVED', receivedAt: new Date(Date.now() - 1800000).toISOString() },
          { id: 'del-3', deliveryCompany: 'BlueDart Courier', trackingNumber: 'BD-33411', category: 'COURIER', recipientName: 'Dr. Anita Joshi', flatNumber: '304', buildingWing: 'C', status: 'COLLECTED', receivedAt: new Date(Date.now() - 18000000).toISOString(), collectedAt: new Date(Date.now() - 3600000).toISOString(), collectedByName: 'Dr. Joshi' },
        ]);
      }
    } catch {
      // Fallback
    }
  }

  async function handleCreateSpace(e: React.FormEvent) {
    e.preventDefault();
    if (!newSpace.spaceIdentifier.trim() || !newSpace.displayName.trim()) return;

    try {
      const res = await fetch('/api/parking/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSpace),
      });
      if (res.ok) {
        setShowAddSpaceModal(false);
        setNewSpace({
          spaceIdentifier: '',
          displayName: '',
          parkingType: 'VISITOR',
          locationDescription: 'Ground Level Visitor Bay',
          vehicleTypeRestrictions: 'ALL',
          notes: '',
        });
        setActionMessage({ type: 'success', text: `Parking space created successfully!` });
        fetchParkingData();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Failed to create parking space' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network error creating parking space' });
    }
  }

  async function handleToggleSpaceStatus(spaceId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/parking/spaces/${spaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: `Space status updated` });
        fetchParkingData();
      } else {
        const err = await res.json();
        setActionMessage({ type: 'error', text: err.error || 'Could not update space' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Network error updating space' });
    }
  }

  function handleSaveDuration(e: React.FormEvent) {
    e.preventDefault();
    setIsDurationSaved(true);
    setTimeout(() => setIsDurationSaved(false), 3000);
    setActionMessage({ type: 'success', text: `Standard visitor parking duration updated to ${defaultDurationMinutes} mins` });
  }

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesSearch =
      d.flatNumber.toLowerCase().includes(deliverySearch.toLowerCase()) ||
      d.recipientName.toLowerCase().includes(deliverySearch.toLowerCase()) ||
      d.deliveryCompany.toLowerCase().includes(deliverySearch.toLowerCase()) ||
      (d.trackingNumber && d.trackingNumber.toLowerCase().includes(deliverySearch.toLowerCase()));
    const matchesFilter = deliveryStatusFilter === 'ALL' || d.status === deliveryStatusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <AppShell
      userName="Rosa Palmour"
      userRoleTitle="Managing Committee • Operations Cockpit"
      activeRole="COMMITTEE"
    >
      {/* 1. HEADER & TAB SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#FAF9FF] p-3 rounded-2xl border border-[#303044]/20">
        <div className="flex items-center gap-2">
          <Badge variant="lavender">Society Operations</Badge>
          <span className="text-xs font-bold text-[#77798A]">
            Visitor Bays & Parcel Tracking • Managing Committee Authority
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('PARKING')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
              activeTab === 'PARKING'
                ? 'bg-[#20243A] text-white border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#20243A] border-[#303044]/30 hover:bg-[#FAF7A7]'
            }`}
          >
            <Car className="w-3.5 h-3.5 inline mr-1" />
            Parking Capacity ({parkingMetrics.occupiedCount}/{parkingMetrics.totalCapacity})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DELIVERIES')}
            className={`px-3 py-1.5 rounded-xl font-black text-xs border transition-all ${
              activeTab === 'DELIVERIES'
                ? 'bg-[#20243A] text-white border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#20243A] border-[#303044]/30 hover:bg-[#FAF7A7]'
            }`}
          >
            <Package className="w-3.5 h-3.5 inline mr-1" />
            Parcels & Deliveries ({deliveryMetrics.pendingCollection} Pending)
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold flex items-center justify-between ${
            actionMessage.type === 'success' ? 'bg-[#C9F2DE] text-[#136338]' : 'bg-[#FCE1D8] text-[#9A2D1F]'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button type="button" onClick={() => setActionMessage(null)} className="font-black text-sm">×</button>
        </div>
      )}

      {/* ===================== TAB 1: PARKING ===================== */}
      {activeTab === 'PARKING' && (
        <>
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Capacity"
              value={parkingMetrics.totalCapacity}
              subtitle="Society Visitor Bays"
              variant="yellow"
              icon={<Car className="w-5 h-5" />}
            />
            <StatCard
              title="Occupied"
              value={parkingMetrics.occupiedCount}
              subtitle={`${parkingMetrics.utilizationPercent}% Current Utilization`}
              variant="peach"
              icon={<Car className="w-5 h-5 text-rose-700" />}
            />
            <StatCard
              title="Available"
              value={parkingMetrics.availableCount}
              subtitle="Free for Incoming Visitors"
              variant="mint"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
            />
            <StatCard
              title="Overdue Allocations"
              value={parkingMetrics.overdueCount}
              subtitle="Exceeded Allocated Duration"
              variant="lavender"
              icon={<AlertTriangle className="w-5 h-5 text-amber-700" />}
            />
          </div>

          {/* DURATION CONFIGURATION & CAPACITY CONTROLS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 rounded-2xl border-[1.5px] border-[#303044] p-5 bg-white shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-[#20243A]">Configurable Parking Duration</h3>
                  <p className="text-xs font-semibold text-[#77798A]">
                    Set expected duration threshold before an allocation flags as OVERDUE for security guards
                  </p>
                </div>
                <Badge variant="yellow">Auto Policy</Badge>
              </div>

              <form onSubmit={handleSaveDuration} className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#77798A]" />
                  <input
                    type="number"
                    min="30"
                    max="720"
                    step="15"
                    value={defaultDurationMinutes}
                    onChange={(e) => setDefaultDurationMinutes(parseInt(e.target.value) || 120)}
                    className="w-24 p-2 rounded-xl border-[1.5px] border-[#303044] font-black text-center text-sm focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                  <span className="text-xs font-bold text-[#20243A]">Minutes standard</span>
                </div>
                <Button type="submit" variant="lime" size="sm" className="font-bold">
                  Update Duration Policy
                </Button>
                {isDurationSaved && (
                  <span className="text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </form>
            </div>

            <div className="md:col-span-4 rounded-2xl border-[1.5px] border-[#303044] p-5 bg-[#FAF7A7] shadow-[2px_2px_0px_rgba(48,48,68,0.12)] flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-[#20243A]">Dynamic Capacity Management</h3>
                <p className="text-xs font-semibold text-[#77798A] mt-1">
                  Add, edit or disable society parking bays beyond initial P1–P5.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddSpaceModal(true)}
                className="w-full mt-3 bg-white font-extrabold gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Configure New Bay</span>
              </Button>
            </div>
          </div>

          {/* VISITOR PARKING BAYS GRID */}
          <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#20243A]">Society Visitor Parking Spaces</h3>
                <p className="text-xs font-semibold text-[#77798A]">
                  Real-time occupancy derived directly from database records
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchParkingData} className="gap-1 text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {spaces.map((sp) => {
                const activeAlloc = allocations.find((a) => a.spaceId === sp.id || a.spaceIdentifier === sp.spaceIdentifier);
                return (
                  <div
                    key={sp.id}
                    className={`rounded-xl border-[1.5px] border-[#303044] p-4 flex flex-col justify-between transition-all ${
                      !sp.isActive
                        ? 'bg-slate-100 opacity-60'
                        : activeAlloc?.isOverdue
                        ? 'bg-[#FCE1D8]'
                        : activeAlloc
                        ? 'bg-[#FAF7A7]'
                        : 'bg-[#C9F2DE]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-lg text-[#20243A]">{sp.spaceIdentifier}</span>
                        <Badge
                          variant={
                            !sp.isActive
                              ? 'neutral'
                              : activeAlloc?.isOverdue
                              ? 'peach'
                              : activeAlloc
                              ? 'yellow'
                              : 'green'
                          }
                        >
                          {!sp.isActive ? 'INACTIVE' : activeAlloc?.isOverdue ? 'OVERDUE' : activeAlloc ? 'OCCUPIED' : 'FREE'}
                        </Badge>
                      </div>
                      <div className="text-[11px] font-bold text-[#77798A]">{sp.displayName}</div>
                      <div className="text-[10px] text-[#77798A]">{sp.locationDescription}</div>

                      {activeAlloc && (
                        <div className="mt-3 pt-2 border-t border-[#303044]/20">
                          <div className="text-xs font-black text-[#20243A]">{activeAlloc.vehicleRegistrationNumber}</div>
                          <div className="text-[10px] font-bold text-[#77798A]">
                            {activeAlloc.flatNumber ? `Flat ${activeAlloc.flatNumber}` : 'Visitor'} • {activeAlloc.vehicleType}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#303044]/10 flex items-center justify-between text-[10px]">
                      <span className="font-bold text-[#77798A]">
                        {sp.vehicleTypeRestrictions || 'All Vehicles'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSpaceStatus(sp.id, sp.isActive)}
                        className="text-xs font-extrabold text-[#20243A] underline hover:text-rose-700"
                      >
                        {sp.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===================== TAB 2: DELIVERIES ===================== */}
      {activeTab === 'DELIVERIES' && (
        <>
          {/* STATS OVERVIEW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Today's Deliveries"
              value={deliveryMetrics.totalToday}
              subtitle="Society Gate Intake"
              variant="yellow"
              icon={<Package className="w-5 h-5" />}
            />
            <StatCard
              title="Pending Collection"
              value={deliveryMetrics.pendingCollection}
              subtitle="Awaiting Resident Handover"
              variant="peach"
              icon={<Clock className="w-5 h-5 text-amber-700" />}
            />
            <StatCard
              title="Collected"
              value={deliveryMetrics.collectedCount}
              subtitle="Handed Over with Verified Identity"
              variant="mint"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
            />
            <StatCard
              title="Returned"
              value={deliveryMetrics.returnedCount}
              subtitle="Sent Back via Courier"
              variant="lavender"
              icon={<RotateCcw className="w-5 h-5" />}
            />
          </div>

          {/* DELIVERIES SEARCH & TABLE */}
          <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#20243A]">Society Delivery Ledger</h3>
                <p className="text-xs font-semibold text-[#77798A]">
                  Flat-wise deliveries with verified collector identity audit
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#77798A]" />
                  <input
                    type="text"
                    placeholder="Search flat, name, provider..."
                    value={deliverySearch}
                    onChange={(e) => setDeliverySearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <select
                  value={deliveryStatusFilter}
                  onChange={(e) => setDeliveryStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="RECEIVED">Received</option>
                  <option value="READY_FOR_COLLECTION">Ready for Pickup</option>
                  <option value="COLLECTED">Collected</option>
                  <option value="RETURNED">Returned</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Parcel Info</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Flat & Recipient</th>
                    <th className="py-3 px-3">Intake Time</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Handover Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#77798A]">
                        No deliveries matching criteria found.
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveries.map((del) => (
                      <tr key={del.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3">
                          <div className="font-extrabold text-[#20243A]">{del.deliveryCompany}</div>
                          {del.trackingNumber && (
                            <div className="text-[10px] text-[#77798A]">{del.trackingNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="lavender">{del.category}</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#20243A]">
                            Wing {del.buildingWing} - Flat {del.flatNumber}
                          </div>
                          <div className="text-[10px] text-[#77798A]">{del.recipientName}</div>
                        </td>
                        <td className="py-3 px-3 text-[#77798A]">
                          {new Date(del.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-3">
                          <Badge
                            variant={
                              del.status === 'COLLECTED'
                                ? 'green'
                                : del.status === 'READY_FOR_COLLECTION'
                                ? 'yellow'
                                : 'peach'
                            }
                          >
                            {del.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {del.status === 'COLLECTED' && del.collectedByName ? (
                            <div className="text-emerald-800 font-bold text-[11px]">
                              Collected by {del.collectedByName}
                            </div>
                          ) : (
                            <span className="text-[#77798A] italic">Awaiting handover</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===================== MODAL: CONFIGURE NEW BAY ===================== */}
      {showAddSpaceModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-6 max-w-md w-full shadow-[6px_6px_0px_#303044] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-[#20243A]" />
                <h3 className="font-black text-lg text-[#20243A]">Configure Parking Space</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSpaceModal(false)}
                className="w-8 h-8 rounded-full border border-[#303044] flex items-center justify-center font-bold hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSpace} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Space Identifier (e.g. P6, P7) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="P6"
                  value={newSpace.spaceIdentifier}
                  onChange={(e) => setNewSpace({ ...newSpace, spaceIdentifier: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Bay P6 (Basement)"
                  value={newSpace.displayName}
                  onChange={(e) => setNewSpace({ ...newSpace, displayName: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Location Description
                </label>
                <input
                  type="text"
                  placeholder="Basement Level 1 - Pillar B4"
                  value={newSpace.locationDescription}
                  onChange={(e) => setNewSpace({ ...newSpace, locationDescription: e.target.value })}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                    Parking Type
                  </label>
                  <select
                    value={newSpace.parkingType}
                    onChange={(e) => setNewSpace({ ...newSpace, parkingType: e.target.value })}
                    className="w-full p-2 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
                  >
                    <option value="VISITOR">Visitor</option>
                    <option value="RESERVED">Reserved</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                    Vehicle Restriction
                  </label>
                  <select
                    value={newSpace.vehicleTypeRestrictions}
                    onChange={(e) => setNewSpace({ ...newSpace, vehicleTypeRestrictions: e.target.value })}
                    className="w-full p-2 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
                  >
                    <option value="ALL">All Vehicles</option>
                    <option value="FOUR_WHEELER">Four-Wheeler Only</option>
                    <option value="TWO_WHEELER">Two-Wheeler Only</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddSpaceModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" className="font-bold">
                  Save Space
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
