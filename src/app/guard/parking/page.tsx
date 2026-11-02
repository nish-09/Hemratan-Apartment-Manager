'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import {
  Car,
  Clock,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Building,
  ShieldAlert,
} from 'lucide-react';
import { VehicleType, VehicleRestriction } from '@/services/parking.service';

interface ParkingSpaceWithStatus {
  id: string;
  displayName: string;
  parkingType: string;
  location: string;
  isActive: boolean;
  vehicleTypeRestriction: VehicleRestriction;
  computedStatus: 'AVAILABLE' | 'OCCUPIED' | 'OVERDUE' | 'INACTIVE';
  activeAllocation: {
    id: string;
    vehicleNumber: string;
    vehicleType: VehicleType;
    flatId?: string;
    status: string;
    expectedDurationMinutes: number;
    allocatedAt: string;
  } | null;
}

interface ParkingAvailabilityResponse {
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  overdueCount: number;
  recentlyVacatedCount: number;
  spaces: ParkingSpaceWithStatus[];
}

interface FlatOption {
  id: string;
  wing: string;
  flatNumber: string;
  residentName?: string;
}

export default function GuardParkingPage() {
  const [data, setData] = useState<ParkingAvailabilityResponse | null>(null);
  const [flats, setFlats] = useState<FlatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'grid' | 'allocations'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  // Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('FOUR_WHEELER');
  const [targetFlatId, setTargetFlatId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [allocNotes, setAllocNotes] = useState('');
  const [allocError, setAllocError] = useState('');
  const [allocSubmitting, setAllocSubmitting] = useState(false);

  // New Space Modal State (for Committee / Super Admin)
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceLocation, setNewSpaceLocation] = useState('Courtyard Gate 1');
  const [newSpaceRestriction, setNewSpaceRestriction] = useState<VehicleRestriction>('ANY');
  const [newSpaceSubmitting, setNewSpaceSubmitting] = useState(false);
  const [newSpaceError, setNewSpaceError] = useState('');

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFlats();
    fetchAvailability();
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
        if (options.length > 0 && !targetFlatId) {
          setTargetFlatId(options[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load flats', e);
    }
  }

  async function fetchAvailability() {
    try {
      setLoading(true);
      const res = await fetch('/api/parking/availability');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load parking availability', e);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenAllocate(spaceId?: string) {
    if (spaceId) {
      setSelectedSpaceId(spaceId);
    } else {
      const firstAvailable = data?.spaces.find((s) => s.computedStatus === 'AVAILABLE');
      if (firstAvailable) {
        setSelectedSpaceId(firstAvailable.id);
      }
    }
    setAllocError('');
    setShowAllocateModal(true);
  }

  async function handleAllocateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAllocError('');
    setAllocSubmitting(true);

    try {
      const res = await fetch('/api/parking/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parkingSpaceId: selectedSpaceId,
          vehicleNumber,
          vehicleType,
          flatId: targetFlatId,
          expectedDurationMinutes: durationMinutes,
          notes: allocNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to allocate parking');
      }

      setShowAllocateModal(false);
      setVehicleNumber('');
      setAllocNotes('');
      await fetchAvailability();
    } catch (err: any) {
      setAllocError(err.message || 'Allocation failed');
    } finally {
      setAllocSubmitting(false);
    }
  }

  async function handleCheckout(allocationId: string) {
    setActionLoading((prev) => ({ ...prev, [allocationId]: true }));
    try {
      const res = await fetch(`/api/parking/allocations/${allocationId}/checkout`, {
        method: 'POST',
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to checkout parking space');
        return;
      }

      await fetchAvailability();
    } catch (e: any) {
      alert(e.message || 'Checkout failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [allocationId]: false }));
    }
  }

  async function handleAddSpace(e: React.FormEvent) {
    e.preventDefault();
    setNewSpaceError('');
    setNewSpaceSubmitting(true);

    try {
      const res = await fetch('/api/parking/spaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: newSpaceName,
          location: newSpaceLocation,
          vehicleTypeRestriction: newSpaceRestriction,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to add space');
      }

      setShowAddSpaceModal(false);
      setNewSpaceName('');
      await fetchAvailability();
    } catch (err: any) {
      setNewSpaceError(err.message || 'Failed to add space');
    } finally {
      setNewSpaceSubmitting(false);
    }
  }

  const spaces = data?.spaces || [];
  const activeAllocations = spaces
    .filter((s) => s.activeAllocation)
    .map((s) => ({
      space: s,
      alloc: s.activeAllocation!,
    }))
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.space.displayName.toLowerCase().includes(q) ||
        item.alloc.vehicleNumber.toLowerCase().includes(q)
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
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Society Visitor Parking</h1>
            <Badge variant="green">Live Bay Monitoring</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Dynamic capacity management, real-time allocation, and automated overstay tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAvailability}
            className="gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="lime"
            size="sm"
            onClick={() => handleOpenAllocate()}
            disabled={data?.availableSpaces === 0}
            className="gap-2 shadow-[2px_2px_0px_#303044]"
          >
            <Car className="w-4 h-4" />
            <span>Allocate Parking</span>
          </Button>
        </div>
      </div>

      {/* 4 PASTEL STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bays"
          value={data?.totalSpaces || 5}
          subtitle="Configured Visitor Spaces"
          variant="blue"
          icon={<Car className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Available Now"
          value={data?.availableSpaces ?? 5}
          subtitle="Ready for Arrival"
          variant="mint"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-800" />}
        />
        <StatCard
          title="Occupied"
          value={data?.occupiedSpaces ?? 0}
          subtitle="Vehicles Parked"
          variant="yellow"
          icon={<Clock className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Overdue Overstay"
          value={data?.overdueCount ?? 0}
          subtitle="Duration Exceeded"
          variant="peach"
          icon={<ShieldAlert className="w-5 h-5 text-rose-700" />}
        />
      </div>

      {/* TABS & SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#303044]/20 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              activeTab === 'grid'
                ? 'bg-[#FAF7A7] text-[#20243A] border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#77798A] border-transparent hover:bg-slate-100'
            }`}
          >
            Visual Parking Grid ({spaces.length})
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              activeTab === 'allocations'
                ? 'bg-[#C9F2DE] text-[#20243A] border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#77798A] border-transparent hover:bg-slate-100'
            }`}
          >
            Active Parked Vehicles ({activeAllocations.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#77798A]" />
          <input
            type="text"
            placeholder="Search bay, plate number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
          />
        </div>
      </div>

      {/* VIEW 1: VISUAL PARKING BAY GRID */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {spaces.map((space) => {
              const isAvailable = space.computedStatus === 'AVAILABLE';
              const isOverdue = space.computedStatus === 'OVERDUE';
              const isOccupied = space.computedStatus === 'OCCUPIED';

              return (
                <div
                  key={space.id}
                  className={`rounded-2xl border-2 border-[#303044] p-4 flex flex-col justify-between transition-all ${
                    isOverdue
                      ? 'bg-[#FFE2DB] shadow-[4px_4px_0px_#E53E3E]'
                      : isOccupied
                      ? 'bg-[#FAF7A7] shadow-[3px_3px_0px_#303044]'
                      : isAvailable
                      ? 'bg-[#C9F2DE] shadow-[3px_3px_0px_#303044]'
                      : 'bg-slate-100 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xl font-black text-[#20243A]">{space.displayName}</span>
                      {isOverdue ? (
                        <Badge variant="peach" className="animate-pulse">
                          OVERDUE
                        </Badge>
                      ) : isOccupied ? (
                        <Badge variant="yellow">Occupied</Badge>
                      ) : isAvailable ? (
                        <Badge variant="green">Available</Badge>
                      ) : (
                        <Badge variant="neutral">Disabled</Badge>
                      )}
                    </div>

                    <p className="text-[11px] font-semibold text-[#77798A]">{space.location}</p>

                    <div className="mt-1">
                      <span className="text-[10px] font-black uppercase text-[#20243A] bg-white/70 px-1.5 py-0.5 rounded border border-[#303044]/20">
                        {space.vehicleTypeRestriction.replace('_', ' ')}
                      </span>
                    </div>

                    {space.activeAllocation && (
                      <div className="mt-3 bg-white p-2.5 rounded-xl border border-[#303044] space-y-1">
                        <span className="text-xs font-black text-[#20243A] block tracking-wider">
                          {space.activeAllocation.vehicleNumber}
                        </span>
                        <div className="text-[10px] font-bold text-[#77798A] flex items-center justify-between">
                          <span>{space.activeAllocation.vehicleType.replace('_', ' ')}</span>
                          <span>{space.activeAllocation.expectedDurationMinutes}m max</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#303044]/20">
                    {isAvailable ? (
                      <Button
                        variant="lime"
                        size="sm"
                        onClick={() => handleOpenAllocate(space.id)}
                        className="w-full text-xs font-black shadow-[2px_2px_0px_#303044]"
                      >
                        Allocate Bay
                      </Button>
                    ) : space.activeAllocation ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCheckout(space.activeAllocation!.id)}
                        disabled={actionLoading[space.activeAllocation.id]}
                        className="w-full text-xs font-bold gap-1 bg-white hover:bg-rose-100 hover:text-rose-900 border-[#303044]"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check Out</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: ACTIVE ALLOCATIONS LIST */}
      {activeTab === 'allocations' && (
        <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#20243A]">
                Actively Parked Vehicles ({activeAllocations.length})
              </h2>
              <p className="text-xs font-semibold text-[#77798A]">
                Real-time allocations linked to visitors and society bays
              </p>
            </div>
            <Badge variant="yellow">{activeAllocations.length} Parked</Badge>
          </div>

          {activeAllocations.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
              No vehicles currently allocated to visitor parking.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Vehicle Plate</th>
                    <th className="py-3 px-3">Parking Bay</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Parked At</th>
                    <th className="py-3 px-3">Allowed Duration</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                  {activeAllocations.map(({ space, alloc }) => (
                    <tr key={alloc.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <span className="font-black text-sm text-[#20243A] tracking-wider bg-slate-100 px-2 py-0.5 rounded border border-[#303044]/20">
                          {alloc.vehicleNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-black text-sm text-[#20243A]">
                        {space.displayName}
                      </td>
                      <td className="py-3 px-3 text-[#77798A]">
                        {alloc.vehicleType.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-3 text-[#77798A]">
                        {new Date(alloc.allocatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3 text-[#77798A]">
                        {alloc.expectedDurationMinutes} mins
                      </td>
                      <td className="py-3 px-3">
                        {space.computedStatus === 'OVERDUE' ? (
                          <Badge variant="peach" className="animate-pulse">
                            OVERDUE
                          </Badge>
                        ) : (
                          <Badge variant="green">Active</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCheckout(alloc.id)}
                          disabled={actionLoading[alloc.id]}
                          className="gap-1 font-bold border-[#303044] hover:bg-rose-100 hover:text-rose-900"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Release</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ALLOCATE MODAL */}
      {showAllocateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-2 border-[#303044] shadow-[6px_6px_0px_#303044] max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#303044]/20 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-[#20243A]">Allocate Parking Space</h3>
                <p className="text-xs font-semibold text-[#77798A]">For visitor vehicle arriving at gate</p>
              </div>
              <button
                onClick={() => setShowAllocateModal(false)}
                className="w-8 h-8 rounded-full border border-[#303044] flex items-center justify-center font-black hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {allocError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{allocError}</span>
              </div>
            )}

            <form onSubmit={handleAllocateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Select Available Bay *
                </label>
                <select
                  required
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                >
                  {spaces
                    .filter((s) => s.isActive)
                    .map((s) => (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={s.computedStatus !== 'AVAILABLE'}
                      >
                        {s.displayName} ({s.location}) — {s.computedStatus} [{s.vehicleTypeRestriction}]
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Vehicle Registration Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MH 02 AB 1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-black tracking-widest rounded-xl border border-[#303044]/30 uppercase focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Vehicle Type *
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  >
                    <option value="FOUR_WHEELER">4-Wheeler (Car)</option>
                    <option value="TWO_WHEELER">2-Wheeler (Bike)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Expected Duration *
                  </label>
                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  >
                    <option value={30}>30 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours (Standard)</option>
                    <option value={240}>4 hours</option>
                    <option value={480}>8 hours (Full day)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Destination Flat *
                </label>
                <select
                  value={targetFlatId}
                  onChange={(e) => setTargetFlatId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                >
                  {flats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.wing}-{f.flatNumber} ({f.residentName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303044]/20">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAllocateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="lime"
                  size="sm"
                  disabled={allocSubmitting}
                  className="shadow-[2px_2px_0px_#303044]"
                >
                  {allocSubmitting ? 'Allocating...' : 'Confirm Allocation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
