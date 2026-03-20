'use client';

import { useEffect, useState } from 'react';

type FeaturedVideoResponse = {
  url?: string | null;
  mime?: string | null;
  source?: 'public' | 'fallback' | null;
};

const FALLBACK_VIDEO_URL = '/images/hero-bg.mp4';

export default function BrandBuildSection() {
  const [videoUrl, setVideoUrl] = useState(FALLBACK_VIDEO_URL);
  const [videoSourceLabel, setVideoSourceLabel] = useState('Local fallback');

  useEffect(() => {
    const controller = new AbortController();

    const loadFeaturedVideo = async () => {
      try {
        const response = await fetch('/api/studio/media/featured-video', {
          cache: 'no-store',
          signal: controller.signal
        });

        if (!response.ok) return;

        const payload = (await response.json()) as FeaturedVideoResponse;
        if (!payload.url) return;

        setVideoUrl(payload.url);
        setVideoSourceLabel(
          payload.source === 'public' ? 'R2 public archive' : 'R2 archive'
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    };

    void loadFeaturedVideo();

    return () => controller.abort();
  }, []);

  return (
    <section className="mt-6 md:mt-8">
      <div className="tech-panel overflow-hidden p-4 sm:p-5 md:p-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-5">
          <div>
            <p className="section-kicker">Designer Brand Build</p>
            <h3 className="display-font mt-2 text-[1.4rem] font-semibold tracking-[0.06em] text-stone-950 sm:text-[1.9rem] md:text-[2.3rem]">
              코딩 아키텍처와 패션 아키텍처로 디자이너 브랜드 구축 완료
            </h3>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-stone-500">
              1920 × 1080 archive playback
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-stone-400">
              {videoSourceLabel}
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden border border-stone-900/10 bg-[#eff4fb]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(167,0,55,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0))]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_40%,rgba(18,7,8,0.02))]" />
          <div className="pointer-events-none absolute left-4 top-4 z-10 border border-stone-900/10 bg-white/75 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-700 backdrop-blur-sm">
            mongsangin archive / brand build
          </div>
          <div className="aspect-[16/9] w-full">
            <video
              key={videoUrl}
              src={videoUrl}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              controls
              playsInline
              preload="metadata"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-7">
          <div className="space-y-3 text-sm leading-relaxed text-stone-800 sm:text-[0.96rem]">
            <p>
              몽상인은 코딩 아키텍처와 패션 프로덕션 아키텍처를 하나의 흐름으로 직접
              설계해 디자이너 브랜드 웹사이트 구축을 완료했습니다.
            </p>
            <p>
              이 브랜드는 사이트 구조 설계, 화면 구성, 상품 흐름, 의류 설계와 제작
              방향까지 모두 한 사람이 정리하고 실행한 결과물입니다.
            </p>
            <p>
              즉, <span className="font-semibold text-stone-950">웹사이트 설계</span>와{' '}
              <span className="font-semibold text-stone-950">의류 설계</span>가 분리된
              작업이 아니라, 몽상인 1명이 처음부터 끝까지 연결한 단일 시스템으로
              완성되었습니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="border border-stone-900/10 bg-white/80 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Site Design
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">
                정보 구조, 화면 흐름, 프론트 구현
              </p>
            </div>
            <div className="border border-stone-900/10 bg-white/80 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Garment Design
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">
                의류 설계, 제작 방향, 프로덕션 연결
              </p>
            </div>
            <div className="border border-stone-900/10 bg-white/80 p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">
                One Person Build
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-950">
                몽상인 1명이 사이트 설계와 의류 설계를 모두 진행
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
