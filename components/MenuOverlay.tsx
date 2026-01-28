'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import cn from 'classnames';
import AuthButton from './AuthButton';

interface MenuOverlayProps {
  isOpen: boolean;
  navItems: Array<{ label: string; href: string }>;
  onClose: () => void;
}

export default function MenuOverlay({ isOpen, navItems, onClose }: MenuOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('overflow-hidden');

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen, onClose]);

  return (
    <div
      id="menu-overlay"
      className={cn(
        'fixed inset-0 z-[60] transition',
        isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/60"
        onClick={onClose}
        aria-label="Close menu"
      />

      <div className="relative ml-auto mt-24 mr-4 w-72 max-w-[calc(100%-2rem)] rounded-2xl border border-white/15 bg-black/95 px-6 py-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
        <nav className="flex flex-col gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="text-xs uppercase tracking-[0.3em] text-white/70 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-4">
          <AuthButton onMyPageClick={onClose} />
        </div>
      </div>
    </div>
  );
}
