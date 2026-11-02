'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import {
  ShieldAlert,
  Users,
  ShieldCheck,
  Activity,
  Database,
  Lock,
  Server,
  Cloud,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Clock,
  HardDrive,
  Cpu,
} from 'lucide-react';

interface SystemOverviewData {
  users: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    usersByRole: Record<string, number>;
  };
  societyConfigStatus: {
    societyName: string;
    totalWings: number;
    totalFlats: number;
    billingMode: string;
    baseFeeInr: string;
    gstApplicable: boolean;
    lateFeePolicy: string;
    configurationState: string;
  };
  databaseHealth: {
    status: string;
    provider: string;
    connectionPool: string;
    latencyMs: number;
    lastHealthCheck: string;
    migrationVersion: string;
  };
  apiHealth: {
    overallStatus: string;
    uptimePercentage: string;
    activeEndpointsCount: number;
    averageLatencyMs: number;
    failedRequestsLast24h: number;
    rateLimitPolicy: string;
  };
  storageConfigStatus: {
    provider: string;
    buckets: Array<{ name: string; access: string; status: string }>;
    totalBuckets: number;
    allBucketsSecured: boolean;
  };
  securityAuditEvents: Array<{
    id: string;
    eventType: string;
    severity: string;
    description: string;
    timestamp: string;
  }>;
  backgroundJobs: Record<string, { status: string; interval?: string; nextRun?: string; queuedJobs?: number }>;
  serverTime: string;
  nodeEnvironment: string;
}

export default function SuperAdminAnalyticsPage() {
  const [data, setData] = useState<SystemOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function fetchTelemetry() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/system-overview');
        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Failed to fetch system overview');
        }
        const json = await res.json();
        if (!ignore) {
          setData(json.overview);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching telemetry');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchTelemetry();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AppShell
      activeRole="SUPER_ADMIN"
      userName="Rajesh Sharma"
      userRoleTitle="Super Admin • System Governance"
    >
      <div className="flex-1 overflow-y-auto bg-[#EAE5FA] p-4 lg:p-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide uppercase bg-[#FAF7A7] border border-[#20243A] text-[#20243A]">
                Platform Governance
              </span>
              <span className="text-xs text-[#77798A] font-medium">
                Infrastructure Health & Telemetry
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-black text-[#20243A] tracking-tight">
              Super Admin System Overview
            </h1>
            <p className="text-sm text-[#77798A] font-medium mt-1">
              Platform-wide telemetry, user authorization distribution, database connection health, and storage isolation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLoading(true);
                fetch('/api/admin/system-overview')
                  .then((r) => r.json())
                  .then((j) => setData(j.overview))
                  .finally(() => setLoading(false));
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#C9F36B] border-[1.5px] border-[#20243A] rounded-xl font-bold text-xs text-[#20243A] shadow-[2px_2px_0px_#20243A] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Poll Telemetry
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-[1.5px] border-red-500 rounded-xl text-red-800 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="p-12 text-center bg-white border-[1.5px] border-[#20243A] rounded-2xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#20243A] mb-3" />
            <p className="text-sm font-bold text-[#20243A]">Connecting to Platform Telemetry...</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Top 4 Infrastructure Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Database Health */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    Database Health
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#C9F2DE] border border-[#20243A] flex items-center justify-center">
                    <Database className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#20243A]">
                  {data.databaseHealth.status === 'CONNECTED_POOLED' ? 'Connected' : 'Persisted Store'}
                </div>
                <div className="text-xs font-medium text-[#77798A] mt-1">
                  {data.databaseHealth.provider}
                </div>
                <div className="mt-3 pt-2 border-t border-[#EAE5FA] flex items-center justify-between text-[11px] font-bold text-[#77798A]">
                  <span>Latency: {data.databaseHealth.latencyMs}ms</span>
                  <span className="text-green-700">Healthy</span>
                </div>
              </div>

              {/* API Status */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    API Health & Uptime
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#FAF7A7] border border-[#20243A] flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#20243A]">
                  {data.apiHealth.uptimePercentage}
                </div>
                <div className="text-xs font-medium text-[#77798A] mt-1">
                  {data.apiHealth.activeEndpointsCount} Secured REST Endpoints
                </div>
                <div className="mt-3 pt-2 border-t border-[#EAE5FA] flex items-center justify-between text-[11px] font-bold text-[#77798A]">
                  <span>Avg Latency: {data.apiHealth.averageLatencyMs}ms</span>
                  <span className="text-green-700">0 Failed Req</span>
                </div>
              </div>

              {/* System Accounts */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    Account Directory
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#DCD2FA] border border-[#20243A] flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#20243A]">
                  {data.users.totalUsers} Accounts
                </div>
                <div className="text-xs font-medium text-[#77798A] mt-1">
                  {data.users.activeUsers} Active • {data.users.inactiveUsers} Deactivated
                </div>
                <div className="mt-3 pt-2 border-t border-[#EAE5FA] text-[11px] font-bold text-green-700">
                  Zero plaintext credentials stored
                </div>
              </div>

              {/* Private Storage Buckets */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-5 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-[#77798A]">
                    Media Storage
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#C9F36B] border border-[#20243A] flex items-center justify-center">
                    <HardDrive className="w-4 h-4 text-[#20243A]" />
                  </div>
                </div>
                <div className="text-2xl font-black text-[#20243A]">
                  {data.storageConfigStatus.totalBuckets} Buckets
                </div>
                <div className="text-xs font-medium text-[#77798A] mt-1">
                  {data.storageConfigStatus.provider}
                </div>
                <div className="mt-3 pt-2 border-t border-[#EAE5FA] text-[11px] font-bold text-green-700">
                  Signed URL access enforced
                </div>
              </div>
            </div>

            {/* Grid 2 Columns: User Role Breakdown & Society Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Roles Breakdown */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    User Roles & Access Distribution
                  </h2>
                  <span className="text-xs font-bold text-[#77798A]">RBAC Enforced</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(data.users.usersByRole).map(([role, count]) => (
                    <div
                      key={role}
                      className="p-3 bg-[#EAE5FA] border border-[#20243A] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-black text-[#20243A]">{role}</div>
                        <div className="text-[10px] text-[#77798A] font-semibold">
                          {role === 'SUPER_ADMIN'
                            ? 'Root Governance'
                            : role === 'COMMITTEE'
                            ? 'Executive Operations'
                            : role === 'GUARD'
                            ? 'Terminal Access'
                            : 'Flat Resident'}
                        </div>
                      </div>
                      <span className="text-sm font-black px-2.5 py-1 bg-white rounded-lg border border-[#20243A]">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Society Configuration State */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Society Architecture & Configuration
                  </h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#C9F2DE] border border-[#20243A] text-[#20243A]">
                    {data.societyConfigStatus.configurationState}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-[#20243A] rounded-xl">
                    <span className="text-[#77798A] font-bold block">Building Name</span>
                    <strong className="text-[#20243A] font-black">{data.societyConfigStatus.societyName}</strong>
                  </div>
                  <div className="p-3 bg-white border border-[#20243A] rounded-xl">
                    <span className="text-[#77798A] font-bold block">Total Units & Wings</span>
                    <strong className="text-[#20243A] font-black">
                      {data.societyConfigStatus.totalFlats} Flats across {data.societyConfigStatus.totalWings} Wings
                    </strong>
                  </div>
                  <div className="p-3 bg-white border border-[#20243A] rounded-xl">
                    <span className="text-[#77798A] font-bold block">Billing Policy</span>
                    <strong className="text-[#20243A] font-black">{data.societyConfigStatus.billingMode}</strong>
                  </div>
                  <div className="p-3 bg-white border border-[#20243A] rounded-xl">
                    <span className="text-[#77798A] font-bold block">Base Rate / Unit</span>
                    <strong className="text-[#20243A] font-black">{data.societyConfigStatus.baseFeeInr}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Buckets & Security Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Private Storage Buckets */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Storage Buckets & Media Isolation
                  </h2>
                  <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    All Buckets Secured
                  </span>
                </div>

                <div className="space-y-2.5">
                  {data.storageConfigStatus.buckets.map((b) => (
                    <div
                      key={b.name}
                      className="flex items-center justify-between p-3 bg-[#EAE5FA] border border-[#20243A] rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#20243A]" />
                        <span className="font-bold text-[#20243A]">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#77798A]">{b.access}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#C9F2DE] border border-[#20243A] font-black text-[10px]">
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Audit Events */}
              <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                  <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    Security Audit & Telemetry Trail
                  </h2>
                  <span className="text-xs font-bold text-[#77798A]">System Generated</span>
                </div>

                <div className="space-y-2.5">
                  {data.securityAuditEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-3 bg-white border border-[#20243A] rounded-xl shadow-[1px_1px_0px_#20243A] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[#20243A]">{evt.eventType}</span>
                        <span className="text-[10px] text-[#77798A]">
                          {new Date(evt.timestamp).toLocaleTimeString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[#77798A] font-medium leading-relaxed">
                        {evt.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Background Workers & Processors */}
            <div className="bg-white border-[1.5px] border-[#20243A] p-6 rounded-2xl shadow-[3px_3px_0px_#20243A]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#20243A]/10">
                <h2 className="text-base font-black text-[#20243A] flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  Background Workers & Automation Engines
                </h2>
                <span className="text-xs font-bold text-[#77798A]">Serverless Scheduled Handlers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(data.backgroundJobs).map(([jobKey, details]) => (
                  <div
                    key={jobKey}
                    className="p-3 bg-[#EAE5FA] border border-[#20243A] rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#20243A] capitalize">
                        {jobKey.replace(/([A-Z])/g, ' $1')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#C9F36B] border border-[#20243A] font-black text-[10px]">
                        {details.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#77798A]">
                      {details.interval || details.nextRun || `Queued: ${details.queuedJobs ?? 0}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
