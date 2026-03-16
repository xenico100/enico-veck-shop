'use client';

import { BRAND_NAME, REPRESENTATIVE_NAME } from '@/utils/branding';

const CREATOR_NAME = REPRESENTATIVE_NAME;

const handmadeTracks = [
  {
    id: 'coding',
    label: 'Handmade Track 01',
    category: 'Coding',
    title: '코딩',
    description:
      '웹사이트 구조를 설계하고, 화면을 구현하고, 기능을 수정하는 일까지 모두 직접 손으로 쌓아갑니다. 아이디어를 코드로 바꾸는 첫 단계부터 운영 가능한 결과물로 정리하는 마지막 단계까지 몽상인 한 사람이 책임집니다.',
    image: '/images/studio/arecode2.png',
    alt: `${CREATOR_NAME}의 코딩 작업 장면`
  },
  {
    id: 'youtube',
    label: 'Handmade Track 02',
    category: 'YouTube',
    title: '유튜브 운영',
    description:
      '채널 방향을 잡고, 콘텐츠 흐름을 정리하고, 업로드와 운영 톤까지 직접 만듭니다. 단순히 영상을 올리는 수준이 아니라 채널의 분위기와 시청 경험을 꾸준히 다듬는 작업을 혼자 이어갑니다.',
    image: '/images/studio/studio6.jpg',
    alt: `${CREATOR_NAME}의 유튜브 운영 작업 공간`
  },
  {
    id: 'brand',
    label: 'Handmade Track 03',
    category: 'Designer Brand',
    title: '디자이너 브랜드 운영',
    description:
      '브랜드의 감도, 비주얼, 이야기, 운영 방식까지 한 사람의 손에서 연결됩니다. 취향을 브랜드 언어로 번역하고, 결과물을 아카이브처럼 쌓아가며 몽상인만의 결을 분명하게 보여줍니다.',
    image: '/images/studio/zeusstudio1.png',
    alt: `${CREATOR_NAME}의 디자이너 브랜드 작업 공간`
  }
];

const handmadeProof = [
  { label: '운영자', value: '1명' },
  { label: '핸드메이드 분야', value: '3개' },
  { label: '진행 방식', value: '기획 · 제작 · 운영 직접' }
];

export default function AboutSection() {
  return (
    <section id="about" className="relative px-4 py-14 md:px-8 md:py-24">
      <div className="section-shell">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-rise">
            <p className="section-kicker">About</p>
            <h2 className="section-title">{CREATOR_NAME}(夢想人)은 누구인가</h2>
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-cyan-50/84 md:text-base">
              {CREATOR_NAME}은 코딩, 유튜브 운영, 디자이너 브랜드 운영을 한 사람이
              처음부터 끝까지 직접 만드는 1인 핸드메이드 작업자입니다. 사이트를
              설계하고, 콘텐츠를 운영하고, 브랜드의 결을 다듬는 세 가지 흐름이
              따로 노는 것이 아니라 한 사람의 감각과 손을 통해 하나의 세계로
              이어집니다.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-cyan-50/68 md:text-base">
              {BRAND_NAME}은 그 결과물만 모아 놓은 공간이 아니라, {CREATOR_NAME}
              이 어떻게 만들고 운영하고 쌓아가는지를 보여주는 커뮤니티
              아카이브입니다. 코딩도, 채널 운영도, 브랜드도 외주가 아니라 직접
              만든다는 점이 이 공간의 가장 큰 특징입니다.
            </p>
          </div>

          <div className="tech-panel scanline animate-rise overflow-hidden border border-cyan-200/16 bg-[linear-gradient(180deg,rgba(9,18,35,0.96)_0%,rgba(4,12,24,0.9)_100%)] p-5 [animation-delay:0.08s] sm:p-6 md:p-7">
            <p className="section-kicker">One Person, Fully Handmade</p>
            <h3 className="display-font mt-3 text-[clamp(1.5rem,3vw,2.35rem)] leading-[0.95] tracking-[0.03em] text-white">
              세 가지 일을
              <br />
              한 사람이 직접 만듭니다.
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-cyan-50/72">
              {CREATOR_NAME}의 작업 방식은 분업보다 연결에 가깝습니다. 코드와
              콘텐츠와 브랜드 감각이 한 사람 안에서 이어지기 때문에 결과물의
              분위기와 방향이 더 선명하게 맞물립니다.
            </p>

            <div className="mt-6 space-y-3">
              {handmadeProof.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-4 border-t border-cyan-100/12 py-3"
                >
                  <span className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/60">
                    {item.label}
                  </span>
                  <span className="text-right text-sm text-cyan-50/88">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-5 text-sm text-orange-100/78">
              "코드도 운영도 브랜드도, 전부 한 손에서 이어지는 작업."
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {handmadeTracks.map((track, index) => (
            <article
              key={track.id}
              className="tech-panel scanline animate-rise overflow-hidden border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(6,14,28,0.92)_0%,rgba(3,9,19,0.96)_100%)] [animation-delay:0.12s]"
              style={{ animationDelay: `${0.12 + index * 0.06}s` }}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={track.image}
                  alt={track.alt}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,18,0.08)_0%,rgba(5,10,18,0.2)_45%,rgba(3,6,12,0.88)_100%)]" />
                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                  <span className="inline-flex rounded-full border border-cyan-100/18 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-50/76 backdrop-blur">
                    {track.label}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/58">
                    {track.category}
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/62">
                    {CREATOR_NAME} Handmade Archive
                  </p>
                  <h3 className="display-font mt-2 text-[1.7rem] font-medium tracking-[0.03em] text-white">
                    {track.title}
                  </h3>
                </div>
              </div>

              <div className="border-t border-cyan-100/10 p-4 sm:p-5">
                <p className="text-sm leading-relaxed text-cyan-50/74">
                  {track.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
