'use client';

const studioImage = '/images/studio/astudiomain.png';

const featureRows = [
  {
    title: 'Hyperreal Spatial Control',
    description:
      '정밀한 음장 설계와 레이어링으로 실제보다 더 선명한 공간감을 구현합니다.'
  },
  {
    title: 'AI-Assisted Mix Pipeline',
    description:
      '신호 분석 기반의 빠른 프리셋 제안과 엔지니어 수작업 튜닝을 결합합니다.'
  },
  {
    title: 'Cross-Media Mastering',
    description:
      '광고, 게임, OTT, 숏폼까지 매체별 출력 규격에 맞춰 다중 마스터를 제공합니다.'
  }
];

export default function AboutSection() {
  return (
    <section id="about" className="relative px-4 py-16 md:px-8 md:py-24">
      <div className="section-shell">
        <div className="mb-8 animate-rise">
          <p className="section-kicker">About</p>
          <h2 className="section-title">High-Tech Acoustic Engine</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.95fr]">
          <div className="tech-panel scanline animate-rise overflow-hidden p-2 [animation-delay:0.08s]">
            <div className="relative overflow-hidden rounded-[1.1rem] border border-cyan-100/25 bg-[#030a10]">
              <img
                src={studioImage}
                alt="ZEUS Studio Control Room"
                className="h-[300px] w-full object-cover opacity-92 md:h-[520px]"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#030a10] via-[#030a10a8] to-transparent p-4 md:p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-50/70">Control Room View</p>
                <p className="mt-1 text-sm text-cyan-50/90 md:text-base">
                  Room-accurate monitoring environment with precision low-end management.
                </p>
              </div>
            </div>
          </div>

          <div className="tech-panel animate-rise space-y-5 p-5 [animation-delay:0.14s] md:p-7">
            <p className="text-sm leading-relaxed text-cyan-50/82 md:text-base">
              제우스 스튜디오는 엔지니어의 감각과 디지털 음향 기술을 결합해
              빠르고 정확한 제작 시스템을 운영합니다. 단순 녹음을 넘어,
              콘텐츠 세계관에 맞는 사운드 리얼리티를 설계합니다.
            </p>

            <div className="space-y-3">
              {featureRows.map((item) => (
                <article
                  key={item.title}
                  className="rounded-xl border border-cyan-200/20 bg-[#071a28cc] p-4"
                >
                  <h3 className="text-sm text-white md:text-base">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-cyan-50/72">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            <p className="rounded-xl border border-amber-100/25 bg-amber-100/10 px-4 py-3 text-sm text-amber-50/85">
              "ZEUS STUDIO will be your production partner for scalable audio business."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
