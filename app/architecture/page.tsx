import type { Metadata } from 'next';
import Link from 'next/link';

import ArchitectureGraph from '@/components/architecture/ArchitectureGraph';
import { BRAND_NAME } from '@/utils/branding';

export const metadata: Metadata = {
  title: `Architecture | ${BRAND_NAME}`,
  description:
    'xenico100/real_enico 저장소 분석을 기반으로 만든 인터랙티브 웹 아키텍처 노드 그래프 페이지'
};

export default function ArchitecturePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-16 pt-24 text-slate-100 md:px-8 md:pb-24 md:pt-32">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <span className="ambient-orb left-[-7rem] top-[10vh] h-72 w-72 bg-[radial-gradient(circle,rgba(64,201,255,0.22)_0%,rgba(64,201,255,0)_70%)]" />
        <span className="ambient-orb right-[-8rem] top-[28vh] h-96 w-96 bg-[radial-gradient(circle,rgba(255,182,89,0.16)_0%,rgba(255,182,89,0)_74%)] [animation-delay:2s]" />
      </div>

      <div className="section-shell">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="section-kicker">Architecture Route</p>
            <h1 className="section-title">real_enico 시스템 연결 구조</h1>
            <p className="mt-5 max-w-3xl text-sm leading-relaxed text-cyan-50/76 md:text-base">
              이 페이지는 GitHub 저장소{' '}
              <a
                href="https://github.com/xenico100/real_enico"
                target="_blank"
                rel="noreferrer"
                className="underline decoration-cyan-300/45 underline-offset-4 transition hover:text-white hover:decoration-cyan-100"
              >
                xenico100/real_enico
              </a>
              의 실제 파일과 폴더 구조를 읽고 정리한 인터랙티브 노드 그래프입니다.
              README, `next.config.ts`, `src/app/page.tsx`,
              `src/lib/storefront/server.ts`, 관리자 업로드/마이그레이션 API,
              `tools/sync-upload-to-supabase.mjs`, 그리고 `src / public / sql /
              supabase / tools / upload` 폴더 구성을 기준으로 만들었습니다.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cyan-50/58 md:text-base">
              정확히 코드로 확인된 연결은 그대로 표시했고, 마이그레이션이나 과거
              저장 경로처럼 간접적으로만 드러난 관계는 노드 안에 `보수적 추론`
              태그를 넣었습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-cyan-100/72">
            <Link
              href="/#about"
              className="y2k-button y2k-button-ghost !text-[0.72rem] no-underline"
            >
              Back To About
            </Link>
            <Link
              href="/"
              className="y2k-button y2k-button-accent !text-[0.72rem] no-underline"
            >
              Home
            </Link>
          </div>
        </div>

        <ArchitectureGraph variant="full" />
      </div>
    </main>
  );
}
