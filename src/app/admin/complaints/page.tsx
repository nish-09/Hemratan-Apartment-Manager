'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  EyeOff,
  UserCheck,
  Calendar,
  Flame,
  Search,
  SlidersHorizontal,
  Plus,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  Complaint,
  PriorityLevel,
  StaffMember,
  INITIAL_STAFF,
} from '@/services/complaint.service';

export default function CommitteeComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    critical: 0,
    high: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    overdueTasks: 0,
    activeTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  // Override Priority Modal
  const [overrideTarget, setOverrideTarget] = useState<Complaint | null>(null);
  const [overridePriorityVal, setOverridePriorityVal] = useState<PriorityLevel>('HIGH');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Assign Task Modal
  const [assignTarget, setAssignTarget] = useState<Complaint | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('staff-002');
  const [taskTitle, setTaskTitle] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  // Confirm ETA Modal
  const [etaTarget, setEtaTarget] = useState<Complaint | null>(null);
  const [etaInput, setEtaInput] = useState('');
  const [etaNotes, setEtaNotes] = useState('');
  const [etaSubmitting, setEtaSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  async function fetchComplaints() {
    setLoading(true);
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const json = await res.json();
        setComplaints(json.complaints || []);
        if (json.metrics) {
          setMetrics(json.metrics);
        }
      } else {
        // Fallback default sample data
        setComplaints([
          {
            id: 'cmp-01',
            referenceNo: 'CMP-20261102-1042',
            title: 'Water Seepage in Basement Parking near P2',
            description: 'Water drops dripping continuously from 5th floor balcony during rains.',
            category: 'PLUMBING',
            flatId: 'flat-402',
            flatNumber: '402',
            wing: 'A',
            isAnonymous: false,
            severity: 'HIGH',
            urgency: 'HIGH',
            affectedFlatsCount: 2,
            propertyDamage: true,
            recurrence: true,
            safetyOverrideTriggered: false,
            computedScore: 78,
            priorityBand: 'HIGH',
            effectivePriority: 'HIGH',
            priorityExplanation: {
              score: 78,
              priorityBand: 'HIGH',
              safetyOverrideTriggered: false,
              factors: { severityPoints: 28, urgencyPoints: 18, affectedFlatsPoints: 10, recurrencePoints: 10, propertyDamagePoints: 5 },
              explanation: 'Deterministic score: 78/100 -> Band: HIGH',
            },
            status: 'TRIAGED',
            createdByName: 'Jonathan Patel',
            reopenedCount: 0,
            media: [],
            createdAt: new Date(Date.now() - 36000000).toISOString(),
            updatedAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'cmp-02',
            referenceNo: 'CMP-20261102-0981',
            title: 'Late night party music noise in Wing B',
            description: 'Loud subwoofer music past 1:30 AM.',
            category: 'NOISE',
            isAnonymous: true,
            severity: 'MEDIUM',
            urgency: 'HIGH',
            affectedFlatsCount: 6,
            propertyDamage: false,
            recurrence: true,
            safetyOverrideTriggered: false,
            computedScore: 59,
            priorityBand: 'MEDIUM',
            effectivePriority: 'MEDIUM',
            priorityExplanation: {
              score: 59,
              priorityBand: 'MEDIUM',
              safetyOverrideTriggered: false,
              factors: { severityPoints: 16, urgencyPoints: 18, affectedFlatsPoints: 15, recurrencePoints: 10, propertyDamagePoints: 0 },
              explanation: 'Deterministic score: 59/100 -> Band: MEDIUM',
            },
            status: 'OPEN',
            createdByName: 'Anonymous Resident',
            reopenedCount: 0,
            media: [],
            createdAt: new Date(Date.now() - 54000000).toISOString(),
            updatedAt: new Date(Date.now() - 54000000).toISOString(),
          },
        ]);
        setMetrics({
          total: 2,
          critical: 0,
          high: 1,
          open: 1,
          inProgress: 1,
          resolved: 0,
          overdueTasks: 0,
          activeTasks: 1,
        });
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (!overrideTarget || !overrideReason) return;
    setOverrideSubmitting(true);

    try {
      const res = await fetch(`/api/complaints/${overrideTarget.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPriority: overridePriorityVal,
          reason: overrideReason,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to override priority');
        return;
      }

      setOverrideTarget(null);
      setOverrideReason('');
      await fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Error updating priority');
    } finally {
      setOverrideSubmitting(false);
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTarget) return;
    setAssignSubmitting(true);

    try {
      const res = await fetch(`/api/complaints/${assignTarget.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle || `Resolve: ${assignTarget.title}`,
          assignedStaffId: selectedStaffId,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to assign task');
        return;
      }

      setAssignTarget(null);
      setTaskTitle('');
      await fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Error assigning task');
    } finally {
      setAssignSubmitting(false);
    }
  }

  async function handleConfirmEta(e: React.FormEvent) {
    e.preventDefault();
    if (!etaTarget || !etaInput) return;
    setEtaSubmitting(true);

    try {
      const res = await fetch(`/api/complaints/${etaTarget.id}/eta`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmedEtaDate: new Date(etaInput).toISOString(),
          notes: etaNotes,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to confirm ETA');
        return;
      }

      setEtaTarget(null);
      setEtaInput('');
      setEtaNotes('');
      await fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Error confirming ETA');
    } finally {
      setEtaSubmitting(false);
    }
  }

  const filtered = complaints.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.referenceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.createdByName && c.createdByName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = filterCategory === 'ALL' || c.category === filterCategory;
    const matchesPriority = filterPriority === 'ALL' || c.effectivePriority === filterPriority;

    return matchesSearch && matchesCategory && matchesPriority;
  });

  return (
    <AppShell
      userName="Rosa Palmour"
      userRoleTitle="Managing Committee • Complaints & Operations"
      activeRole="COMMITTEE"
    >
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border-[1.5px] border-[#303044] shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Society Complaints & Task Cockpit</h1>
            <Badge variant="lavender">Operations Triage</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Deterministic weighted scoring, safety overrides, technician dispatch, and anonymous identity protection
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchComplaints}
          className="gap-1.5 self-start sm:self-auto"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Cockpit</span>
        </Button>
      </div>

      {/* 2. OPERATIONAL METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Complaints"
          value={metrics.total || complaints.length}
          subtitle="All Logged Requests"
          variant="yellow"
          icon={<ClipboardList className="w-5 h-5" />}
        />
        <StatCard
          title="Critical Priority"
          value={metrics.critical || complaints.filter((c) => c.effectivePriority === 'CRITICAL').length}
          subtitle="Immediate Action Required"
          variant="peach"
          icon={<AlertTriangle className="w-5 h-5 text-rose-700" />}
        />
        <StatCard
          title="High Priority"
          value={metrics.high || complaints.filter((c) => c.effectivePriority === 'HIGH').length}
          subtitle="Resolution Within 24 Hours"
          variant="blue"
          icon={<Clock className="w-5 h-5 text-blue-700" />}
        />
        <StatCard
          title="Active Tasks"
          value={metrics.activeTasks || 1}
          subtitle="Assigned to Staff Technicians"
          variant="mint"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
        />
      </div>

      {/* 3. COMPLAINTS TRIAGE LEDGER */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_rgba(48,48,68,0.12)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-[#20243A]">Complaints Triage Ledger ({filtered.length})</h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Review automated score breakdown, assign operational staff, or override priority
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#77798A]" />
              <input
                type="text"
                placeholder="Search reference, title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
            >
              <option value="ALL">All Categories</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="LIFT">Lift</option>
              <option value="STRUCTURAL">Structural</option>
              <option value="AMENITIES">Amenities</option>
              <option value="NOISE">Noise</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">Complaint Reference</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Author / Flat</th>
                <th className="py-3 px-3">Priority Score</th>
                <th className="py-3 px-3">Status & Confirmed ETA</th>
                <th className="py-3 px-3 text-right">Committee Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#77798A]">
                    No complaints matching filters found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const priorityVariant =
                    c.effectivePriority === 'CRITICAL'
                      ? 'peach'
                      : c.effectivePriority === 'HIGH'
                      ? 'yellow'
                      : 'neutral';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <div className="font-mono font-black text-[#20243A]">{c.referenceNo}</div>
                        <div className="font-extrabold text-xs text-[#20243A] line-clamp-1 mt-0.5">{c.title}</div>
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="lavender">{c.category}</Badge>
                      </td>
                      <td className="py-3 px-3">
                        {c.isAnonymous ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-900 bg-purple-100 px-2 py-0.5 rounded border border-purple-300">
                            <EyeOff className="w-3 h-3" /> Anonymous
                          </span>
                        ) : (
                          <div>
                            <div className="font-extrabold text-[#20243A]">{c.createdByName}</div>
                            <div className="text-[10px] text-[#77798A]">
                              {c.flatNumber ? `Wing ${c.wing || 'A'} • Flat ${c.flatNumber}` : 'Flat A-402'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Badge variant={priorityVariant}>
                            {c.effectivePriority} ({c.computedScore})
                          </Badge>
                          {c.committeePriority && (
                            <span className="text-[10px] font-bold text-amber-900 bg-[#FAF7A7] px-1.5 py-0.5 rounded border border-[#303044]/20">
                              Overridden
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#77798A] mt-0.5 font-medium">
                          Sev: {c.priorityExplanation?.factors?.severityPoints || 16}/40 • Urg:{' '}
                          {c.priorityExplanation?.factors?.urgencyPoints || 10}/25
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#20243A]">{c.status}</div>
                        {c.confirmedEta ? (
                          <div className="text-[10px] font-bold text-emerald-800">
                            ETA: {new Date(c.confirmedEta).toLocaleDateString()}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEtaTarget(c);
                              setEtaInput(new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16));
                            }}
                            className="text-[10px] font-black text-purple-800 underline hover:text-purple-950"
                          >
                            + Confirm ETA
                          </button>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setOverrideTarget(c);
                              setOverridePriorityVal(c.effectivePriority);
                            }}
                            className="text-xs py-1"
                          >
                            Override Priority
                          </Button>
                          <Button
                            variant="lime"
                            size="sm"
                            onClick={() => {
                              setAssignTarget(c);
                              setTaskTitle(`Resolve: ${c.title}`);
                            }}
                            className="text-xs py-1 font-bold"
                          >
                            Assign Task
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: OVERRIDE PRIORITY */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-5 max-w-md w-full shadow-[6px_6px_0px_#303044]">
            <h3 className="font-black text-lg text-[#20243A] mb-1">Override Automated Priority</h3>
            <p className="text-xs text-[#77798A] mb-3">
              Automated Score: <span className="font-bold">{overrideTarget.computedScore}/100</span> ({overrideTarget.priorityBand})
            </p>
            <form onSubmit={handleOverride} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  New Priority Band *
                </label>
                <select
                  value={overridePriorityVal}
                  onChange={(e) => setOverridePriorityVal(e.target.value as PriorityLevel)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
                >
                  <option value="CRITICAL">Critical (Emergency)</option>
                  <option value="HIGH">High (Within 24 Hours)</option>
                  <option value="MEDIUM">Medium (Within 48 Hours)</option>
                  <option value="LOW">Low (Routine)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Mandatory Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mandatory reason for audit trail (minimum 8 characters)..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-medium focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOverrideTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" disabled={overrideSubmitting} className="font-bold">
                  {overrideSubmitting ? 'Saving...' : 'Confirm Override'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: ASSIGN TASK */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-5 max-w-md w-full shadow-[6px_6px_0px_#303044]">
            <h3 className="font-black text-lg text-[#20243A] mb-1">Assign Operational Task</h3>
            <p className="text-xs text-[#77798A] mb-3">
              Dispatch qualified staff technician for {assignTarget.category} maintenance
            </p>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Assign Staff Member *
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
                >
                  {INITIAL_STAFF.filter((s) => s.isActive).map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name} — {staff.role} ({staff.activeTaskCount} active tasks)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAssignTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" disabled={assignSubmitting} className="font-bold">
                  {assignSubmitting ? 'Assigning...' : 'Dispatch Technician'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: CONFIRM OFFICIAL ETA */}
      {etaTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-5 max-w-md w-full shadow-[6px_6px_0px_#303044]">
            <h3 className="font-black text-lg text-[#20243A] mb-1">Confirm Official Society ETA</h3>
            <p className="text-xs text-[#77798A] mb-3">
              This timeline will be officially committed and displayed in the resident's dashboard
            </p>
            <form onSubmit={handleConfirmEta} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Target Completion Date & Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={etaInput}
                  onChange={(e) => setEtaInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Operational Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spare motor ordered from supplier"
                  value={etaNotes}
                  onChange={(e) => setEtaNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEtaTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" disabled={etaSubmitting} className="font-bold">
                  {etaSubmitting ? 'Confirming...' : 'Commit Official ETA'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
