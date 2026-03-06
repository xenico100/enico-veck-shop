"use client";

import { Menu } from "lucide-react";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 md:px-8 md:pt-6">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between rounded-[1.15rem] border border-cyan-300/18 bg-[#060913d8] px-4 py-3 shadow-[0_18px_44px_rgba(0,0,0,0.42)] backdrop-blur-xl md:px-6 md:py-4">
        <a href="#home" className="group flex items-center gap-3 no-underline">
          <span className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-cyan-300/22 bg-[#101b33] text-[10px] font-medium tracking-[0.22em] text-cyan-100">
            NX
          </span>
          <div>
            <p className="section-kicker !text-[0.58rem] !tracking-[0.22em]">Underground Feed</p>
            <p className="display-font text-sm tracking-[0.14em] text-cyan-50 md:text-base">
              NEXUS ARCHIVE
            </p>
          </div>
        </a>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="tech-chip hidden md:inline-flex">Encrypted Relay</span>
          <button
            onClick={onMenuClick}
            className="y2k-button y2k-button-ghost group px-4 !text-[0.72rem] !tracking-[0.16em]"
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
