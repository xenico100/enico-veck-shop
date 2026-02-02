'use client';

export function MainContent() {
  return (
    <section
      id="home"
      className="relative flex min-h-screen flex-col items-center justify-center px-6 pb-16 pt-28 text-white max-w-full md:px-8 lg:px-16"
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
      <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center text-center">
        <img
          src="/images/main_word.png"
          alt="ZEUS Studio"
          className="w-full max-w-3xl"
        />
        <div className="absolute bottom-10 left-1/2 w-full max-w-2xl -translate-x-1/2 text-center text-xs leading-relaxed tracking-wide text-white/80">
          <p>서울 강남구 양재천로 551 4F</p>
          <p>
            4F, 551-17, Yangcheon-ro, Gangse-gu, Seoul, Republic of Korea
          </p>
          <p>Contact Email: 070@zeus-studio.net</p>
          <p>Copyrights©ZEUS STUDIO All rights reserved</p>
        </div>
      </div>
    </section>
  );
}
