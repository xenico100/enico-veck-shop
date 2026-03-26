'use client';

import { Menu } from 'lucide-react';
import { BRAND_NAME } from '@/utils/branding';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4 md:px-8 md:pt-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 rounded-full border border-white/10 bg-[rgba(7,11,21,0.62)] px-4 py-3 shadow-[0_24px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-6 md:py-4">
        <a
          href="#home"
          className="group flex min-w-0 items-center no-underline"
        >
          <div className="min-w-0">
            <p className="display-font text-[0.82rem] tracking-[0.16em] text-white sm:text-sm md:text-base">
              {BRAND_NAME}
            </p>
          </div>
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="tech-chip hidden md:inline-flex !text-[rgba(226,244,255,0.68)]">
            Board Index
          </span>
          <button
            onClick={onMenuClick}
            className="y2k-button y2k-button-ghost y2k-button-fade-micro group px-3 sm:px-4 !text-[0.7rem] !tracking-[0.16em]"
            aria-label="메뉴 열기"
          >
            <span>ACCESS</span>
            <Menu className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-[1px]" />
          </button>
        </div>
      </div>
    </header>
  );
}
