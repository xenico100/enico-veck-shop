'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import cn from 'classnames';
import AuthButton from './AuthButton';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = useMemo(
    () => [
      { label: 'Home', href: '/#home' },
      { label: 'About', href: '/#about' },
      { label: 'Services', href: '/#services' },
      { label: 'Studio', href: '/#portfolio' },
      { label: 'Posts', href: '/#posts' },
      { label: 'Contact', href: '/#contact' }
    ],
    []
  );

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

        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden md:block">
            <AuthButton />
          </div>
          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-label="메뉴 열기"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/80 transition hover:border-white/60 hover:text-white md:hidden"
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
          'border-t border-white/10 bg-black/95 px-4 py-6 text-white md:hidden',
          isOpen ? 'block' : 'hidden'
        )}
      >
        <div className="flex flex-col gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className="text-sm uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-4">
            <AuthButton onMyPageClick={closeMenu} />
          </div>
        </div>
      </div>
    </header>
  );
}
