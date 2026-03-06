'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

type ActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'pill';
type ActionButtonSize = 'sm' | 'md';

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  active?: boolean;
};

const baseClass =
  'inline-flex items-center justify-center rounded-[0.92rem] border font-medium tracking-[0.08em] transition-[transform,border-color,background-color,box-shadow,color] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-100/35 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50';

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'min-h-9 px-3.5 text-[0.78rem]',
  md: 'min-h-11 px-5 text-[0.82rem]'
};

const variantClasses: Record<Exclude<ActionButtonVariant, 'pill'>, string> = {
  primary:
    'border-amber-100/24 bg-[linear-gradient(180deg,rgba(255,169,122,0.22),rgba(40,20,16,0.88))] text-amber-50 shadow-[inset_0_1px_0_rgba(255,239,229,0.08),0_12px_24px_rgba(14,4,2,0.24)] hover:border-amber-100/40 hover:bg-[linear-gradient(180deg,rgba(255,180,139,0.28),rgba(52,27,22,0.9))]',
  secondary:
    'border-cyan-100/24 bg-[linear-gradient(180deg,rgba(79,107,200,0.22),rgba(8,17,33,0.84))] text-cyan-50 shadow-[inset_0_1px_0_rgba(239,244,255,0.08),0_12px_24px_rgba(1,4,12,0.22)] backdrop-blur-sm hover:border-cyan-100/38 hover:bg-[linear-gradient(180deg,rgba(96,124,221,0.28),rgba(10,20,38,0.88))]',
  ghost:
    'border-cyan-100/16 bg-[linear-gradient(180deg,rgba(21,32,58,0.08),rgba(6,12,24,0.7))] text-cyan-50/92 hover:border-cyan-100/30 hover:bg-[linear-gradient(180deg,rgba(34,48,82,0.16),rgba(8,15,29,0.78))]',
  destructive:
    'border-rose-300/28 bg-[linear-gradient(180deg,rgba(244,63,94,0.18),rgba(43,10,18,0.86))] text-rose-100 shadow-[inset_0_1px_0_rgba(255,234,240,0.06),0_12px_24px_rgba(14,2,5,0.24)] hover:border-rose-300/40 hover:bg-[linear-gradient(180deg,rgba(244,63,94,0.24),rgba(52,12,21,0.88))]'
};

const pillVariantClass = (active: boolean) =>
  active
    ? 'border-amber-100/32 bg-[linear-gradient(180deg,rgba(255,169,122,0.22),rgba(40,20,16,0.88))] text-amber-50 shadow-[inset_0_1px_0_rgba(255,239,229,0.08),0_12px_24px_rgba(14,4,2,0.24)] hover:border-amber-100/40'
    : 'border-cyan-100/22 bg-[linear-gradient(180deg,rgba(79,107,200,0.18),rgba(8,17,33,0.8))] text-cyan-50/92 shadow-[inset_0_1px_0_rgba(239,244,255,0.06),0_10px_22px_rgba(1,4,12,0.18)] hover:border-cyan-100/34';

export default function ActionButton({
  variant = 'secondary',
  size = 'md',
  active = false,
  type = 'button',
  className,
  ...props
}: ActionButtonProps) {
  const variantClass = variant === 'pill' ? pillVariantClass(active) : variantClasses[variant];

  return (
    <button
      type={type}
      className={cn(baseClass, sizeClasses[size], variantClass, className)}
      data-variant={variant}
      data-state={active ? 'active' : 'inactive'}
      {...props}
    />
  );
}
