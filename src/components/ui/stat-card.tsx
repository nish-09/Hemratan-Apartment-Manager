import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: React.ReactNode;
  variant?: 'yellow' | 'mint' | 'lavender' | 'blue' | 'peach';
  onActionClick?: () => void;
}

const variantConfig = {
  yellow: {
    bg: 'bg-[#FAF7A7]',
    border: 'border-[#303044]',
  },
  blue: {
    bg: 'bg-[#E2E8F8]',
    border: 'border-[#303044]',
  },
  mint: {
    bg: 'bg-[#C9F2DE]',
    border: 'border-[#303044]',
  },
  lavender: {
    bg: 'bg-[#E6DEFC]',
    border: 'border-[#303044]',
  },
  peach: {
    bg: 'bg-[#FCE1D8]',
    border: 'border-[#303044]',
  },
};

export function StatCard({
  title: _title,
  value,
  subtitle,
  icon,
  variant = 'yellow',
  onActionClick,
}: StatCardProps) {
  const config = variantConfig[variant] || variantConfig.yellow;

  return (
    <div
      className={`rounded-2xl border-[1.5px] ${config.border} ${config.bg} p-5 flex flex-col justify-between shadow-[2px_2px_0px_rgba(48,48,68,0.15)] transition-transform hover:-translate-y-0.5`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-full border border-[#303044] bg-white/60 flex items-center justify-center text-[#20243A]">
          {icon}
        </div>
        <button
          type="button"
          onClick={onActionClick}
          aria-label="More options"
          className="text-[#20243A]/70 hover:text-[#20243A] p-1 rounded-lg hover:bg-black/5"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-[#20243A] tracking-tight">{value}</div>
        <div className="text-xs sm:text-sm font-medium text-[#77798A] mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
