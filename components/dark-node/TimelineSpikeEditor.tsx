'use client';

const trunkMarkers = Array.from({ length: 11 }, (_, index) => `${index * 10}%`);

const stages = [
  {
    id: 'garment',
    title: '의류제작',
    labelLeft: '13%',
    panelLeft: '4%',
    panelWidth: '26%',
    branchHeight: '3.7rem',
    lines: ['├ 원부자재 발주', '├ CLO 3D 설계', '├ 데이터 저장', '└ 실물 제작']
  },
  {
    id: 'video',
    title: '영상제작',
    labelLeft: '42%',
    panelLeft: '34%',
    panelWidth: '22%',
    branchHeight: '3.7rem',
    lines: [
      '├ 제품 촬영',
      '├ 촬영/소스 정리',
      '├ 컷 편집',
      '├ 자막/사운드',
      '└ 최종 출력'
    ]
  },
  {
    id: 'platform',
    title: '플랫폼 업로드',
    labelLeft: '72%',
    panelLeft: '60%',
    panelWidth: '34%',
    branchHeight: '3.7rem',
    groups: [
      {
        title: '[몽상인 영상채널]',
        items: [
          'YouTube   → 롱폼 / 숏폼 업로드',
          'Instagram → 롱폼 / 숏폼 업로드',
          'TikTok    → 롱폼 / 숏폼 업로드'
        ]
      },
      {
        title: '[enicoveck]',
        items: [
          '상품 등록',
          '이미지 업로드',
          '사이즈표 기재',
          '상품 설명',
          '결제 연결',
          '상품 오픈',
          '의류 콘텐츠 기반 영어권 숏폼 1개 업로드'
        ]
      }
    ]
  }
] as const;

const branchPaths = [
  'M120 238 C148 220 162 190 180 118',
  'M220 238 C238 208 258 176 292 78',
  'M360 238 C346 206 336 178 318 102',
  'M520 238 C544 212 566 182 594 92',
  'M684 238 C666 266 650 296 624 388',
  'M846 238 C870 214 894 184 928 96',
  'M1008 238 C988 264 974 292 950 366'
] as const;

export default function TimelineSpikeEditor() {
  return (
    <div className="mt-5 overflow-hidden rounded-[1.9rem] border border-[#485c8f]/40 bg-[#020817] p-3 shadow-[0_26px_80px_rgba(2,8,24,0.46)] sm:p-4">
      <div className="overflow-x-auto rounded-[1.55rem] border border-white/8 bg-[radial-gradient(circle_at_50%_20%,rgba(159,193,255,0.12),transparent_26%),linear-gradient(180deg,rgba(6,14,32,0.98),rgba(3,8,18,1))]">
        <div className="relative min-h-[39rem] min-w-[1120px] overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_35%,rgba(204,219,255,0.12),transparent_18%),radial-gradient(circle_at_80%_28%,rgba(223,196,255,0.12),transparent_18%),radial-gradient(circle_at_52%_62%,rgba(188,225,255,0.08),transparent_26%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

          {trunkMarkers.map((left) => (
            <div
              key={left}
              className="pointer-events-none absolute top-4 h-4 w-px bg-white/90"
              style={{ left }}
            />
          ))}

          <svg
            viewBox="0 0 1200 620"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="trunk-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c8deff" stopOpacity="0" />
                <stop offset="30%" stopColor="#edf5ff" stopOpacity="0.96" />
                <stop offset="62%" stopColor="#efd7ff" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#c6ebff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="trunk-core" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d2e7ff" />
                <stop offset="45%" stopColor="#ffffff" />
                <stop offset="68%" stopColor="#edd0ff" />
                <stop offset="100%" stopColor="#d2f1ff" />
              </linearGradient>
              <linearGradient
                id="branch-fill"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#d5eaff" stopOpacity="0.92" />
                <stop offset="54%" stopColor="#ffffff" stopOpacity="0.94" />
                <stop offset="100%" stopColor="#eccfff" stopOpacity="0.84" />
              </linearGradient>
              <filter
                id="diagram-blur"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="12" />
              </filter>
              <filter
                id="diagram-soft"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            <path
              d="M48 238 C212 238 334 237 492 238 C630 239 748 238 906 238 C1010 238 1088 238 1152 238"
              stroke="url(#trunk-glow)"
              strokeWidth="34"
              strokeLinecap="round"
              fill="none"
              filter="url(#diagram-blur)"
              className="diagram-pulse"
            />
            <path
              d="M48 238 C212 238 334 237 492 238 C630 239 748 238 906 238 C1010 238 1088 238 1152 238"
              stroke="url(#trunk-core)"
              strokeWidth="8"
              strokeLinecap="round"
              fill="none"
              filter="url(#diagram-soft)"
              className="diagram-flow"
            />

            {branchPaths.map((path) => (
              <g key={path}>
                <path
                  d={path}
                  stroke="#d9e9ff"
                  strokeWidth="18"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.22"
                  filter="url(#diagram-blur)"
                  className="diagram-branch"
                />
                <path
                  d={path}
                  stroke="url(#branch-fill)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  filter="url(#diagram-soft)"
                  className="diagram-flow"
                />
              </g>
            ))}
          </svg>

          <div className="pointer-events-none absolute left-8 right-8 top-[14.85rem] h-[58px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(245,250,255,0.2),rgba(149,190,255,0.08),transparent_68%)] blur-xl" />

          {stages.map((stage) => (
            <div key={stage.id}>
              <div
                className="absolute top-[13rem] z-10 -translate-x-1/2 rounded-full border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(118,148,212,0.16))] px-5 py-2 font-mono text-[15px] font-semibold tracking-[0.24em] text-white shadow-[0_0_28px_rgba(213,230,255,0.28)] backdrop-blur-md"
                style={{ left: stage.labelLeft }}
              >
                [{stage.title}]
              </div>

              <div
                className="pointer-events-none absolute top-[15.4rem] z-0 w-px bg-[linear-gradient(180deg,rgba(236,244,255,0.84),rgba(190,221,255,0.22),transparent)]"
                style={{
                  left: stage.labelLeft,
                  height: stage.branchHeight
                }}
              />

              <div
                className="absolute top-[19.1rem] z-10"
                style={{
                  left: stage.panelLeft,
                  width: stage.panelWidth
                }}
              >
                {'lines' in stage ? (
                  <div className="space-y-3 font-mono text-[15px] leading-[1.75] tracking-[0.04em] text-[#eef5ff]">
                    {stage.lines.map((line) => (
                      <div key={line} className="flex items-start gap-3">
                        <span className="mt-[0.2rem] h-[7px] w-[7px] rounded-full bg-[#f7fbff] shadow-[0_0_10px_rgba(240,247,255,0.74)]" />
                        <span>{line.replace(/^[├└]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-5 font-mono text-[14px] leading-[1.8] tracking-[0.03em] text-[#eef5ff]">
                    {stage.groups.map((group) => (
                      <div key={group.title} className="relative pl-5">
                        <div className="absolute left-0 top-[0.6rem] h-[calc(100%-0.6rem)] w-px bg-white/30" />
                        <div className="absolute left-0 top-[0.6rem] h-px w-3 bg-white/50" />
                        <div className="text-[15px] font-semibold tracking-[0.12em] text-white">
                          {group.title}
                        </div>
                        <div className="mt-2 space-y-2 pl-5">
                          {group.items.map((item, index) => (
                            <div key={item} className="relative">
                              <div className="absolute -left-5 top-[0.78rem] h-px w-3 bg-white/42" />
                              {index < group.items.length - 1 ? (
                                <div className="absolute -left-5 top-0 h-full w-px bg-white/22" />
                              ) : null}
                              <div>{item}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="pointer-events-none absolute left-[8%] top-[9.5rem] h-24 w-10 rotate-[18deg] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent)] blur-[10px] opacity-70" />
          <div className="pointer-events-none absolute left-[47%] top-[6.9rem] h-28 w-10 rotate-[26deg] rounded-full bg-[linear-gradient(180deg,rgba(222,202,255,0.32),transparent)] blur-[12px] opacity-70" />
          <div className="pointer-events-none absolute left-[85%] top-[10.2rem] h-24 w-10 rotate-[24deg] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent)] blur-[11px] opacity-65" />
        </div>
      </div>

      <style>{`
        .diagram-flow {
          stroke-dasharray: 22 16;
          animation: diagram-flow 11s linear infinite;
        }

        .diagram-pulse {
          animation: diagram-pulse 5s ease-in-out infinite;
        }

        .diagram-branch {
          animation: diagram-branch 4.8s ease-in-out infinite;
        }

        @keyframes diagram-flow {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -240;
          }
        }

        @keyframes diagram-pulse {
          0%,
          100% {
            opacity: 0.54;
          }
          50% {
            opacity: 0.96;
          }
        }

        @keyframes diagram-branch {
          0%,
          100% {
            opacity: 0.18;
          }
          45% {
            opacity: 0.42;
          }
          70% {
            opacity: 0.26;
          }
        }
      `}</style>
    </div>
  );
}
