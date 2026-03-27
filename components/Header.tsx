'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const POOP_HOLD_MS = 3000;

export default function Header({ onMenuClick }: HeaderProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHoldingPoop, setIsHoldingPoop] = useState(false);
  const holdActiveRef = useRef(false);
  const holdStartRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const poopTriggeredRef = useRef(false);

  const resetPoopHold = (keepProgress = false) => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }

    holdStartRef.current = null;
    poopTriggeredRef.current = false;
    holdActiveRef.current = false;
    setIsHoldingPoop(false);
    if (!keepProgress) {
      setHoldProgress(0);
    }
  };

  useEffect(() => {
    return () => resetPoopHold();
  }, []);

  const beginPoopHold = () => {
    if (holdActiveRef.current) return;

    holdActiveRef.current = true;
    poopTriggeredRef.current = false;
    setIsHoldingPoop(true);
    setHoldProgress(0);
    holdStartRef.current = performance.now();

    const tick = () => {
      if (holdStartRef.current === null) return;
      const elapsed = performance.now() - holdStartRef.current;
      const nextProgress = Math.min(1, elapsed / POOP_HOLD_MS);
      setHoldProgress(nextProgress);

      if (nextProgress < 1) {
        holdRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    holdRafRef.current = window.requestAnimationFrame(tick);
    holdTimeoutRef.current = window.setTimeout(() => {
      poopTriggeredRef.current = true;
      setHoldProgress(1);
      setIsHoldingPoop(false);
      holdActiveRef.current = false;
      window.dispatchEvent(new CustomEvent('bio-village:poop-trigger'));
      window.setTimeout(() => {
        setHoldProgress(0);
      }, 420);
    }, POOP_HOLD_MS);
  };

  const startPoopHoldPointer = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    beginPoopHold();
  };

  const startPoopHoldMouse = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    beginPoopHold();
  };

  const startPoopHoldTouch = (event: React.TouchEvent<HTMLButtonElement>) => {
    event.preventDefault();
    beginPoopHold();
  };

  const stopPoopHold = (keepProgress = false) => {
    if (poopTriggeredRef.current) {
      poopTriggeredRef.current = false;
      return;
    }

    resetPoopHold(keepProgress);
  };

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

        <button
          type="button"
          onPointerDown={startPoopHoldPointer}
          onPointerUp={() => stopPoopHold()}
          onPointerLeave={() => stopPoopHold()}
          onPointerCancel={() => stopPoopHold()}
          onMouseDown={startPoopHoldMouse}
          onMouseUp={() => stopPoopHold()}
          onMouseLeave={() => stopPoopHold()}
          onTouchStart={startPoopHoldTouch}
          onTouchEnd={() => stopPoopHold()}
          onTouchCancel={() => stopPoopHold()}
          onContextMenu={(event) => event.preventDefault()}
          className={`pointer-events-auto relative overflow-hidden rounded-full border border-[rgba(96,24,24,0.76)] bg-[rgba(44,16,10,0.94)] px-3 py-2 font-[var(--font-brush)] text-[0.64rem] font-bold tracking-[0.14em] text-[rgba(255,235,219,0.96)] shadow-[0_10px_22px_rgba(0,0,0,0.26)] transition-transform duration-200 hover:-translate-y-[1px] sm:px-4 ${isHoldingPoop ? 'scale-[0.985]' : ''}`}
          style={{ WebkitTouchCallout: 'none', touchAction: 'none' }}
          aria-label="똥싸기 버튼"
        >
          <span className="relative z-[1]">
            {isHoldingPoop
              ? `똥싸기 ${Math.max(1, Math.ceil((1 - holdProgress) * 3))}`
              : '똥싸기'}
          </span>
          <span
            className="absolute inset-x-1 bottom-1 h-[3px] rounded-full bg-[rgba(255,255,255,0.08)]"
            aria-hidden="true"
          >
            <span
              className="block h-full rounded-full bg-[linear-gradient(90deg,rgba(255,196,120,0.88),rgba(255,134,85,0.98))] transition-[width] duration-75"
              style={{ width: `${holdProgress * 100}%` }}
            />
          </span>
          {isHoldingPoop ? (
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.14),transparent)] opacity-70" />
          ) : null}
        </button>
      </div>
    </header>
  );
}
