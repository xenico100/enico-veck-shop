import type { Metadata } from "next";
import { Do_Hyeon, Noto_Sans_KR, Share_Tech_Mono } from "next/font/google";

import "./styles/tailwind.css";
import "./styles/theme.css";
import Providers from "./providers";

const sansFont = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "700"],
});

const displayFont = Do_Hyeon({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
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
  title: "ZEUS STUDIO",
  description: "Professional Sound Studio",
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
