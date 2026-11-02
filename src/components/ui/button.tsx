import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'lime';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#303044]/30';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-xl',
    md: 'text-sm px-4 py-2.5 rounded-xl',
    lg: 'text-base px-6 py-3 rounded-2xl',
  }[size];

  const variantStyles = {
    primary:
      'bg-[#20243A] text-white border-[1.5px] border-[#303044] hover:bg-[#303044] active:translate-y-0.5 shadow-[2px_2px_0px_rgba(48,48,68,0.2)]',
    lime:
      'bg-[#C9F36B] text-[#20243A] border-[1.5px] border-[#303044] hover:bg-[#b8ea52] active:translate-y-0.5 shadow-[2px_2px_0px_rgba(48,48,68,0.2)]',
    secondary:
      'bg-[#EAE5FA] text-[#20243A] border-[1.5px] border-[#303044] hover:bg-[#dfd7f7] active:translate-y-0.5 shadow-[1px_1px_0px_rgba(48,48,68,0.15)]',
    outline:
      'bg-white text-[#20243A] border-[1.5px] border-[#303044] hover:bg-slate-50 active:translate-y-0.5 shadow-[2px_2px_0px_rgba(48,48,68,0.12)]',
    ghost: 'text-[#20243A] hover:bg-black/5 active:bg-black/10',
  }[variant];

  return (
    <button className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {children}
    </button>
  );
}
