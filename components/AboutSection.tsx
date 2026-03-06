'use client';

const studioImage = '/images/studio/astudiomain.png';

const featureRows = [
  {
    title: 'Black-Channel Spatial Control',
    description:
      '폐쇄형 시청 채널을 행 단위로 분리해 노출 범위를 정밀하게 컨트롤합니다.'
  },
  {
    title: 'Encrypted Membership Routing',
    description:
      '결제 등급별로 다른 플랫폼 경험(가로/숏폼/블로그)을 즉시 라우팅합니다.'
  },
  {
    title: 'Leak-Safe Content Nodes',
    description:
      '공개/멤버십 전용 데이터를 분리해 체험판과 유료 컨텐츠를 동시에 운용합니다.'
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
            <div className="relative overflow-hidden rounded-[1rem] border border-cyan-300/18 bg-[#060913]">
              <img
                src={studioImage}
                alt="ZEUS Studio Control Room"
                className="h-[300px] w-full object-cover opacity-84 grayscale md:h-[520px]"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#030503] via-[#030503ac] to-transparent p-4 md:p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/70">Relay Room View</p>
                <p className="mt-1 text-sm text-cyan-50/88 md:text-base">
                  Multi-node command room with shadow-dispatch monitoring.
                </p>
              </div>
            </div>
          </div>

          <div className="tech-panel animate-rise space-y-5 p-5 [animation-delay:0.14s] md:p-7">
            <p className="text-sm leading-relaxed text-cyan-50/82 md:text-base">
              이 플랫폼은 일반 공개 트래픽과 유료 멤버십 스트림을 동일 화면에서
              제어하기 위해 설계된 다크웹 톤 인터페이스입니다. 단순 전시가 아니라
              실제 접근 권한 흐름이 시각적으로 바로 드러나게 구성했습니다.
            </p>

            <div className="space-y-3">
              {featureRows.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[0.95rem] border border-cyan-300/18 bg-[#0a1327cc] p-4"
                >
                  <h3 className="display-font text-[1.02rem] font-medium tracking-[0.03em] text-cyan-50 md:text-[1.08rem]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-cyan-50/72">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>

            <p className="rounded-[0.95rem] border border-orange-300/28 bg-orange-300/10 px-4 py-3 text-sm text-orange-100/88">
              \"Visibility is controlled. Access is earned.\"
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
