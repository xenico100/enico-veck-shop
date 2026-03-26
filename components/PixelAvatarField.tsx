'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const STEP_SIZE = 24;
const AVATAR_WIDTH = 40;
const AVATAR_HEIGHT = 50;
const WORLD_MARGIN = 24;

type Direction = 'up' | 'down' | 'left' | 'right';
type Position = { x: number; y: number };
type WorldBounds = { width: number; height: number };
type ViewportState = {
  height: number;
  scrollX: number;
  scrollY: number;
  width: number;
};

const DIRECTIONS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right'
};

const SPRITES: Record<Direction, string[]> = {
  down: [
    '............',
    '...111111...',
    '..12222221..',
    '..12333221..',
    '..12333221..',
    '...244442...',
    '...255552...',
    '..25555552..',
    '..25666652..',
    '...56..65...',
    '..777..777..',
    '..7......7..'
  ],
  up: [
    '............',
    '...111111...',
    '..12222221..',
    '..12333321..',
    '..12333321..',
    '...244442...',
    '...255552...',
    '..25555552..',
    '..25666652..',
    '...56..65...',
    '..777..777..',
    '..7......7..'
  ],
  left: [
    '............',
    '...11111....',
    '..1222221...',
    '..12333221..',
    '..123332421.',
    '...24445521.',
    '...25555521.',
    '..255556652.',
    '..256666652.',
    '...56..665..',
    '..777..777..',
    '..7......7..'
  ],
  right: [
    '............',
    '....11111...',
    '...1222221..',
    '..12233321..',
    '.124233321..',
    '.125544442...',
    '.125555552...',
    '.2566655552..',
    '.2566666652..',
    '..566..65...',
    '..777..777..',
    '..7......7..'
  ]
};

const PALETTE: Record<string, string> = {
  '1': '#4f1010',
  '2': '#f7d6bf',
  '3': '#23110f',
  '4': '#f9f7f2',
  '5': '#8c1b1b',
  '6': '#f1b84f',
  '7': '#47290f'
};

const snapToGrid = (value: number) => Math.round(value / STEP_SIZE) * STEP_SIZE;

const getWorldBounds = (): WorldBounds => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  const doc = document.documentElement;
  const body = document.body;

  return {
    width: Math.max(doc.scrollWidth, body.scrollWidth, window.innerWidth),
    height: Math.max(doc.scrollHeight, body.scrollHeight, window.innerHeight)
  };
};

const getViewportState = (): ViewportState => ({
  width: window.innerWidth,
  height: window.innerHeight,
  scrollX: window.scrollX,
  scrollY: window.scrollY
});

const clampPosition = (position: Position, bounds: WorldBounds): Position => ({
  x: Math.max(
    WORLD_MARGIN,
    Math.min(bounds.width - AVATAR_WIDTH - WORLD_MARGIN, position.x)
  ),
  y: Math.max(
    WORLD_MARGIN,
    Math.min(bounds.height - AVATAR_HEIGHT - WORLD_MARGIN, position.y)
  )
});

function buildSpritePixels(sprite: string[]) {
  return sprite.flatMap((row, y) =>
    row.split('').flatMap((cell, x) => {
      const color = PALETTE[cell];
      if (!color) return [];

      return [
        <span
          key={`${x}-${y}`}
          className="absolute"
          style={{
            left: `${x * 3}px`,
            top: `${y * 3}px`,
            width: '3px',
            height: '3px',
            backgroundColor: color,
            boxShadow:
              color === '#f9f7f2' ? '0 0 4px rgba(255,255,255,0.6)' : 'none'
          }}
        />
      ];
    })
  );
}

export default function PixelAvatarField() {
  const hasMovedRef = useRef(false);
  const [worldBounds, setWorldBounds] = useState<WorldBounds>({
    width: 0,
    height: 0
  });
  const [viewport, setViewport] = useState<ViewportState>({
    width: 0,
    height: 0,
    scrollX: 0,
    scrollY: 0
  });
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [destination, setDestination] = useState<Position | null>(null);
  const [facing, setFacing] = useState<Direction>('down');
  const [stepTick, setStepTick] = useState(0);

  const spritePixels = useMemo(
    () => buildSpritePixels(SPRITES[facing] ?? SPRITES.down),
    [facing]
  );

  useEffect(() => {
    const syncBounds = () => {
      const nextBounds = getWorldBounds();
      setWorldBounds(nextBounds);
      setPosition((current) => {
        if (current.x === 0 && current.y === 0) {
          return clampPosition(
            {
              x: snapToGrid(window.innerWidth * 0.68),
              y: snapToGrid(260)
            },
            nextBounds
          );
        }

        return clampPosition(current, nextBounds);
      });
    };

    const syncViewport = () => {
      setViewport(getViewportState());
    };

    syncBounds();
    syncViewport();

    const observer = new ResizeObserver(() => {
      syncBounds();
      syncViewport();
    });

    observer.observe(document.documentElement);
    observer.observe(document.body);
    window.addEventListener('resize', syncBounds);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('scroll', syncViewport, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncBounds);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('scroll', syncViewport);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      const direction = DIRECTIONS[event.key];
      if (!direction) return;

      event.preventDefault();
      hasMovedRef.current = true;
      setDestination(null);
      setFacing(direction);
      setPosition((current) => {
        const next = { ...current };

        if (direction === 'up') next.y -= STEP_SIZE;
        if (direction === 'down') next.y += STEP_SIZE;
        if (direction === 'left') next.x -= STEP_SIZE;
        if (direction === 'right') next.x += STEP_SIZE;

        setStepTick((tick) => tick + 1);
        return clampPosition(next, worldBounds);
      });
    };

    const handleContextMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      event.preventDefault();
      hasMovedRef.current = true;

      const next = clampPosition(
        {
          x: snapToGrid(event.clientX + window.scrollX - AVATAR_WIDTH / 2),
          y: snapToGrid(event.clientY + window.scrollY - AVATAR_HEIGHT / 2)
        },
        worldBounds
      );

      setDestination(next);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMove);
    };
  }, [worldBounds]);

  useEffect(() => {
    if (!destination) return undefined;
    if (destination.x === position.x && destination.y === position.y) {
      setDestination(null);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      hasMovedRef.current = true;
      setPosition((current) => {
        const next = { ...current };

        if (destination.x !== current.x) {
          next.x += destination.x > current.x ? STEP_SIZE : -STEP_SIZE;
          setFacing(destination.x > current.x ? 'right' : 'left');
        } else if (destination.y !== current.y) {
          next.y += destination.y > current.y ? STEP_SIZE : -STEP_SIZE;
          setFacing(destination.y > current.y ? 'down' : 'up');
        }

        setStepTick((tick) => tick + 1);
        return clampPosition(next, worldBounds);
      });
    }, 88);

    return () => window.clearTimeout(timer);
  }, [destination, position.x, position.y, worldBounds]);

  useEffect(() => {
    if (!hasMovedRef.current || viewport.width === 0 || viewport.height === 0) {
      return;
    }

    const topSafe = 132;
    const bottomSafe = viewport.height - 180;
    const leftSafe = 120;
    const rightSafe = viewport.width - 120;
    const avatarLeft = position.x - viewport.scrollX;
    const avatarTop = position.y - viewport.scrollY;
    let nextScrollX = viewport.scrollX;
    let nextScrollY = viewport.scrollY;

    if (avatarLeft < leftSafe) {
      nextScrollX -= leftSafe - avatarLeft;
    } else if (avatarLeft + AVATAR_WIDTH > rightSafe) {
      nextScrollX += avatarLeft + AVATAR_WIDTH - rightSafe;
    }

    if (avatarTop < topSafe) {
      nextScrollY -= topSafe - avatarTop;
    } else if (avatarTop + AVATAR_HEIGHT > bottomSafe) {
      nextScrollY += avatarTop + AVATAR_HEIGHT - bottomSafe;
    }

    const maxScrollX = Math.max(0, worldBounds.width - viewport.width);
    const maxScrollY = Math.max(0, worldBounds.height - viewport.height);

    nextScrollX = Math.max(0, Math.min(maxScrollX, nextScrollX));
    nextScrollY = Math.max(0, Math.min(maxScrollY, nextScrollY));

    if (
      Math.abs(nextScrollX - viewport.scrollX) > 1 ||
      Math.abs(nextScrollY - viewport.scrollY) > 1
    ) {
      window.scrollTo({
        left: nextScrollX,
        top: nextScrollY
      });
    }
  }, [position, viewport, worldBounds]);

  const worldScreenX = position.x - viewport.scrollX;
  const worldScreenY = position.y - viewport.scrollY;

  return (
    <>
      <div className="clinical-field-shell animate-rise [animation-delay:0.12s]">
        <div className="clinical-field-header">
          <div>
            <p className="clinical-field-kicker">SITE-WIDE PIXEL AVATAR</p>
            <h3 className="clinical-field-title">
              RIGHT CLICK ANYWHERE OR MOVE WITH ARROWS
            </h3>
          </div>
          <div className="clinical-field-status">
            <span>MODE: WALK</span>
            <span>{destination ? 'AUTO PATHING' : 'FREE ROAM'}</span>
          </div>
        </div>

        <div className="clinical-avatar-console">
          <div className="clinical-avatar-preview">
            <div
              className={`clinical-avatar-preview-sprite ${
                stepTick % 2 === 0
                  ? 'clinical-avatar-bob-a'
                  : 'clinical-avatar-bob-b'
              }`}
            >
              <span className="clinical-avatar-shadow" />
              <span className="clinical-avatar-sprite">{spritePixels}</span>
            </div>
          </div>

          <div className="clinical-avatar-console-copy">
            <p className="clinical-avatar-console-lead">
              이제 캐릭터가 메인페이지 장난감이 아니라 사이트 전체를 걷는다.
            </p>
            <div className="clinical-avatar-badges">
              <span>GLOBAL WALK</span>
              <span>AUTO SCROLL FOLLOW</span>
              <span>PIXEL HEARTGOLD FEEL</span>
            </div>
            <div className="clinical-avatar-metrics">
              <p>
                X <strong>{Math.round(position.x)}</strong>
              </p>
              <p>
                Y <strong>{Math.round(position.y)}</strong>
              </p>
              <p>
                DIR <strong>{facing.toUpperCase()}</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="clinical-field-footer">
          <span>우클릭: 원하는 위치로 자동 이동</span>
          <span>방향키: 사이트 전체에서 한 칸씩 이동</span>
          <span>아래로 가면 화면도 캐릭터 시점에 맞춰 자동 추적</span>
        </div>
      </div>

      <div className="clinical-avatar-world" aria-hidden="true">
        <div
          className={`clinical-avatar ${
            stepTick % 2 === 0
              ? 'clinical-avatar-bob-a'
              : 'clinical-avatar-bob-b'
          }`}
          style={{
            transform: `translate(${worldScreenX}px, ${worldScreenY}px)`
          }}
        >
          <span className="clinical-avatar-shadow" />
          <span className="clinical-avatar-sprite">{spritePixels}</span>
        </div>
      </div>
    </>
  );
}
