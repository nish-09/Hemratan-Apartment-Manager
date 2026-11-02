'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ClipboardList,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  EyeOff,
  Star,
  RotateCcw,
  ShieldAlert,
  Flame,
  Zap,
  HelpCircle,
  FileText,
} from 'lucide-react';
import {
  Complaint,
  ComplaintCategory,
  SeverityLevel,
  UrgencyLevel,
  SafetyOverrideType,
} from '@/services/complaint.service';

export default function ResidentComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory>('PLUMBING');
  const [severity, setSeverity] = useState<SeverityLevel>('MEDIUM');
  const [urgency, setUrgency] = useState<UrgencyLevel>('MEDIUM');
  const [affectedFlats, setAffectedFlats] = useState(1);
  const [propertyDamage, setPropertyDamage] = useState(false);
  const [recurrence, setRecurrence] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [safetyOverride, setSafetyOverride] = useState<SafetyOverrideType | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reopen Modal State
  const [reopenTargetId, setReopenTargetId] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenSubmitting, setReopenSubmitting] = useState(false);

  // Feedback Modal State
  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [feedbackComments, setFeedbackComments] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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
      } else {
        // Fallback default sample data
        setComplaints([
          {
            id: 'cmp-sample-1',
            referenceNo: 'CMP-20261102-1042',
            title: 'Water Seepage in Master Balcony Ceiling',
            description: 'Water drops dripping continuously from 5th floor balcony during rains.',
            category: 'PLUMBING',
            flatId: 'flat-402',
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
            status: 'IN_PROGRESS',
            confirmedEta: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
            createdByName: 'Jonathan Patel',
            reopenedCount: 0,
            media: [],
            createdAt: new Date(Date.now() - 36000000).toISOString(),
            updatedAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: 'cmp-sample-2',
            referenceNo: 'CMP-20261102-0981',
            title: 'Intermittent Jerk in Wing A Lift on 4th Floor',
            description: 'Lift cable shuddering when leveling at floor 4.',
            category: 'LIFT',
            flatId: 'flat-402',
            isAnonymous: false,
            severity: 'CRITICAL',
            urgency: 'CRITICAL',
            affectedFlatsCount: 8,
            propertyDamage: false,
            recurrence: false,
            safetyOverrideTriggered: true,
            safetyOverrideType: 'LIFT_ENTRAPMENT',
            computedScore: 95,
            priorityBand: 'CRITICAL',
            effectivePriority: 'CRITICAL',
            priorityExplanation: {
              score: 95,
              priorityBand: 'CRITICAL',
              safetyOverrideTriggered: true,
              factors: { severityPoints: 40, urgencyPoints: 25, affectedFlatsPoints: 15, recurrencePoints: 0, propertyDamagePoints: 0 },
              explanation: 'FORCED CRITICAL: Safety override activated.',
            },
            status: 'RESOLVED',
            confirmedEta: new Date(Date.now() - 3600000).toISOString(),
            createdByName: 'Jonathan Patel',
            reopenedCount: 0,
            media: [],
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 7200000).toISOString(),
            resolvedAt: new Date(Date.now() - 7200000).toISOString(),
          },
        ]);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitComplaint(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          severity,
          urgency,
          affectedFlatsCount: affectedFlats,
          propertyDamage,
          recurrence,
          isAnonymous,
          safetyOverrideType: safetyOverride || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to submit complaint');
      }

      setShowSubmitModal(false);
      resetForm();
      await fetchComplaints();
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault();
    if (!reopenTargetId || !reopenReason) return;
    setReopenSubmitting(true);

    try {
      const res = await fetch(`/api/complaints/${reopenTargetId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Could not reopen complaint');
        return;
      }

      setReopenTargetId(null);
      setReopenReason('');
      await fetchComplaints();
    } catch (err: any) {
      alert(err.message || 'Error reopening');
    } finally {
      setReopenSubmitting(false);
    }
  }

  async function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackTargetId) return;
    setFeedbackSubmitting(true);

    try {
      const res = await fetch(`/api/complaints/${feedbackTargetId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedbackComments }),
      });

      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Could not submit feedback');
        return;
      }

      setFeedbackTargetId(null);
      setFeedbackComments('');
      alert('Thank you for rating this service resolution!');
    } catch (err: any) {
      alert(err.message || 'Error submitting rating');
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory('PLUMBING');
    setSeverity('MEDIUM');
    setUrgency('MEDIUM');
    setAffectedFlats(1);
    setPropertyDamage(false);
    setRecurrence(false);
    setIsAnonymous(false);
    setSafetyOverride('');
    setErrorMsg('');
  }

  const openComplaints = complaints.filter((c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED');
  const resolvedComplaints = complaints.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED');

  return (
    <AppShell
      userName="Jonathan Patel"
      userRoleTitle="Resident • Flat A-402"
      activeRole="RESIDENT"
    >
      {/* 1. HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border-[1.5px] border-[#303044] shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Flat A-402 Complaints & Maintenance</h1>
            <Badge variant="yellow">Private Resident Portal</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Deterministic priority scoring, anonymous submission protection, and confirmed ETA tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchComplaints}
            className="gap-1.5"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="lime"
            size="sm"
            onClick={() => setShowSubmitModal(true)}
            className="gap-2 shadow-[2px_2px_0px_#303044] font-extrabold"
          >
            <Plus className="w-4 h-4" />
            <span>Raise New Complaint</span>
          </Button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Complaints"
          value={complaints.length}
          subtitle="Submitted for Flat A-402"
          variant="yellow"
          icon={<ClipboardList className="w-5 h-5 text-[#20243A]" />}
        />
        <StatCard
          title="Active Requests"
          value={openComplaints.length}
          subtitle="Currently in Resolution"
          variant="peach"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
        />
        <StatCard
          title="Resolved"
          value={resolvedComplaints.length}
          subtitle="Successfully Handled"
          variant="mint"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-800" />}
        />
        <StatCard
          title="Safety Overrides"
          value={complaints.filter((c) => c.safetyOverrideTriggered).length}
          subtitle="Emergency Fast-Tracked"
          variant="lavender"
          icon={<ShieldAlert className="w-5 h-5 text-purple-800" />}
        />
      </div>

      {/* 3. ACTIVE COMPLAINTS LIST */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-[#20243A]">
              My Active Service Requests ({openComplaints.length})
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Track technician assignment, committee confirmation, and verified resolution
            </p>
          </div>
          <Badge variant="green">Live Triage</Badge>
        </div>

        {openComplaints.length === 0 ? (
          <div className="p-8 text-center text-xs font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
            No active open complaints for Flat A-402 right now.
          </div>
        ) : (
          <div className="space-y-3">
            {openComplaints.map((c) => {
              const priorityVariant =
                c.effectivePriority === 'CRITICAL'
                  ? 'peach'
                  : c.effectivePriority === 'HIGH'
                  ? 'yellow'
                  : 'lavender';

              return (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border border-[#303044]/30 bg-[#FAF9FF] space-y-3 hover:border-[#303044] transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-[#20243A] bg-slate-200 px-2 py-0.5 rounded border border-[#303044]/20">
                        {c.referenceNo}
                      </span>
                      <Badge variant="neutral">{c.category}</Badge>
                      <Badge variant={priorityVariant}>
                        {c.effectivePriority} ({c.computedScore})
                      </Badge>
                      {c.isAnonymous && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded border border-purple-300">
                          <EyeOff className="w-3 h-3" /> Anonymous
                        </span>
                      )}
                      {c.safetyOverrideTriggered && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black bg-rose-100 text-rose-900 px-2 py-0.5 rounded border border-rose-300">
                          <Flame className="w-3 h-3" /> Safety Fast-Track
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold text-[#77798A]">
                        Status: <span className="text-[#20243A]">{c.status}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-[#20243A]">{c.title}</h3>
                    <p className="text-xs text-[#77798A] font-medium mt-1 leading-relaxed">{c.description}</p>
                  </div>

                  {/* Confirmed ETA & Score Breakdown */}
                  <div className="pt-2 border-t border-[#303044]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#77798A]" />
                      {c.confirmedEta ? (
                        <span className="font-extrabold text-emerald-800 bg-[#C9F2DE] px-2 py-0.5 rounded border border-[#303044]/20">
                          Confirmed ETA: {new Date(c.confirmedEta).toLocaleDateString()} at{' '}
                          {new Date(c.confirmedEta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ) : (
                        <span className="text-[#77798A] font-semibold italic">
                          ETA Pending Committee Confirmation
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] font-semibold text-[#77798A]">
                      Reported {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. RESOLVED COMPLAINTS & FEEDBACK */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)] space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-[#20243A]">
            Resolved Complaints History ({resolvedComplaints.length})
          </h2>
          <p className="text-xs font-semibold text-[#77798A]">
            Review completed work, submit feedback, or reopen if issue recurs
          </p>
        </div>

        {resolvedComplaints.length === 0 ? (
          <div className="p-6 text-center text-xs font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
            No resolved complaints in history.
          </div>
        ) : (
          <div className="space-y-3">
            {resolvedComplaints.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-[#303044]/20 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-[#20243A]">{c.referenceNo}</span>
                    <Badge variant="green">RESOLVED</Badge>
                    <Badge variant="neutral">{c.category}</Badge>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#20243A] mt-1">{c.title}</h4>
                  <div className="text-[11px] text-[#77798A] font-semibold mt-0.5">
                    Resolved on {c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : 'Recently'}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFeedbackTargetId(c.id)}
                    className="gap-1 text-xs"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                    <span>Rate Service</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setReopenTargetId(c.id)}
                    className="gap-1 text-xs text-rose-800 hover:bg-rose-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reopen</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. MODAL: RAISE NEW COMPLAINT */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-5 sm:p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-[6px_6px_0px_#303044]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-[#20243A]" />
                <h3 className="font-black text-lg text-[#20243A]">Raise Maintenance Complaint</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="w-8 h-8 rounded-full border border-[#303044] flex items-center justify-center font-bold hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-xl bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Complaint Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master bathroom flush leakage"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ComplaintCategory)}
                    className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
                  >
                    <option value="PLUMBING">Plumbing</option>
                    <option value="ELECTRICAL">Electrical</option>
                    <option value="LIFT">Lift & Elevator</option>
                    <option value="HOUSEKEEPING">Housekeeping</option>
                    <option value="SECURITY">Security Gate</option>
                    <option value="PARKING">Parking Bay</option>
                    <option value="NOISE">Noise Disturbance</option>
                    <option value="STRUCTURAL">Structural & Civil</option>
                    <option value="AMENITIES">Clubhouse / Amenities</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                    Severity *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                    className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
                  >
                    <option value="LOW">Low (Minor cosmetic issue)</option>
                    <option value="MEDIUM">Medium (Inconvenient but usable)</option>
                    <option value="HIGH">High (Major impairment)</option>
                    <option value="CRITICAL">Critical (Danger to life/property)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                    Urgency *
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value as UrgencyLevel)}
                    className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold bg-white"
                  >
                    <option value="LOW">Routine (Within 4-5 days)</option>
                    <option value="MEDIUM">Normal (Within 48 hours)</option>
                    <option value="HIGH">Urgent (Within 24 hours)</option>
                    <option value="CRITICAL">Immediate (Emergency)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                    Affected Flats Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={affectedFlats}
                    onChange={(e) => setAffectedFlats(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-[#20243A] uppercase tracking-wider mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain the location, symptoms, and urgency in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                />
              </div>

              {/* Factors & Safety Checkboxes */}
              <div className="p-3 bg-[#FAF9FF] rounded-xl border border-[#303044]/20 space-y-2">
                <div className="text-xs font-black text-[#20243A]">Contributing Factors:</div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-[#20243A]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={propertyDamage}
                      onChange={(e) => setPropertyDamage(e.target.checked)}
                      className="w-4 h-4 rounded text-lime-600 focus:ring-0"
                    />
                    <span>Active Property Damage (+5 pts)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recurrence}
                      onChange={(e) => setRecurrence(e.target.checked)}
                      className="w-4 h-4 rounded text-lime-600 focus:ring-0"
                    />
                    <span>Recurring Issue (+10 pts)</span>
                  </label>
                </div>
              </div>

              {/* Anonymous Complaint Toggle */}
              <div className="p-3 bg-[#E6DEFC]/40 rounded-xl border border-[#303044]/30 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="anon-check"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-purple-600"
                />
                <label htmlFor="anon-check" className="text-xs font-extrabold text-[#20243A] cursor-pointer">
                  <span>Submit as Anonymous Complaint</span>
                  <p className="text-[11px] font-normal text-[#77798A] mt-0.5">
                    Your name and flat number will be completely hidden from Managing Committee records. Identity is secured in an isolated audit table accessible only by Super Admin for legal reasons.
                  </p>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowSubmitModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" disabled={submitting} className="font-extrabold">
                  {submitting ? 'Calculating Priority...' : 'Submit Complaint'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL: REOPEN COMPLAINT */}
      {reopenTargetId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-5 max-w-md w-full shadow-[6px_6px_0px_#303044]">
            <h3 className="font-black text-lg text-[#20243A] mb-2">Reopen Maintenance Request</h3>
            <p className="text-xs text-[#77798A] mb-3">
              Please explain why the resolution was incomplete or how the issue has resurfaced.
            </p>
            <form onSubmit={handleReopen} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Reason for reopening (minimum 10 characters)..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-semibold focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setReopenTargetId(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" disabled={reopenSubmitting} className="font-bold">
                  {reopenSubmitting ? 'Submitting...' : 'Confirm Reopen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: RATE RESOLUTION */}
      {feedbackTargetId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-[2px] border-[#303044] p-5 max-w-md w-full shadow-[6px_6px_0px_#303044]">
            <h3 className="font-black text-lg text-[#20243A] mb-2">Rate Technician Service</h3>
            <p className="text-xs text-[#77798A] mb-3">
              Help us maintain quality standards by rating this maintenance turnaround.
            </p>
            <form onSubmit={handleFeedback} className="space-y-4">
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= rating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <textarea
                rows={2}
                placeholder="Optional feedback comments..."
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                className="w-full p-2.5 rounded-xl border-[1.5px] border-[#303044] text-xs font-medium focus:outline-none"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setFeedbackTargetId(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="lime" size="sm" disabled={feedbackSubmitting} className="font-bold">
                  {feedbackSubmitting ? 'Saving...' : 'Submit Rating'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
