'use client';

import { useEffect } from 'react';

import ServicesSection from './ServicesSection';

type ServicesSectionModalProps = {
  onOpenCart?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export default function ServicesSectionModal({
  onOpenCart,
  onOpenChange,
  open
}: ServicesSectionModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[87]">
      <button
        type="button"
        aria-label="굿즈 판매 탭 닫기"
        className="absolute inset-0 bg-[rgba(10,8,14,0.62)] backdrop-blur-[4px]"
        onClick={() => onOpenChange(false)}
      />

      <div className="absolute inset-x-2 bottom-2 top-20 z-[88] overflow-hidden rounded-[1.55rem] border border-[rgba(183,61,61,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,246,250,0.94))] shadow-[0_40px_120px_rgba(34,14,14,0.24)] md:inset-x-6 md:bottom-6 md:top-24 md:rounded-[2rem]">
        <div className="flex items-center justify-between gap-3 border-b border-[rgba(183,61,61,0.12)] bg-white/84 px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(161,48,48,0.58)]">
              Goods Section
            </p>
            <h2 className="mt-1 font-[var(--font-display-kr)] text-[1rem] font-semibold text-[rgba(79,14,14,0.96)] sm:text-[1.18rem]">
              굿즈 판매 탭
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full border border-[rgba(183,61,61,0.18)] bg-white/92 px-3 py-1.5 text-[0.72rem] font-medium text-[rgba(90,19,19,0.92)] transition hover:bg-white"
          >
            닫기
          </button>
        </div>

        <div className="h-[calc(100%-4.25rem)] overflow-y-auto px-3 py-3 sm:px-5 sm:py-5">
          <ServicesSection
            mode="modal"
            onOpenCart={onOpenCart}
            sectionId="services-modal"
          />
        </div>
      </div>
    </div>
  );
}
