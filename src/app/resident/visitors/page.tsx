'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  UserPlus,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { AgeRange, VisitRecord } from '@/services/visitor.service';

export default function ResidentVisitorsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreApproveModal, setShowPreApproveModal] = useState(false);

  // Pre-approve form state
  const [guestName, setGuestName] = useState('');
  const [guestMobile, setGuestMobile] = useState('');
  const [guestAgeRange, setGuestAgeRange] = useState<AgeRange>('31_TO_50');
  const [guestPurpose, setGuestPurpose] = useState('Personal / Guest Visit');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [preApproveSuccess, setPreApproveSuccess] = useState<{ message: string; otp?: string } | null>(null);

  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchResidentVisits();
  }, []);

  async function fetchResidentVisits() {
    try {
      setLoading(true);
      const res = await fetch('/api/visitors');
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch (e) {
      console.error('Failed to load resident visits', e);
    } finally {
      setLoading(false);
    }
  }

  // Resident Pre-Approval Submit
  async function handlePreApprove(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setPreApproveSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: guestName,
          mobileNumber: guestMobile,
          ageRange: guestAgeRange,
          flatId: 'flat-a-402', // Resident's flat
          purpose: guestPurpose,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to pre-approve guest');
      }

      setPreApproveSuccess({
        message: `Guest pre-approved! An entry OTP has been assigned.`,
        otp: data.rawOtp,
      });

      setGuestName('');
      setGuestMobile('');
      await fetchResidentVisits();
    } catch (err: any) {
      setFormError(err.message || 'Pre-approval error');
    } finally {
      setSubmitting(false);
    }
  }

  // Resident 1-Click App Approval for Incoming Gate Request
  async function handleResidentDecision(visitId: string, status: 'APPROVED' | 'REJECTED') {
    setActionLoading((prev) => ({ ...prev, [visitId]: true }));
    try {
      const res = await fetch(`/api/visitors/${visitId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'RESIDENT_APP',
          status,
          notes:
            status === 'APPROVED'
              ? '1-Click approved via Resident Mobile App'
              : 'Declined by resident via Resident Mobile App',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to record approval decision');
        return;
      }

      await fetchResidentVisits();
    } catch (e: any) {
      alert(e.message || 'Decision failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [visitId]: false }));
    }
  }

  // Split visits
  const pendingApprovals = visits.filter(
    (v) => (v.status === 'PENDING_CHECKS' || v.status === 'OTP_VERIFIED') && !v.residentApproved
  );
  const activeInside = visits.filter((v) => v.status === 'INSIDE');
  const pastVisits = visits.filter(
    (v) => v.status === 'COMPLETED' || v.status === 'REJECTED' || (v.status === 'APPROVED' && !v.entryTime)
  );

  return (
    <AppShell
      userName="Jonathan Patel"
      userRoleTitle="Resident • Flat A-402"
      activeRole="RESIDENT"
    >
      {/* Header with Flat Badge & Pre-Approve Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border-[1.5px] border-[#303044] shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Flat A-402 Visitors</h1>
            <Badge variant="yellow">Private Flat Access</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Pre-approve expected visitors or grant instant app clearance for gate arrivals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchResidentVisits}
            className="gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="lime"
            size="sm"
            onClick={() => setShowPreApproveModal(true)}
            className="gap-2 shadow-[2px_2px_0px_#303044]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Pre-Approve Guest</span>
          </Button>
        </div>
      </div>

      {/* INCOMING GATE REQUESTS WAITING FOR RESIDENT APPROVAL */}
      {pendingApprovals.length > 0 && (
        <div className="bg-[#FAF7A7]/70 border-2 border-[#303044] rounded-2xl p-5 shadow-[3px_3px_0px_#303044]">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-900" />
            <h2 className="text-base font-black text-[#20243A]">
              Arrival At Gate — Action Required ({pendingApprovals.length})
            </h2>
          </div>

          <div className="space-y-3">
            {pendingApprovals.map((visit) => (
              <div
                key={visit.id}
                className="bg-white rounded-xl border border-[#303044] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-[#20243A]">{visit.visitor.fullName}</span>
                    <Badge variant="lavender">Age: {visit.visitor.ageRange.replace('_', ' ')}</Badge>
                    {visit.otpVerified && (
                      <Badge variant="green" className="text-[10px]">
                        ✓ OTP Verified
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-[#77798A] mt-1">
                    Purpose: <span className="font-bold text-[#20243A]">{visit.purpose}</span> • Mobile: {visit.visitor.mobileNumber}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="lime"
                    size="sm"
                    disabled={actionLoading[visit.id]}
                    onClick={() => handleResidentDecision(visit.id, 'APPROVED')}
                    className="gap-1 font-black shadow-[2px_2px_0px_#303044]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Entry</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actionLoading[visit.id]}
                    onClick={() => handleResidentDecision(visit.id, 'REJECTED')}
                    className="text-rose-700 hover:bg-rose-100 font-bold"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVE VISITORS CURRENTLY INSIDE */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-[#20243A]">
              Currently Visiting Flat A-402 ({activeInside.length})
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Visitors confirmed inside the building visiting your residence
            </p>
          </div>
          <Badge variant="green">{activeInside.length} In Flat</Badge>
        </div>

        {activeInside.length === 0 ? (
          <div className="p-6 text-center text-xs font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
            No active visitors currently in flat A-402.
          </div>
        ) : (
          <div className="space-y-3">
            {activeInside.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-[#303044]/20 bg-[#FAF9FF]"
              >
                <div>
                  <div className="font-extrabold text-sm text-[#20243A]">{v.visitor.fullName}</div>
                  <div className="text-xs text-[#77798A] flex items-center gap-2 mt-0.5">
                    <span>{v.purpose}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Entered at{' '}
                      {v.entryTime
                        ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Recently'}
                    </span>
                  </div>
                </div>
                <Badge variant="green">Inside Flat</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAST VISITOR HISTORY LOG */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <h2 className="text-base font-extrabold text-[#20243A] mb-3">Recent Visitor Log for Flat A-402</h2>

        {pastVisits.length === 0 ? (
          <div className="p-6 text-center text-xs font-semibold text-[#77798A]">
            No previous visitor history on record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase">
                <tr>
                  <th className="py-2.5 px-3">Visitor</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Clearance Method</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                {pastVisits.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 px-3">
                      <div className="font-bold">{v.visitor.fullName}</div>
                      <div className="text-[10px] text-[#77798A]">{v.visitor.mobileNumber}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[#77798A]">{v.purpose}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] font-bold text-[#4A329A]">
                        {v.approvalRecord?.channel.replace('_', ' ') || 'Gate Intercom'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {v.status === 'COMPLETED' ? (
                        <Badge variant="green">Departed</Badge>
                      ) : v.status === 'REJECTED' ? (
                        <Badge variant="peach">Declined</Badge>
                      ) : (
                        <Badge variant="yellow">Pre-Approved</Badge>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#77798A]">
                      {new Date(v.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PRE-APPROVE MODAL */}
      {showPreApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-2 border-[#303044] shadow-[6px_6px_0px_#303044] max-w-md w-full p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#303044]/20 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-[#20243A]">Pre-Approve a Visitor</h3>
                <p className="text-xs font-semibold text-[#77798A]">For Flat A-402 (Jonathan Patel)</p>
              </div>
              <button
                onClick={() => {
                  setShowPreApproveModal(false);
                  setPreApproveSuccess(null);
                }}
                className="w-8 h-8 rounded-full border border-[#303044] flex items-center justify-center font-black hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold">
                {formError}
              </div>
            )}

            {preApproveSuccess ? (
              <div className="p-4 rounded-2xl bg-[#C9F2DE] border border-[#303044] text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-800 mx-auto" />
                <h4 className="text-sm font-black text-emerald-950">Pre-Approval Active!</h4>
                <p className="text-xs font-bold text-emerald-900">{preApproveSuccess.message}</p>
                {preApproveSuccess.otp && (
                  <div className="bg-white p-3 rounded-xl border border-[#303044] inline-block">
                    <span className="text-[10px] font-bold text-[#77798A] block">Guest Entry Code</span>
                    <span className="text-2xl font-black tracking-widest text-[#20243A]">
                      {preApproveSuccess.otp}
                    </span>
                  </div>
                )}
                <div>
                  <Button
                    variant="lime"
                    size="sm"
                    onClick={() => {
                      setShowPreApproveModal(false);
                      setPreApproveSuccess(null);
                    }}
                    className="w-full font-black shadow-[2px_2px_0px_#303044]"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePreApprove} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Guest Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Mahindra"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Mobile Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9820011223"
                    value={guestMobile}
                    onChange={(e) => setGuestMobile(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Age Bracket (Privacy-Preserved) *
                  </label>
                  <select
                    value={guestAgeRange}
                    onChange={(e) => setGuestAgeRange(e.target.value as AgeRange)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  >
                    <option value="UNDER_18">Under 18</option>
                    <option value="18_TO_30">18 - 30 years</option>
                    <option value="31_TO_50">31 - 50 years</option>
                    <option value="51_TO_65">51 - 65 years</option>
                    <option value="ABOVE_65">Above 65 years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Visit Purpose *
                  </label>
                  <input
                    type="text"
                    required
                    value={guestPurpose}
                    onChange={(e) => setGuestPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303044]/20">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowPreApproveModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="lime"
                    size="sm"
                    disabled={submitting}
                    className="shadow-[2px_2px_0px_#303044]"
                  >
                    {submitting ? 'Generating Pass...' : 'Create Pre-Approval'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
