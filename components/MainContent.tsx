'use client';

import { BRAND_NAME, DESIGNER_BRAND_URL, YOUTUBE_URL } from '@/utils/branding';

export default function MainContent() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-screen items-center px-4 pb-16 pt-28 md:px-8 md:pb-24 md:pt-40"
    >
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <video
          className="h-full w-full object-cover opacity-[0.2] saturate-[0.7] contrast-125"
          src="/images/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,7,14,0.78)_0%,rgba(6,10,18,0.86)_46%,rgba(3,5,11,0.94)_100%)]" />
        <div className="absolute left-[8%] top-[14%] h-56 w-56 rounded-full bg-[#7ad0ff]/12 blur-3xl md:h-80 md:w-80" />
        <div className="absolute right-[8%] top-[18%] h-48 w-48 rounded-full bg-[#ff6b78]/12 blur-3xl md:h-72 md:w-72" />
        <div className="absolute bottom-[14%] left-[34%] h-40 w-40 rounded-full bg-[#ffbf7b]/10 blur-3xl md:h-64 md:w-64" />
      </div>

      <div className="section-shell">
        <div className="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="animate-rise max-w-3xl">
            <p className="section-kicker">
              Architecture · Fashion · Cinema Archive
            </p>
            <h1 className="display-font text-glow mt-6 text-[clamp(3.2rem,9vw,8rem)] font-semibold leading-[0.86] tracking-[0.01em] text-white">
              {BRAND_NAME}
            </h1>
            <div className="mt-5 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-300/78 md:text-xs">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                Obsidian Archive
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                Surreal Commerce
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                London Exhibition Tone
              </span>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-300/78 md:text-[0.95rem]">
              <a
                href={DESIGNER_BRAND_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-white/50"
              >
                enicoveck.com
              </a>
              <a
                href={YOUTUBE_URL}
                target="_blank"
                rel="noreferrer"
                className="underline decoration-white/20 underline-offset-4 transition hover:text-white hover:decoration-white/50"
              >
                YouTube / FancyVeck
              </a>
            </div>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-slate-200/78 md:text-[1.04rem]">
              夢想人 曰 이곳은 극소수의 창작자를 위한 커뮤니티형 아카이브입니다.
              웹앱제작부터 의상제작, 영상제작까지 실제 설계와 창작의 전 과정을
              솔직하게 보여드리며, 인사이트를 공유합니다.
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
          </div>

          <div className="animate-rise relative hidden min-h-[34rem] items-center justify-center [animation-delay:0.12s] lg:flex">
            <div className="absolute inset-x-[12%] top-[8%] h-[28rem] rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(122,208,255,0.12),rgba(255,255,255,0.02)_54%,transparent_76%)] blur-[1px]" />
            <div className="absolute inset-x-[19%] top-[18%] h-[20rem] rounded-full border border-white/10" />
            <div className="absolute inset-x-[28%] top-[30%] h-[11rem] rounded-full border border-white/10" />
            <div className="absolute left-[18%] top-[20%] h-20 w-20 rounded-full border border-[#7ad0ff]/30 bg-[#7ad0ff]/12 shadow-[0_0_40px_rgba(122,208,255,0.24)] animate-[orb-drift_10s_ease-in-out_infinite]" />
            <div className="absolute right-[20%] top-[26%] h-16 w-16 rounded-full border border-[#ff6b78]/35 bg-[#ff6b78]/12 shadow-[0_0_38px_rgba(255,107,120,0.22)] animate-[orb-drift_13s_ease-in-out_infinite]" />
            <div className="absolute bottom-[18%] left-[32%] h-24 w-24 rounded-full border border-[#ffbf7b]/30 bg-[#ffbf7b]/10 shadow-[0_0_44px_rgba(255,191,123,0.2)] animate-[orb-drift_12s_ease-in-out_infinite]" />

            <div className="relative w-full max-w-[28rem] rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,24,0.78),rgba(5,8,18,0.52))] p-8 shadow-[0_40px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-slate-300/60">
                <span>Surreal System</span>
                <span>Archive Orbit</span>
              </div>
              <div className="mt-8 space-y-4">
                <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-5 py-4 text-slate-100/88">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-slate-300/56">
                    Script
                  </p>
                  <p className="mt-2 text-lg">
                    서사와 대본에서 모든 파생이 시작됨
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-300/56">
                      Garment
                    </p>
                    <p className="mt-2 text-sm text-slate-100/86">
                      CLO 3D와 핸드메이드 제작으로 물성 완성
                    </p>
                  </div>
                  <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                    <p className="text-[10px] uppercase tracking-[0.28em] text-slate-300/56">
                      Cinema
                    </p>
                    <p className="mt-2 text-sm text-slate-100/86">
                      롱폼, 숏폼, 아카이브 영상으로 세계관 확산
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
