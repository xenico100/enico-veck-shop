'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthButton from './AuthButton'; // 👈 아까 만든 로그인 버튼 가져오기

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  return (
    <header className="fixed left-0 top-0 z-50 w-full">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="block w-[160px] md:w-[220px]">
          <img
            src="/images/logo.png"
            alt="Homepage"
            className="h-auto w-full"
          />
        </Link>

        <button
          type="button"
          onClick={toggleMenu}
          aria-expanded={isOpen}
          aria-controls="studio-menu"
          className="relative flex items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-white/60 transition hover:text-white"
        >
          <span className="hidden sm:inline">Menu</span>
          <span className="relative h-4 w-6">
            <span
              className={`absolute left-0 top-0 h-[2px] w-full bg-white transition ${
                isOpen ? 'translate-y-[6px] rotate-45' : ''
              }`}
            />
            <span
              className={`absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-white transition ${
                isOpen ? 'opacity-0' : ''
              }`}
            />
            <span
              className={`absolute left-0 bottom-0 h-[2px] w-full bg-white transition ${
                isOpen ? '-translate-y-[6px] -rotate-45' : ''
              }`}
            />
          </span>
        </button>
      </div>

      <div
        className={`fixed inset-0 z-40 bg-black/60 transition ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeMenu}
        aria-hidden={!isOpen}
      />

      <nav
        id="studio-menu"
        className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col gap-6 overflow-y-auto border-l border-white/10 bg-brand-charcoal px-6 py-8 text-sm text-white/70 shadow-2xl transition ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">ZEUS STUDIO</h3>
          <button
            type="button"
            onClick={closeMenu}
            aria-label="메뉴 닫기"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-xs text-white/70 transition hover:border-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col gap-3 border-y border-white/10 py-6 text-xs uppercase tracking-[0.3em]">
          <li>
            <a href="#home" onClick={closeMenu} className="hover:text-white">
              Home
            </a>
          </li>
          <li>
            <a href="#about" onClick={closeMenu} className="hover:text-white">
              About
            </a>
          </li>
          <li>
            <a href="#services" onClick={closeMenu} className="hover:text-white">
              Services
            </a>
          </li>
          <li>
            <a href="#portfolio" onClick={closeMenu} className="hover:text-white">
              Studio
            </a>
          </li>
          <li>
            <a href="#posts" onClick={closeMenu} className="hover:text-white">
              Posts
            </a>
          </li>
          <li>
            <a href="#contact" onClick={closeMenu} className="hover:text-white">
              Contact
            </a>
          </li>
        </ul>

        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">
            Member Access
          </p>
          <AuthButton />
        </div>

        <ul className="mt-auto flex items-center gap-3 text-lg text-white/40">
          <li>
            <a href="#" className="transition hover:text-white">
              <i className="fa fa-facebook-square"></i>
            </a>
          </li>
          <li>
            <a href="#" className="transition hover:text-white">
              <i className="fa fa-twitter"></i>
            </a>
          </li>
          <li>
            <a href="#" className="transition hover:text-white">
              <i className="fa fa-instagram"></i>
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
