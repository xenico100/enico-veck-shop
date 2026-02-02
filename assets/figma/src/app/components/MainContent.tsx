'use client';

export function MainContent() {
  return (
    <section
      id="home"
      className="relative min-h-screen w-full overflow-hidden px-6 pt-28 text-white md:px-8 lg:px-16"
    >
      {/* Background video */}
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover"
        src="/images/hero-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 z-10 bg-black/30" />

      {/* Bottom-center pinned block */}
      <div className="fixed bottom-6 left-1/2 z-50 w-[min(640px,calc(100vw-32px))] -translate-x-1/2 text-center">
        <div className="mx-auto inline-flex flex-col items-center gap-2 rounded-2xl bg-black/35 px-5 py-3 text-xs leading-relaxed tracking-wide text-white/85 backdrop-blur-sm">
          {/* Main word image */}
          <img
            src="/images/main_word.png"
            alt="ZEUS Studio"
            className="w-40 sm:w-44 md:w-48"
            draggable={false}
          />

          {/* Footer text */}
          <div className="space-y-1">
            <p>서울 강남구 양재천로 551 4F</p>
            <p>
              4F, 551-17, Yangcheon-ro, Gangse-gu, Seoul, Republic of Korea
            </p>
            <p>Contact Email: 070@zeus-studio.net</p>
            <p>Copyrights©ZEUS STUDIO All rights reserved</p>
          </div>
        </div>
      </div>
    </section>
  );
}
