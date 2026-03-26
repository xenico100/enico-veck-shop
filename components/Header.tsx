'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end px-3 pt-3 sm:px-4 sm:pt-4 md:px-8 md:pt-6">
      <button
        onClick={onMenuClick}
        className="pointer-events-auto y2k-button y2k-button-ghost y2k-button-fade-micro group px-3 sm:px-4 !text-[0.7rem] !tracking-[0.16em]"
        aria-label="메뉴 열기"
      >
        <span>ACCESS</span>
        <Menu className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-[1px]" />
      </button>
    </header>
  );
}
