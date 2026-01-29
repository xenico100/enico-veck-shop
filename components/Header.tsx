'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MenuOverlay from './MenuOverlay';

type NavItem = { label: string; href: string };

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { label: 'Home', href: '/#home' },
    { label: 'About', href: '/#about' },
    { label: 'Services', href: '/#services' },
    { label: 'Studio', href: '/#portfolio' },
    { label: 'Posts', href: '/#posts' },
    { label: 'Contact', href: '/#contact' },
    { label: 'My Page', href: '/account' },
  ];

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  // route change 시 자동 닫힘
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // 메뉴 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" alt="ZEUS STUDIO" className="h-8 w-auto" />
          <span className="text-sm uppercase tracking-[0.4em] text-white/70">
            Zeus Studio
          </span>
        </Link>

        {/* 헤더에는 메뉴 버튼만 남김 */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="menu-overlay"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/60"
          >
            {isOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      <MenuOverlay isOpen={isOpen} navItems={navItems} onClose={closeMenu} />
    </header>
  );
}
