'use client';

import { useState } from 'react';
import Link from 'next/link';
import cn from 'classnames';
import AuthButton from './AuthButton';

const navItems = [
  { label: 'Home', href: '/#home' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Studio', href: '/#portfolio' },
  { label: 'Posts', href: '/#posts' },
  { label: 'Contact', href: '/#contact' }
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" alt="ZEUS STUDIO" className="h-8 w-auto" />
          <span className="text-sm uppercase tracking-[0.4em] text-white/70">
            Zeus Studio
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <AuthButton />
          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-label="메뉴 열기"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-white/60 hover:text-white"
          >
            <span className="flex h-4 w-4 flex-col justify-between">
              <span className="h-px w-full bg-current"></span>
              <span className="h-px w-full bg-current"></span>
              <span className="h-px w-full bg-current"></span>
            </span>
          </button>
        </div>
      </div>

      <div
        className={cn(
          'absolute right-4 top-full mt-3 w-[220px] rounded-2xl border border-white/15 bg-black/95 px-4 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <div className="flex flex-col gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="text-xs uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
