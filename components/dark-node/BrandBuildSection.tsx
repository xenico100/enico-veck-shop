'use client';

import { useEffect, useState } from 'react';

import TimelineSpikeEditor from '@/components/dark-node/TimelineSpikeEditor';

type FeaturedVideoResponse = {
  url?: string | null;
};

const FALLBACK_VIDEO_URL = '/images/hero-bg.mp4';

export default function BrandBuildSection() {
  const [videoUrl, setVideoUrl] = useState(FALLBACK_VIDEO_URL);

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
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError')
          return;
      }
    };

    void loadFeaturedVideo();

    return () => controller.abort();
  }, []);

  return (
    <section className="mt-6 md:mt-8">
      <div className="tech-panel overflow-hidden p-4 sm:p-5 md:p-7">
        <div className="mb-4 md:mb-5">
          <p className="section-kicker">Designer Brand Build</p>
          <h3 className="display-font mt-2 text-[1.4rem] font-semibold tracking-[0.06em] text-stone-950 sm:text-[1.9rem] md:text-[2.3rem]">
            코딩 아키텍처와 패션 아키텍처로 디자이너 브랜드 구축 완료
          </h3>
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

        <TimelineSpikeEditor />
      </div>
    </section>
  );
}
