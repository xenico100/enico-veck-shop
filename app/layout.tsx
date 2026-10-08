import type { Metadata, Viewport } from 'next';
import {
  IBM_Plex_Mono,
  Libre_Bodoni,
  Noto_Sans_KR,
  Noto_Serif_KR,
  Song_Myung
} from 'next/font/google';

import './styles/tailwind.css';
import './styles/theme.css';
import Providers from './providers';
import { BRAND_NAME, SITE_URL } from '@/utils/branding';

const sansFont = Noto_Sans_KR({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '700']
});

const displayFont = Libre_Bodoni({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['600', '700']
});

const displayKrFont = Noto_Serif_KR({
  subsets: ['latin'],
  variable: '--font-display-kr',
  weight: ['500', '600', '700']
});

const monoFont = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500']
});

const brushFont = Song_Myung({
  subsets: ['latin'],
  variable: '--font-brush',
  weight: ['400']
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND_NAME} 몽상인 — 픽셀 커뮤니티 게임`,
    template: `%s | 몽상인`
  },
  description:
    '마을을 걷고, 이야기를 나누고, 직접 만든 옷을 만나는 픽셀 커뮤니티 게임. 몽상 잡화점에서 ENICO VECK의 실제 의류를 만나보세요.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'Mongsangin · 몽상인',
    title: '몽상인 — 픽셀 커뮤니티 게임',
    description:
      '광장, 이야기, 퀘스트와 실제 의류 상점이 연결된 작은 온라인 마을.',
    url: SITE_URL
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${sansFont.variable} ${displayFont.variable} ${displayKrFont.variable} ${monoFont.variable} ${brushFont.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
