'use client';

export default function Footer() {
  return (
    <footer className="relative border-t border-lime-300/25 px-4 pb-10 pt-12 md:px-8 md:pt-16">
      <div className="section-shell">
        <div className="tech-panel grid gap-8 p-6 md:grid-cols-[1.1fr_0.8fr_0.8fr] md:p-8">
          <div>
            <p className="section-kicker">NEXUS ARCHIVE</p>
            <h3 className="mt-3 text-2xl">Dark Relay Platform</h3>
            <p className="mt-3 text-sm leading-relaxed text-lime-50/76">
              Tiered media distribution for long-form, shorts, and blog content
              under a single encrypted-style interface.
            </p>
          </div>

          <div>
            <p className="section-kicker !tracking-[0.24em]">Contact</p>
            <div className="mt-3 space-y-1.5 text-sm text-lime-50/75">
              <p>070@zeus-studio.net</p>
              <p>+82 2-1234-5678</p>
              <p>서울 강남구 양재천로 551 4F</p>
            </div>
          </div>

          <div>
            <p className="section-kicker !tracking-[0.24em]">Network</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <a
                href="#"
                className="inline-flex rounded-full border border-lime-300/28 bg-lime-300/10 px-3 py-1.5 text-lime-100/85 no-underline transition hover:bg-lime-300/20"
              >
                Instagram
              </a>
              <a
                href="#"
                className="inline-flex rounded-full border border-lime-300/28 bg-lime-300/10 px-3 py-1.5 text-lime-100/85 no-underline transition hover:bg-lime-300/20"
              >
                YouTube
              </a>
              <a
                href="#"
                className="inline-flex rounded-full border border-lime-300/28 bg-lime-300/10 px-3 py-1.5 text-lime-100/85 no-underline transition hover:bg-lime-300/20"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs tracking-[0.14em] text-lime-50/45">
          © 2026 NEXUS ARCHIVE. Clearance required.
        </p>
      </div>
    </footer>
  );
}
