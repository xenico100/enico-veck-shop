'use client';

import { useState } from 'react';

import { cn } from '@/utils/cn';
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

type DarkNodeDiagramStackProps = {
  className?: string;
};

export default function DarkNodeDiagramStack({
  className
}: DarkNodeDiagramStackProps) {
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const archiveRed = '#7d002d';
  const dataInk = '#0b5c61';
  const imageInk = '#17652f';
  const authInk = '#865114';
  const paymentInk = '#776109';
  const adminInk = '#6b135c';
  const statusInk = '#1b5c2c';

  return (
    <div className={cn('relative min-h-screen w-full overflow-hidden bg-[#f8fbff]', className)}>
      <div className="pointer-events-none absolute inset-0 z-20 opacity-10">
        <div className="dark-node-scanlines h-full" />
      </div>

      <div className="dark-node-noise pointer-events-none absolute inset-0 z-10 opacity-5" />

      <div className="relative z-0 w-full px-3 pb-6 pt-4 md:px-6 md:pb-10 md:pt-6">
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
            Next.js × Supabase × Cloudflare R2 × Google Auth × Nice Pay ×
            PayPal
          </div>
          <div
            className="mt-2 font-mono text-[9px] tracking-wider opacity-45 md:text-[10px]"
            style={{ color: archiveRed }}
          >
            [SYSTEM ONLINE] :: {currentDate}
          </div>
        </div>

        <ZoomableCanvas svgWidth={ARCH_SVG_WIDTH} svgHeight={ARCH_SVG_HEIGHT}>
          <ArchitectureDiagram />
        </ZoomableCanvas>

        <div className="mt-3 font-mono text-[10px] md:text-xs">
          <div className="inline-flex flex-wrap gap-x-4 gap-y-1 rounded border border-[#d2d2d2] bg-[#f8fbff] p-2 backdrop-blur-sm md:p-3">
            <div className="mb-1 w-full tracking-wide opacity-75" style={{ color: statusInk }}>
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
              <span className="opacity-80" style={{ color: paymentInk }}>
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

        <div className="mt-2 font-mono text-[9px] opacity-50 md:text-[10px]" style={{ color: statusInk }}>
          <div className="flex gap-3 md:gap-4">
            <span>[NODES: 25]</span>
            <span>[CONNECTIONS: 22]</span>
            <span>[ZONES: 6]</span>
            <span>[STATUS: ACTIVE]</span>
          </div>
        </div>
      </div>

      <div className="relative my-4 h-px w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ffff] to-transparent opacity-30" />
      </div>

      <div className="relative z-0 w-full px-3 pb-6 pt-4 md:px-6 md:pb-10 md:pt-6">
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

        <ZoomableCanvas svgWidth={PROD_SVG_WIDTH} svgHeight={PROD_SVG_HEIGHT}>
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
            <span style={{ color: '#00ffff' }} className="opacity-90">
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
            <span style={{ color: '#00ff41' }} className="opacity-90">
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
            <span style={{ color: '#ff00ff' }} className="opacity-90">
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
            <span style={{ color: '#4499ff' }} className="opacity-90">
              이커머스 아웃풋
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-[2px] w-6 border-t-2 border-dashed md:w-10"
              style={{ borderColor: '#00ff41' }}
            />
            <span style={{ color: '#00ff41' }} className="opacity-60">
              데이터 재사용
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex w-full justify-center py-6">
        <div
          className="px-4 text-center font-mono text-[9px] tracking-widest opacity-30 md:text-[10px]"
          style={{ color: statusInk }}
        >
          [EOF] :: REAL_ENICO ARCHITECTURE DOCUMENTATION :: {currentDate}
        </div>
      </div>

      <style>{`
        .dark-node-scanlines {
          background: linear-gradient(
            to bottom,
            transparent 50%,
            rgba(0, 255, 65, 0.1) 50%
          );
          background-size: 100% 4px;
          animation: dark-node-scanline 8s linear infinite;
        }

        @keyframes dark-node-scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }

        .dark-node-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
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
    </div>
  );
}
