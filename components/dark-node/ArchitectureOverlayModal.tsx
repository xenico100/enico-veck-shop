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
import PillTab from '@/components/ui/PillTab';

export type ArchitectureModalTab = 'system' | 'production';

type ArchitectureOverlayModalProps = {
  activeTab: ArchitectureModalTab;
  currentDate: string;
  onOpenChange: (open: boolean) => void;
  onTabChange: (tab: ArchitectureModalTab) => void;
  open: boolean;
};

export default function ArchitectureOverlayModal({
  activeTab,
  currentDate,
  onOpenChange,
  onTabChange,
  open
}: ArchitectureOverlayModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const archiveRed = '#7d002d';
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
          aria-labelledby="architecture-modal-title"
          className="architecture-modal-shell max-h-[calc(100dvh-0.75rem)] w-full max-w-[96rem] overflow-hidden rounded-[1.15rem]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-stone-900/10 px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-6 md:px-8">
            <div className="min-w-0 flex-1">
              <h2
                id="architecture-modal-title"
                className="display-font text-[1.35rem] font-semibold tracking-[0.04em] text-stone-950 sm:text-[1.7rem] md:text-[2rem]"
              >
                Architecture Viewer
              </h2>
              <div className="mt-4 overflow-x-auto pb-1">
                <div className="flex min-w-max items-center gap-2">
                  <PillTab
                    active={activeTab === 'system'}
                    onClick={() => onTabChange('system')}
                    className="whitespace-nowrap"
                  >
                    SYSTEM ARCHITECTURE MAP
                  </PillTab>
                  <PillTab
                    active={activeTab === 'production'}
                    onClick={() => onTabChange('production')}
                    className="whitespace-nowrap"
                  >
                    패션 프로덕션 아키텍처
                  </PillTab>
                </div>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => onOpenChange(false)}
              className="y2k-button y2k-button-ghost y2k-button-icon y2k-button-fade-pin shrink-0"
              aria-label="아키텍처 모달 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto px-4 pb-6 pt-5 sm:max-h-[78vh] sm:px-6 sm:pb-8 sm:pt-6 md:px-8">
            {activeTab === 'system' ? (
              <div className="space-y-4">
                <div className="mb-4 md:mb-6">
                  <div
                    className="dark-node-glitch font-mono text-xs tracking-wider opacity-70 md:text-sm"
                    data-text="REAL_ENICO :: SYSTEM ARCHITECTURE MAP"
                    style={{
                      color: archiveRed,
                      textShadow: '0 0 4px rgba(90, 0, 16, 0.18)'
                    }}
                  >
                    REAL_ENICO :: SYSTEM ARCHITECTURE MAP
                  </div>
                  <div
                    className="mt-1 font-mono text-[10px] tracking-wider opacity-60 md:text-xs"
                    style={{ color: archiveRed }}
                  >
                    Next.js × Supabase × Cloudflare R2 × Google Auth × Nice Pay
                    × PayPal
                  </div>
                  <div
                    className="mt-2 font-mono text-[9px] tracking-wider opacity-45 md:text-[10px]"
                    style={{ color: archiveRed }}
                  >
                    [SYSTEM ONLINE] :: {currentDate}
                  </div>
                </div>

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

                <div
                  className="mt-2 font-mono text-[9px] opacity-50 md:text-[10px]"
                  style={{ color: statusInk }}
                >
                  <div className="flex gap-3 md:gap-4">
                    <span>[NODES: 25]</span>
                    <span>[CONNECTIONS: 22]</span>
                    <span>[ZONES: 6]</span>
                    <span>[STATUS: ACTIVE]</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mb-4 md:mb-6">
                  <div
                    className="dark-node-glitch font-mono text-xs tracking-wider md:text-sm"
                    style={{
                      color: archiveRed,
                      textShadow: '0 0 4px rgba(90, 0, 16, 0.18)',
                      opacity: 0.9
                    }}
                    data-text="PRODUCTION PIPELINE :: 패션 프로덕션 아키텍처"
                  >
                    PRODUCTION PIPELINE :: 패션 프로덕션 아키텍처
                  </div>
                  <div
                    className="mt-1 font-mono text-[10px] tracking-wider opacity-65 md:text-xs"
                    style={{ color: archiveRed }}
                  >
                    CLO3D × CLO-SET × Handmade × enicoveck.com
                  </div>
                  <div
                    className="mt-2 font-mono text-[9px] tracking-wider opacity-50 md:text-[10px]"
                    style={{ color: archiveRed }}
                  >
                    [NODES: 19] :: [CONNECTIONS: 24] :: [PHASES: 4]
                  </div>
                </div>

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

        .dark-node-glitch {
          position: relative;
          text-shadow:
            0 0 5px #00ff41,
            0 0 10px #00ff41;
        }

        .dark-node-glitch::before {
          content: attr(data-text);
          position: absolute;
          left: -2px;
          top: 0;
          overflow: hidden;
          background: #f8fbff;
          color: #00ff41;
          text-shadow: -2px 0 #ff00ff;
          clip: rect(0, 900px, 0, 0);
          animation: dark-node-glitch-anim 5s infinite linear alternate-reverse;
          opacity: 0.8;
        }

        @keyframes dark-node-glitch-anim {
          0% { clip: rect(42px, 9999px, 44px, 0); }
          5% { clip: rect(12px, 9999px, 59px, 0); }
          10% { clip: rect(48px, 9999px, 29px, 0); }
          15% { clip: rect(42px, 9999px, 73px, 0); }
          20% { clip: rect(63px, 9999px, 27px, 0); }
          25% { clip: rect(34px, 9999px, 55px, 0); }
          30% { clip: rect(86px, 9999px, 73px, 0); }
          35% { clip: rect(20px, 9999px, 20px, 0); }
          40% { clip: rect(26px, 9999px, 60px, 0); }
          45% { clip: rect(25px, 9999px, 66px, 0); }
          50% { clip: rect(57px, 9999px, 98px, 0); }
          55% { clip: rect(5px, 9999px, 46px, 0); }
          60% { clip: rect(82px, 9999px, 31px, 0); }
          65% { clip: rect(54px, 9999px, 27px, 0); }
          70% { clip: rect(28px, 9999px, 99px, 0); }
          75% { clip: rect(45px, 9999px, 69px, 0); }
          80% { clip: rect(23px, 9999px, 85px, 0); }
          85% { clip: rect(54px, 9999px, 84px, 0); }
          90% { clip: rect(45px, 9999px, 47px, 0); }
          95% { clip: rect(37px, 9999px, 20px, 0); }
          100% { clip: rect(4px, 9999px, 91px, 0); }
        }
      `}</style>
    </>
  );
}
