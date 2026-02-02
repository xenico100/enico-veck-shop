'use client';

export function MainContent() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-28 text-white max-w-full md:px-8 lg:px-16"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/images/hero-bg.mp4"
        autoPlay
        loop
        muted
        playsInline
      />
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute bottom-6 left-1/2 z-10 w-full max-w-2xl -translate-x-1/2 px-4 text-center">
        <div className="mx-auto inline-flex flex-col items-center gap-3 rounded-2xl bg-black/35 px-6 py-4 text-xs leading-relaxed tracking-wide text-white/85 backdrop-blur-sm">
          <img
            src="/images/main_word.png"
            alt="ZEUS Studio"
            className="w-56 sm:w-64 md:w-72"
          />
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
