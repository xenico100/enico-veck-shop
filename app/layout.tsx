import type { Metadata } from "next";

import "./styles/tailwind.css";
import "./styles/theme.css";
import Providers from "./providers";

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
    <html lang="ko" className="dark">
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
