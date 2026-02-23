"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 md:px-8 py-6 flex justify-between items-start max-w-full">
      <div className={`flex flex-col text-white ${appleFontClass}`}>
        <span className="mb-1 text-xs tracking-[0.3em] text-white/80">STUDIO</span>
        <span className="text-2xl tracking-[0.2em]">ZEUS</span>
      </div>

      <button
        onClick={onMenuClick}
        className={`group flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-neutral-200 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/[0.12] hover:text-white ${appleFontClass}`}
        aria-label="메뉴 열기"
      >
        <span className="text-xs font-medium tracking-[0.3em]">MENU</span>
        <Menu className="h-5 w-5 transition-transform duration-200 ease-in-out group-hover:scale-105" />
      </button>
    </header>
  );
}
