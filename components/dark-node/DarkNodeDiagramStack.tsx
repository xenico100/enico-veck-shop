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
import { BOARD } from '@/components/dark-node/board-theme';
import { ZoomableCanvas } from '@/components/dark-node/ZoomableCanvas';

type DarkNodeDiagramStackProps = {
  className?: string;
};

function LegendSwatch({
  color,
  label
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="block h-[2px] w-8"
        style={{ background: color }}
      />
      <span className="text-[11px] font-medium tracking-[0.12em]" style={{ color: BOARD.inkSoft }}>
        {label}
      </span>
    </div>
  );
}

export default function DarkNodeDiagramStack({
  className
}: DarkNodeDiagramStackProps) {
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);

  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{
        background:
          `linear-gradient(180deg, ${BOARD.ink} 0%, #241d16 42%, ${BOARD.ink} 100%)`
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.14,
          backgroundImage:
            `repeating-linear-gradient(90deg, transparent 0, transparent 47px, rgba(255,255,255,0.02) 47px, rgba(255,255,255,0.02) 48px),
             repeating-linear-gradient(180deg, transparent 0, transparent 47px, rgba(255,255,255,0.02) 47px, rgba(255,255,255,0.02) 48px)`
        }}
      />

      <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-8 pt-6 md:px-6 md:pb-12 md:pt-8">
        <section
          className="border p-4 md:p-6"
          style={{
            background: `linear-gradient(180deg, ${BOARD.paperSoft} 0%, ${BOARD.paperDeep} 100%)`,
            borderColor: BOARD.wood,
            boxShadow: `0 22px 44px rgba(35, 28, 20, 0.22)`
          }}
        >
          <div className="mb-5 flex flex-col gap-4 md:mb-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p
                className="text-[11px] tracking-[0.28em]"
                style={{ color: BOARD.gold, textTransform: 'uppercase' }}
              >
                System Record
              </p>
              <h2
                className="mt-3 text-[clamp(1.6rem,4vw,3rem)] font-semibold tracking-[0.04em]"
                style={{ color: BOARD.ink }}
              >
                REAL_ENICO 구조도
              </h2>
              <p
                className="mt-3 max-w-2xl text-sm leading-relaxed md:text-base"
                style={{ color: BOARD.inkSoft }}
              >
                웹사이트 운영 구조를 전략판처럼 정리한 도식입니다. 사용자 요청,
                관리자 입력, 저장소, 인증, 결제, 소스 구조가 서로 어떤 순서와
                위계로 맞물리는지 한 장의 판으로 읽히도록 재구성했습니다.
              </p>
            </div>

            <div
              className="border px-4 py-3 text-right"
              style={{
                borderColor: BOARD.line,
                background: BOARD.paper,
                color: BOARD.inkSoft
              }}
            >
              <div className="text-[10px] tracking-[0.22em] uppercase">Current Record</div>
              <div className="mt-2 text-sm font-medium">{currentDate}</div>
              <div className="mt-2 text-[10px] tracking-[0.16em]">Next.js / Supabase / R2 / Pay</div>
            </div>
          </div>

          <ZoomableCanvas svgWidth={ARCH_SVG_WIDTH} svgHeight={ARCH_SVG_HEIGHT}>
            <ArchitectureDiagram />
          </ZoomableCanvas>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <LegendSwatch color={BOARD.inkSoft} label="데이터 흐름" />
              <LegendSwatch color={BOARD.wood} label="이미지 흐름" />
              <LegendSwatch color={BOARD.gold} label="인증 · 결제" />
              <LegendSwatch color={BOARD.rust} label="관리자 흐름" />
              <LegendSwatch color={BOARD.line} label="저장소 · 소스 구조" />
            </div>

            <div
              className="text-[11px] tracking-[0.18em]"
              style={{ color: BOARD.wood }}
            >
              구성 25 / 연결 22 / 구획 6
            </div>
          </div>
        </section>

        <div
          className="mx-auto my-6 h-px w-full max-w-[1260px]"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${BOARD.goldSoft} 18%, ${BOARD.goldSoft} 82%, transparent 100%)`
          }}
        />

        <section
          className="border p-4 md:p-6"
          style={{
            background: `linear-gradient(180deg, ${BOARD.paperSoft} 0%, ${BOARD.paperDeep} 100%)`,
            borderColor: BOARD.wood,
            boxShadow: `0 22px 44px rgba(35, 28, 20, 0.18)`
          }}
        >
          <div className="mb-5 flex flex-col gap-4 md:mb-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p
                className="text-[11px] tracking-[0.28em]"
                style={{ color: BOARD.rustSoft, textTransform: 'uppercase' }}
              >
                Production Record
              </p>
              <h2
                className="mt-3 text-[clamp(1.6rem,4vw,3rem)] font-semibold tracking-[0.04em]"
                style={{ color: BOARD.ink }}
              >
                enicoveck 제작 수순도
              </h2>
              <p
                className="mt-3 max-w-2xl text-sm leading-relaxed md:text-base"
                style={{ color: BOARD.inkSoft }}
              >
                디지털 설계에서 자료 아카이브, 실물 제작, 이커머스 업로드까지의
                수순을 하나의 판짜기 구조로 정리했습니다. 정보는 많지만 흐름은
                단정하게 읽히도록 위계를 다시 잡았습니다.
              </p>
            </div>

            <div
              className="border px-4 py-3 text-right"
              style={{
                borderColor: BOARD.line,
                background: BOARD.paper,
                color: BOARD.inkSoft
              }}
            >
              <div className="text-[10px] tracking-[0.22em] uppercase">Production Scope</div>
              <div className="mt-2 text-sm font-medium">CLO3D / CLO-SET / Handmade</div>
              <div className="mt-2 text-[10px] tracking-[0.16em]">Archive / Physical / Commerce</div>
            </div>
          </div>

          <ZoomableCanvas svgWidth={PROD_SVG_WIDTH} svgHeight={PROD_SVG_HEIGHT}>
            <ProductionDiagram />
          </ZoomableCanvas>

          <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <LegendSwatch color={BOARD.inkSoft} label="디지털 설계" />
              <LegendSwatch color={BOARD.wood} label="아카이브 / 데이터" />
              <LegendSwatch color={BOARD.rust} label="실물 제작" />
              <LegendSwatch color={BOARD.gold} label="이커머스 결과물" />
            </div>

            <div
              className="text-[11px] tracking-[0.18em]"
              style={{ color: BOARD.wood }}
            >
              구성 19 / 연결 24 / 단계 4
            </div>
          </div>
        </section>

        <div
          className="py-7 text-center text-[10px] tracking-[0.26em]"
          style={{ color: BOARD.goldSoft, textTransform: 'uppercase', opacity: 0.72 }}
        >
          Real Enico Record Sheet · Structured Board Edition
        </div>
      </div>
    </div>
  );
}
