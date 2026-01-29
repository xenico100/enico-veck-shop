'use client';

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
  return (
    <section id="services" className="relative bg-black text-white min-h-screen flex items-center justify-center px-4 md:px-8 lg:px-16 py-20 max-w-full">
      <div className="max-w-6xl mx-auto w-full">
        {/* Title */}
        <h2 className="text-5xl md:text-6xl tracking-wide text-center mb-16">Services</h2>
        
        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div key={index} className="flex w-full flex-col items-center text-center space-y-4">
              {/* Image */}
              <div className="w-full overflow-hidden rounded-lg aspect-[4/3]">
                <img
                  src={service.image}
                  alt={service.title}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
              
              {/* Content */}
              <div className="space-y-2">
                <h3 className="text-xl tracking-wide">{service.title}</h3>
                <p className="text-sm text-gray-300">{service.description}</p>
                <p className="text-xs text-gray-400">{service.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
