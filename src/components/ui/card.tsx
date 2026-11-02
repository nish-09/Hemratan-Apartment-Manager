import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'white' | 'yellow' | 'mint' | 'lavender' | 'blue' | 'peach';
}

const variantStyles: Record<string, string> = {
  white: 'bg-white',
  yellow: 'bg-[#FAF7A7]',
  mint: 'bg-[#C9F2DE]',
  lavender: 'bg-[#E6DEFC]',
  blue: 'bg-[#E2E8F8]',
  peach: 'bg-[#FCE1D8]',
};

export function Card({ children, className = '', variant = 'white', ...props }: CardProps) {
  const bgClass = variantStyles[variant] || 'bg-white';
  return (
    <div
      className={`rounded-2xl border-[1.5px] border-[#303044] p-5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)] ${bgClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
