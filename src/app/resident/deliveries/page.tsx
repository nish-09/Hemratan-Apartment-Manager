'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Package,
  Clock,
  RefreshCw,
  CheckCircle2,
  BellRing,
  Car,
  AlertCircle,
  Building,
} from 'lucide-react';
import { DeliveryRecord, DeliveryNotificationRecord } from '@/services/delivery.service';
import { ParkingAllocationRecord } from '@/services/parking.service';

export default function ResidentDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [notifications, setNotifications] = useState<DeliveryNotificationRecord[]>([]);
  const [allocations, setAllocations] = useState<ParkingAllocationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResidentData();
  }, []);

  async function fetchResidentData() {
    try {
      setLoading(true);
      const [delRes, parkRes] = await Promise.all([
        fetch('/api/deliveries'),
        fetch('/api/parking/allocations'),
      ]);

      if (delRes.ok) {
        const delJson = await delRes.json();
        setDeliveries(delJson.deliveries || []);
        setNotifications(delJson.notifications || []);
      }

      if (parkRes.ok) {
        const parkJson = await parkRes.json();
        setAllocations(parkJson.allocations || []);
      }
    } catch (e) {
      console.error('Failed to load resident delivery and parking data', e);
    } finally {
      setLoading(false);
    }
  }

  const pendingDeliveries = deliveries.filter(
    (d) => d.status === 'RECEIVED' || d.status === 'NOTIFIED' || d.status === 'READY_FOR_COLLECTION'
  );
  const collectedDeliveries = deliveries.filter((d) => d.status === 'COLLECTED');

  return (
    <AppShell
      userName="Jonathan Patel"
      userRoleTitle="Resident • Flat A-402"
      activeRole="RESIDENT"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border-[1.5px] border-[#303044] shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Flat A-402 Deliveries & Parking</h1>
            <Badge variant="yellow">Private Flat Records</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Real-time parcel intake notifications and visitor parking space information
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchResidentData}
          className="gap-1.5"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* IN-APP NOTIFICATION BANNER */}
      {notifications.length > 0 && (
        <div className="bg-[#FAF7A7]/80 border-2 border-[#303044] rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_#303044] space-y-3">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-amber-900 animate-bounce" />
            <h2 className="text-sm sm:text-base font-black text-[#20243A]">
              Gate 1 Parcel Notifications ({notifications.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white p-3.5 rounded-xl border border-[#303044] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-[#20243A]">{notif.title}</span>
                  <Badge variant="green">At Gate 1</Badge>
                </div>
                <p className="text-[11px] font-semibold text-[#77798A]">{notif.message}</p>
                <span className="text-[10px] font-bold text-[#77798A] block pt-1">
                  Received {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PENDING PACKAGES AWAITING PICKUP */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#20243A]">
              Awaiting Collection at Gate 1 ({pendingDeliveries.length})
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Please show your resident name to the security guard for handover
            </p>
          </div>
          <Badge variant="yellow">{pendingDeliveries.length} Packages</Badge>
        </div>

        {pendingDeliveries.length === 0 ? (
          <div className="p-6 text-center text-xs font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
            No parcels currently waiting at the gate for Flat A-402.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDeliveries.map((del) => (
              <div
                key={del.id}
                className="p-4 rounded-xl border border-[#303044]/20 bg-[#FAF9FF] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-[#20243A]">{del.provider}</span>
                    <Badge variant="lavender">{del.category}</Badge>
                    {del.trackingNumber && (
                      <span className="text-[10px] font-bold text-[#77798A] bg-slate-100 px-1.5 py-0.5 rounded">
                        #{del.trackingNumber}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-[#77798A] mt-1">
                    Recipient: <span className="font-bold text-[#20243A]">{del.recipientName}</span> • Received at{' '}
                    {new Date(del.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <Badge variant="green" className="self-start sm:self-center font-bold">
                  Ready for Pickup
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VISITOR PARKING FOR FLAT A-402 */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#20243A]">
              Visitor Parking for Flat A-402 ({allocations.length})
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Society parking bays allocated to visitors visiting your residence
            </p>
          </div>
          <Badge variant="lavender">{allocations.length} Active</Badge>
        </div>

        {allocations.length === 0 ? (
          <div className="p-6 text-center text-xs font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
            No active visitor vehicles currently parked for Flat A-402.
          </div>
        ) : (
          <div className="space-y-3">
            {allocations.map((alloc) => (
              <div
                key={alloc.id}
                className="p-3.5 rounded-xl border border-[#303044]/20 bg-[#FAF9FF] flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF7A7] border border-[#303044] flex items-center justify-center font-black text-sm text-[#20243A]">
                    {alloc.parkingSpaceDisplayName}
                  </div>
                  <div>
                    <div className="font-black text-sm text-[#20243A] tracking-wider">
                      {alloc.vehicleNumber}
                    </div>
                    <div className="text-xs text-[#77798A]">
                      {alloc.vehicleType.replace('_', ' ')} • Parked since{' '}
                      {new Date(alloc.allocatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <Badge variant={alloc.status === 'OVERDUE' ? 'peach' : 'green'}>
                  {alloc.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RECENT COLLECTION HISTORY */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <h2 className="text-base font-extrabold text-[#20243A] mb-3">Past Deliveries Received</h2>

        {collectedDeliveries.length === 0 ? (
          <div className="p-6 text-center text-xs font-semibold text-[#77798A]">
            No previous delivery history on record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Provider</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Collected By</th>
                  <th className="py-2.5 px-3 text-right">Handover Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                {collectedDeliveries.map((del) => (
                  <tr key={del.id}>
                    <td className="py-2.5 px-3 font-bold">{del.provider}</td>
                    <td className="py-2.5 px-3 text-[#77798A]">{del.category}</td>
                    <td className="py-2.5 px-3">{del.recipientName}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-emerald-800">
                        {del.collectedByName || 'Self'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#77798A]">
                      {del.collectedAt
                        ? new Date(del.collectedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) +
                          ' ' +
                          new Date(del.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Collected'}
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
