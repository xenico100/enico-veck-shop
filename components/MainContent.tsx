'use client';

import Link from 'next/link';

import { BRAND_NAME, DESIGNER_BRAND_URL, YOUTUBE_URL } from '@/utils/branding';

export default function MainContent() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-screen items-center px-4 pb-14 pt-28 md:px-8 md:pb-20 md:pt-40"
    >
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <video
          className="h-full w-full object-cover opacity-[0.14] grayscale saturate-0 contrast-105"
          src="/images/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,248,255,0.98)_0%,rgba(249,251,255,0.96)_52%,rgba(239,245,255,0.98)_100%)]" />
        <div className="absolute inset-y-0 right-0 w-[24vw] bg-[linear-gradient(180deg,rgba(235,242,255,0.94),rgba(248,251,255,0.22))]" />
      </div>

      <div className="section-shell">
        <div className="animate-rise max-w-3xl">
          <p className="section-kicker">Architecture · Creativity · Art</p>
          <h1 className="display-font text-glow mt-5 text-[clamp(2.8rem,9vw,7.4rem)] font-semibold leading-[0.9] tracking-[0.01em] text-stone-950">
            {BRAND_NAME}
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-stone-600 md:text-[0.95rem]">
            <a
              href={DESIGNER_BRAND_URL}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-stone-900/25 underline-offset-4 transition hover:text-stone-950 hover:decoration-stone-900/55"
            >
              enicoveck.com
            </a>
            <a
              href={YOUTUBE_URL}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-stone-900/25 underline-offset-4 transition hover:text-stone-950 hover:decoration-stone-900/55"
            >
              YouTube / FancyVeck
            </a>
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-stone-700 md:text-base">
            夢想人 曰 이곳은 극소수의 창작자를 위한 커뮤니티형 아카이브입니다.
            웹앱제작부터 의상제작, 영상제작까지 실제 설계와 창작의 전 과정을
            솔직하게 보여드리며, 인사이트를 공유합니다.
          </p>

          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-1.5">
            <Link
              href="/architecture"
              className="y2k-button y2k-button-primary y2k-button-hero-compact y2k-button-fade-micro w-full no-underline sm:w-auto"
            >
              OPEN NODE MAP
            </Link>
            <a
              href="#studio"
              className="y2k-button y2k-button-accent y2k-button-hero-compact y2k-button-fade-micro w-full no-underline sm:w-auto"
            >
              WATCH FEED
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
