'use client';

type DotNode = {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string[];
  labelX: number;
  labelY: number;
  align: 'left' | 'center' | 'right';
};

const stageTitles = [
  { id: 'garment', x: 170, label: '[의류제작]' },
  { id: 'video', x: 600, label: '[영상제작]' },
  { id: 'platform', x: 1098, label: '[플랫폼 업로드]' }
] as const;

const dottedPaths = [
  'M96 176 C128 210 166 214 212 142',
  'M212 142 C246 100 286 102 326 176',
  'M326 176 C360 236 402 238 448 176',
  'M458 176 C500 126 548 120 596 176',
  'M596 176 C634 220 678 226 726 176',
  'M726 176 C768 128 820 124 876 176',
  'M920 176 C986 132 1040 132 1094 176',
  'M1094 176 C1144 116 1196 120 1242 176',
  'M1094 176 C1136 228 1188 232 1246 280'
] as const;

const nodes: DotNode[] = [
  {
    id: 'garment-order',
    x: 96,
    y: 176,
    color: '#f1d64f',
    label: ['원부자재 발주'],
    labelX: 112,
    labelY: 214,
    align: 'left'
  },
  {
    id: 'garment-clo',
    x: 212,
    y: 142,
    color: '#4ac3d1',
    label: ['CLO 3D 설계'],
    labelX: 228,
    labelY: 104,
    align: 'left'
  },
  {
    id: 'garment-data',
    x: 326,
    y: 176,
    color: '#65cf72',
    label: ['데이터 저장'],
    labelX: 342,
    labelY: 214,
    align: 'left'
  },
  {
    id: 'garment-physical',
    x: 448,
    y: 176,
    color: '#748fdc',
    label: ['실물 제작'],
    labelX: 464,
    labelY: 214,
    align: 'left'
  },
  {
    id: 'video-shoot',
    x: 596,
    y: 176,
    color: '#f2b54a',
    label: ['제품 촬영'],
    labelX: 612,
    labelY: 214,
    align: 'left'
  },
  {
    id: 'video-source',
    x: 726,
    y: 176,
    color: '#f0a95d',
    label: ['촬영/소스 정리'],
    labelX: 742,
    labelY: 214,
    align: 'left'
  },
  {
    id: 'video-cut',
    x: 876,
    y: 176,
    color: '#e97959',
    label: ['컷 편집'],
    labelX: 892,
    labelY: 214,
    align: 'left'
  },
  {
    id: 'video-subtitle',
    x: 1094,
    y: 176,
    color: '#d95f72',
    label: ['자막/사운드', '최종 출력'],
    labelX: 1110,
    labelY: 214,
    align: 'left'
  },
  {
    id: 'channel-youtube',
    x: 1242,
    y: 176,
    color: '#6c6fd9',
    label: [
      '[몽상인 영상채널]',
      'YouTube → 롱폼 / 숏폼 업로드',
      'Instagram → 롱폼 / 숏폼 업로드',
      'TikTok → 롱폼 / 숏폼 업로드'
    ],
    labelX: 1228,
    labelY: 88,
    align: 'right'
  },
  {
    id: 'store-enicoveck',
    x: 1246,
    y: 280,
    color: '#f08f39',
    label: [
      '[enicoveck]',
      '상품 등록',
      '이미지 업로드',
      '사이즈표 기재',
      '상품 설명',
      '결제 연결',
      '상품 오픈',
      '의류 콘텐츠 기반 영어권 숏폼 1개 업로드'
    ],
    labelX: 1232,
    labelY: 300,
    align: 'right'
  }
];

const getLabelClassName = (align: DotNode['align']) => {
  if (align === 'center') return 'items-center text-center';
  if (align === 'right') return 'items-end text-right';
  return 'items-start text-left';
};

export default function TimelineSpikeEditor() {
  return (
    <div className="mt-6 overflow-x-auto">
      <div className="relative min-h-[34rem] min-w-[1320px]">
        <svg
          viewBox="0 0 1320 540"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient
              id="timeline-main-line"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#5a6e9c" />
              <stop offset="42%" stopColor="#33517d" />
              <stop offset="72%" stopColor="#925784" />
              <stop offset="100%" stopColor="#536e99" />
            </linearGradient>
          </defs>

          <path
            d="M76 176 C324 176 436 176 584 176 C748 176 904 176 1246 176"
            stroke="url(#timeline-main-line)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {dottedPaths.map((path) => (
            <path
              key={path}
              d={path}
              stroke="#90a1cb"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="12 12"
              opacity="0.8"
            />
          ))}
        </svg>

        {stageTitles.map((title) => (
          <div
            key={title.id}
            className="absolute top-4 -translate-x-1/2 font-mono text-[18px] font-semibold tracking-[0.08em] text-[#263b68]"
            style={{ left: `${title.x}px` }}
          >
            {title.label}
          </div>
        ))}

        {nodes.map((node) => (
          <div key={node.id}>
            <div
              className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-[0_0_0_4px_rgba(255,255,255,0.6)]"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                backgroundColor: node.color
              }}
            />

            <div
              className={`absolute flex max-w-[22rem] flex-col gap-1 font-mono text-[14px] leading-[1.45] text-[#233963] ${getLabelClassName(node.align)}`}
              style={{
                left: `${node.labelX}px`,
                top: `${node.labelY}px`,
                transform:
                  node.align === 'right'
                    ? 'translateX(-100%)'
                    : node.align === 'center'
                      ? 'translateX(-50%)'
                      : undefined
              }}
            >
              {node.label.map((line, index) => (
                <span
                  key={`${node.id}-${line}`}
                  className={
                    index === 0 &&
                    (line.startsWith('[') || node.id === 'store-enicoveck')
                      ? 'font-semibold tracking-[0.06em] text-[#3d4f7c]'
                      : ''
                  }
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
