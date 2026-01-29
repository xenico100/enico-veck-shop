'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 md:px-8 py-6 flex justify-between items-start max-w-full">
      <div className="flex flex-col text-white">
        <span className="text-xs tracking-[0.3em] mb-1">STUDIO</span>
        <span className="text-2xl tracking-[0.2em]">ZEUS</span>
      </div>
      
      <button 
        onClick={onMenuClick}
        className="flex items-center gap-3 text-white hover:opacity-80 transition-opacity"
        aria-label="메뉴 열기"
      >
        <span className="text-sm tracking-[0.3em]">MENU</span>
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
}