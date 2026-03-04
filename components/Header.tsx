"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 md:px-8 md:pt-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-2xl border border-cyan-200/25 bg-[#05111fd9] px-4 py-3 shadow-[0_12px_42px_rgba(1,11,20,0.48)] backdrop-blur-xl md:px-6 md:py-4">
        <a href="#home" className="group flex items-center gap-3 no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/30 bg-cyan-200/10 text-[10px] font-semibold tracking-[0.28em] text-cyan-100">
            ZS
          </span>
          <div>
            <p className="section-kicker !text-[0.58rem] !tracking-[0.3em]">Audio Intelligence</p>
            <p className="display-font text-sm text-white md:text-lg">ZEUS STUDIO</p>
          </div>
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="tech-chip hidden md:inline-flex">Realtime Session</span>
          <button
            onClick={onMenuClick}
            className="group inline-flex items-center gap-2.5 rounded-full border border-cyan-100/30 bg-cyan-200/10 px-4 py-2 text-xs font-semibold tracking-[0.22em] text-cyan-50 transition duration-200 hover:border-cyan-100/50 hover:bg-cyan-200/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/40"
            aria-label="메뉴 열기"
          >
            <span>MENU</span>
            <Menu className="h-4 w-4 transition-transform duration-200 group-hover:rotate-12" />
          </button>
        </div>
      </div>
    </header>
  );
}
