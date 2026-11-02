'use client';

import React, { useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  Users,
  ShieldCheck,
  Activity,
  Plus,
  Key,
  Database,
  Lock,
} from 'lucide-react';
import { SEED_USERS } from '@/lib/auth/mock-users';

export default function SuperAdminDashboard() {
  const [users] = useState(SEED_USERS);
  const [auditLogs] = useState([
    {
      id: 'LOG-901',
      action: 'ROLE_ASSIGNMENT',
      actor: 'Rajesh Sharma (Super Admin)',
      target: 'Rosa Palmour -> COMMITTEE',
      timestamp: 'Today, 09:30 am',
      status: 'SUCCESS',
    },
    {
      id: 'LOG-900',
      action: 'RLS_SECURITY_CHECK',
      actor: 'System Integrity Scanner',
      target: 'Row-Level Security Policies Active (9 tables)',
      timestamp: 'Today, 07:00 am',
      status: 'VERIFIED',
    },
    {
      id: 'LOG-899',
      action: 'GATE_TERMINAL_SESSION',
      actor: 'Santosh Yadav (Guard)',
      target: 'Gate 1 Access Console Handshake',
      timestamp: 'Yesterday, 06:00 am',
      status: 'SUCCESS',
    },
  ]);

  return (
    <AppShell
      userName="Rajesh Sharma"
      userRoleTitle="Super Admin • System Governance"
      activeRole="SUPER_ADMIN"
    >
      {/* 1. TOP STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Users"
          value={users.length}
          subtitle="4 Provisioned System Accounts"
          variant="yellow"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Security Policies"
          value="9 Tables"
          subtitle="Row-Level Security Active"
          variant="mint"
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <StatCard
          title="DB Pooler"
          value="Healthy"
          subtitle="Transaction Pooling Active"
          variant="blue"
          icon={<Database className="w-5 h-5" />}
        />
        <StatCard
          title="Security Events"
          value="0"
          subtitle="Zero Security Violations"
          variant="lavender"
          icon={<ShieldAlert className="w-5 h-5" />}
        />
      </div>

      {/* 2. USER ROLE & PERMISSION MANAGEMENT TABLE */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#20243A]">
              System Users & Role Matrix
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Role-Based Access Control • Least-Privilege Provisioning
            </p>
          </div>
          <Button variant="lime" size="sm" className="gap-1.5 font-bold">
            <Plus className="w-3.5 h-3.5" />
            <span>Provision Account</span>
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF9FF] border-b border-[#303044]/20 text-[#77798A] font-extrabold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">Assigned Flat</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303044]/10 font-semibold text-[#20243A]">
              {users.map((u) => {
                const roleBadgeVariant = {
                  SUPER_ADMIN: 'lavender' as const,
                  COMMITTEE: 'yellow' as const,
                  GUARD: 'green' as const,
                  RESIDENT: 'neutral' as const,
                }[u.role];

                return (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-3">
                      <div className="font-extrabold text-[#20243A]">{u.fullName}</div>
                      <div className="text-[10px] text-[#77798A]">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={roleBadgeVariant}>{u.role}</Badge>
                    </td>
                    <td className="py-3 px-3 text-[#77798A]">{u.phoneNumber || '—'}</td>
                    <td className="py-3 px-3">
                      {u.flatDetails ? (
                        <span className="font-bold text-[#20243A] bg-slate-100 px-2 py-0.5 rounded border border-[#303044]/20">
                          Wing {u.flatDetails.wing} • Flat {u.flatDetails.flatNumber}
                        </span>
                      ) : (
                        <span className="text-[#77798A] italic">Society Wide</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                        <Activity className="w-3 h-3" /> Active
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" className="gap-1 text-xs py-1">
                          <Key className="w-3 h-3" />
                          <span>Reset Key</span>
                        </Button>
                        <Button variant="secondary" size="sm" className="gap-1 text-xs py-1">
                          <Lock className="w-3 h-3" />
                          <span>Permissions</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. APPEND-ONLY SECURITY AUDIT TRAIL */}
      <div className="rounded-2xl border-[1.5px] border-[#303044] bg-white p-5 sm:p-6 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#20243A]">
              Append-Only Security Audit Trail
            </h2>
            <p className="text-xs font-semibold text-[#77798A]">
              Immutable system event log for governance compliance
            </p>
          </div>
          <Badge variant="green">Real-time Stream</Badge>
        </div>

        <div className="divide-y divide-[#303044]/10 font-mono text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="font-extrabold text-[#20243A]">{log.action}: </span>
                <span className="text-[#77798A]">{log.target}</span>
                <div className="text-[10px] text-[#77798A] font-sans mt-0.5">By {log.actor}</div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-center">
                <Badge variant="green">{log.status}</Badge>
                <span className="text-[11px] text-[#77798A] font-sans">{log.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
