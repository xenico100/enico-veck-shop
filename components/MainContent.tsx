'use client';

import { BRAND_NAME, DESIGNER_BRAND_URL, YOUTUBE_URL } from '@/utils/branding';
import PixelAvatarField from './PixelAvatarField';

export default function MainContent() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-screen items-center px-4 pb-20 pt-28 md:px-8 md:pb-24 md:pt-40"
    >
      <div className="section-shell">
        <div className="clinical-hero-shell">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="animate-rise max-w-3xl">
              <p className="section-kicker !text-[rgba(147,30,30,0.82)]">
                몽상 x 에니코벡 : BIO-NEBULA (Clinical White Ver.)
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.28em] text-[rgba(138,39,39,0.72)] sm:text-[11px]">
                <span className="rounded-full border border-[rgba(176,41,41,0.22)] bg-white/80 px-3 py-1.5">
                  Script / 3D / Handmade
                </span>
                <span className="rounded-full border border-[rgba(173,37,37,0.18)] bg-[rgba(255,244,244,0.9)] px-3 py-1.5">
                  Clinical Archive
                </span>
                <span className="rounded-full border border-[rgba(108,145,58,0.2)] bg-[rgba(250,255,247,0.92)] px-3 py-1.5">
                  Pixel Walk Mode
                </span>
              </div>
              <h1 className="display-font mt-7 text-[clamp(3rem,8vw,7rem)] font-semibold leading-[0.84] tracking-[0.04em] text-[rgba(74,0,0,0.96)]">
                NEBULA_
                <br />
                SYSTEM.exe
              </h1>
              <p className="mt-3 font-[var(--font-mono)] text-xs uppercase tracking-[0.34em] text-[rgba(153,41,41,0.68)] md:text-sm">
                organic archive / clinical white / playable landing field
              </p>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-[rgba(73,23,23,0.78)] md:text-[1.06rem]">
                夢想人 曰 이곳은 극소수의 창작자를 위한 커뮤니티형
                아카이브입니다. 웹앱제작부터 의상제작, 영상제작까지 실제 설계와
                창작의 전 과정을 솔직하게 보여드리며, 인사이트를 공유합니다.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="#about"
                  className="y2k-button y2k-button-primary w-full no-underline sm:w-auto"
                >
                  OPEN NODE MAP
                </a>
                <a
                  href="#studio"
                  className="y2k-button y2k-button-accent w-full no-underline sm:w-auto"
                >
                  WATCH FEED
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="bio-data-card">
                  <p className="bio-data-label">CORE</p>
                  <p className="bio-data-title">대본 / CLO 3D / 실물 제작</p>
                </div>
                <div className="bio-data-card">
                  <p className="bio-data-label">MESSAGE</p>
                  <p className="bio-data-title">몽상 채널로 사람 모으기</p>
                </div>
                <div className="bio-data-card">
                  <p className="bio-data-label">COMMERCE</p>
                  <p className="bio-data-title">에니코 벡으로 물성 판매</p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[rgba(111,63,63,0.72)]">
                <a
                  href={DESIGNER_BRAND_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[rgba(179,31,31,0.22)] underline-offset-4 transition hover:text-[rgba(94,0,0,0.96)] hover:decoration-[rgba(255,52,52,0.44)]"
                >
                  enicoveck.com
                </a>
                <a
                  href={YOUTUBE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-[rgba(179,31,31,0.22)] underline-offset-4 transition hover:text-[rgba(94,0,0,0.96)] hover:decoration-[rgba(255,52,52,0.44)]"
                >
                  YouTube / FancyVeck
                </a>
                <span className="font-[var(--font-mono)] uppercase tracking-[0.18em] text-[rgba(89,128,49,0.72)]">
                  Host :: {BRAND_NAME}
                </span>
              </div>
            </div>

            <div className="animate-rise [animation-delay:0.12s]">
              <PixelAvatarField />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
