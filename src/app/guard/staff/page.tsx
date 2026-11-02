'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Plus,
  FileCheck,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { ComplaintTask, TaskStatus, INITIAL_STAFF } from '@/services/complaint.service';

const SEED_TASKS: ComplaintTask[] = [
  {
    id: 'tsk-001',
    complaintId: 'cmp-01',
    complaintReferenceNo: 'CMP-20261102-1042',
    title: 'Inspect & Repair Water Pipe Seepage near Bay P2',
    description: 'Water drops dripping continuously from 5th floor balcony pipeline in basement.',
    assignedStaffId: 'staff-001',
    assignedStaffName: 'Santosh Yadav',
    assignedStaffRole: 'Security & Access Control',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    estimatedDurationHours: 4.5,
    eta: '2026-11-02T18:00:00.000Z',
    etaStatus: 'CONFIRMED',
    progressUpdates: [
      {
        id: 'u-1',
        updatedBy: 'Santosh Yadav',
        statusUpdate: 'IN_PROGRESS',
        notes: 'Inspected joint coupling; valve gasket worn out. Getting replacement from inventory.',
        createdAt: '2026-11-02T09:00:00.000Z',
      },
    ],
    createdAt: '2026-11-02T08:00:00.000Z',
    updatedAt: '2026-11-02T09:00:00.000Z',
  },
  {
    id: 'tsk-002',
    complaintId: 'cmp-02',
    complaintReferenceNo: 'CMP-20261102-0814',
    title: 'Gate 1 Boom Barrier Sensor Alignment',
    description: 'Sensor cable loose, causing vehicle gate to stop intermittently.',
    assignedStaffId: 'staff-001',
    assignedStaffName: 'Santosh Yadav',
    assignedStaffRole: 'Security & Access Control',
    priority: 'CRITICAL',
    status: 'ASSIGNED',
    estimatedDurationHours: 2.0,
    eta: '2026-11-02T14:00:00.000Z',
    etaStatus: 'CONFIRMED',
    progressUpdates: [],
    createdAt: '2026-11-02T07:00:00.000Z',
    updatedAt: '2026-11-02T07:00:00.000Z',
  },
];

export default function StaffTaskConsolePage() {
  const [tasks, setTasks] = useState<ComplaintTask[]>(SEED_TASKS);
  const [loading, setLoading] = useState(false);

  // Resolution Modal State
  const [resolveTargetTask, setResolveTargetTask] = useState<ComplaintTask | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [evidencePath, setEvidencePath] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Update Progress Modal State
  const [progressTargetTask, setProgressTargetTask] = useState<ComplaintTask | null>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus>('IN_PROGRESS');
  const [progressNote, setProgressNote] = useState('');

  async function handleQuickStatusChange(taskId: string, targetStatus: TaskStatus, noteText: string) {
    try {
      const res = await fetch(`/api/complaints/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusUpdate: targetStatus,
          notes: noteText,
        }),
      });

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updatedAt: new Date().toISOString() } : t))
        );
      }
    } catch {
      // Local fallback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updatedAt: new Date().toISOString() } : t))
      );
    }
  }

  async function handleResolveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveTargetTask || !resolutionNotes) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/complaints/tasks/${resolveTargetTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusUpdate: 'RESOLVED',
          notes: `Task completed. ${resolutionNotes}`,
          resolutionNotes,
          evidencePhotoPath: evidencePath || undefined,
        }),
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === resolveTargetTask.id
            ? { ...t, status: 'RESOLVED', resolutionNotes, resolvedAt: new Date().toISOString() }
            : t
        )
      );

      setResolveTargetTask(null);
      setResolutionNotes('');
      setEvidencePath('');
    } catch {
      alert('Error recording resolution');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      userName="Santosh Yadav"
      userRoleTitle="Security Guard • Gate 1 Operations"
      activeRole="GUARD"
    >
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border-[1.5px] border-[#303044] shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Staff Task Execution Console</h1>
            <Badge variant="green">Operational Duty Active</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Real-time maintenance assignments, progress tracking, and verified resolution evidence
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {}}
          className="gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Tasks</span>
        </Button>
      </div>

      {/* 2. STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Tasks"
          value={tasks.length}
          subtitle="Assigned to Gate 1 Staff"
          variant="yellow"
          icon={<Wrench className="w-5 h-5" />}
        />
        <StatCard
          title="In Progress"
          value={tasks.filter((t) => t.status === 'IN_PROGRESS').length}
          subtitle="Currently Being Handled"
          variant="peach"
          icon={<Play className="w-5 h-5 text-amber-700" />}
        />
        <StatCard
          title="Pending Start"
          value={tasks.filter((t) => t.status === 'ASSIGNED').length}
          subtitle="Awaiting Technician"
          variant="blue"
          icon={<Clock className="w-5 h-5 text-blue-700" />}
        />
        <StatCard
          title="Completed"
          value={tasks.filter((t) => t.status === 'RESOLVED').length}
          subtitle="Successfully Closed"
          variant="mint"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-700" />}
        />
      </div>

      {/* 3. TASK QUEUE */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#20243A]">Active Assignment Queue ({tasks.length})</h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Operational tasks dispatched by Managing Committee
            </p>
          </div>
          <Badge variant="lavender">Live Queue</Badge>
        </div>

        <div className="space-y-4">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-2xl border-[1.5px] border-[#303044] space-y-3 transition-all ${
                t.status === 'RESOLVED'
                  ? 'bg-emerald-50/50 opacity-80'
                  : t.priority === 'CRITICAL'
                  ? 'bg-[#FCE1D8]'
                  : 'bg-[#FAF9FF]'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black text-[#20243A] bg-white px-2 py-0.5 rounded border border-[#303044]/30">
                    {t.complaintReferenceNo}
                  </span>
                  <Badge variant={t.priority === 'CRITICAL' ? 'peach' : t.priority === 'HIGH' ? 'yellow' : 'neutral'}>
                    {t.priority}
                  </Badge>
                  <span className="text-xs font-bold text-[#20243A]">
                    Assigned: <span className="font-extrabold">{t.assignedStaffName}</span>
                  </span>
                </div>

                <Badge variant={t.status === 'RESOLVED' ? 'green' : t.status === 'IN_PROGRESS' ? 'yellow' : 'neutral'}>
                  {t.status}
                </Badge>
              </div>

              <div>
                <h3 className="font-black text-base text-[#20243A]">{t.title}</h3>
                <p className="text-xs text-[#77798A] font-semibold mt-1 leading-relaxed">{t.description}</p>
              </div>

              {/* Progress updates list */}
              {t.progressUpdates.length > 0 && (
                <div className="bg-white/80 p-3 rounded-xl border border-[#303044]/20 space-y-1.5">
                  <div className="text-[11px] font-black text-[#20243A]">Latest Progress Note:</div>
                  <div className="text-xs text-[#20243A] font-medium">
                    {t.progressUpdates[t.progressUpdates.length - 1].notes}
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 border-t border-[#303044]/15 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#77798A]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ETA: {t.eta ? new Date(t.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {t.status === 'ASSIGNED' && (
                    <Button
                      variant="lime"
                      size="sm"
                      onClick={() => handleQuickStatusChange(t.id, 'IN_PROGRESS', 'Technician started work')}
                      className="gap-1 text-xs font-black"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Task</span>
                    </Button>
                  )}

                  {t.status === 'IN_PROGRESS' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickStatusChange(t.id, 'ON_HOLD', 'Waiting for spare parts/access')}
                        className="gap-1 text-xs font-bold"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        <span>Put on Hold</span>
                      </Button>
                      <Button
                        variant="lime"
                        size="sm"
                        onClick={() => setResolveTargetTask(t)}
                        className="gap-1 text-xs font-black"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Complete & Resolve</span>
                      </Button>
                    </>
                  )}

                  {t.status === 'ON_HOLD' && (
                    <Button
                      variant="lime"
                      size="sm"
                      onClick={() => handleQuickStatusChange(t.id, 'IN_PROGRESS', 'Resumed work')}
                      className="gap-1 text-xs font-black"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume Work</span>
                    </Button>
                  )}

                  {t.status === 'RESOLVED' && (
                    <span className="text-xs font-black text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Resolution Submitted
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MODAL: RESOLUTION SUBMISSION */}
      {resolveTargetTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-5 max-w-md w-full shadow-[6px_6px_0px_#303044]">
            <h3 className="font-black text-lg text-[#20243A] mb-1">Submit Task Resolution</h3>
            <p className="text-xs text-[#77798A] mb-3">
              Record completion notes and resolution evidence for {resolveTargetTask.complaintReferenceNo}
            </p>
            <form onSubmit={handleResolveSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Resolution Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detail the repairs performed, parts replaced, and tests completed..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Evidence Photo Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="evidence_repaired_coupling.jpg"
                  value={evidencePath}
                  onChange={(e) => setEvidencePath(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setResolveTargetTask(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" disabled={submitting} className="font-extrabold">
                  {submitting ? 'Submitting...' : 'Confirm Resolution'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
