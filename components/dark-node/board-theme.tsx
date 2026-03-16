'use client';

export const BOARD = {
  ink: '#181311',
  inkSoft: '#524746',
  paper: '#fafaf5',
  paperSoft: '#ffffff',
  paperDeep: '#ecebe6',
  wood: '#5d7460',
  woodSoft: '#7f8b97',
  rust: '#b52930',
  rustSoft: '#8d3539',
  gold: '#b69143',
  goldSoft: '#d0a55a',
  line: '#d7d3cc',
  lineSoft: '#efede8',
  shadow: '#6b605a'
} as const;

export type BoardTone = 'ink' | 'wood' | 'rust' | 'gold' | 'neutral';
export type BoardMarkVariant =
  | 'stone'
  | 'hall'
  | 'ledger'
  | 'seal'
  | 'grid'
  | 'branch'
  | 'loom'
  | 'cart';

export function toneColor(tone: BoardTone) {
  switch (tone) {
    case 'wood':
      return BOARD.wood;
    case 'rust':
      return BOARD.rust;
    case 'gold':
      return BOARD.gold;
    case 'neutral':
      return BOARD.woodSoft;
    case 'ink':
    default:
      return BOARD.ink;
  }
}

type BoardMarkProps = {
  variant: BoardMarkVariant;
  tone: BoardTone;
  size?: number;
  color?: string;
};

export function BoardMark({
  variant,
  tone,
  size = 30,
  color
}: BoardMarkProps) {
  const stroke = color ?? toneColor(tone);
  const common = {
    stroke,
    strokeWidth: 2.4,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    fill: 'none'
  };

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {variant === 'stone' ? (
        <>
          <rect x="10" y="10" width="20" height="20" rx="1.5" {...common} />
          <path d="M14 14L26 26" {...common} />
          <path d="M26 14L14 26" {...common} />
        </>
      ) : null}

      {variant === 'hall' ? (
        <>
          <rect x="10" y="9" width="20" height="22" rx="1.5" {...common} />
          <path d="M16 31V21H24V31" {...common} />
        </>
      ) : null}

      {variant === 'ledger' ? (
        <>
          <rect x="10" y="8" width="20" height="24" rx="1.5" {...common} />
          <path d="M15 8V32" {...common} />
          <path d="M19 15H26" {...common} />
          <path d="M19 20H26" {...common} />
          <path d="M19 25H24" {...common} />
        </>
      ) : null}

      {variant === 'seal' ? (
        <>
          <path d="M20 8L31 20L20 32L9 20Z" {...common} />
          <rect x="17" y="17" width="6" height="6" fill={stroke} />
        </>
      ) : null}

      {variant === 'grid' ? (
        <>
          <rect x="9" y="9" width="22" height="22" rx="1" {...common} />
          <path d="M20 9V31" {...common} />
          <path d="M9 20H31" {...common} />
        </>
      ) : null}

      {variant === 'branch' ? (
        <>
          <path d="M11 20H29" {...common} />
          <path d="M16 12L11 20L16 28" {...common} />
          <path d="M24 12L29 20L24 28" {...common} />
        </>
      ) : null}

      {variant === 'loom' ? (
        <>
          <rect x="10" y="10" width="20" height="20" rx="1.5" {...common} />
          <path d="M13 24L18 14L23 24L28 14" {...common} />
          <path d="M13 28H28" {...common} />
        </>
      ) : null}

      {variant === 'cart' ? (
        <>
          <path d="M12 15H28L25.5 24H15L12 15Z" {...common} />
          <rect x="14.5" y="26" width="4" height="4" {...common} />
          <rect x="21.5" y="26" width="4" height="4" {...common} />
        </>
      ) : null}
    </svg>
  );
}
