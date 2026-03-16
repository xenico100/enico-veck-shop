'use client';

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode
} from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

import { BOARD } from '@/components/dark-node/board-theme';

type ZoomableCanvasProps = {
  children: ReactNode;
  svgWidth: number;
  svgHeight: number;
};

export function ZoomableCanvas({
  children,
  svgWidth,
  svgHeight
}: ZoomableCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [baseScale, setBaseScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const lastTouchCount = useRef(0);

  const calcFitScale = useCallback(() => {
    if (!containerRef.current) return 1;
    const containerW = containerRef.current.clientWidth;
    const padding = 22;

    return Math.min(1, (containerW - padding) / svgWidth);
  }, [svgWidth]);

  useEffect(() => {
    const fit = () => {
      const s = calcFitScale();
      setBaseScale(s);
      setScale(s);
      setTranslate({ x: 0, y: 0 });
    };

    fit();
    window.addEventListener('resize', fit);

    return () => window.removeEventListener('resize', fit);
  }, [calcFitScale]);

  const clampScale = (s: number) => Math.max(baseScale * 0.55, Math.min(2.8, s));

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { ...translate };
    },
    [translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;

      setTranslate({
        x: translateStart.current.x + (e.clientX - panStart.current.x),
        y: translateStart.current.y + (e.clientY - panStart.current.y)
      });
    },
    [isPanning]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        pinchStartDist.current = getTouchDist(e.touches);
        pinchStartScale.current = scale;
      } else if (e.touches.length === 1) {
        panStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        translateStart.current = { ...translate };
      }

      lastTouchCount.current = e.touches.length;
    },
    [scale, translate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches);
        if (pinchStartDist.current > 0) {
          const newScale = pinchStartScale.current * (dist / pinchStartDist.current);
          setScale(clampScale(newScale));
        }
      } else if (e.touches.length === 1 && lastTouchCount.current === 1) {
        setTranslate({
          x: translateStart.current.x + (e.touches[0].clientX - panStart.current.x),
          y: translateStart.current.y + (e.touches[0].clientY - panStart.current.y)
        });
      }
    },
    [baseScale]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStartDist.current = 0;
      }

      if (e.touches.length === 1) {
        panStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
        translateStart.current = { ...translate };
      }

      lastTouchCount.current = e.touches.length;
    },
    [translate]
  );

  const resetView = () => {
    const s = calcFitScale();
    setScale(s);
    setTranslate({ x: 0, y: 0 });
  };

  const zoomPercent = Math.round((scale / baseScale) * 100);

  return (
    <div className="relative w-full" style={{ touchAction: 'none' }}>
      <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
        <button
          onClick={() => setScale((prev) => clampScale(prev * 0.88))}
          className="flex h-8 w-8 items-center justify-center border"
          style={{
            background: BOARD.paperSoft,
            borderColor: BOARD.ink,
            color: BOARD.ink
          }}
        >
          <ZoomOut size={14} />
        </button>
        <div
          className="min-w-[52px] border px-2 py-1 text-center text-[10px] font-semibold tracking-[0.18em]"
          style={{
            background: BOARD.paperSoft,
            borderColor: BOARD.ink,
            color: BOARD.ink
          }}
        >
          {zoomPercent}%
        </div>
        <button
          onClick={() => setScale((prev) => clampScale(prev * 1.12))}
          className="flex h-8 w-8 items-center justify-center border"
          style={{
            background: BOARD.paperSoft,
            borderColor: BOARD.ink,
            color: BOARD.ink
          }}
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={resetView}
          className="flex h-8 w-8 items-center justify-center border"
          style={{
            background: BOARD.paperSoft,
            borderColor: BOARD.ink,
            color: BOARD.ink
          }}
        >
          <Maximize size={14} />
        </button>
      </div>

      <div
        ref={containerRef}
        className="w-full overflow-hidden border"
        style={{
          height: Math.max(320, svgHeight * scale + 24),
          cursor: isPanning ? 'grabbing' : 'grab',
          background: BOARD.paperSoft,
          borderColor: BOARD.ink,
          boxShadow: `inset 0 0 0 1px ${BOARD.lineSoft}`
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'top left',
            transition: isPanning ? 'none' : 'transform 0.15s ease-out',
            width: svgWidth,
            height: svgHeight
          }}
        >
          {children}
        </div>
      </div>

      <div
        className="mt-2 text-center text-[10px] tracking-[0.16em] md:hidden"
        style={{ color: BOARD.inkSoft }}
      >
        PINCH TO ZOOM · DRAG TO PAN
      </div>
    </div>
  );
}
