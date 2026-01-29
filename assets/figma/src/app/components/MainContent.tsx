'use client';

export function MainContent() {
  return (
    <section
      id="home"
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pb-16 pt-28 text-white max-w-full md:px-8 lg:px-16"
    >
      {/* Main Title */}
      <div className="text-center">
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-9xl tracking-[0.3em] leading-[1.1] mb-10">
          ZEUS
        </h1>

        <div className="mx-auto max-w-lg space-y-2 text-xs sm:text-sm md:text-base tracking-[0.15em] leading-relaxed">
          <p>RECORDING STUDIO / LOCALIZATION /</p>
          <p>SOUND PRODUCTION & MIXING / DUBBING</p>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="mt-auto w-full text-center pt-12">
        <div className="text-[10px] leading-relaxed tracking-wide opacity-80 space-y-1">
          <p>서울 강남구 양재천로 551 4F</p>
          <p>4F, 551-17, Yangcheon-ro, Gangse-gu, Seoul, Republic of Korea</p>
          <p>Contact Email: 070@zeus-studio.net</p>
          <p className="text-[9px]">Copyrights©ZEUS STUDIO All rights reserved</p>
        </div>
      </div>
    </section>
  );
}
