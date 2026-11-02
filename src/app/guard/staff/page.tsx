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
  Users,
  Search,
  LogIn,
  LogOut,
  Phone,
  Home,
  Check,
} from 'lucide-react';
import { ComplaintTask, TaskStatus, INITIAL_STAFF } from '@/services/complaint.service';
import { DomesticWorker, StaffAttendanceLog } from '@/services/directory.service';

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
  const [activeTab, setActiveTab] = useState<'ATTENDANCE' | 'INSIDE' | 'TASKS'>('ATTENDANCE');
  const [tasks, setTasks] = useState<ComplaintTask[]>(SEED_TASKS);
  const [staffList, setStaffList] = useState<DomesticWorker[]>([]);
  const [activeInside, setActiveInside] = useState<StaffAttendanceLog[]>([]);
  const [searchStaff, setSearchStaff] = useState('');
  const [selectedGate, setSelectedGate] = useState('Gate 1 Main Access');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resolution Modal State
  const [resolveTargetTask, setResolveTargetTask] = useState<ComplaintTask | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [evidencePath, setEvidencePath] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Update Progress Modal State
  const [progressTargetTask, setProgressTargetTask] = useState<ComplaintTask | null>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus>('IN_PROGRESS');
  const [progressNote, setProgressNote] = useState('');

  // New staff registration modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'MAID' | 'COOK' | 'DRIVER' | 'OTHER'>('MAID');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffEmergency, setNewStaffEmergency] = useState('');

  useEffect(() => {
    fetchStaff();
    fetchActiveInside();
  }, []);

  async function fetchStaff() {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.staff || []);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    }
  }

  async function fetchActiveInside() {
    try {
      const res = await fetch('/api/attendance/active');
      if (res.ok) {
        const data = await res.json();
        setActiveInside(data.activeInside || []);
      }
    } catch (err) {
      console.error('Error fetching active inside:', err);
    }
  }

  async function handleCheckIn(staff: DomesticWorker) {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: staff.id,
          gateNumber: selectedGate,
          remarks: `Checked in via Guard Console at ${selectedGate}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to check in staff');
        return;
      }

      setSuccessMessage(`Check-in logged for ${staff.fullName}. Status: Inside society.`);
      fetchStaff();
      fetchActiveInside();
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-in failed');
    }
  }

  async function handleCheckOut(staffId: string, staffName: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          remarks: `Checked out via Guard Console at ${selectedGate}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to check out staff');
        return;
      }

      setSuccessMessage(`Check-out logged for ${staffName}. Status: Completed.`);
      fetchStaff();
      fetchActiveInside();
    } catch (err: any) {
      setErrorMessage(err.message || 'Check-out failed');
    }
  }

  async function handleRegisterStaff() {
    if (!newStaffName || !newStaffPhone) return;
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newStaffName,
          phone: newStaffPhone,
          roleTitle: newStaffRole,
          emergencyContact: newStaffEmergency || undefined,
        }),
      });

      if (res.ok) {
        setShowAddStaffModal(false);
        setNewStaffName('');
        setNewStaffPhone('');
        setNewStaffEmergency('');
        fetchStaff();
        setSuccessMessage('New domestic worker registered successfully.');
      }
    } catch (err) {
      console.error('Failed to register staff:', err);
    }
  }

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
          prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updatedAt: '2026-11-02T18:00:00.000Z' } : t))
        );
      }
    } catch {
      // Local fallback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus, updatedAt: '2026-11-02T18:00:00.000Z' } : t))
      );
    }
  }

  async function handleResolveSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resolveTargetTask || !resolutionNotes) return;
    setSubmitting(true);

    try {
      await fetch(`/api/complaints/tasks/${resolveTargetTask.id}`, {
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
            ? { ...t, status: 'RESOLVED', resolutionNotes, resolvedAt: '2026-11-02T18:00:00.000Z' }
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

  async function handleProgressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!progressTargetTask || !progressNote) return;

    try {
      await fetch(`/api/complaints/tasks/${progressTargetTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusUpdate: newStatus,
          notes: progressNote,
        }),
      });

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === progressTargetTask.id) {
            return {
              ...t,
              status: newStatus,
              progressUpdates: [
                ...t.progressUpdates,
                {
                  id: `u-${Date.now()}`,
                  updatedBy: 'Santosh Yadav',
                  statusUpdate: newStatus,
                  notes: progressNote,
                  createdAt: '2026-11-02T18:00:00.000Z',
                },
              ],
              updatedAt: '2026-11-02T18:00:00.000Z',
            };
          }
          return t;
        })
      );

      setProgressTargetTask(null);
      setProgressNote('');
    } catch {
      alert('Failed to update progress');
    }
  }

  const filteredStaff = staffList.filter((s) => {
    if (!searchStaff) return true;
    const q = searchStaff.toLowerCase();
    return s.fullName.toLowerCase().includes(q) || s.serviceType.toLowerCase().includes(q);
  });

  const insideCount = activeInside.length;

  return (
    <AppShell
      activeRole="GUARD"
      userName="Santosh Yadav"
      userRoleTitle="Head Security Guard (Gate 1 Main Access)"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider bg-[#C9F36B] border border-[#303044] rounded-lg">
                Operational Duty Active
              </span>
              <span className="text-xs font-bold text-gray-500">Gate 1 & Gate 2 Security Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#303044] mt-2">
              Staff Task Execution Console & Security Gate Attendance
            </h1>
            <p className="text-sm font-medium text-gray-600 mt-1">
              Verify domestic staff identity, record real-time gate entry/exit, and manage urgent society maintenance duties.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAddStaffModal(true)}
              className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black border-2 border-[#303044] shadow-[2px_2px_0px_#303044]"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
              Register Domestic Worker
            </Button>
          </div>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="bg-red-50 border-2 border-red-400 p-4 rounded-xl flex items-center justify-between text-xs font-bold text-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800">
              ✕
            </button>
          </div>
        )}
        {successMessage && (
          <div className="bg-[#C9F2DE] border-2 border-[#303044] p-4 rounded-xl flex items-center justify-between text-xs font-bold text-[#303044]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-gray-600 hover:text-black">
              ✕
            </button>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Inside"
            value={insideCount.toString()}
            subtitle="Staff currently inside premises"
            variant="mint"
          />
          <StatCard
            title="Total Roster"
            value={staffList.length.toString()}
            subtitle="Registered domestic workers in society"
            variant="yellow"
          />
          <StatCard
            title="Gate Access"
            value="Gate 1 & 2"
            subtitle="Active gate entry checkpoints"
            variant="lavender"
          />
          <StatCard
            title="Assigned Duties"
            value={tasks.filter((t) => t.status !== 'RESOLVED').length.toString()}
            subtitle="Active assigned maintenance duties"
            variant="peach"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b-2 border-[#303044] pb-2">
          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'ATTENDANCE'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Gate Attendance Roster ({staffList.length})
          </button>
          <button
            onClick={() => setActiveTab('INSIDE')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'INSIDE'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Currently Inside Premises ({insideCount})
          </button>
          <button
            onClick={() => setActiveTab('TASKS')}
            className={`px-4 py-2 font-black text-sm rounded-xl border-2 transition-all ${
              activeTab === 'TASKS'
                ? 'bg-[#303044] text-white border-[#303044] shadow-[2px_2px_0px_#C9F36B]'
                : 'bg-white text-[#303044] border-[#303044] hover:bg-gray-50'
            }`}
          >
            Assigned Society Tasks • Active Assignment Queue (Assigned to Gate 1 Staff) ({tasks.length})
          </button>
        </div>

        {/* TAB 1: GATE ATTENDANCE ROSTER */}
        {activeTab === 'ATTENDANCE' && (
          <div className="space-y-4">
            {/* Search & Gate Selector */}
            <div className="bg-white p-4 rounded-xl border-2 border-[#303044] shadow-[4px_4px_0px_#303044] flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search staff name or role..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-gray-600">Current Gate:</span>
                <select
                  value={selectedGate}
                  onChange={(e) => setSelectedGate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-[#303044] bg-white"
                >
                  <option value="Gate 1 Main Access">Gate 1 Main Access</option>
                  <option value="Gate 2 Service Access">Gate 2 Service Access</option>
                </select>
              </div>
            </div>

            {/* Staff Roster Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStaff.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-white rounded-2xl border-2 border-[#303044] p-5 shadow-[4px_4px_0px_#303044] flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="inline-block px-2 py-0.5 text-[11px] font-black uppercase rounded bg-[#E6DEFC] border border-[#303044]">
                          {worker.serviceType}
                        </span>
                        <h3 className="text-lg font-black text-[#303044] mt-1">{worker.fullName}</h3>
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-gray-600 mt-1">
                          <Phone className="w-3.5 h-3.5" />
                          {worker.phoneNumber}
                        </div>
                      </div>

                      {/* State Badge */}
                      <div>
                        {worker.isCurrentlyInside ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#C9F36B] text-[#303044] border border-[#303044]">
                            Inside
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gray-100 text-gray-600 border border-gray-300">
                            Outside
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs font-semibold space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Authorized Flats:</span>
                        <span className="text-[#303044]">{worker.authorizedFlats.length > 0 ? worker.authorizedFlats.join(', ') : 'None assigned'}</span>
                      </div>
                      {worker.emergencyContact && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Emergency:</span>
                          <span className="text-[#303044]">{worker.emergencyContact}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Gate Action Buttons */}
                  <div className="mt-4 pt-3 border-t-2 border-[#303044] flex gap-2">
                    {!worker.isCurrentlyInside ? (
                      <Button
                        size="sm"
                        onClick={() => handleCheckIn(worker)}
                        className="w-full bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border border-[#303044] shadow-[2px_2px_0px_#303044]"
                      >
                        <LogIn className="w-3.5 h-3.5 mr-1" />
                        Check In at {selectedGate.split(' ')[0]}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleCheckOut(worker.id, worker.fullName)}
                        className="w-full bg-[#FCE1D8] hover:bg-[#fbd3c7] text-[#303044] font-black text-xs border border-[#303044] shadow-[2px_2px_0px_#303044]"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-1" />
                        Check Out
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CURRENTLY INSIDE PREMISES */}
        {activeTab === 'INSIDE' && (
          <div className="bg-white rounded-2xl border-2 border-[#303044] p-6 shadow-[4px_4px_0px_#303044] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-[#303044]">Live Society Occupancy: Domestic Workers</h2>
                <p className="text-xs font-semibold text-gray-500">
                  Workers who checked in through society gates and have not checked out yet.
                </p>
              </div>
              <span className="px-3 py-1 bg-[#C9F36B] text-[#303044] font-black text-xs rounded-full border border-[#303044]">
                {activeInside.length} Workers Inside
              </span>
            </div>

            {activeInside.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm font-semibold">
                No domestic workers are currently inside the society premises.
              </div>
            ) : (
              <div className="divide-y-2 border-2 border-[#303044] rounded-xl overflow-hidden">
                {activeInside.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between bg-white hover:bg-gray-50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-[#303044]">{log.staffName}</span>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-[#E6DEFC] border border-[#303044]">
                          {log.serviceType}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          Authorized: {log.authorizedFlatNumbers.join(', ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          Entry: {new Date(log.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>Gate: {log.entryGate}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleCheckOut(log.domesticStaffId, log.staffName)}
                      className="bg-[#FCE1D8] hover:bg-[#fbd3c7] text-[#303044] font-black text-xs border border-[#303044] shadow-[1px_1px_0px_#303044]"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />
                      Record Exit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ASSIGNED TASKS (STAGE 4 CONSOLE) */}
        {activeTab === 'TASKS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h2 className="text-base font-black text-[#303044]">
                Active Assignment Queue (Assigned to Gate 1 Staff)
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border-2 border-[#303044] p-5 shadow-[4px_4px_0px_#303044] space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-gray-500">
                        {task.complaintReferenceNo}
                      </span>
                      <h3 className="text-base font-black text-[#303044] mt-0.5">{task.title}</h3>
                    </div>
                    <Badge
                      variant={task.priority === 'CRITICAL' ? 'peach' : 'yellow'}
                      className="text-xs font-black"
                    >
                      {task.priority}
                    </Badge>
                  </div>

                  <p className="text-xs text-gray-600 font-medium">{task.description}</p>

                  <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Status: {task.status}</span>
                    <span className="text-[#303044]">ETA: ~{task.estimatedDurationHours}h</span>
                  </div>

                  <div className="flex gap-2 pt-2 border-t-2 border-[#303044]">
                    {task.status !== 'RESOLVED' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => setProgressTargetTask(task)}
                          className="flex-1 bg-white hover:bg-gray-50 text-[#303044] font-black text-xs border border-[#303044]"
                        >
                          Update Status
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setResolveTargetTask(task)}
                          className="flex-1 bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border border-[#303044] shadow-[1px_1px_0px_#303044]"
                        >
                          Mark Completed
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL: REGISTER DOMESTIC WORKER */}
        {showAddStaffModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[8px_8px_0px_#303044] max-w-md w-full p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-gray-500">Security Gate Roster</span>
                  <h3 className="text-xl font-black text-[#303044] mt-0.5">
                    Register Domestic Staff
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
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Role Title</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  >
                    <option value="MAID">House Maid / Cleaner</option>
                    <option value="COOK">Cook / Meals</option>
                    <option value="DRIVER">Driver</option>
                    <option value="OTHER">Other Domestic Help</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="e.g. 9820012345"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">Emergency Contact (Optional)</label>
                  <input
                    type="text"
                    value={newStaffEmergency}
                    onChange={(e) => setNewStaffEmergency(e.target.value)}
                    placeholder="e.g. 9820099999 (Brother)"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
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
                  onClick={handleRegisterStaff}
                  disabled={!newStaffName || !newStaffPhone}
                  className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border-2 border-[#303044] shadow-[2px_2px_0px_#303044]"
                >
                  Save & Add to Roster
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: RESOLVE TASK */}
        {resolveTargetTask && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border-2 border-[#303044] shadow-[8px_8px_0px_#303044] max-w-md w-full p-6 space-y-4">
              <h3 className="text-lg font-black text-[#303044]">
                Resolve Task: {resolveTargetTask.title}
              </h3>
              <form onSubmit={handleResolveSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#303044] mb-1">
                    Completion Notes
                  </label>
                  <textarea
                    rows={3}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    required
                    placeholder="Work performed, parts replaced..."
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border-2 border-[#303044] focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResolveTargetTask(null)}
                    className="border-2 border-[#303044] text-xs font-black"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-[#C9F36B] hover:bg-[#b8e858] text-[#303044] font-black text-xs border-2 border-[#303044]"
                  >
                    Confirm Completion
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
