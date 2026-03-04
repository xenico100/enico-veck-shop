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
  'inline-flex items-center justify-center rounded-full border transition font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-100/45 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-base'
};

const variantClasses: Record<Exclude<ActionButtonVariant, 'pill'>, string> = {
  primary:
    'border-amber-100/35 bg-amber-100/20 text-amber-50 shadow-md hover:bg-amber-100/30',
  secondary:
    'border-cyan-100/30 bg-cyan-200/10 text-cyan-50 backdrop-blur-sm hover:bg-cyan-200/20',
  ghost: 'border-transparent bg-transparent text-cyan-50 hover:bg-cyan-200/10',
  destructive:
    'border-rose-300/35 bg-rose-500/15 text-rose-100 hover:bg-rose-500/24'
};

const pillVariantClass = (active: boolean) =>
  active
    ? 'border-amber-100/45 bg-amber-100/20 text-amber-50 shadow-md hover:bg-amber-100/30'
    : 'border-cyan-100/30 bg-cyan-200/10 text-cyan-50 hover:bg-cyan-200/20';

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
