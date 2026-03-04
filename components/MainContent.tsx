'use client';

const statItems = [
  { label: 'Projects Shipped', value: '1,200+' },
  { label: 'Realtime Monitoring', value: '24/7' },
  { label: 'Studio Rooms', value: '4 Pods' }
];

export default function MainContent() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-screen items-center px-4 pb-16 pt-32 md:px-8 md:pb-20 md:pt-40"
    >
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <video
          className="h-full w-full object-cover opacity-35 saturate-[0.7] contrast-125"
          src="/images/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(4,11,18,0.9)_8%,rgba(4,15,24,0.64)_48%,rgba(6,11,17,0.88)_100%)]" />
      </div>

      <div className="section-shell">
        <div className="grid items-end gap-8 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="animate-rise">
            <p className="section-kicker">Immersive Audio Pipeline</p>
            <h1 className="text-glow mt-5 text-[clamp(2.8rem,9vw,7.4rem)] leading-[0.9]">
              ZEUS
              <br />
              STUDIO
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-cyan-50/78 md:text-base">
              하이테크 음향 워크플로우와 하이퍼리얼 사운드 디자인을 결합해,
              브랜드와 콘텐츠의 몰입도를 실시간으로 끌어올립니다.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <a
                href="#services"
                className="inline-flex items-center rounded-full border border-cyan-100/40 bg-cyan-200/15 px-5 py-2.5 text-xs font-semibold tracking-[0.18em] text-cyan-50 no-underline transition hover:bg-cyan-200/25"
              >
                VIEW SERVICES
              </a>
              <a
                href="#studio"
                className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-xs font-semibold tracking-[0.18em] text-white/90 no-underline transition hover:bg-white/20"
              >
                OPEN STUDIO FEED
              </a>
            </div>

            <div className="mt-8 grid gap-2 sm:grid-cols-3 sm:gap-3">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-cyan-200/20 bg-[#041726b8] px-4 py-3 shadow-[inset_0_1px_0_rgba(233,251,255,0.22)]"
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/60">
                    {item.label}
                  </p>
                  <p className="mt-2 display-font text-lg text-white md:text-xl">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="tech-panel scanline animate-rise relative overflow-hidden p-5 [animation-delay:0.15s] md:p-7">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-200/15 blur-2xl" />
            <p className="section-kicker">Signal</p>
            <h2 className="mt-2 text-2xl md:text-3xl">Live Facility Data</h2>

            <div className="mt-6 space-y-4 text-sm text-cyan-50/80">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/60">Address</p>
                <p className="mt-1 leading-relaxed">
                  서울 강남구 양재천로 551 4F
                  <br />
                  4F, 551, Yangjaecheon-ro, Gangnam-gu, Seoul
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/60">Contact</p>
                <p className="mt-1">070@zeus-studio.net</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-amber-100/30 bg-amber-100/10 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-amber-50/85">
              Hyperreal Sound Calibration Online
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
