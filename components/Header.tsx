'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MenuOverlay from './MenuOverlay';

// 수정 파일: components/Header.tsx - 메뉴 오버레이 상태/토글 및 라우팅 변경 시 자동 닫힘 처리
export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/images/logo.png" alt="ZEUS STUDIO" className="h-8 w-auto" />
          <span className="text-sm uppercase tracking-[0.4em] text-white/70">
            Zeus Studio
          </span>
        </Link>
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
      <MenuOverlay isOpen={isOpen} onClose={closeMenu} />
    </header>
  );
}
