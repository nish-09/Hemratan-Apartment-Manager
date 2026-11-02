import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'peach' | 'lavender' | 'yellow' | 'neutral';
  className?: string;
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  const variantStyles = {
    green: 'bg-[#C9F2DE] text-[#136338] border-[#136338]/30',
    peach: 'bg-[#FCE1D8] text-[#9A2D1F] border-[#9A2D1F]/30',
    lavender: 'bg-[#E6DEFC] text-[#4A329A] border-[#4A329A]/30',
    yellow: 'bg-[#FAF7A7] text-[#695D0A] border-[#695D0A]/30',
    neutral: 'bg-white text-[#20243A] border-[#303044]/30',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${variantStyles} ${className}`}
    >
      {children}
    </span>
  );
}
