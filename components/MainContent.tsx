'use client';

const statItems = [
  { label: 'Signal Drops', value: '1,200+' },
  { label: 'Network Uptime', value: '24/7' },
  { label: 'Secure Nodes', value: '4 Pods' }
];

export default function MainContent() {
  return (
    <section
      id="home"
      className="relative isolate flex min-h-screen items-center px-4 pb-16 pt-32 md:px-8 md:pb-20 md:pt-40"
    >
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <video
          className="h-full w-full object-cover opacity-28 saturate-[0.45] contrast-125"
          src="/images/hero-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(3,5,10,0.96)_8%,rgba(7,12,22,0.78)_44%,rgba(4,5,9,0.94)_100%)]" />
      </div>

      <div className="section-shell">
        <div className="grid items-end gap-8 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="animate-rise">
            <p className="section-kicker">Restricted Broadcast Channel</p>
            <h1 className="display-font text-glow mt-5 text-[clamp(2.8rem,9vw,7.4rem)] font-medium leading-[0.88] tracking-[0.03em]">
              NEXUS
              <br />
              ARCHIVE
            </h1>
            <p className="mt-6 max-w-2xl text-sm leading-relaxed text-cyan-100/74 md:text-base">
              폐쇄형 네트워크 인터페이스로 콘텐츠를 분산 배치하고,
              티어별 시청 권한을 실시간으로 재조립하는 다크웹 스타일 허브입니다.
            </p>

            <div className="mt-7 flex flex-wrap gap-2.5">
              <a
                href="#services"
                className="y2k-button y2k-button-primary no-underline"
              >
                OPEN NODE MAP
              </a>
              <a
                href="#studio"
                className="y2k-button y2k-button-accent no-underline"
              >
                WATCH FEED
              </a>
            </div>

            <div className="mt-8 grid gap-2 sm:grid-cols-3 sm:gap-3">
              {statItems.map((item) => (
                <div
                  key={item.label}
                  className="border-l border-cyan-300/14 pl-4 py-1"
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/65">
                    {item.label}
                  </p>
                  <p className="mt-2 display-font text-lg font-medium tracking-[0.05em] text-cyan-50 md:text-xl">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="tech-panel scanline animate-rise relative overflow-hidden pt-4 [animation-delay:0.15s] lg:border-l lg:border-cyan-300/14 lg:pl-8 lg:pt-0">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-300/15 blur-2xl" />
            <p className="section-kicker">Signal</p>
            <h2 className="display-font mt-2 text-2xl font-medium tracking-[0.03em] md:text-3xl">
              Live Node Intel
            </h2>

            <div className="mt-6 space-y-4 text-sm text-cyan-50/80">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/65">Node</p>
                <p className="mt-1 leading-relaxed">
                  서울 강남구 양재천로 551 4F
                  <br />
                  4F, 551, Yangjaecheon-ro, Gangnam-gu, Seoul
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/65">Ping</p>
                <p className="mt-1">070@zeus-studio.net</p>
              </div>
            </div>

            <div className="mt-6 text-[11px] uppercase tracking-[0.18em] text-orange-100/72">
              Access Protocol: Shadow Relay Enabled
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
