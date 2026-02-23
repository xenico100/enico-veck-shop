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
  'inline-flex items-center justify-center rounded-full border transition font-semibold focus:outline-none focus:ring-2 focus:ring-white/40 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed';

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-base'
};

const variantClasses: Record<Exclude<ActionButtonVariant, 'pill'>, string> = {
  primary: 'bg-white text-black border-white/40 shadow-md hover:bg-white/90',
  secondary: 'bg-white/10 text-white border-white/20 backdrop-blur-sm hover:bg-white/15',
  ghost: 'bg-transparent text-white border-transparent hover:bg-white/10',
  destructive: 'bg-red-500/20 text-red-200 border-red-500/30 hover:bg-red-500/25'
};

const pillVariantClass = (active: boolean) =>
  active
    ? 'bg-white text-black border-white/40 shadow-md hover:bg-white/90'
    : 'bg-white/10 text-white border-white/20 hover:bg-white/15';

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
