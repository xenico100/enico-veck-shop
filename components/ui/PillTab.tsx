'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

type PillTabProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export default function PillTab({
  active = false,
  className,
  type = 'button',
  ...props
}: PillTabProps) {
  return (
    <button
      type={type}
      className={cn(
        'h-11 px-5 rounded-full border backdrop-blur-sm transition text-base font-semibold tracking-[0.2px] focus:outline-none focus:ring-2 focus:ring-white/40 disabled:opacity-50 disabled:cursor-not-allowed',
        active
          ? 'bg-white text-black border-white/40 shadow-md hover:bg-neutral-200'
          : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:text-white',
        'active:scale-[0.99]',
        className
      )}
      data-state={active ? 'active' : 'inactive'}
      {...props}
    />
  );
}
