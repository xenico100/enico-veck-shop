'use client';

const trunkMarkers = Array.from(
  { length: 9 },
  (_, index) => `${5 + index * 11.5}%`
);

const garmentItems = [
  '원부자재 발주',
  'CLO 3D 설계',
  '데이터 저장',
  '실물 제작'
] as const;

const videoItems = [
  '제품 촬영',
  '촬영/소스 정리',
  '컷 편집',
  '자막/사운드',
  '최종 출력'
] as const;

const channelItems = [
  'YouTube   → 롱폼 / 숏폼 업로드',
  'Instagram → 롱폼 / 숏폼 업로드',
  'TikTok    → 롱폼 / 숏폼 업로드'
] as const;

const storeItems = [
  '상품 등록',
  '이미지 업로드',
  '사이즈표 기재',
  '상품 설명',
  '결제 연결',
  '상품 오픈',
  '의류 콘텐츠 기반 영어권 숏폼 1개 업로드'
] as const;

const timelineGridColumns =
  'minmax(230px,0.95fr) minmax(150px,0.52fr) minmax(230px,0.95fr) minmax(150px,0.52fr) minmax(390px,1.55fr)';

const branchPaths = [
  'M132 192 C166 164 184 118 210 74',
  'M286 192 C320 162 340 126 364 66',
  'M440 192 C420 228 404 264 386 326',
  'M642 192 C676 164 700 128 734 72',
  'M812 192 C788 228 768 260 742 318',
  'M1090 192 C1118 166 1146 130 1182 74',
  'M1248 192 C1222 230 1204 264 1178 332'
] as const;

const mainNodes = [
  { left: '12.5%', color: '#48c9d5' },
  { left: '39.8%', color: '#f0b44d' },
  { left: '73.5%', color: '#e06c78' }
] as const;

export default function TimelineSpikeEditor() {
  return (
    <div className="mt-6 overflow-x-auto">
      <div className="relative min-h-[35rem] min-w-[1280px]">
        {trunkMarkers.map((left) => (
          <div
            key={left}
            className="pointer-events-none absolute top-3 h-4 w-px bg-[#35446d]/65"
            style={{ left }}
          />
        ))}

        <div
          className="absolute inset-x-[4%] top-8 z-10 grid items-center gap-4 font-mono text-[16px] font-semibold tracking-[0.1em] text-[#1d2b54]"
          style={{ gridTemplateColumns: timelineGridColumns }}
        >
          <div className="text-left">[의류제작]</div>
          <div className="overflow-hidden whitespace-nowrap text-center text-[#576892]">
            ───────────────
          </div>
          <div className="text-center">[영상제작]</div>
          <div className="overflow-hidden whitespace-nowrap text-center text-[#576892]">
            ───────────────
          </div>
          <div className="text-right">[플랫폼 업로드]</div>
        </div>

        <svg
          viewBox="0 0 1280 560"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="trunk-glow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d8e7ff" stopOpacity="0" />
              <stop offset="24%" stopColor="#e8f1ff" stopOpacity="0.86" />
              <stop offset="54%" stopColor="#f8fbff" stopOpacity="1" />
              <stop offset="74%" stopColor="#efd6ff" stopOpacity="0.86" />
              <stop offset="100%" stopColor="#d8e7ff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="trunk-core" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#52648f" />
              <stop offset="34%" stopColor="#35507b" />
              <stop offset="62%" stopColor="#5a4d88" />
              <stop offset="100%" stopColor="#516693" />
            </linearGradient>
            <filter
              id="trunk-blur"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="10" />
            </filter>
            <filter
              id="trunk-soft"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          <path
            d="M74 192 C248 192 352 192 514 192 C700 192 874 192 1208 192"
            stroke="url(#trunk-glow)"
            strokeWidth="54"
            strokeLinecap="round"
            fill="none"
            filter="url(#trunk-blur)"
          />
          <path
            d="M74 192 C248 192 352 192 514 192 C700 192 874 192 1208 192"
            stroke="url(#trunk-core)"
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
            filter="url(#trunk-soft)"
          />

          {branchPaths.map((path) => (
            <path
              key={path}
              d={path}
              stroke="#92a3cc"
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="16 16"
              opacity="0.72"
            />
          ))}
        </svg>

        <div className="pointer-events-none absolute left-[6%] right-[6%] top-[9.35rem] h-[7px] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(250,252,255,0.94),rgba(238,214,255,0.9),rgba(255,255,255,0))] opacity-85 blur-[1px]" />
        <div className="pointer-events-none absolute left-[6%] right-[6%] top-[8.55rem] h-[34px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(240,246,255,0.22),rgba(173,198,241,0.08),transparent_72%)] blur-xl" />

        {mainNodes.map((node) => (
          <div
            key={node.left}
            className="absolute top-[8.62rem] z-10 h-5 w-5 -translate-x-1/2 rounded-full border border-white/80 shadow-[0_0_0_6px_rgba(255,255,255,0.18),0_0_18px_rgba(106,129,186,0.28)]"
            style={{ left: node.left, backgroundColor: node.color }}
          />
        ))}

        <div
          className="absolute inset-x-[4%] top-[15rem] grid items-start gap-4"
          style={{ gridTemplateColumns: timelineGridColumns }}
        >
          <div className="space-y-4 font-mono text-[15px] leading-[1.55] text-[#1d2b54]">
            {garmentItems.map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span
                  className="h-[10px] w-[10px] rounded-full shadow-[0_0_12px_rgba(88,148,196,0.24)]"
                  style={{
                    backgroundColor:
                      index === 0
                        ? '#f0d355'
                        : index === 1
                          ? '#48c9d5'
                          : index === 2
                            ? '#6fd08e'
                            : '#7d94d0'
                  }}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div />

          <div className="space-y-4 font-mono text-[15px] leading-[1.55] text-[#1d2b54]">
            {videoItems.map((item, index) => (
              <div key={item} className="flex items-center gap-3">
                <span
                  className="h-[10px] w-[10px] rounded-full shadow-[0_0_12px_rgba(193,123,103,0.22)]"
                  style={{
                    backgroundColor:
                      index < 2 ? '#f0b44d' : index < 4 ? '#ea7b5a' : '#d55872'
                  }}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div />

          <div className="space-y-8 font-mono text-[14px] leading-[1.65] text-[#1d2b54]">
            <div className="relative pl-6">
              <div className="absolute left-0 top-[0.7rem] h-[calc(100%-0.7rem)] w-px bg-[#697aa4]/70" />
              <div className="absolute left-0 top-[0.7rem] h-px w-4 bg-[#697aa4]/80" />
              <div className="text-[15px] font-semibold tracking-[0.08em] text-[#3a4d7c]">
                [몽상인 영상채널]
              </div>
              <div className="mt-3 space-y-2 pl-6">
                {channelItems.map((item, index) => (
                  <div key={item} className="relative">
                    <div className="absolute -left-6 top-[0.76rem] h-px w-4 bg-[#697aa4]/72" />
                    {index < channelItems.length - 1 ? (
                      <div className="absolute -left-6 top-0 h-full w-px bg-[#9ea9c6]/45" />
                    ) : null}
                    <div>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative pl-6">
              <div className="absolute left-0 top-[0.7rem] h-[calc(100%-0.7rem)] w-px bg-[#697aa4]/70" />
              <div className="absolute left-0 top-[0.7rem] h-px w-4 bg-[#697aa4]/80" />
              <div className="text-[15px] font-semibold tracking-[0.08em] text-[#3a4d7c]">
                [enicoveck]
              </div>
              <div className="mt-3 space-y-2 pl-6">
                {storeItems.map((item, index) => (
                  <div key={item} className="relative">
                    <div className="absolute -left-6 top-[0.76rem] h-px w-4 bg-[#697aa4]/72" />
                    {index < storeItems.length - 1 ? (
                      <div className="absolute -left-6 top-0 h-full w-px bg-[#9ea9c6]/45" />
                    ) : null}
                    <div>{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
