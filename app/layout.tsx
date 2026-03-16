import type { Metadata, Viewport } from "next";
import {
  Barlow_Condensed,
  IBM_Plex_Sans_KR,
  Share_Tech_Mono,
} from "next/font/google";

import "./styles/tailwind.css";
import "./styles/theme.css";
import Providers from "./providers";
import { BRAND_NAME } from "@/utils/branding";

const sansFont = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

const monoFont = Share_Tech_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: BRAND_NAME,
  description: `${BRAND_NAME}은 코딩, 미디어, 패션에 대해 알려주는 커뮤니티 사이트입니다.`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`dark ${sansFont.variable} ${displayFont.variable} ${monoFont.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
