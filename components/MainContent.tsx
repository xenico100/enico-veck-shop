'use client';

import Link from 'next/link';

import {
  BRAND_NAME,
  CONTACT_EMAIL,
  DESIGNER_BRAND_URL,
  REPRESENTATIVE_NAME,
  YOUTUBE_URL
} from '@/utils/branding';

const statItems = [
  { label: 'Signal Drops', value: '1,200+' },
  { label: 'Network Uptime', value: '24/7' },
  { label: 'Secure Nodes', value: '4 Pods' }
];

export default function MainContent() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-screen items-center px-4 pb-14 pt-28 md:px-8 md:pb-20 md:pt-40"
    >
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <video
          className="h-full w-full object-cover opacity-28 saturate-[0.45] contrast-125"
          src="/images/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(3,5,10,0.96)_8%,rgba(7,12,22,0.78)_44%,rgba(4,5,9,0.94)_100%)]" />
      </div>

      <div className="section-shell">
        <div className="grid items-end gap-10 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="animate-rise">
            <p className="section-kicker">Coding · Media · Fashion Community</p>
            <h1 className="display-font text-glow mt-5 text-[clamp(2.8rem,9vw,7.4rem)] font-medium leading-[0.88] tracking-[0.03em]">
              {BRAND_NAME}
            </h1>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-cyan-100/78 md:text-[0.95rem]">
              <a
                href={DESIGNER_BRAND_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-cyan-300/45 underline-offset-4 transition hover:text-white hover:decoration-cyan-100"
              >
                enicoveck.com
              </a>
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-cyan-300/45 underline-offset-4 transition hover:text-white hover:decoration-cyan-100"
              >
                YouTube / FancyVeck
              </a>
            </div>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-cyan-100/74 md:text-base">
              {BRAND_NAME}은 코딩, 미디어, 패션에 대한 정보와 인사이트를 함께
              나누는 커뮤니티 사이트입니다. 트렌드 정리부터 작업 이야기,
              실무 팁과 추천 콘텐츠까지 한곳에서 보고 소통할 수 있도록
              구성했습니다.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <Link
                href="/architecture"
                className="y2k-button y2k-button-primary w-full no-underline sm:w-auto"
              >
                OPEN NODE MAP
              </Link>
              <a
                href="#studio"
                className="y2k-button y2k-button-accent w-full no-underline sm:w-auto"
              >
                WATCH FEED
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className="min-w-0 border-l border-cyan-300/14 py-1 pl-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/65">
                    {item.label}
                  </p>
                  <p className="mt-2 display-font text-lg font-medium tracking-[0.05em] text-cyan-50 md:text-xl">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="tech-panel scanline animate-rise relative max-w-xl overflow-hidden pt-2 [animation-delay:0.15s] lg:max-w-none lg:border-l lg:border-cyan-300/14 lg:pl-8 lg:pt-0">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-300/15 blur-2xl" />
            <p className="section-kicker">Signal</p>
            <h2 className="display-font mt-2 text-xl font-medium tracking-[0.03em] sm:text-2xl md:text-3xl">
              Live Node Intel
            </h2>

            <div className="mt-6 space-y-4 text-sm text-cyan-50/80">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/65">Representative</p>
                <p className="mt-1 break-words leading-relaxed">
                  대표: {REPRESENTATIVE_NAME}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/65">Email</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-1 block break-all leading-relaxed underline decoration-cyan-300/35 underline-offset-4 transition hover:text-white hover:decoration-cyan-100"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
