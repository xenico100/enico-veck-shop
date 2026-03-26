'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4 md:px-8 md:pt-6">
      <div className="bio-header-shell mx-auto flex w-full max-w-7xl items-center justify-end px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center">
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
