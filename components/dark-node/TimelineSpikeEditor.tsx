'use client';

import { useRef, useState } from 'react';
import {
  Layers,
  MousePointer2,
  Plus,
  Scissors,
  Sparkles,
  Undo2
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/utils/cn';

type TimelineSegment = {
  id: string;
  start: number;
  end: number;
  label: string;
  note: string;
  accent: string;
};

type TimelineSpike = {
  id: string;
  title: string;
  detail: string;
  lane: string;
  position: number;
  height: number;
  accent: string;
};

type HistorySnapshot = {
  segments: TimelineSegment[];
  selectedSegmentId: string | null;
};

type BranchDirection = 'up' | 'down';

const TICKS = Array.from({ length: 11 }, (_, index) => index * 10);

const SEGMENT_PALETTE = [
  '#506ea2',
  '#31517c',
  '#5e88c4',
  '#223a65',
  '#456399'
] as const;

const SPIKE_PALETTE = [
  '#dff2ff',
  '#b3dbff',
  '#f4fbff',
  '#8cc6ff',
  '#d0ebff'
] as const;

const TRUNK_PATH =
  'M20 136 C118 118 184 153 256 140 C344 123 410 119 484 138 C556 156 626 151 704 136 C804 116 890 132 980 140';

const ENERGY_BRANCHES = [
  {
    id: 'branch-a',
    d: 'M166 132 C146 108 136 88 118 26',
    width: 12,
    accent: '#b9ddff'
  },
  {
    id: 'branch-b',
    d: 'M256 140 C274 108 296 80 322 18',
    width: 14,
    accent: '#ebd0ff'
  },
  {
    id: 'branch-c',
    d: 'M512 141 C498 114 486 86 474 24',
    width: 10,
    accent: '#c6e6ff'
  },
  {
    id: 'branch-d',
    d: 'M624 142 C646 108 664 76 692 20',
    width: 14,
    accent: '#e2c8ff'
  },
  {
    id: 'branch-e',
    d: 'M780 136 C760 162 744 188 724 236',
    width: 12,
    accent: '#c7ebff'
  },
  {
    id: 'branch-f',
    d: 'M354 139 C336 163 324 182 304 236',
    width: 10,
    accent: '#d2e0ff'
  },
  {
    id: 'branch-g',
    d: 'M888 139 C904 108 922 84 944 16',
    width: 16,
    accent: '#ddd4ff'
  }
] as const;

const ENERGY_PARTICLES = [
  { left: '9%', top: '28%', size: 8, delay: '0s' },
  { left: '21%', top: '58%', size: 10, delay: '1.5s' },
  { left: '43%', top: '34%', size: 7, delay: '0.8s' },
  { left: '57%', top: '54%', size: 9, delay: '2.2s' },
  { left: '73%', top: '24%', size: 8, delay: '1.1s' },
  { left: '87%', top: '48%', size: 11, delay: '2.8s' }
] as const;

const initialSegments: TimelineSegment[] = [
  {
    id: 'segment-1',
    start: 0,
    end: 100,
    label: 'Master Trunk',
    note: '코드 아키텍처와 패션 아키텍처를 한 줄기로 묶는 메인 브랜치.',
    accent: SEGMENT_PALETTE[0]
  }
];

const initialSpikes: TimelineSpike[] = [
  {
    id: 'spike-1',
    title: 'Web Layer',
    detail: '정보 구조, 스토어 플로우, 인증 동선.',
    lane: 'code',
    position: 18,
    height: 88,
    accent: SPIKE_PALETTE[0]
  },
  {
    id: 'spike-2',
    title: 'Garment Logic',
    detail: '패턴, 샘플, 실물 제작 흐름.',
    lane: 'fashion',
    position: 46,
    height: 124,
    accent: SPIKE_PALETTE[1]
  },
  {
    id: 'spike-3',
    title: 'Edit Stack',
    detail: '영상 편집, 룩북 컷, 런칭 연동.',
    lane: 'media',
    position: 76,
    height: 102,
    accent: SPIKE_PALETTE[2]
  }
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const cloneSegments = (segments: TimelineSegment[]) =>
  segments.map((segment) => ({ ...segment }));

const formatMark = (value: number) => `00:${String(value).padStart(2, '0')}`;

const getSpikeDirection = (lane: string): BranchDirection =>
  lane.toLowerCase().includes('fashion') ? 'down' : 'up';

const createSpikePaths = (height: number) => ({
  viewBoxHeight: height + 18,
  core: `M45 ${height + 8} C41 ${Math.round(height * 0.78)} 39 ${Math.round(height * 0.48)} 45 10`,
  branchLeft: `M44 ${Math.round(height * 0.66)} C28 ${Math.round(height * 0.52)} 21 ${Math.round(height * 0.3)} 18 ${Math.max(12, Math.round(height * 0.1))}`,
  branchRight: `M45 ${Math.round(height * 0.48)} C62 ${Math.round(height * 0.33)} 72 ${Math.round(height * 0.18)} 77 8`,
  twigLeft: `M26 ${Math.round(height * 0.28)} C18 ${Math.round(height * 0.2)} 14 ${Math.round(height * 0.12)} 12 6`,
  twigRight: `M59 ${Math.round(height * 0.58)} C67 ${Math.round(height * 0.48)} 75 ${Math.round(height * 0.42)} 82 ${Math.round(height * 0.28)}`
});

const getSegmentForPosition = (
  position: number,
  segments: TimelineSegment[]
) => {
  if (segments.length === 0) return null;

  return (
    segments.find((segment, index) => {
      const isLast = index === segments.length - 1;

      return (
        position >= segment.start &&
        (isLast ? position <= segment.end : position < segment.end)
      );
    }) ?? segments[segments.length - 1]
  );
};

export default function TimelineSpikeEditor() {
  const idRef = useRef(4);
  const [segments, setSegments] = useState(initialSegments);
  const [spikes, setSpikes] = useState(initialSpikes);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    initialSegments[0]?.id ?? null
  );
  const [selectedSpikeId, setSelectedSpikeId] = useState<string | null>(
    initialSpikes[1]?.id ?? null
  );
  const [status, setStatus] = useState(
    '줄기 클릭하고 컷 누르면 바로 잘린다. 잘린 구간 내용은 오른쪽 패널에 꽂으면 된다.'
  );

  const createId = (prefix: string) => {
    const id = `${prefix}-${idRef.current}`;
    idRef.current += 1;
    return id;
  };

  const selectedSegment =
    segments.find((segment) => segment.id === selectedSegmentId) ??
    segments[0] ??
    null;
  const selectedSpike =
    spikes.find((spike) => spike.id === selectedSpikeId) ?? spikes[0] ?? null;
  const selectedSpikeSegment = selectedSpike
    ? getSegmentForPosition(selectedSpike.position, segments)
    : selectedSegment;
  const selectedSegmentSpikes = selectedSegment
    ? spikes.filter(
        (spike) =>
          getSegmentForPosition(spike.position, segments)?.id ===
          selectedSegment.id
      )
    : [];

  const addSpike = () => {
    if (!selectedSegment) return;

    const segmentSpan = selectedSegment.end - selectedSegment.start;
    const localSpikes = spikes.filter(
      (spike) =>
        getSegmentForPosition(spike.position, segments)?.id ===
        selectedSegment.id
    );
    const insertRatios = [0.22, 0.38, 0.54, 0.7, 0.84];
    const ratio =
      insertRatios[Math.min(localSpikes.length, insertRatios.length - 1)];
    const position = clamp(
      selectedSegment.start + segmentSpan * ratio,
      selectedSegment.start + 2,
      selectedSegment.end - 2
    );

    const newSpike: TimelineSpike = {
      id: createId('spike'),
      title: `Spike ${String(spikes.length + 1).padStart(2, '0')}`,
      detail: '컷 이후에 들어갈 상세 아키텍처를 적어둬.',
      lane: localSpikes.length % 2 === 0 ? 'code' : 'fashion',
      position,
      height: clamp(68 + localSpikes.length * 12, 56, 142),
      accent: SPIKE_PALETTE[spikes.length % SPIKE_PALETTE.length]
    };

    setSpikes((current) => [...current, newSpike]);
    setSelectedSpikeId(newSpike.id);
    setSelectedSegmentId(selectedSegment.id);
    setStatus(
      '가시 스택 하나 더 박아뒀다. 제목하고 상세만 갈아끼우면 바로 쓴다.'
    );
  };

  const splitSelectedSegment = () => {
    if (!selectedSegment) return;

    const span = selectedSegment.end - selectedSegment.start;
    if (span < 12) {
      setStatus(
        '이 구간은 이미 너무 잘아서 더 못 자른다. 되감기부터 하고 다시 오자.'
      );
      return;
    }

    const middle = Number((selectedSegment.start + span / 2).toFixed(2));
    const paletteIndex = segments.length % SEGMENT_PALETTE.length;
    const leftId = createId('segment');
    const rightId = createId('segment');
    const leftSegment: TimelineSegment = {
      ...selectedSegment,
      id: leftId,
      end: middle
    };
    const rightSegment: TimelineSegment = {
      ...selectedSegment,
      id: rightId,
      start: middle,
      label: `${selectedSegment.label} / cut`,
      note: '잘린 줄기 메모를 입력해. 여기서 새 스택을 쌓으면 된다.',
      accent: SEGMENT_PALETTE[paletteIndex]
    };

    setHistory((current) => [
      ...current,
      {
        segments: cloneSegments(segments),
        selectedSegmentId
      }
    ]);
    setSegments((current) =>
      current.flatMap((segment) =>
        segment.id === selectedSegment.id
          ? [leftSegment, rightSegment]
          : [segment]
      )
    );
    setSelectedSegmentId(rightId);
    setStatus(
      '줄기 반 갈랐다. 오른쪽 컷이 선택된 상태니까 내용 바로 밀어 넣으면 된다.'
    );
  };

  const undoSplit = () => {
    const snapshot = history[history.length - 1];
    if (!snapshot) {
      setStatus('되감기할 컷이 없다. 아직 멀쩡한 한 줄기 상태다.');
      return;
    }

    setSegments(cloneSegments(snapshot.segments));
    setSelectedSegmentId(snapshot.selectedSegmentId);
    setHistory((current) => current.slice(0, -1));
    setStatus('직전 컷은 되감았다. 파이널컷 놀이 역재생 완료.');
  };

  const updateSelectedSegment = (
    patch: Partial<Pick<TimelineSegment, 'label' | 'note'>>
  ) => {
    if (!selectedSegmentId) return;

    setSegments((current) =>
      current.map((segment) =>
        segment.id === selectedSegmentId ? { ...segment, ...patch } : segment
      )
    );
  };

  const updateSelectedSpike = (
    patch: Partial<
      Pick<
        TimelineSpike,
        'title' | 'detail' | 'lane' | 'height' | 'position' | 'accent'
      >
    >
  ) => {
    if (!selectedSpikeId) return;

    setSpikes((current) =>
      current.map((spike) =>
        spike.id === selectedSpikeId ? { ...spike, ...patch } : spike
      )
    );
  };

  const spikeMin = selectedSpikeSegment
    ? Math.max(0, Math.ceil(selectedSpikeSegment.start + 1))
    : 0;
  const spikeMax = selectedSpikeSegment
    ? Math.min(100, Math.floor(selectedSpikeSegment.end - 1))
    : 100;
  const safeSpikeMax = Math.max(spikeMin + 1, spikeMax);

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,360px)]">
      <div className="overflow-hidden rounded-[1.95rem] border border-[#45588f]/45 bg-[#020817] p-4 text-white shadow-[0_28px_70px_rgba(3,6,18,0.5)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addSpike}
            className="inline-flex items-center gap-2 rounded-full border border-[#6c88d7]/50 bg-[linear-gradient(180deg,rgba(58,86,153,0.56),rgba(28,42,79,0.66))] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#eef5ff] transition hover:border-[#d8dfff] hover:bg-[linear-gradient(180deg,rgba(79,112,190,0.76),rgba(38,58,104,0.82))]"
          >
            <Plus className="h-4 w-4" />
            Spike Add
          </button>
          <button
            type="button"
            onClick={splitSelectedSegment}
            className="inline-flex items-center gap-2 rounded-full border border-[#6c88d7]/40 bg-[linear-gradient(180deg,rgba(31,43,84,0.8),rgba(13,21,43,0.92))] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#dee9ff] transition hover:border-[#d8dfff] hover:bg-[linear-gradient(180deg,rgba(48,66,118,0.88),rgba(20,28,57,0.96))]"
          >
            <Scissors className="h-4 w-4" />
            Cut Trunk
          </button>
          <button
            type="button"
            onClick={undoSplit}
            className="inline-flex items-center gap-2 rounded-full border border-[#6c88d7]/40 bg-[linear-gradient(180deg,rgba(31,43,84,0.8),rgba(13,21,43,0.92))] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-[#dee9ff] transition hover:border-[#d8dfff] hover:bg-[linear-gradient(180deg,rgba(48,66,118,0.88),rgba(20,28,57,0.96))]"
          >
            <Undo2 className="h-4 w-4" />
            Undo Cut
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              Segments {segments.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              Spikes {spikes.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              Hover Popup On
            </span>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-[#758fd9]/20 bg-[linear-gradient(180deg,rgba(152,182,255,0.08),rgba(255,255,255,0.03))] px-3 py-2 text-[11px] text-white/72 backdrop-blur-md">
          {status}
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="min-w-[900px] rounded-[1.75rem] border border-[#5b6fb2]/25 bg-[radial-gradient(circle_at_50%_50%,rgba(126,169,255,0.14),transparent_34%),radial-gradient(circle_at_top,rgba(170,194,255,0.1),transparent_38%),linear-gradient(180deg,rgba(5,12,30,0.98),rgba(3,7,18,1))] p-4">
            <div className="relative h-[456px] overflow-hidden rounded-[1.45rem] border border-white/6 bg-[radial-gradient(circle_at_50%_45%,rgba(171,200,255,0.12),transparent_32%),linear-gradient(180deg,rgba(8,13,31,0.8),rgba(2,6,18,0.96))]">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-14">
                {TICKS.map((tick) => (
                  <div
                    key={tick}
                    className="absolute top-0 h-full"
                    style={{ left: `${tick}%` }}
                  >
                    <div
                      className={cn(
                        'flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.24em] text-[#d9e6ff]/48',
                        tick === 0
                          ? 'translate-x-0'
                          : tick === 100
                            ? '-translate-x-full'
                            : '-translate-x-1/2'
                      )}
                    >
                      <span>{formatMark(tick)}</span>
                      <span className="h-3 w-px bg-white/14" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(156,194,255,0.14),transparent_38%),radial-gradient(circle_at_20%_25%,rgba(172,221,255,0.12),transparent_22%),radial-gradient(circle_at_80%_30%,rgba(210,184,255,0.12),transparent_20%)]" />

              <div className="pointer-events-none absolute inset-x-0 top-16 bottom-10 rounded-[1.4rem]">
                {TICKS.map((tick) => (
                  <div
                    key={`grid-${tick}`}
                    className="absolute inset-y-0 w-px bg-[linear-gradient(180deg,transparent,rgba(183,205,255,0.14),transparent)]"
                    style={{ left: `${tick}%` }}
                  />
                ))}
                <div className="timeline-scrub pointer-events-none absolute inset-y-12 w-px bg-[linear-gradient(180deg,transparent,rgba(240,246,255,0.96),transparent)] shadow-[0_0_16px_rgba(181,224,255,0.7)]" />
                <div
                  className="pointer-events-none absolute inset-x-[-2%] h-[20rem] opacity-95"
                  style={{ top: 'calc(50% - 10rem)', mixBlendMode: 'screen' }}
                >
                  <svg
                    viewBox="0 0 1000 260"
                    className="h-full w-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="trunk-glow"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop
                          offset="0%"
                          stopColor="#cfe6ff"
                          stopOpacity="0.28"
                        />
                        <stop
                          offset="36%"
                          stopColor="#ecf4ff"
                          stopOpacity="0.94"
                        />
                        <stop
                          offset="62%"
                          stopColor="#e6cdff"
                          stopOpacity="0.9"
                        />
                        <stop
                          offset="100%"
                          stopColor="#c1e3ff"
                          stopOpacity="0.5"
                        />
                      </linearGradient>
                      <linearGradient
                        id="trunk-core"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#b5d7ff" stopOpacity="1" />
                        <stop
                          offset="30%"
                          stopColor="#f9fbff"
                          stopOpacity="1"
                        />
                        <stop
                          offset="58%"
                          stopColor="#edccff"
                          stopOpacity="1"
                        />
                        <stop
                          offset="100%"
                          stopColor="#d0efff"
                          stopOpacity="1"
                        />
                      </linearGradient>
                      <filter
                        id="trunk-blur"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                      >
                        <feGaussianBlur stdDeviation="12" />
                      </filter>
                      <filter
                        id="trunk-soft"
                        x="-20%"
                        y="-20%"
                        width="140%"
                        height="140%"
                      >
                        <feGaussianBlur stdDeviation="3.2" />
                      </filter>
                    </defs>

                    <path
                      d={TRUNK_PATH}
                      stroke="url(#trunk-glow)"
                      strokeWidth="38"
                      strokeLinecap="round"
                      fill="none"
                      filter="url(#trunk-blur)"
                      className="energy-trunk"
                    />
                    <path
                      d={TRUNK_PATH}
                      stroke="url(#trunk-core)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      fill="none"
                      filter="url(#trunk-soft)"
                      className="energy-core"
                    />

                    {ENERGY_BRANCHES.map((branch) => (
                      <g key={branch.id}>
                        <path
                          d={branch.d}
                          stroke={branch.accent}
                          strokeWidth={branch.width}
                          strokeLinecap="round"
                          fill="none"
                          filter="url(#trunk-blur)"
                          opacity="0.56"
                          className="energy-branch"
                        />
                        <path
                          d={branch.d}
                          stroke="#edf5ff"
                          strokeWidth={Math.max(2, branch.width / 3.2)}
                          strokeLinecap="round"
                          fill="none"
                          filter="url(#trunk-soft)"
                          className="energy-branch energy-branch-core"
                        />
                      </g>
                    ))}
                  </svg>
                </div>

                {ENERGY_PARTICLES.map((particle) => (
                  <span
                    key={`${particle.left}-${particle.top}`}
                    className="energy-particle pointer-events-none absolute rounded-full bg-white/90"
                    style={{
                      left: particle.left,
                      top: particle.top,
                      height: `${particle.size}px`,
                      width: `${particle.size}px`,
                      animationDelay: particle.delay
                    }}
                  />
                ))}
              </div>

              <div className="pointer-events-none absolute left-4 right-4 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,rgba(177,216,255,0),rgba(241,247,255,0.98),rgba(237,206,255,0.92),rgba(185,228,255,0))] shadow-[0_0_36px_rgba(210,232,255,0.72)]" />
              <div className="pointer-events-none absolute left-8 right-8 top-1/2 h-[72px] -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(240,246,255,0.24),rgba(148,190,255,0.1),transparent_72%)] blur-lg" />

              {segments.map((segment) => {
                const isSelected = segment.id === selectedSegmentId;
                const segmentWidth = segment.end - segment.start;

                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => setSelectedSegmentId(segment.id)}
                    className={cn(
                      'absolute top-[54%] h-[76px] -translate-y-1/2 overflow-hidden rounded-[1.2rem] border px-3 py-2 text-left backdrop-blur-xl transition',
                      isSelected
                        ? 'border-[#d7e6ff] shadow-[0_0_0_1px_rgba(214,232,255,0.28),0_0_28px_rgba(195,227,255,0.2)]'
                        : 'border-white/10 hover:border-white/25'
                    )}
                    style={{
                      left: `calc(${segment.start}% + 0.18rem)`,
                      width: `calc(${segmentWidth}% - 0.36rem)`,
                      background: isSelected
                        ? `linear-gradient(180deg, rgba(252,254,255,0.16), ${segment.accent}DD, rgba(8, 16, 34, 0.42))`
                        : `linear-gradient(180deg, rgba(255,255,255,0.08), ${segment.accent}B5, rgba(6, 14, 31, 0.26))`
                    }}
                  >
                    <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/14" />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/24" />
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/62">
                      {formatMark(Math.round(segment.start))} -{' '}
                      {formatMark(Math.round(segment.end))}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {segment.label}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-white/72">
                      {segment.note}
                    </div>
                  </button>
                );
              })}

              {spikes.map((spike) => {
                const owningSegment = getSegmentForPosition(
                  spike.position,
                  segments
                );
                const isSelected = spike.id === selectedSpikeId;
                const direction = getSpikeDirection(spike.lane);
                const spikePaths = createSpikePaths(spike.height);

                return (
                  <button
                    key={spike.id}
                    type="button"
                    onClick={() => {
                      setSelectedSpikeId(spike.id);
                      if (owningSegment) {
                        setSelectedSegmentId(owningSegment.id);
                      }
                    }}
                    className={cn(
                      'group absolute -translate-x-1/2 focus:outline-none',
                      direction === 'up'
                        ? 'top-[49%] -translate-y-full'
                        : 'top-[49%]'
                    )}
                    style={{ left: `${spike.position}%` }}
                  >
                    <div
                      className={cn(
                        'pointer-events-none absolute left-1/2 z-20 w-56 -translate-x-1/2 rounded-2xl border border-white/15 bg-[linear-gradient(180deg,rgba(246,250,255,0.16),rgba(132,167,244,0.08))] p-3 text-left opacity-0 shadow-[0_20px_45px_rgba(4,9,17,0.35)] backdrop-blur-md transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100',
                        direction === 'up'
                          ? 'bottom-full mb-5'
                          : 'top-full mt-5'
                      )}
                    >
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">
                        {owningSegment?.label ?? 'No Segment'}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white">
                        {spike.title}
                      </div>
                      <div className="mt-2 text-[12px] leading-relaxed text-white/74">
                        {spike.detail}
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/50">
                        {spike.lane} · {formatMark(Math.round(spike.position))}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'relative flex items-center',
                        direction === 'down' ? 'flex-col-reverse' : 'flex-col'
                      )}
                    >
                      <svg
                        viewBox={`0 0 90 ${spikePaths.viewBoxHeight}`}
                        className={cn(
                          'w-[92px] transition duration-200',
                          direction === 'down' && 'scale-y-[-1]'
                        )}
                        style={{
                          height: `${spikePaths.viewBoxHeight}px`,
                          filter: isSelected
                            ? 'drop-shadow(0 0 26px rgba(195,227,255,0.62))'
                            : 'drop-shadow(0 0 14px rgba(170,214,255,0.22))'
                        }}
                        aria-hidden="true"
                      >
                        <defs>
                          <linearGradient
                            id={`spike-gradient-${spike.id}`}
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="55%" stopColor={spike.accent} />
                            <stop
                              offset="100%"
                              stopColor="rgba(196,230,255,0.1)"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d={spikePaths.core}
                          stroke={spike.accent}
                          strokeWidth="14"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.34"
                        />
                        <path
                          d={spikePaths.branchLeft}
                          stroke={spike.accent}
                          strokeWidth="10"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.24"
                        />
                        <path
                          d={spikePaths.branchRight}
                          stroke="rgba(237, 210, 255, 0.82)"
                          strokeWidth="9"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.22"
                        />
                        <path
                          d={spikePaths.twigLeft}
                          stroke="rgba(191, 230, 255, 0.8)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.3"
                        />
                        <path
                          d={spikePaths.twigRight}
                          stroke="rgba(237, 210, 255, 0.8)"
                          strokeWidth="5"
                          strokeLinecap="round"
                          fill="none"
                          opacity="0.3"
                        />
                        <path
                          d={spikePaths.core}
                          stroke={`url(#spike-gradient-${spike.id})`}
                          strokeWidth="4.2"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d={spikePaths.branchLeft}
                          stroke="rgba(231, 244, 255, 0.94)"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          fill="none"
                        />
                        <path
                          d={spikePaths.branchRight}
                          stroke="rgba(255, 239, 255, 0.92)"
                          strokeWidth="2.1"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                      <div className="h-4 w-px bg-white/35" />
                      <span
                        className={cn(
                          'max-w-[92px] text-center text-[10px] uppercase tracking-[0.18em] text-white/65',
                          direction === 'down' ? 'mb-3' : 'mt-3'
                        )}
                      >
                        {spike.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="tech-panel overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-stone-900/10 bg-[#edf4ff] p-2 text-[#21406b]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="section-kicker !tracking-[0.18em]">Cut Inspector</p>
              <p className="mt-1 text-xs text-stone-500">
                잘라진 줄기 제목이랑 메모를 여기서 박아넣으면 된다.
              </p>
            </div>
          </div>

          {selectedSegment ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Segment Title
                </label>
                <Input
                  value={selectedSegment.label}
                  onChange={(event) =>
                    updateSelectedSegment({ label: event.currentTarget.value })
                  }
                  className="border-stone-900/10 bg-white/80"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Segment Note
                </label>
                <Textarea
                  value={selectedSegment.note}
                  onChange={(event) =>
                    updateSelectedSegment({ note: event.currentTarget.value })
                  }
                  rows={5}
                  className="border-stone-900/10 bg-white/80"
                />
              </div>

              <div className="rounded-[1.1rem] border border-stone-900/10 bg-[#f5f9ff] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                  Selected Range
                </div>
                <div className="mt-2 text-sm font-semibold text-stone-950">
                  {formatMark(Math.round(selectedSegment.start))} -{' '}
                  {formatMark(Math.round(selectedSegment.end))}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedSegmentSpikes.map((spike) => (
                    <span
                      key={spike.id}
                      className="rounded-full border border-stone-900/10 bg-white/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-stone-600"
                    >
                      {spike.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-600">줄기를 먼저 선택해.</p>
          )}
        </div>

        <div className="tech-panel overflow-hidden p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-stone-900/10 bg-[#edf4ff] p-2 text-[#21406b]">
              <MousePointer2 className="h-4 w-4" />
            </div>
            <div>
              <p className="section-kicker !tracking-[0.18em]">Spike Editor</p>
              <p className="mt-1 text-xs text-stone-500">
                가시 클릭하면 호버 카드랑 상세 입력 둘 다 같이 먹는다.
              </p>
            </div>
          </div>

          {selectedSpike ? (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Spike Title
                </label>
                <Input
                  value={selectedSpike.title}
                  onChange={(event) =>
                    updateSelectedSpike({ title: event.currentTarget.value })
                  }
                  className="border-stone-900/10 bg-white/80"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Spike Lane
                </label>
                <Input
                  value={selectedSpike.lane}
                  onChange={(event) =>
                    updateSelectedSpike({ lane: event.currentTarget.value })
                  }
                  className="border-stone-900/10 bg-white/80"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-stone-500">
                  Hover Detail
                </label>
                <Textarea
                  value={selectedSpike.detail}
                  onChange={(event) =>
                    updateSelectedSpike({ detail: event.currentTarget.value })
                  }
                  rows={4}
                  className="border-stone-900/10 bg-white/80"
                />
              </div>

              <div className="rounded-[1.1rem] border border-stone-900/10 bg-[#f5f9ff] p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  <span>Spike Height</span>
                  <span>{selectedSpike.height}px</span>
                </div>
                <input
                  type="range"
                  min={56}
                  max={144}
                  value={selectedSpike.height}
                  onChange={(event) =>
                    updateSelectedSpike({
                      height: Number(event.currentTarget.value)
                    })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#2f5d95]"
                />
              </div>

              <div className="rounded-[1.1rem] border border-stone-900/10 bg-[#f5f9ff] p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  <span>Spike Position</span>
                  <span>{formatMark(Math.round(selectedSpike.position))}</span>
                </div>
                <input
                  type="range"
                  min={spikeMin}
                  max={safeSpikeMax}
                  value={clamp(selectedSpike.position, spikeMin, safeSpikeMax)}
                  onChange={(event) =>
                    updateSelectedSpike({
                      position: Number(event.currentTarget.value)
                    })
                  }
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-[#2f5d95]"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-stone-500">
                  <Sparkles className="h-4 w-4" />
                  Accent Tone
                </div>
                <div className="flex flex-wrap gap-2">
                  {SPIKE_PALETTE.map((accent) => (
                    <button
                      key={accent}
                      type="button"
                      onClick={() => updateSelectedSpike({ accent })}
                      className={cn(
                        'h-8 w-8 rounded-full border transition',
                        selectedSpike.accent === accent
                          ? 'border-stone-950/45 scale-105'
                          : 'border-stone-900/10'
                      )}
                      style={{ background: accent }}
                      aria-label={`Select accent ${accent}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-600">
              가시 하나를 먼저 찍어.
            </p>
          )}
        </div>
      </div>

      <style>{`
        .timeline-scrub {
          animation: timeline-scrub 10s linear infinite;
        }

        .energy-trunk {
          animation: trunk-throb 5.5s ease-in-out infinite;
        }

        .energy-core,
        .energy-branch-core {
          stroke-dasharray: 22 12;
          animation: energy-drift 11s linear infinite;
        }

        .energy-branch {
          animation: branch-flicker 4.8s ease-in-out infinite;
        }

        .energy-particle {
          box-shadow:
            0 0 18px rgba(201, 229, 255, 0.92),
            0 0 38px rgba(214, 202, 255, 0.42);
          animation: particle-float 5.2s ease-in-out infinite;
        }

        @keyframes timeline-scrub {
          0% {
            left: 0%;
            opacity: 0;
          }
          8% {
            opacity: 1;
          }
          92% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        @keyframes energy-drift {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -260;
          }
        }

        @keyframes branch-flicker {
          0%,
          100% {
            opacity: 0.28;
          }
          40% {
            opacity: 0.52;
          }
          70% {
            opacity: 0.34;
          }
        }

        @keyframes trunk-throb {
          0%,
          100% {
            opacity: 0.62;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes particle-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(0.9);
            opacity: 0.45;
          }
          50% {
            transform: translate3d(0, -8px, 0) scale(1.08);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
