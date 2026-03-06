'use client';

export default function Footer() {
  return (
    <footer className="relative border-t border-cyan-300/25 px-4 pb-10 pt-10 md:px-8 md:pt-16">
      <div className="section-shell">
        <div className="tech-panel grid gap-8 p-4 sm:p-6 md:grid-cols-[1.1fr_0.8fr_0.8fr] md:p-8">
          <div>
            <p className="section-kicker">NEXUS ARCHIVE</p>
            <h3 className="display-font mt-3 text-[1.55rem] font-medium tracking-[0.03em] sm:text-[1.9rem]">
              Dark Relay Platform
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-cyan-50/76">
              Tiered media distribution for long-form, shorts, and blog content
              under a single encrypted-style interface.
            </p>
          </div>

          <div>
            <p className="section-kicker !tracking-[0.24em]">Contact</p>
            <div className="mt-3 space-y-1.5 text-sm text-cyan-50/75">
              <p>070@zeus-studio.net</p>
              <p>+82 2-1234-5678</p>
              <p>서울 강남구 양재천로 551 4F</p>
            </div>
          </div>

          <div>
            <p className="section-kicker !tracking-[0.24em]">Network</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a href="#" className="y2k-button y2k-button-ghost min-h-9 px-3 !text-[0.68rem] no-underline">
                Instagram
              </a>
              <a href="#" className="y2k-button y2k-button-ghost min-h-9 px-3 !text-[0.68rem] no-underline">
                YouTube
              </a>
              <a href="#" className="y2k-button y2k-button-ghost min-h-9 px-3 !text-[0.68rem] no-underline">
                Facebook
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] tracking-[0.12em] text-cyan-50/45 sm:text-xs">
          © 2026 NEXUS ARCHIVE. Clearance required.
        </p>
      </div>
    </footer>
  );
}
