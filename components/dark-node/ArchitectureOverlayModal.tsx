'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import {
  ArchitectureDiagram,
  ARCH_SVG_HEIGHT,
  ARCH_SVG_WIDTH
} from '@/components/dark-node/ArchitectureDiagram';
import {
  ProductionDiagram,
  PROD_SVG_HEIGHT,
  PROD_SVG_WIDTH
} from '@/components/dark-node/ProductionDiagram';
import { ZoomableCanvas } from '@/components/dark-node/ZoomableCanvas';

export type ArchitectureModalTab = 'system' | 'production';

type ArchitectureOverlayModalProps = {
  activeTab: ArchitectureModalTab;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export default function ArchitectureOverlayModal({
  activeTab,
  onOpenChange,
  open
}: ArchitectureOverlayModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dataInk = '#0b5c61';
  const imageInk = '#17652f';
  const authInk = '#865114';
  const paymentInk = '#776109';
  const adminInk = '#6b135c';
  const statusInk = '#1b5c2c';
  const prodDigitalInk = '#0a4f57';
  const prodArchiveInk = '#1c5a28';
  const prodPhysicalInk = '#6e1768';
  const prodCommerceInk = '#33599a';
  const prodReuseInk = '#27572e';

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-[rgba(31,24,18,0.18)] backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      <div className="fixed inset-0 z-[71] flex items-end justify-center p-2 pt-10 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Architecture Overlay"
          className="architecture-modal-shell relative max-h-[calc(100dvh-0.75rem)] w-full max-w-[96rem] overflow-hidden rounded-[1.15rem]"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-900/12 bg-white/92 text-stone-900 shadow-[0_14px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400/70 sm:right-6 sm:top-6 md:right-8"
            aria-label="아키텍처 모달 닫기"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto px-4 pb-6 pt-10 sm:max-h-[88vh] sm:px-6 sm:pb-8 sm:pt-12 md:px-8">
            {activeTab === 'system' ? (
              <div className="space-y-4">
                <ZoomableCanvas
                  svgWidth={ARCH_SVG_WIDTH}
                  svgHeight={ARCH_SVG_HEIGHT}
                >
                  <ArchitectureDiagram />
                </ZoomableCanvas>

                <div className="mt-3 font-mono text-[10px] md:text-xs">
                  <div className="inline-flex flex-wrap gap-x-4 gap-y-1 rounded border border-[#d2d2d2] bg-[#f8fbff] p-2 backdrop-blur-sm md:p-3">
                    <div
                      className="mb-1 w-full tracking-wide opacity-75"
                      style={{ color: statusInk }}
                    >
                      FLOW TYPES:
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-5 bg-[#00ffff] shadow-[0_0_4px_#00ffff]" />
                      <span className="opacity-80" style={{ color: dataInk }}>
                        Data Flow
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-5 bg-[#00ff41] shadow-[0_0_4px_#00ff41]" />
                      <span className="opacity-80" style={{ color: imageInk }}>
                        Image Flow
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-5 bg-[#ff9900] shadow-[0_0_4px_#ff9900]" />
                      <span className="opacity-80" style={{ color: authInk }}>
                        Auth Flow
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-5 bg-[#ffdd00] shadow-[0_0_4px_#ffdd00]" />
                      <span
                        className="opacity-80"
                        style={{ color: paymentInk }}
                      >
                        Payment Flow
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-0.5 w-5 bg-[#ff00ff] shadow-[0_0_4px_#ff00ff]" />
                      <span className="opacity-80" style={{ color: adminInk }}>
                        Admin Flow
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <ZoomableCanvas
                  svgWidth={PROD_SVG_WIDTH}
                  svgHeight={PROD_SVG_HEIGHT}
                >
                  <ProductionDiagram />
                </ZoomableCanvas>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] md:text-[11px]">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[2px] w-6 md:w-10"
                      style={{
                        background: '#00ffff',
                        boxShadow: '0 0 6px #00ffff'
                      }}
                    />
                    <span
                      style={{ color: prodDigitalInk }}
                      className="opacity-95"
                    >
                      디지털 플로우
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[2px] w-6 md:w-10"
                      style={{
                        background: '#00ff41',
                        boxShadow: '0 0 6px #00ff41'
                      }}
                    />
                    <span
                      style={{ color: prodArchiveInk }}
                      className="opacity-95"
                    >
                      아카이브 / 데이터
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[2px] w-6 md:w-10"
                      style={{
                        background: '#ff00ff',
                        boxShadow: '0 0 6px #ff00ff'
                      }}
                    />
                    <span
                      style={{ color: prodPhysicalInk }}
                      className="opacity-95"
                    >
                      실물 프로덕션
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[2px] w-6 md:w-10"
                      style={{
                        background: '#4499ff',
                        boxShadow: '0 0 6px #4499ff'
                      }}
                    />
                    <span
                      style={{ color: prodCommerceInk }}
                      className="opacity-95"
                    >
                      이커머스 아웃풋
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-[2px] w-6 border-t-2 border-dashed md:w-10"
                      style={{ borderColor: '#00ff41' }}
                    />
                    <span
                      style={{ color: prodReuseInk }}
                      className="opacity-85"
                    >
                      데이터 재사용
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .architecture-modal-shell {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(248, 251, 255, 0.98)),
            linear-gradient(135deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.58));
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow:
            0 30px 80px rgba(148, 163, 184, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.85);
          animation: architecture-modal-enter 240ms ease-out;
        }

        @keyframes architecture-modal-enter {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.985);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
