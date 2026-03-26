'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="pointer-events-none fixed right-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4 md:px-8 md:pt-6">
      <button
        onClick={onMenuClick}
        className="pointer-events-auto inline-flex items-center gap-2 border border-[rgba(96,24,24,0.9)] bg-[rgba(24,3,3,0.96)] px-3 py-2 font-[var(--font-brush)] text-[0.7rem] font-bold tracking-[0.16em] text-[rgba(255,241,236,0.96)] shadow-[0_10px_24px_rgba(0,0,0,0.34)] transition-transform duration-200 hover:-translate-y-[1px] sm:px-4"
        aria-label="메뉴 열기"
      >
        <span>ACCESS</span>
        <Menu className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-[1px]" />
      </button>
    </header>
  );
}
