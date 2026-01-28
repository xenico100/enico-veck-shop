'use client';

import { useState } from 'react';
import Link from 'next/link';
import cn from 'classnames';
import AuthButton from './AuthButton';

// 수정 파일: components/Header.tsx - 모바일 메뉴 토글/드롭다운 레이아웃 복원 목적
export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const navItems = [
    { label: 'Home', href: '/#home' },
    { label: 'About', href: '/#about' },
    { label: 'Services', href: '/#services' },
    { label: 'Studio', href: '/#portfolio' },
    { label: 'Posts', href: '/#posts' },
    { label: 'Contact', href: '/#contact' }
  ];

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" alt="ZEUS STUDIO" className="h-8 w-auto" />
          <span className="text-sm uppercase tracking-[0.4em] text-white/70">
            Zeus Studio
          </span>
        </Link>
        {/* 데스크탑 메뉴는 항상 노출, 모바일은 버튼으로 토글 */}
        <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.3em] text-white/70 lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
          >
            Menu
          </button>
        </div>
      </div>
      {/* 모바일 드롭다운: position/opacity/z-index 복원 */}
      <div
        id="mobile-menu"
        className={cn(
          'absolute right-4 top-full mt-3 w-[220px] rounded-2xl border border-white/15 bg-black/95 px-4 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition lg:hidden',
          isOpen
            ? 'opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-2'
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
        <div className="mt-6 border-t border-white/10 pt-4">
          <AuthButton onMyPageClick={closeMenu} />
        </div>
      </div>

    </header>
  );
}
