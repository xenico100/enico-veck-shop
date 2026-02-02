'use client';

import { useRef } from 'react';

const services = [
  {
    title: 'Recording',
    description: '최고급 장비와 전문 엔지니어가 함께하는 레코딩',
    detail: 'Professional recording with state-of-the-art equipment',
    image: 'https://images.unsplash.com/photo-1566612453429-50faafea3e5f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBtaXhpbmclMjBjb25zb2xlfGVufDF8fHx8MTc2OTY1MzExNnww&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    title: 'Mixing & Mastering',
    description: '프로페셔널한 믹싱과 마스터링 서비스',
    detail: 'Expert mixing and mastering for optimal sound quality',
    image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBhdWRpbyUyMGVxdWlwbWVudCUyMG1pY3JvcGhvbmV8ZW58MXx8fHwxNzY5NjUzMTE3fDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    title: 'Dubbing',
    description: '다양한 언어의 더빙 및 후시 녹음',
    detail: 'Multi-language dubbing and voice-over services',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZWNvcmRpbmclMjBzdHVkaW8lMjBpbnRlcmlvcnxlbnwxfHx8fDE3Njk2NTMxMTd8MA&ixlib=rb-4.1.0&q=80&w=1080',
  },
];

export function ServicesSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const scrollByPage = (direction: 'left' | 'right') => {
    const track = trackRef.current;
    if (!track) return;
    const amount = track.clientWidth * 0.9;
    track.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    isDragging.current = true;
    startX.current = event.clientX;
    startScrollLeft.current = track.scrollLeft;
    track.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track || !isDragging.current) return;
    const delta = startX.current - event.clientX;
    track.scrollLeft = startScrollLeft.current + delta;
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!track) return;
    isDragging.current = false;
    track.releasePointerCapture(event.pointerId);
  };

  return (
    <section id="services" className="relative bg-black text-white min-h-screen flex items-center justify-center px-4 md:px-8 lg:px-16 py-20 max-w-full">
      <div className="max-w-6xl mx-auto w-full">
        {/* Title */}
        <h2 className="text-5xl md:text-6xl tracking-wide text-center mb-16">Services</h2>
        
        {/* Services Carousel */}
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollByPage('left')}
            className="absolute left-0 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white backdrop-blur transition hover:border-white/60 md:block"
            aria-label="이전 서비스"
          >
            ←
          </button>
          <div
            ref={trackRef}
            className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-2 pb-4"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {services.map((service, index) => (
              <div
                key={index}
                className="flex min-h-[360px] min-w-[75%] snap-start flex-col items-center justify-between text-center sm:min-w-[45%] lg:min-w-[30%] xl:min-w-[24%]"
              >
                <div className="w-full overflow-hidden rounded-lg aspect-[4/3]">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
                <div className="space-y-2 px-2 pt-4">
                  <h3 className="text-xl tracking-wide">{service.title}</h3>
                  <p className="text-sm text-gray-300">{service.description}</p>
                  <p className="text-xs text-gray-400">{service.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollByPage('right')}
            className="absolute right-0 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white backdrop-blur transition hover:border-white/60 md:block"
            aria-label="다음 서비스"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
