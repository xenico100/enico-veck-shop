'use client';

import { BRAND_NAME, REPRESENTATIVE_NAME } from '@/utils/branding';

const CREATOR_NAME = REPRESENTATIVE_NAME;

const roleCards = [
  {
    label: 'Coding',
    title: '코딩',
    detail: '웹사이트를 설계하고 구조를 잡고 직접 구현합니다.'
  },
  {
    label: 'Designer Brand',
    title: '디자이너 브랜드',
    detail: '옷의 감도와 제작 흐름, 브랜드 운영을 직접 이어갑니다.'
  },
  {
    label: 'Video Editing',
    title: '영상편집 · 유튜브 운영',
    detail: '편집으로 마무리한 결과물을 채널 운영까지 연결합니다.'
  }
];

const architectureNodes = [
  { title: 'Brand Story', className: 'col-start-1 row-start-1' },
  { title: 'Landing', className: 'col-start-2 row-start-1' },
  { title: 'Collection', className: 'col-start-3 row-start-1' },
  { title: 'Archive', className: 'col-start-1 row-start-2' },
  { title: 'Product Detail', className: 'col-start-2 row-start-2' },
  { title: 'Checkout', className: 'col-start-3 row-start-2' }
];

const garmentStages = [
  { label: 'Idea', value: '01' },
  { label: 'Pattern', value: '02' },
  { label: 'Sample', value: '03' },
  { label: 'Fitting', value: '04' },
  { label: 'Release', value: '05' }
];

const youtubeFlow = [
  {
    step: '01',
    title: '기획과 촬영 정리',
    description: '어떤 이야기를 어떤 톤으로 보여줄지 먼저 정리합니다.'
  },
  {
    step: '02',
    title: '영상편집으로 마무리',
    description: '컷 편집, 리듬, 자막, 분위기를 직접 손봐 최종 결과물을 만듭니다.'
  },
  {
    step: '03',
    title: '유튜브 운영으로 연결',
    description: '업로드 이후 썸네일과 문맥, 채널 흐름까지 이어서 관리합니다.'
  }
];

const sectionPanelClass =
  'tech-panel scanline animate-rise overflow-hidden border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(8,16,31,0.94)_0%,rgba(4,9,20,0.98)_100%)]';

export default function AboutSection() {
  return (
    <section id="about" className="relative px-4 py-14 md:px-8 md:py-24">
      <div className="section-shell">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-rise">
            <p className="section-kicker">About</p>
            <h2 className="section-title">
              {CREATOR_NAME}은
              <br />
              3가지 일을 하는 사람입니다.
            </h2>
            <p className="mt-6 max-w-3xl text-sm leading-relaxed text-cyan-50/84 md:text-base">
              이 섹션은 {CREATOR_NAME}이 어떤 사람인지, 그리고 코딩과 브랜드와
              유튜브 운영이 하나의 흐름으로 어떻게 이어지는지를 보여주기 위한
              스토리 구조로 짜두었습니다. 곧 보내주실 정보만 넣으면 바로 완성할
              수 있도록 순서와 시각 요소를 먼저 정리해 둔 상태입니다.
            </p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-cyan-50/68 md:text-base">
              시작은 {CREATOR_NAME}이 3가지 일을 모두 직접 한다는 소개로 열고,
              그다음에는 코딩과 디자이너 브랜드 웹사이트 아키텍처, 옷이 만들어지는
              흐름과 그래프, 마지막으로 영상편집에서 유튜브 운영으로 이어지는
              과정까지 자연스럽게 이어지도록 설계했습니다.
            </p>
          </div>

          <div
            className={`${sectionPanelClass} p-5 [animation-delay:0.08s] sm:p-6 md:p-7`}
          >
            <p className="section-kicker">Three Roles, One Person</p>
            <h3 className="display-font mt-3 text-[clamp(1.45rem,3vw,2.3rem)] leading-[0.95] tracking-[0.03em] text-white">
              몽상인의 소개는
              <br />
              세 갈래로 시작됩니다.
            </h3>

            <div className="mt-6 grid gap-3">
              {roleCards.map((card) => (
                <article
                  key={card.label}
                  className="rounded-[1.2rem] border border-cyan-100/10 bg-white/[0.03] p-4"
                >
                  <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/58">
                    {card.label}
                  </p>
                  <h4 className="mt-2 display-font text-[1.2rem] tracking-[0.03em] text-white">
                    {card.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-cyan-50/72">
                    {card.detail}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-5 text-sm text-orange-100/78">
              "{BRAND_NAME}의 흐름은 한 사람이 여러 역할을 이어가며 만듭니다."
            </p>
          </div>
        </div>

        <div className="mt-10 space-y-6">
          <article
            className={`${sectionPanelClass} grid gap-0 lg:grid-cols-[0.9fr_1.1fr] [animation-delay:0.12s]`}
          >
            <div className="relative min-h-[20rem] overflow-hidden">
              <img
                src="/images/studio/arecode2.png"
                alt={`${CREATOR_NAME}의 코딩 작업 장면`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,18,0.18)_0%,rgba(4,8,16,0.36)_55%,rgba(4,8,16,0.88)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/62">
                  Chapter 01
                </p>
                <h3 className="display-font mt-2 text-[1.8rem] tracking-[0.03em] text-white">
                  코딩은 어떻게 했는가
                </h3>
              </div>
            </div>

            <div className="p-5 sm:p-6 md:p-7">
              <p className="section-kicker">Coding Story</p>
              <p className="mt-4 text-sm leading-relaxed text-cyan-50/78 md:text-base">
                이 구간에는 {CREATOR_NAME}이 어떤 방식으로 코딩을 시작했고,
                브랜드 웹사이트를 어떤 생각으로 설계했는지 들어갈 예정입니다.
                아래 구조도는 나중에 보내주실 실제 정보에 맞춰 바로 치환할 수
                있게 비주얼 뼈대를 먼저 잡아둔 상태입니다.
              </p>

              <div className="mt-6 rounded-[1.4rem] border border-cyan-100/12 bg-[#07111f]/88 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">
                    Designer Brand Website Architecture
                  </p>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-50/42">
                    Placeholder Structure
                  </span>
                </div>

                <div className="relative mt-5 overflow-hidden rounded-[1.2rem] border border-cyan-100/10 bg-black/20 p-4 sm:p-5">
                  <div className="pointer-events-none absolute left-1/2 top-[4.2rem] h-[calc(100%-8.4rem)] w-px -translate-x-1/2 bg-cyan-200/16" />
                  <div className="pointer-events-none absolute left-[18%] right-[18%] top-1/2 h-px -translate-y-1/2 bg-cyan-200/12" />
                  <div className="grid grid-cols-3 gap-3">
                    {architectureNodes.map((node) => (
                      <div
                        key={node.title}
                        className={`${node.className} flex min-h-[5.3rem] items-center justify-center rounded-[1rem] border border-cyan-100/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)] px-3 text-center text-sm leading-snug text-cyan-50/82`}
                      >
                        {node.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article
            className={`${sectionPanelClass} grid gap-0 lg:grid-cols-[1.05fr_0.95fr] [animation-delay:0.16s]`}
          >
            <div className="p-5 sm:p-6 md:p-7">
              <p className="section-kicker">Garment Process</p>
              <h3 className="display-font mt-2 text-[clamp(1.55rem,3vw,2.45rem)] tracking-[0.03em] text-white">
                옷은 어떻게 만들었는지
                <br />
                그래프로 보여주는 구간
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-cyan-50/76 md:text-base">
                여기에는 옷이 만들어지는 과정을 설명하는 실제 메모와 함께, 제작
                흐름이 눈에 들어오도록 노멀 그래프 스타일의 시각 자료가 들어갈
                자리입니다. 샘플링, 패턴, 피팅, 완성까지 어떤 순서로 진행됐는지
                나중에 보내주실 정보에 맞춰 자연스럽게 채워 넣을 수 있습니다.
              </p>

              <div className="mt-6 rounded-[1.4rem] border border-cyan-100/12 bg-[#06101d]/90 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-200/60">
                    Normal Graph Placeholder
                  </p>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-50/42">
                    Clothing Making Flow
                  </span>
                </div>

                <div className="mt-5">
                  <svg
                    viewBox="0 0 320 170"
                    className="h-auto w-full"
                    role="img"
                    aria-label="의류 제작 흐름 그래프 자리"
                  >
                    <defs>
                      <linearGradient id="about-line-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                        <stop offset="0%" stopColor="rgba(120,188,255,0.55)" />
                        <stop offset="100%" stopColor="rgba(255,176,122,0.85)" />
                      </linearGradient>
                    </defs>

                    {[24, 56, 88, 120, 152].map((y) => (
                      <line
                        key={y}
                        x1="16"
                        y1={y}
                        x2="304"
                        y2={y}
                        stroke="rgba(186,210,255,0.08)"
                        strokeWidth="1"
                      />
                    ))}

                    <polyline
                      fill="none"
                      stroke="url(#about-line-gradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points="20,138 88,122 156,94 224,68 292,42"
                    />

                    {[
                      { x: 20, y: 138 },
                      { x: 88, y: 122 },
                      { x: 156, y: 94 },
                      { x: 224, y: 68 },
                      { x: 292, y: 42 }
                    ].map((point, index) => (
                      <g key={`${point.x}-${point.y}`}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="6"
                          fill="#dce7ff"
                          fillOpacity="0.92"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="12"
                          fill="#7eb9ff"
                          fillOpacity="0.12"
                        />
                        <text
                          x={point.x}
                          y="164"
                          textAnchor="middle"
                          fill="rgba(220,231,255,0.68)"
                          fontSize="10"
                          letterSpacing="0.16em"
                        >
                          {garmentStages[index].label.toUpperCase()}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {garmentStages.map((stage) => (
                    <div
                      key={stage.label}
                      className="rounded-[0.95rem] border border-cyan-100/10 bg-white/[0.03] px-3 py-2.5"
                    >
                      <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/55">
                        {stage.value}
                      </p>
                      <p className="mt-1 text-sm text-cyan-50/82">{stage.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative min-h-[20rem] overflow-hidden">
              <img
                src="/images/studio/zeusstudio1.png"
                alt={`${CREATOR_NAME}의 의류 제작과 브랜드 작업 이미지`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,18,0.14)_0%,rgba(5,10,18,0.34)_50%,rgba(4,8,16,0.9)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/62">
                  Chapter 02
                </p>
                <h3 className="display-font mt-2 text-[1.8rem] tracking-[0.03em] text-white">
                  Designer Brand Process
                </h3>
              </div>
            </div>
          </article>

          <article
            className={`${sectionPanelClass} grid gap-0 lg:grid-cols-[0.92fr_1.08fr] [animation-delay:0.2s]`}
          >
            <div className="relative min-h-[20rem] overflow-hidden">
              <img
                src="/images/studio/studio6.jpg"
                alt={`${CREATOR_NAME}의 영상편집과 유튜브 운영 이미지`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,10,18,0.14)_0%,rgba(5,10,18,0.34)_50%,rgba(4,8,16,0.9)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/62">
                  Chapter 03
                </p>
                <h3 className="display-font mt-2 text-[1.8rem] tracking-[0.03em] text-white">
                  Edit to YouTube Flow
                </h3>
              </div>
            </div>

            <div className="p-5 sm:p-6 md:p-7">
              <p className="section-kicker">Video Editing to Channel Flow</p>
              <h3 className="display-font mt-2 text-[clamp(1.55rem,3vw,2.45rem)] tracking-[0.03em] text-white">
                영상편집으로 마무리하고
                <br />
                유튜브 운영으로 이어집니다.
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-cyan-50/76 md:text-base">
                마지막 구간은 편집 작업이 어떻게 채널 운영으로 이어지는지를
                보여주는 흐름 소개입니다. 촬영 정리, 편집, 업로드, 채널 관리라는
                단계가 자연스럽게 연결되도록 카드형 타임라인으로 뼈대를
                만들어두었습니다.
              </p>

              <div className="mt-6 space-y-3">
                {youtubeFlow.map((item, index) => (
                  <div
                    key={item.step}
                    className="relative rounded-[1.2rem] border border-cyan-100/10 bg-white/[0.03] p-4 pl-16"
                  >
                    <div className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-100/16 bg-cyan-200/10 text-[11px] font-medium tracking-[0.16em] text-cyan-50/82">
                      {item.step}
                    </div>
                    {index < youtubeFlow.length - 1 ? (
                      <div className="absolute left-[2.1rem] top-[3.25rem] h-[calc(100%+0.8rem)] w-px bg-cyan-200/12" />
                    ) : null}
                    <h4 className="display-font text-[1.15rem] tracking-[0.03em] text-white">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-cyan-50/72">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
