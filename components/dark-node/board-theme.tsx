'use client';

export const BOARD = {
  ink: '#1a1712',
  inkSoft: '#4b4034',
  paper: '#ebe1cf',
  paperSoft: '#f4ecdf',
  paperDeep: '#d9ccb6',
  wood: '#7b6149',
  woodSoft: '#a18970',
  rust: '#6c4136',
  rustSoft: '#8a5c4e',
  gold: '#9b8558',
  goldSoft: '#b9a47a',
  line: '#b3a38d',
  lineSoft: '#d2c6b3',
  shadow: '#231c14'
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
      return BOARD.inkSoft;
  }
}

type BoardMarkProps = {
  variant: BoardMarkVariant;
  tone: BoardTone;
  size?: number;
};

export function BoardMark({
  variant,
  tone,
  size = 30
}: BoardMarkProps) {
  const stroke = toneColor(tone);
  const common = {
    stroke,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none'
  };

  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      {variant === 'stone' ? (
        <>
          <circle cx="20" cy="20" r="11" {...common} />
          <circle cx="20" cy="20" r="2.8" fill={stroke} />
        </>
      ) : null}

      {variant === 'hall' ? (
        <>
          <rect x="10" y="9" width="20" height="22" rx="4" {...common} />
          <path d="M16 31V20.5C16 18.5 17.8 17 20 17C22.2 17 24 18.5 24 20.5V31" {...common} />
        </>
      ) : null}

      {variant === 'ledger' ? (
        <>
          <rect x="10" y="8" width="20" height="24" rx="3" {...common} />
          <path d="M15 8V32" {...common} />
          <path d="M19 15H26" {...common} />
          <path d="M19 20H26" {...common} />
          <path d="M19 25H24" {...common} />
        </>
      ) : null}

      {variant === 'seal' ? (
        <>
          <path d="M20 8L31 20L20 32L9 20Z" {...common} />
          <rect x="17" y="17" width="6" height="6" rx="1.2" fill={stroke} />
        </>
      ) : null}

      {variant === 'grid' ? (
        <>
          <rect x="9" y="9" width="22" height="22" rx="3" {...common} />
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
          <rect x="10" y="10" width="20" height="20" rx="4" {...common} />
          <path d="M13 24L18 14L23 24L28 14" {...common} />
          <path d="M13 28H28" {...common} />
        </>
      ) : null}

      {variant === 'cart' ? (
        <>
          <path d="M12 15H28L25.5 24H15L12 15Z" {...common} />
          <circle cx="17" cy="28" r="2.4" {...common} />
          <circle cx="24" cy="28" r="2.4" {...common} />
        </>
      ) : null}
    </svg>
  );
}
