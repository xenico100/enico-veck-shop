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
  'relative inline-flex items-center justify-center gap-2 border-0 bg-transparent px-0 text-center font-medium uppercase leading-tight tracking-[0.12em] transition-[transform,color,opacity] duration-200 ease-out after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:origin-center after:scale-x-[0.72] after:bg-current after:opacity-40 after:transition-[transform,opacity] after:duration-200 hover:after:scale-x-100 hover:after:opacity-90 focus:outline-none focus:ring-0 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50';

const sizeClasses: Record<ActionButtonSize, string> = {
  sm: 'min-h-8 text-[0.74rem]',
  md: 'min-h-10 text-[0.78rem]'
};

const variantClasses: Record<Exclude<ActionButtonVariant, 'pill'>, string> = {
  primary:
    'text-amber-50',
  secondary:
    'text-cyan-50',
  ghost:
    'text-cyan-50/86',
  destructive:
    'text-rose-100'
};

const pillVariantClass = (active: boolean) =>
  active
    ? 'text-amber-50 after:scale-x-100 after:opacity-90'
    : 'text-cyan-50/86';

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
