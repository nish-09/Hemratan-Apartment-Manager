'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ShieldCheck,
  UserPlus,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  DoorOpen,
  LogOut,
  Search,
  Filter,
  RefreshCw,
  Building,
} from 'lucide-react';
import { AgeRange, VisitRecord } from '@/services/visitor.service';

interface FlatOption {
  id: string;
  wing: string;
  flatNumber: string;
  intercomNumber: string;
  residentName?: string;
}

export default function GuardVisitorsPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [flats, setFlats] = useState<FlatOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'inside' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // New Visitor Form State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAgeRange, setFormAgeRange] = useState<AgeRange>('31_TO_50');
  const [formFlatId, setFormFlatId] = useState('');
  const [formPurpose, setFormPurpose] = useState('Guest / Personal');
  const [formPhotoPreview, setFormPhotoPreview] = useState<string | null>(null);
  const [visitorConsent, setVisitorConsent] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Verification Input state map: visitId -> otp string
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [otpErrors, setOtpErrors] = useState<Record<string, string>>({});
  const [otpRemaining, setOtpRemaining] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFlats();
    fetchVisits();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function fetchFlats() {
    try {
      const res = await fetch('/api/flats');
      if (res.ok) {
        const data = await res.json();
        const options: FlatOption[] = (data.flats || []).map((f: any) => ({
          id: f.id,
          wing: f.wing,
          flatNumber: f.flatNumber,
          intercomNumber: f.intercomNumber,
          residentName: f.residents?.[0]?.fullName || 'Vacant / Society Office',
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

  async function fetchVisits() {
    try {
      setLoading(true);
      const res = await fetch('/api/visitors');
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch (e) {
      console.error('Failed to load visits', e);
    } finally {
      setLoading(false);
    }
  }

  function stopWebcam() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  }

  async function startWebcam() {
    setWebcamError('');
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Webcam API is not supported in this environment. Please use file upload.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamActive(true);
    } catch (err: any) {
      console.warn('Webcam permission or device error:', err);
      setWebcamError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings or upload an image file.'
          : err.message || 'Camera device unavailable. Please use file upload.'
      );
      setIsWebcamActive(false);
    }
  }

  function captureWebcamPhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setFormPhotoPreview(dataUrl);
      stopWebcam();
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the maximum permitted limit of 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Register New Visitor
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccessMsg('');

    if (formPhotoPreview && !visitorConsent) {
      setRegisterError('Visitor consent is mandatory prior to recording photograph per DPDP compliance.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        fullName: formName,
        mobileNumber: formMobile,
        ageRange: formAgeRange,
        flatId: formFlatId,
        purpose: formPurpose,
      };

      if (formPhotoPreview) {
        payload.photoData = {
          storagePath: formPhotoPreview,
          fileSizeBytes: 1024 * 500, // 500 KB
          mimeType: 'image/jpeg',
        };
      }

      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register visitor');
      }

      setRegisterSuccessMsg(
        `Visitor registered! OTP dispatched to ${formMobile}${data.rawOtp ? ` (Demo Mock OTP: ${data.rawOtp})` : ''}`
      );

      // Reset form
      setFormName('');
      setFormMobile('');
      setFormPhotoPreview(null);
      setVisitorConsent(false);
      stopWebcam();
      await fetchVisits();
      setActiveTab('pending');
    } catch (err: any) {
      setRegisterError(err.message || 'Registration error');
    } finally {
      setSubmitting(false);
    }
  }

  // Independent Step A: Verify OTP
  async function handleVerifyOtp(visitId: string) {
    const otp = otpInputs[visitId] || '';
    if (otp.length !== 6) {
      setOtpErrors((prev) => ({ ...prev, [visitId]: 'Enter 6-digit OTP' }));
      return;
    }

    setActionLoading((prev) => ({ ...prev, [visitId]: true }));
    setOtpErrors((prev) => ({ ...prev, [visitId]: '' }));

    try {
      const res = await fetch(`/api/visitors/${visitId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpErrors((prev) => ({
          ...prev,
          [visitId]: data.error || 'Invalid OTP code',
        }));
        if (data.remainingAttempts !== undefined) {
          setOtpRemaining((prev) => ({ ...prev, [visitId]: data.remainingAttempts }));
        }
        return;
      }

      // Success
      await fetchVisits();
    } catch (err: any) {
      setOtpErrors((prev) => ({ ...prev, [visitId]: err.message || 'OTP verification failed' }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [visitId]: false }));
    }
  }

  // Independent Step B: Record Intercom Approval or Rejection
  async function handleRecordApproval(visitId: string, status: 'APPROVED' | 'REJECTED') {
    setActionLoading((prev) => ({ ...prev, [visitId]: true }));
    try {
      const res = await fetch(`/api/visitors/${visitId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'GODREJ_INTERCOM',
          status,
          notes:
            status === 'APPROVED'
              ? 'Confirmed via Godrej Intercom by resident'
              : 'Resident declined entry via intercom',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to record intercom approval');
        return;
      }

      await fetchVisits();
    } catch (e: any) {
      alert(e.message || 'Approval error');
    } finally {
      setActionLoading((prev) => ({ ...prev, [visitId]: false }));
    }
  }

  // Step C: Confirm Physical Gate Entry (Requires BOTH Step A & Step B)
  async function handleConfirmEntry(visitId: string) {
    setActionLoading((prev) => ({ ...prev, [visitId]: true }));
    try {
      const res = await fetch(`/api/visitors/${visitId}/entry`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`Entry Denied: ${data.error}`);
        return;
      }

      await fetchVisits();
      setActiveTab('inside');
    } catch (e: any) {
      alert(e.message || 'Entry confirmation failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [visitId]: false }));
    }
  }

  // Check out visitor
  async function handleCheckOut(visitId: string) {
    setActionLoading((prev) => ({ ...prev, [visitId]: true }));
    try {
      const res = await fetch(`/api/visitors/${visitId}/exit`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to check out visitor');
        return;
      }

      await fetchVisits();
    } catch (e: any) {
      alert(e.message || 'Checkout failed');
    } finally {
      setActionLoading((prev) => ({ ...prev, [visitId]: false }));
    }
  }

  // Filtered views
  const pendingVisits = visits.filter(
    (v) => v.status === 'PENDING_CHECKS' || v.status === 'OTP_VERIFIED' || v.status === 'RESIDENT_APPROVED'
  );
  const insideVisits = visits.filter((v) => v.status === 'INSIDE');
  const historyVisits = visits.filter((v) => v.status === 'COMPLETED' || v.status === 'REJECTED');

  const displayedVisits = (
    activeTab === 'pending' ? pendingVisits : activeTab === 'inside' ? insideVisits : historyVisits
  ).filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.visitor.fullName.toLowerCase().includes(q) ||
      v.visitor.mobileNumber.includes(q) ||
      v.flatNumber.includes(q) ||
      v.purpose.toLowerCase().includes(q)
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
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A]">Visitor Gate Console</h1>
            <Badge variant="green">Dual-Check Security Enforced</Badge>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-[#77798A] mt-1">
            Independent 6-Digit OTP + Godrej Intercom Resident Clearance required for all arrivals
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchVisits}
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
            <UserPlus className="w-4 h-4" />
            <span>New Arrival Registration</span>
          </Button>
        </div>
      </div>

      {/* Quick Summary Pill Tabs */}
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
            Gate Verification Queue ({pendingVisits.length})
          </button>
          <button
            onClick={() => setActiveTab('inside')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              activeTab === 'inside'
                ? 'bg-[#C9F2DE] text-[#20243A] border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#77798A] border-transparent hover:bg-slate-100'
            }`}
          >
            Currently Inside ({insideVisits.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              activeTab === 'history'
                ? 'bg-[#E6DEFC] text-[#20243A] border-[#303044] shadow-[2px_2px_0px_#303044]'
                : 'bg-white text-[#77798A] border-transparent hover:bg-slate-100'
            }`}
          >
            Past Logs ({historyVisits.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#77798A]" />
          <input
            type="text"
            placeholder="Search visitor, flat, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
          />
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border-2 border-[#303044] shadow-[6px_6px_0px_#303044] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-[#303044]/20 pb-4 mb-5">
              <div>
                <h3 className="text-lg font-black text-[#20243A]">Register Visitor Arrival</h3>
                <p className="text-xs font-semibold text-[#77798A]">
                  OTP will be sent immediately upon recording
                </p>
              </div>
              <button
                onClick={() => {
                  stopWebcam();
                  setShowRegisterModal(false);
                }}
                className="w-8 h-8 rounded-full border border-[#303044] flex items-center justify-center font-black hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {registerError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            {registerSuccessMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{registerSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                  Visitor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Verma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
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
                  placeholder="e.g. 9876543210"
                  value={formMobile}
                  onChange={(e) => setFormMobile(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#20243A] uppercase tracking-wider mb-1">
                    Age Bracket (Privacy-Preserved) *
                  </label>
                  <select
                    value={formAgeRange}
                    onChange={(e) => setFormAgeRange(e.target.value as AgeRange)}
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
                    Destination Flat *
                  </label>
                  <select
                    value={formFlatId}
                    onChange={(e) => setFormFlatId(e.target.value)}
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
                  Purpose of Visit *
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Guest / Personal', 'Swiggy / Zomato', 'Amazon / Courier', 'Electrician / Plumber', 'Doctor Visit'].map(
                    (p) => (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setFormPurpose(p)}
                        className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all ${
                          formPurpose === p
                            ? 'bg-[#C9F36B] border-[#303044] text-[#20243A]'
                            : 'bg-slate-100 border-transparent text-[#77798A] hover:bg-slate-200'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-[#303044]/30 focus:outline-none focus:ring-2 focus:ring-[#C9F36B] focus:border-[#303044]"
                />
              </div>

              {/* Photo Capture Section */}
              <div className="border border-dashed border-[#303044]/40 p-4 rounded-2xl bg-[#FAF9FF] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#20243A]">Security Photograph (Max 10MB)</span>
                  <Badge variant="lavender">HTML5 Camera Stream</Badge>
                </div>

                {/* Hidden canvas for snapshot rendering */}
                <canvas ref={canvasRef} className="hidden" />

                {formPhotoPreview ? (
                  <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#303044]/20">
                    <img
                      src={formPhotoPreview}
                      alt="Captured visitor"
                      className="w-16 h-16 rounded-xl object-cover border border-[#303044]"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-700 block">Photo attached (Max 10MB) ✓</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormPhotoPreview(null);
                          stopWebcam();
                        }}
                        className="text-[11px] font-bold text-rose-600 underline"
                      >
                        Remove & Retake
                      </button>
                    </div>
                  </div>
                ) : isWebcamActive ? (
                  <div className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border-2 border-[#303044] bg-black">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="lime"
                        size="sm"
                        onClick={captureWebcamPhoto}
                        className="w-full gap-1.5 font-black text-xs shadow-[2px_2px_0px_#303044]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Photo</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={stopWebcam}
                        className="text-xs font-bold"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {webcamError && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-bold">
                        {webcamError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startWebcam}
                        className="w-full gap-2 border-[#303044] bg-white font-bold text-xs"
                      >
                        <Camera className="w-4 h-4 text-emerald-700" />
                        <span>Open Live Webcam</span>
                      </Button>

                      <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-[#303044] bg-white hover:bg-slate-50 cursor-pointer text-[#20243A]">
                        <span>Upload Photo File</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* DPDP Visitor Consent Checkbox */}
                <label className="flex items-start gap-2 pt-2 border-t border-[#303044]/15 cursor-pointer text-[11px] font-bold text-[#20243A]">
                  <input
                    type="checkbox"
                    checked={visitorConsent}
                    onChange={(e) => setVisitorConsent(e.target.checked)}
                    className="mt-0.5 rounded border-[#303044] text-[#C9F36B] focus:ring-[#C9F36B]"
                  />
                  <span>
                    I confirm visitor consent for security photo capture under Hemratan Society safety protocols (DPDP Act compliant).
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#303044]/20">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    stopWebcam();
                    setShowRegisterModal(false);
                  }}
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
                  {submitting ? 'Dispatching OTP...' : 'Register & Send OTP'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MAIN VIEW: PENDING VISITS QUEUE WITH DUAL-CHECK CONTROLS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {displayedVisits.length === 0 ? (
            <Card className="p-8 text-center text-sm font-semibold text-[#77798A] border-dashed">
              No visitors waiting in queue. All gate verifications are completed.
            </Card>
          ) : (
            displayedVisits.map((visit) => {
              const visitFlat = flats.find((f) => f.id === visit.flatId);
              const isReadyForEntry = visit.otpVerified && visit.residentApproved;
              const hasRejected = visit.status === 'REJECTED';

              return (
                <div
                  key={visit.id}
                  className="rounded-2xl border-2 border-[#303044] bg-white p-5 shadow-[3px_3px_0px_#303044] transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#303044]/15">
                    {/* Visitor Info */}
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-[#303044] bg-[#FAF7A7] flex items-center justify-center font-black text-lg text-[#20243A] shrink-0 overflow-hidden">
                        {visit.visitor.photoUrl ? (
                          <img
                            src={visit.visitor.photoUrl}
                            alt={visit.visitor.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          visit.visitor.fullName.charAt(0)
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-[#20243A]">
                            {visit.visitor.fullName}
                          </h3>
                          <Badge variant="lavender">Age: {visit.visitor.ageRange.replace('_', ' ')}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#77798A] mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {visit.visitor.mobileNumber}
                          </span>
                          <span>•</span>
                          <span className="font-bold text-[#20243A]">
                            Visiting Flat {visit.wing}-{visit.flatNumber}
                          </span>
                          <span>•</span>
                          <span>Purpose: {visit.purpose}</span>
                        </div>
                      </div>
                    </div>

                    {/* Overall Status Badge */}
                    <div className="flex items-center gap-2">
                      {isReadyForEntry ? (
                        <Badge variant="green" className="py-1 px-3 text-xs font-black">
                          ✓ Ready for Entry
                        </Badge>
                      ) : (
                        <Badge variant="yellow" className="py-1 px-3 text-xs font-black">
                          Pending Dual-Verification
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* DUAL CHECK GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                    {/* CHECK 1: INDEPENDENT OTP VERIFICATION */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        visit.otpVerified
                          ? 'bg-emerald-50/70 border-emerald-400'
                          : 'bg-[#FAF9FF] border-[#303044]/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-[#20243A] uppercase tracking-wider flex items-center gap-1.5">
                          1. Visitor Mobile OTP Check
                        </span>
                        {visit.otpVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>

                      {visit.otpVerified ? (
                        <p className="text-xs font-bold text-emerald-800">
                          Mobile number ownership confirmed via 6-digit cryptographic OTP.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold text-[#77798A]">
                            Ask visitor for the 6-digit SMS OTP sent to their mobile.
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="6-digit OTP"
                              value={otpInputs[visit.id] || ''}
                              onChange={(e) =>
                                setOtpInputs((prev) => ({ ...prev, [visit.id]: e.target.value }))
                              }
                              className="w-32 px-3 py-1.5 text-xs font-black tracking-widest rounded-lg border border-[#303044]/30 bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerifyOtp(visit.id)}
                              disabled={actionLoading[visit.id]}
                              className="bg-[#C9F36B] hover:bg-[#b8e855] text-xs font-black"
                            >
                              Verify OTP
                            </Button>
                          </div>
                          {otpErrors[visit.id] && (
                            <span className="text-[11px] font-bold text-rose-600 block">
                              {otpErrors[visit.id]}
                            </span>
                          )}
                          {otpRemaining[visit.id] !== undefined && (
                            <span className="text-[10px] font-semibold text-[#77798A] block">
                              Attempts remaining: {otpRemaining[visit.id]} / 3
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CHECK 2: INDEPENDENT RESIDENT INTERCOM APPROVAL */}
                    <div
                      className={`p-4 rounded-xl border transition-all ${
                        visit.residentApproved
                          ? 'bg-emerald-50/70 border-emerald-400'
                          : hasRejected
                          ? 'bg-rose-50 border-rose-300'
                          : 'bg-[#FAF9FF] border-[#303044]/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-[#20243A] uppercase tracking-wider flex items-center gap-1.5">
                          2. Resident Intercom Clearance
                        </span>
                        {visit.residentApproved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : hasRejected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Declined
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            Pending Call
                          </span>
                        )}
                      </div>

                      {visit.residentApproved ? (
                        <p className="text-xs font-bold text-emerald-800">
                          {visit.approvalRecord?.notes || 'Resident confirmed entry via intercom call.'}
                        </p>
                      ) : hasRejected ? (
                        <p className="text-xs font-bold text-rose-700">
                          Resident explicitly declined entry. Access blocked.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-lg border border-[#303044]/20">
                            <span className="font-bold text-[#77798A]">Godrej Intercom Dial:</span>
                            <span className="font-black text-[#20243A] bg-[#FAF7A7] px-2 py-0.5 rounded border border-[#303044]/20">
                              {visitFlat?.intercomNumber || `${visit.wing}${visit.flatNumber}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRecordApproval(visit.id, 'APPROVED')}
                              disabled={actionLoading[visit.id]}
                              className="w-full bg-[#FAF7A7] hover:bg-[#ede874] text-xs font-black"
                            >
                              Intercom Confirmed ✓
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleRecordApproval(visit.id, 'REJECTED')}
                              disabled={actionLoading[visit.id]}
                              className="text-xs font-bold text-rose-700 hover:bg-rose-100"
                            >
                              Decline
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM GATE ENTRY TRIGGER */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#303044]/15">
                    <div className="text-xs font-bold">
                      {isReadyForEntry ? (
                        <span className="text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Both security checks verified. Safe to open
                          gate.
                        </span>
                      ) : (
                        <span className="text-amber-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Entry button locked until both OTP and
                          Intercom are verified.
                        </span>
                      )}
                    </div>

                    <Button
                      variant={isReadyForEntry ? 'lime' : 'secondary'}
                      size="md"
                      disabled={!isReadyForEntry || actionLoading[visit.id]}
                      onClick={() => handleConfirmEntry(visit.id)}
                      className={`gap-2 font-black ${
                        isReadyForEntry ? 'shadow-[3px_3px_0px_#303044]' : 'opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <DoorOpen className="w-4 h-4" />
                      <span>Confirm Gate Entry</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CURRENTLY INSIDE TABLE */}
      {activeTab === 'inside' && (
        <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-[#20243A]">
                Visitors Inside Hemratan Premises ({displayedVisits.length})
              </h2>
              <p className="text-xs font-semibold text-[#77798A]">
                Click Check Out when visitor departs through Gate 1
              </p>
            </div>
            <Badge variant="green">{displayedVisits.length} Active</Badge>
          </div>

          {displayedVisits.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-[#77798A] border border-dashed border-[#303044]/30 rounded-xl">
              No active visitors currently inside society.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Visitor Profile</th>
                    <th className="py-3 px-3">Flat Destination</th>
                    <th className="py-3 px-3">Purpose</th>
                    <th className="py-3 px-3">Entry Time</th>
                    <th className="py-3 px-3">Clearance Audited</th>
                    <th className="py-3 px-3 text-right">Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                  {displayedVisits.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-3">
                        <div className="font-extrabold">{v.visitor.fullName}</div>
                        <div className="text-[10px] text-[#77798A] flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {v.visitor.mobileNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-[#20243A] bg-[#FAF7A7] px-2 py-0.5 rounded border border-[#303044]/20">
                          {v.wing}-{v.flatNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#77798A]">{v.purpose}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 text-[#77798A]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {v.entryTime ? new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5 text-[10px] font-bold text-emerald-800">
                          <span>✓ OTP Verified</span>
                          <span>✓ {v.approvalRecord?.channel.replace('_', ' ') || 'Intercom'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCheckOut(v.id)}
                          disabled={actionLoading[v.id]}
                          className="gap-1.5 border-[#303044] hover:bg-rose-100 hover:text-rose-900 font-bold"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Check Out</span>
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

      {/* HISTORY / LOGS TABLE */}
      {activeTab === 'history' && (
        <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
          <h2 className="text-base font-extrabold text-[#20243A] mb-3">Past Visitor Gate Activity</h2>
          {displayedVisits.length === 0 ? (
            <div className="p-8 text-center text-sm font-semibold text-[#77798A]">
              No archived visitor records.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Visitor Name</th>
                    <th className="py-2.5 px-3">Destination</th>
                    <th className="py-2.5 px-3">Purpose</th>
                    <th className="py-2.5 px-3">Result</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
                  {displayedVisits.map((v) => (
                    <tr key={v.id}>
                      <td className="py-2.5 px-3 font-bold">{v.visitor.fullName}</td>
                      <td className="py-2.5 px-3">
                        {v.wing}-{v.flatNumber}
                      </td>
                      <td className="py-2.5 px-3 text-[#77798A]">{v.purpose}</td>
                      <td className="py-2.5 px-3">
                        {v.status === 'COMPLETED' ? (
                          <Badge variant="green">Departed</Badge>
                        ) : (
                          <Badge variant="peach">Declined</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[#77798A]">
                        {new Date(v.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
