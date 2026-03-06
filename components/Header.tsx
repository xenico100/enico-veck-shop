"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4 md:px-8 md:pt-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 border-b border-cyan-300/12 px-1 py-3 md:px-0 md:py-4">
        <a href="#home" className="group flex min-w-0 items-center gap-2.5 no-underline">
          <span className="display-font text-[0.78rem] tracking-[0.28em] text-cyan-100/72">
            NX
          </span>
          <div className="min-w-0">
            <p className="section-kicker !text-[0.58rem] !tracking-[0.22em]">Underground Feed</p>
            <p className="display-font text-[0.82rem] tracking-[0.12em] text-cyan-50 sm:text-sm md:text-base">
              NEXUS ARCHIVE
            </p>
          </div>
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="tech-chip hidden md:inline-flex">Encrypted Relay</span>
          <button
            onClick={onMenuClick}
            className="y2k-button y2k-button-ghost group px-3 sm:px-4 !text-[0.7rem] !tracking-[0.16em]"
            aria-label="메뉴 열기"
          >
            <span>ACCESS</span>
            <Menu className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
          </button>
        </div>
      </div>
    </header>
  );
}
