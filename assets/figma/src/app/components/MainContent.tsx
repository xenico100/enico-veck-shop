'use client';

export function MainContent() {
  return (
    <section id="home" className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 md:px-8 text-white max-w-full">
      {/* Main Title */}
      <div className="text-center mb-8">
        <h1 className="text-7xl md:text-8xl tracking-[0.3em] mb-8">ZEUS</h1>
        
        <div className="space-y-1 text-xs tracking-[0.15em]">
          <p>RECORDING STUDIO / LOCALIZATION /</p>
          <p>SOUND PRODUCTION & MIXING / DUBBING</p>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="absolute bottom-12 left-0 right-0 text-center px-4">
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