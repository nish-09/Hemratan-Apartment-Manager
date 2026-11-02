'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Wrench, ShieldAlert, ArrowRight, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Strictly restrict demo shortcuts to development environments
  const isDevMode = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true';

  const quickRoles = [
    {
      role: 'Resident',
      email: 'resident@hemratan.com',
      desc: 'Jonathan Patel • Flat A-402',
      variant: 'yellow' as const,
      icon: User,
    },
    {
      role: 'Security Guard',
      email: 'guard@hemratan.com',
      desc: 'Santosh Yadav • Gate Security',
      variant: 'mint' as const,
      icon: ShieldCheck,
    },
    {
      role: 'Committee',
      email: 'committee@hemratan.com',
      desc: 'Rosa Palmour • Operations & Billing',
      variant: 'lavender' as const,
      icon: Wrench,
    },
    {
      role: 'Super Admin',
      email: 'admin@hemratan.com',
      desc: 'Rajesh Sharma • Governance',
      variant: 'blue' as const,
      icon: ShieldAlert,
    },
  ];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      router.push(data.redirectUrl || '/');
      router.refresh();
    } catch {
      setErrorMessage('Network error during authentication. Please retry.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#FAF9FF] flex items-center justify-center p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-xl bg-white border-[1.5px] border-[#303044] rounded-[28px] shadow-[4px_6px_0px_rgba(48,48,68,0.2)] p-6 sm:p-10 flex flex-col gap-6">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C9F36B] border-[1.5px] border-[#303044] flex items-center justify-center font-black text-2xl text-[#20243A] shadow-[2px_2px_0px_#303044]">
            H
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#20243A] tracking-tight">
              Hemratan Apartment Manager
            </h1>
            <p className="text-xs font-semibold text-[#77798A]">One community. One connected platform.</p>
          </div>
        </div>

        {/* Development-Only Demo Switcher */}
        {isDevMode && (
          <div className="p-4 rounded-2xl bg-[#F8F7FC] border border-[#303044]/30">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold text-[#77798A] uppercase tracking-wider block">
                Dev Environment Demo Profiles
              </label>
              <Badge variant="peach" className="text-[10px]">Development Only</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {quickRoles.map((r) => {
                const Icon = r.icon;
                const isSelected = email === r.email;
                const variantBg = {
                  yellow: 'bg-[#FAF7A7]',
                  mint: 'bg-[#C9F2DE]',
                  lavender: 'bg-[#E6DEFC]',
                  blue: 'bg-[#E2E8F8]',
                }[r.variant];

                return (
                  <button
                    key={r.email}
                    type="button"
                    onClick={() => {
                      setEmail(r.email);
                      setPassword('Password@123');
                      setErrorMessage('');
                    }}
                    className={`p-2.5 rounded-xl border-[1.5px] border-[#303044] text-left transition-all cursor-pointer ${variantBg} ${
                      isSelected ? 'ring-2 ring-[#20243A] shadow-[2px_2px_0px_#303044]' : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-white border border-[#303044] flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-[#20243A]" />
                      </div>
                      <span className="font-extrabold text-xs text-[#20243A]">{r.role}</span>
                    </div>
                    <p className="text-[10px] font-semibold text-[#77798A] mt-1 line-clamp-1">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4 mt-1">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#20243A] block mb-1">Registered Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. resident@hemratan.com"
              className="w-full px-4 py-2.5 rounded-xl border-[1.5px] border-[#303044] text-sm text-[#20243A] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#20243A]">Password</label>
              <span className="text-[11px] font-bold text-[#77798A] hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 rounded-xl border-[1.5px] border-[#303044] text-sm text-[#20243A] bg-white focus:outline-none focus:ring-2 focus:ring-[#C9F36B]"
            />
          </div>

          <Button
            type="submit"
            variant="lime"
            size="lg"
            disabled={loading}
            className="w-full mt-2 font-black text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In Securely</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-2 border-t border-[#303044]/10 text-center">
          <p className="text-[11px] font-semibold text-[#77798A]">
            Production Security: Password-only authentication with salted scrypt hashing.
          </p>
        </div>
      </div>
    </div>
  );
}
