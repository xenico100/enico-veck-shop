'use client';

import { BRAND_NAME } from '@/utils/branding';

export default function Footer() {
  return (
    <footer className="relative px-4 pb-10 pt-10 md:px-8 md:pt-16">
      <div className="section-shell">
        <div className="tech-panel grid gap-8 p-5 sm:p-6 md:grid-cols-[1.1fr_0.8fr_0.8fr] md:p-8">
          <div>
            <p className="section-kicker">{BRAND_NAME}</p>
            <h3 className="display-font mt-3 text-[1.55rem] font-semibold tracking-[0.04em] text-[rgba(250,230,226,0.96)] sm:text-[1.9rem]">
              Cursed Community Archive
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[rgba(222,193,185,0.78)]">
              코딩, 미디어, 패션에 대한 정보와 레퍼런스를 함께 나누는 커뮤니티
              사이트입니다.
            </p>
          </div>

          <div>
            <p className="section-kicker !tracking-[0.24em]">Contact</p>
            <div className="mt-3 space-y-1.5 text-sm text-[rgba(222,193,185,0.74)]">
              <p>070@zeus-studio.net</p>
              <p>+82 2-1234-5678</p>
              <p>서울 강남구 양재천로 551 4F</p>
            </div>
          </div>

          <div>
            <p className="section-kicker !tracking-[0.24em]">Network</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a
                href="#"
                className="y2k-button y2k-button-ghost y2k-button-fade-tight min-h-9 px-3 !text-[0.68rem] no-underline"
              >
                Instagram
              </a>
              <a
                href="#"
                className="y2k-button y2k-button-ghost y2k-button-fade-tight min-h-9 px-3 !text-[0.68rem] no-underline"
              >
                YouTube
              </a>
              <a
                href="#"
                className="y2k-button y2k-button-ghost y2k-button-fade-tight min-h-9 px-3 !text-[0.68rem] no-underline"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-[var(--font-mono)] text-[11px] tracking-[0.18em] text-[rgba(157,119,115,0.62)] sm:text-xs">
          © 2026 {BRAND_NAME}. Clearance required.
        </p>
      </div>
    </footer>
  );
}
