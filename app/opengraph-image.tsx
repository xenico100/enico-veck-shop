import { ImageResponse } from 'next/og';

export const alt = '몽상인 (Mongsangin) — 픽셀 커뮤니티 게임';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: 64,
          border: '8px solid #1d2b45',
          background: '#0b0f1b',
          color: '#eef4ff'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            color: '#7ad0ff',
            fontSize: 20,
            letterSpacing: 4
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36">
            <path
              d="M12 0h12v12h12v12H24v12H12V24H0V12h12Z"
              fill="#7ad0ff"
            />
          </svg>
          PIXEL COMMUNITY GAME
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.1
            }}
          >
            MONGSANGIN
          </div>
          <div style={{ fontSize: 34, color: '#b8c5df', marginTop: 12 }}>
            Meet in an online town.
          </div>
          <div style={{ fontSize: 34, color: '#b8c5df' }}>
            Discover stories, people and real clothing.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 24,
            borderTop: '1px solid #35435e'
          }}
        >
          <span style={{ fontSize: 28 }}>mongsangin.life</span>
          <span
            style={{
              fontSize: 18,
              color: '#ffbf7b',
              letterSpacing: 2
            }}
          >
            MONGSANGIN × ENICO VECK
          </span>
        </div>
      </div>
    ),
    size
  );
}
