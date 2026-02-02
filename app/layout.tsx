import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./styles/tailwind.css";
import "./styles/theme.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
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
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  );
}
