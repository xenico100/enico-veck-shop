'use client';

import DarkNodeDiagramStack from '@/components/dark-node/DarkNodeDiagramStack';

export default function AboutSection() {
  return (
    <section id="about" className="relative py-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[10%] top-[8%] h-52 w-52 rounded-full bg-[#7ad0ff]/6 blur-3xl" />
        <div className="absolute right-[8%] bottom-[10%] h-60 w-60 rounded-full bg-[#ff6b78]/6 blur-3xl" />
      </div>
      <DarkNodeDiagramStack />
    </section>
  );
}
