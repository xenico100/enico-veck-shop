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
  { label: 'My Page', href: '/account' },
];

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-start justify-between px-4 py-6 max-w-full md:px-8">
      <div className="flex items-center">
        <img
          src="/images/logo.png"
          alt=""
          className="h-20 w-auto md:h-24 lg:h-28"
          draggable={false}
        />
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
        className="flex items-center gap-3 text-white transition-opacity hover:opacity-80 md:hidden"
        aria-label="메뉴 열기"
        type="button"
      >
        <span className="text-sm tracking-[0.3em]">MENU</span>
        <Menu className="h-6 w-6" />
      </button>
    </header>
  );
}
