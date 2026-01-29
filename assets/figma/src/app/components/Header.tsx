'use client';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Studio', href: '#studio' },
  { label: 'My Page', href: '/account' }
];

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 md:px-8 py-6 flex justify-between items-start max-w-full">
      <div className="flex flex-col text-white">
        <span className="text-xs tracking-[0.3em] mb-1">STUDIO</span>
        <span className="text-2xl tracking-[0.2em]">ZEUS</span>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="text-xs tracking-[0.3em] text-white/70 transition hover:text-white"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <button
        onClick={onMenuClick}
        className="flex items-center gap-3 text-white hover:opacity-80 transition-opacity md:hidden"
        aria-label="메뉴 열기"
      >
        <span className="text-sm tracking-[0.3em]">MENU</span>
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
}
