'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ServiceDetailModal } from './ServiceDetailModal';

const services = [
  // 녹음 카테고리
  {
    title: 'Studio Recording',
    subtitle: 'Professional Vocal Recording',
    description: '최고급 장비와 전문 엔지니어가 함께하는\n완벽한 레코딩 경험을 제공합니다.',
    price: '₩150,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBtaWNyb3Bob25lJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTY1MjE4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1a1a1a', '#4a4a4a', '#8a8a8a'],
  },
  {
    title: 'Premium Microphone',
    subtitle: 'High-End Condenser Mic',
    description: '프로페셔널 보컬 녹음을 위한\n최상급 콘덴서 마이크 제공',
    price: '₩120,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1745848413076-cdf1fa5d4d71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtaWNyb3Bob25lJTIwc3RhbmQlMjBzdHVkaW98ZW58MXx8fHwxNzY5Njc0Mjk3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a2a2a', '#5a5a5a', '#9a9a9a'],
  },
  {
    title: 'Audio Interface',
    subtitle: 'Professional Recording Interface',
    description: '고해상도 오디오 변환\n레이턴시 제로 모니터링',
    price: '₩180,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1760348213351-76638ffff25c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMGludGVyZmFjZSUyMHJlY29yZGluZyUyMGVxdWlwbWVudHxlbnwxfHx8fDE3Njk2NzQyOTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3a3a3a', '#6a6a6a', '#aaaaaa'],
  },
  {
    title: 'Studio Headphones',
    subtitle: 'Reference Monitoring',
    description: '정확한 모니터링을 위한\n레퍼런스급 스튜디오 헤드폰',
    price: '₩90,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1737885197886-9e34a03ad226?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBoZWFkcGhvbmVzJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTYxNjkzN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1a1a2a', '#4a4a5a', '#8a8a9a'],
  },
  
  // 믹스/마스터 카테고리
  {
    title: 'Mixing & Mastering',
    subtitle: 'Expert Sound Engineering',
    description: '프로페셔널한 믹싱과 마스터링으로\n최상의 사운드 퀄리티를 완성합니다.',
    price: '₩200,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1622134955998-50a54e8b5d63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMG1peGluZyUyMGNvbnNvbGUlMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzY5Njc0MTUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a3a5a', '#4a5a7a', '#6a7a9a'],
  },
  {
    title: 'Analog Mixing',
    subtitle: 'Vintage Sound Character',
    description: '아날로그 장비로 만드는\n따뜻하고 풍부한 사운드',
    price: '₩250,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1622134955998-50a54e8b5d63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMG1peGluZyUyMGNvbnNvbGUlMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzY5Njc0MTUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3a4a6a', '#5a6a8a', '#7a8aaa'],
  },
  {
    title: 'Mastering Suite',
    subtitle: 'Final Polish & Enhancement',
    description: '최종 마스터링으로\n완벽한 사운드 밸런스 구현',
    price: '₩180,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1712303700832-57d2b2b916b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBtb25pdG9yJTIwc3BlYWtlcnN8ZW58MXx8fHwxNzY5Njc0Mjk5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a3a4a', '#4a5a6a', '#6a7a8a'],
  },
  {
    title: 'Stem Mixing',
    subtitle: 'Flexible Mix Approach',
    description: '스템 단위 믹싱으로\n세밀한 컨트롤 제공',
    price: '₩220,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1622134955998-50a54e8b5d63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMG1peGluZyUyMGNvbnNvbGUlMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzY5Njc0MTUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#4a5a6a', '#6a7a8a', '#8a9aaa'],
  },
  
  // 더빙/성우 카테고리
  {
    title: 'Voice Over',
    subtitle: 'Multi-Language Dubbing',
    description: '다양한 언어의 더빙 및 후시 녹음\n전문 성우와 함께합니다.',
    price: '₩100,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1581650127213-e72e2271ff15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2ljZSUyMGFjdGluZyUyMGR1YmJpbmclMjBib290aHxlbnwxfHx8fDE3Njk2NzQxNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3a2a4a', '#5a4a6a', '#7a6a8a'],
  },
  {
    title: 'Character Voice',
    subtitle: 'Animation & Game Dubbing',
    description: '애니메이션과 게임을 위한\n캐릭터 보이스 연기',
    price: '₩130,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1581650127213-e72e2271ff15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2ljZSUyMGFjdGluZyUyMGR1YmJpbmclMjBib290aHxlbnwxfHx8fDE3Njk2NzQxNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#4a3a5a', '#6a5a7a', '#8a7a9a'],
  },
  {
    title: 'Commercial VO',
    subtitle: 'Advertisement Voice Over',
    description: '광고 내레이션과\nCM송 녹음 서비스',
    price: '₩80,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBtaWNyb3Bob25lJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTY1MjE4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#5a4a6a', '#7a6a8a', '#9a8aaa'],
  },
  {
    title: 'Audiobook Recording',
    subtitle: 'Professional Narration',
    description: '오디오북과 팟캐스트\n전문 내레이션 녹음',
    price: '₩110,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBtaWNyb3Bob25lJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTY1MjE4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a1a3a', '#4a3a5a', '#6a5a7a'],
  },
];

const categories = ['모든 제품', '녹음', '믹스/마스터', '더빙/성우'];

export default function ServicesSection() {
  const [activeCategory, setActiveCategory] = useState('모든 제품');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // 카테고리별 필터링
  const filteredServices = useMemo(() => {
    if (activeCategory === '모든 제품') {
      return services;
    }
    return services.filter(service => service.category === activeCategory);
  }, [activeCategory]);

  // 서비스 상세보기 열기
  const openServiceDetail = (service: typeof services[0]) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  // 서비스 상세보기 닫기
  const closeServiceDetail = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedService(null);
    }, 300);
  };

  // 카테고리 변경 핸들러
  const handleCategoryChange = (category: string) => {
    setIsChanging(true);
    setTimeout(() => {
      setActiveCategory(category);
      setScrollPosition(0);
      if (containerRef.current) {
        containerRef.current.scrollLeft = 0;
      }
      setTimeout(() => {
        setIsChanging(false);
      }, 50);
    }, 150);
  };

  // 마우스 드래그 이벤트
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeft.current = containerRef.current.scrollLeft;
    containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  // 스크롤 처리
  const handleScroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollAmount = 400;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
    
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollPosition < (filteredServices.length * 300);

  return (
    <section id="services" className="relative bg-[#0a0a0a] text-white min-h-screen flex flex-col justify-center px-4 md:px-8 lg:px-16 py-20 max-w-full">
      <div className="max-w-7xl mx-auto w-full">
        {/* Title */}
        <h2 className="text-4xl md:text-5xl mb-8 tracking-tight">Services</h2>
        
        {/* Category Tabs */}
        <div className="flex gap-3 mb-12 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-5 py-2 rounded-full text-xs whitespace-nowrap transition-all ${
                activeCategory === category
                  ? 'bg-white text-black'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        {/* Services Carousel */}
        <div className="relative">
          {/* Desktop: Scrollable Row */}
          <div className={`hidden md:block relative transition-opacity duration-150 ${isChanging ? 'opacity-0' : 'opacity-100'}`}>
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                onClick={() => handleScroll('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[#1a1a1a] shadow-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors -ml-6"
              >
                ←
              </button>
            )}
            
            {/* Scrollable Container */}
            <div
              ref={containerRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth cursor-grab"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {filteredServices.map((service, index) => (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-[280px] flex flex-col bg-[#1a1a1a] rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-white/10 transition-all duration-300 ${
                    !isChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{
                    transitionDelay: isChanging ? '0ms' : `${index * 50}ms`
                  }}
                >
                  {/* Image */}
                  <div className="relative w-full h-64 bg-[#0f0f0f] flex items-center justify-center p-8">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-contain"
                      draggable="false"
                    />
                  </div>
                  
                  {/* Color Options */}
                  <div className="flex gap-2 justify-center py-4">
                    {service.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-3 h-3 rounded-full border border-gray-600"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl mb-1 tracking-tight text-white">{service.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{service.subtitle}</p>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4 whitespace-pre-line flex-1">
                      {service.description}
                    </p>
                    <p className="text-sm text-white mb-4">{service.price}</p>
                    
                    {/* Buttons */}
                    <div className="flex items-center gap-4">
                      <button className="bg-red-600 text-white px-4 py-2 rounded-full text-xs hover:bg-red-700 transition-colors" onClick={() => openServiceDetail(service)}>
                        더 알아보기
                      </button>
                      <a href="#" className="text-red-400 text-xs hover:underline">
                        구매하기 &gt;
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Right Arrow */}
            {canScrollRight && (
              <button
                onClick={() => handleScroll('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[#1a1a1a] shadow-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors -mr-6"
              >
                →
              </button>
            )}
          </div>
          
          {/* Mobile: Simple Scroll */}
          <div className={`md:hidden overflow-x-auto pb-4 transition-opacity duration-150 ${isChanging ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex gap-4">
              {filteredServices.map((service, index) => (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-[280px] flex flex-col bg-[#1a1a1a] rounded-2xl overflow-hidden transition-all duration-300 ${
                    !isChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{
                    transitionDelay: isChanging ? '0ms' : `${index * 50}ms`
                  }}
                >
                  {/* Image */}
                  <div className="relative w-full h-56 bg-[#0f0f0f] flex items-center justify-center p-6">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* Color Options */}
                  <div className="flex gap-2 justify-center py-4">
                    {service.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-3 h-3 rounded-full border border-gray-600"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl mb-1 tracking-tight text-white">{service.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{service.subtitle}</p>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4 whitespace-pre-line">
                      {service.description}
                    </p>
                    <p className="text-sm text-white mb-4">{service.price}</p>
                    
                    {/* Buttons */}
                    <div className="flex items-center gap-4">
                      <button className="bg-red-600 text-white px-4 py-2 rounded-full text-xs hover:bg-red-700 transition-colors" onClick={() => openServiceDetail(service)}>
                        더 알아보기
                      </button>
                      <a href="#" className="text-red-400 text-xs hover:underline">
                        구매하기 &gt;
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Service Detail Modal */}
      <ServiceDetailModal 
        isOpen={isModalOpen} 
        service={selectedService} 
        onClose={closeServiceDetail} 
      />
    </section>
  );
}
