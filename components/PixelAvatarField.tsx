'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

const TILE_SIZE = 24;
const FIELD_WIDTH = 15;
const FIELD_HEIGHT = 11;

type Direction = 'up' | 'down' | 'left' | 'right';
type Position = { x: number; y: number };

const MAP_ROWS = [
  'GGGGGGGGGGGGGGG',
  'GGGFFFFFGGGGGGG',
  'GGGFGGGFGGGGGGG',
  'GGGFGGGFGGSSSGG',
  'GGGFFFFFGGSSSGG',
  'GGGGGGGFGGSSSGG',
  'GGGGGFFFGGGGGGG',
  'GGGGGFGGGGGGGGG',
  'GGFFFGFGGGGGGGG',
  'GGFGGGFGGGGGGGG',
  'GGFFFFFGGGGGGGG'
] as const;

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

function clampPosition(position: Position): Position {
  return {
    x: Math.max(0, Math.min(FIELD_WIDTH - 1, position.x)),
    y: Math.max(0, Math.min(FIELD_HEIGHT - 1, position.y))
  };
}

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
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<Position>({ x: 6, y: 5 });
  const [destination, setDestination] = useState<Position | null>(null);
  const [facing, setFacing] = useState<Direction>('down');
  const [stepTick, setStepTick] = useState(0);

  const spritePixels = useMemo(
    () => buildSpritePixels(SPRITES[facing] ?? SPRITES.down),
    [facing]
  );

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
      setDestination(null);
      setFacing(direction);
      setPosition((current) => {
        const next = { ...current };

        if (direction === 'up') next.y -= 1;
        if (direction === 'down') next.y += 1;
        if (direction === 'left') next.x -= 1;
        if (direction === 'right') next.x += 1;

        setStepTick((tick) => tick + 1);
        return clampPosition(next);
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!destination) return undefined;
    if (destination.x === position.x && destination.y === position.y) {
      setDestination(null);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setPosition((current) => {
        const next = { ...current };

        if (destination.x !== current.x) {
          next.x += destination.x > current.x ? 1 : -1;
          setFacing(destination.x > current.x ? 'right' : 'left');
        } else if (destination.y !== current.y) {
          next.y += destination.y > current.y ? 1 : -1;
          setFacing(destination.y > current.y ? 'down' : 'up');
        }

        setStepTick((tick) => tick + 1);
        return clampPosition(next);
      });
    }, 92);

    return () => window.clearTimeout(timer);
  }, [destination, position.x, position.y]);

  const handleContextMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tileX = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const tileY = Math.floor((event.clientY - rect.top) / TILE_SIZE);
    const next = clampPosition({ x: tileX, y: tileY });
    setDestination(next);
  };

  return (
    <div className="clinical-field-shell animate-rise [animation-delay:0.12s]">
      <div className="clinical-field-header">
        <div>
          <p className="clinical-field-kicker">POCKET FIELD / PIXEL AVATAR</p>
          <h3 className="clinical-field-title">
            RIGHT CLICK OR MOVE WITH ARROWS
          </h3>
        </div>
        <div className="clinical-field-status">
          <span>MODE: WALK</span>
          <span>{destination ? 'PATHING...' : 'IDLE'}</span>
        </div>
      </div>

      <div
        ref={fieldRef}
        className="clinical-pixel-field"
        onContextMenu={handleContextMove}
        role="application"
        aria-label="픽셀 아바타 이동 필드"
      >
        <div
          className="clinical-pixel-grid"
          style={{
            gridTemplateColumns: `repeat(${FIELD_WIDTH}, ${TILE_SIZE}px)`,
            gridTemplateRows: `repeat(${FIELD_HEIGHT}, ${TILE_SIZE}px)`
          }}
        >
          {MAP_ROWS.flatMap((row, y) =>
            row.split('').map((tile, x) => {
              const isTarget = destination?.x === x && destination?.y === y;
              const tileClass =
                tile === 'F'
                  ? 'clinical-tile clinical-tile-path'
                  : tile === 'S'
                    ? 'clinical-tile clinical-tile-stone'
                    : 'clinical-tile clinical-tile-grass';

              return (
                <div key={`${x}-${y}`} className={tileClass}>
                  {isTarget ? <span className="clinical-tile-target" /> : null}
                </div>
              );
            })
          )}
        </div>

        <div
          className={`clinical-avatar ${
            stepTick % 2 === 0
              ? 'clinical-avatar-bob-a'
              : 'clinical-avatar-bob-b'
          }`}
          style={{
            transform: `translate(${position.x * TILE_SIZE + 4}px, ${position.y * TILE_SIZE - 10}px)`
          }}
        >
          <span className="clinical-avatar-shadow" />
          <span className="clinical-avatar-sprite">{spritePixels}</span>
        </div>
      </div>

      <div className="clinical-field-footer">
        <span>우클릭: 원하는 타일로 자동 이동</span>
        <span>방향키: 한 칸씩 직접 이동</span>
      </div>
    </div>
  );
}
