'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const HOLD_MS = {
  clean: 2000,
  poop: 3000
} as const;

type HoldKind = keyof typeof HOLD_MS;

const HOLD_EVENT_MAP: Record<
  HoldKind,
  { end: string; start: string; trigger: string }
> = {
  clean: {
    end: 'bio-village:poop-clean-hold-end',
    start: 'bio-village:poop-clean-hold-start',
    trigger: 'bio-village:poop-clean-trigger'
  },
  poop: {
    end: 'bio-village:poop-hold-end',
    start: 'bio-village:poop-hold-start',
    trigger: 'bio-village:poop-trigger'
  }
};

export default function Header({ onMenuClick }: HeaderProps) {
  const [activeHold, setActiveHold] = useState<HoldKind | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdActiveRef = useRef(false);
  const holdKindRef = useRef<HoldKind | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);

  const resetHold = (keepProgress = false) => {
    const activeKind = holdKindRef.current;
    const hadActiveHold =
      holdActiveRef.current ||
      holdStartRef.current !== null ||
      holdTriggeredRef.current ||
      activeKind !== null;

    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }

    holdActiveRef.current = false;
    holdKindRef.current = null;
    holdStartRef.current = null;
    holdTriggeredRef.current = false;
    setActiveHold(null);

    if (hadActiveHold && activeKind) {
      window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[activeKind].end));
    }

    if (!keepProgress) {
      setHoldProgress(0);
    }
  };

  useEffect(() => {
    return () => resetHold();
  }, []);

  const beginHold = (kind: HoldKind) => {
    if (holdActiveRef.current) return;

    holdActiveRef.current = true;
    holdKindRef.current = kind;
    holdTriggeredRef.current = false;
    holdStartRef.current = performance.now();
    setActiveHold(kind);
    setHoldProgress(0);
    window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[kind].start));

    const tick = () => {
      if (holdStartRef.current === null) return;
      const elapsed = performance.now() - holdStartRef.current;
      const nextProgress = Math.min(1, elapsed / HOLD_MS[kind]);
      setHoldProgress(nextProgress);

      if (nextProgress < 1) {
        holdRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    holdRafRef.current = window.requestAnimationFrame(tick);
    holdTimeoutRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      holdActiveRef.current = false;
      holdKindRef.current = null;
      holdStartRef.current = null;
      setActiveHold(null);
      setHoldProgress(1);
      window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[kind].end));
      window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[kind].trigger));
      window.setTimeout(() => {
        setHoldProgress(0);
      }, 420);
    }, HOLD_MS[kind]);
  };

  const stopHold = (keepProgress = false) => {
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }

    resetHold(keepProgress);
  };

  const startHoldPointer =
    (kind: HoldKind) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      beginHold(kind);
    };

  const startHoldMouse =
    (kind: HoldKind) => (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      beginHold(kind);
    };

  const startHoldTouch =
    (kind: HoldKind) => (event: React.TouchEvent<HTMLButtonElement>) => {
      event.preventDefault();
      beginHold(kind);
    };

  const preventDefaultEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
  };

  const renderHoldOrb = (kind: HoldKind) => {
    if (activeHold === kind) {
      return (
        <span
          aria-hidden="true"
          className="relative h-[13px] w-[13px] rounded-full border border-[rgba(255,243,233,0.36)]"
          style={{
            background: `conic-gradient(${kind === 'clean' ? 'rgba(188,224,186,0.96)' : 'rgba(255,196,120,0.96)'} ${
              holdProgress * 360
            }deg, rgba(255,255,255,0.08) 0deg)`
          }}
        >
          <span className="absolute inset-[2px] rounded-full bg-[rgba(44,16,10,0.96)]" />
        </span>
      );
    }

    return (
      <span
        aria-hidden="true"
        className="h-[13px] w-[13px] rounded-full border border-[rgba(255,243,233,0.26)] bg-[rgba(255,255,255,0.08)]"
      />
    );
  };

  const buttonBaseClassName =
    'pointer-events-auto relative overflow-hidden rounded-full border px-3 py-2 font-[var(--font-brush)] text-[0.64rem] font-bold tracking-[0.14em] text-[rgba(255,235,219,0.96)] shadow-[0_10px_22px_rgba(0,0,0,0.26)] transition-transform duration-200 hover:-translate-y-[1px] sm:px-4';

  const buttonSharedStyle = {
    MozUserSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none' as const,
    WebkitUserSelect: 'none' as const,
    touchAction: 'none' as const,
    userSelect: 'none' as const
  };

  const renderHoldButton = (
    kind: HoldKind,
    label: string,
    toneClassName: string,
    ariaLabel: string
  ) => (
    <button
      type="button"
      onPointerDown={startHoldPointer(kind)}
      onPointerUp={() => stopHold()}
      onPointerLeave={() => stopHold()}
      onPointerCancel={() => stopHold()}
      onMouseDown={startHoldMouse(kind)}
      onMouseUp={() => stopHold()}
      onMouseLeave={() => stopHold()}
      onTouchStart={startHoldTouch(kind)}
      onTouchEnd={() => stopHold()}
      onTouchCancel={() => stopHold()}
      onContextMenu={preventDefaultEvent}
      onDragStart={preventDefaultEvent}
      className={`${buttonBaseClassName} ${toneClassName} ${
        activeHold === kind ? 'scale-[0.985]' : ''
      }`}
      style={buttonSharedStyle}
      aria-label={ariaLabel}
      draggable={false}
    >
      <span className="relative z-[1] inline-flex items-center gap-2">
        {renderHoldOrb(kind)}
        <span>{label}</span>
      </span>
      {activeHold === kind ? (
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.14),transparent)] opacity-70" />
      ) : null}
    </button>
  );

  return (
    <header className="pointer-events-none fixed right-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4 md:px-8 md:pt-6">
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={onMenuClick}
          className="pointer-events-auto inline-flex items-center gap-2 border border-[rgba(96,24,24,0.9)] bg-[rgba(24,3,3,0.96)] px-3 py-2 font-[var(--font-brush)] text-[0.7rem] font-bold tracking-[0.16em] text-[rgba(255,241,236,0.96)] shadow-[0_10px_24px_rgba(0,0,0,0.34)] transition-transform duration-200 hover:-translate-y-[1px] sm:px-4"
          aria-label="메뉴 열기"
        >
          <span>ACCESS</span>
          <Menu className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-[1px]" />
        </button>

        {renderHoldButton(
          'poop',
          '똥싸기',
          'border-[rgba(96,24,24,0.76)] bg-[rgba(44,16,10,0.94)]',
          '똥싸기 버튼'
        )}

        {renderHoldButton(
          'clean',
          '똥치우기',
          'border-[rgba(52,90,57,0.76)] bg-[rgba(18,43,22,0.94)]',
          '똥치우기 버튼'
        )}
      </div>
    </header>
  );
}
