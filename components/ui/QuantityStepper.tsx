'use client';

import { Minus, Plus } from 'lucide-react';
import ActionButton from '@/components/ui/ActionButton';
import { cn } from '@/utils/cn';

type QuantityStepperProps = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  decrementLabel?: string;
  incrementLabel?: string;
};

export default function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  min = 1,
  max,
  disabled = false,
  className,
  decrementLabel = '수량 감소',
  incrementLabel = '수량 증가'
}: QuantityStepperProps) {
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && (typeof max === 'number' ? value < max : true);

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-white/20 bg-white/8 p-1 shadow-sm backdrop-blur-sm',
        className
      )}
    >
      <ActionButton
        variant="secondary"
        size="sm"
        type="button"
        onClick={onDecrement}
        disabled={!canDecrement}
        aria-label={decrementLabel}
        className="h-9 w-9 px-0 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"
      >
        <Minus className="h-4 w-4" />
      </ActionButton>
      <span className="min-w-9 px-1 text-center text-sm font-semibold text-white">{value}</span>
      <ActionButton
        variant="secondary"
        size="sm"
        type="button"
        onClick={onIncrement}
        disabled={!canIncrement}
        aria-label={incrementLabel}
        className="h-9 w-9 px-0 rounded-full border-white/20 bg-white/10 text-white hover:bg-white/15"
      >
        <Plus className="h-4 w-4" />
      </ActionButton>
    </div>
  );
}
