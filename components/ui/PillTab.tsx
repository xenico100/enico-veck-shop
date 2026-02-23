'use client';

import * as React from 'react';
import ActionButton from '@/components/ui/ActionButton';

type PillTabProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export default function PillTab({
  active = false,
  className,
  ...props
}: PillTabProps) {
  return (
    <ActionButton
      variant="pill"
      size="md"
      active={active}
      className={className}
      {...props}
    />
  );
}
