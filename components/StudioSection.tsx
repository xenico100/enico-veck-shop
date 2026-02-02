'use client';

import { useState, useEffect, useRef } from 'react';
import { Pause, Play } from 'lucide-react';

const studioItems = [
  { id: 1, title: 'Vocal Recording', category: '녹음', image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBlcXVpcG1lbnQlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY5Njc1MTEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 2, title: 'Production Suite', category: '믹싱', image: 'https://images.unsplash.com/photo-1756719164587-3dfcacc9a6e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHByb2R1Y3Rpb24lMjBzdHVkaW8lMjBpbnRlcmlvcnxlbnwxfHx8fDE3Njk2NzUxMTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 3, title: 'Mixing Console', category: '장비', image: 'https://images.unsplash.com/photo-1615268734097-12b6b02ca8ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBtaXhpbmclMjBjb25zb2xlJTIwZGVza3xlbnwxfHx8fDE3Njk2NzUxMTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 4, title: 'Professional Mic', category: '녹음', image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtaWNyb3Bob25lJTIwcmVjb3JkaW5nfGVufDF8fHx8MTc2OTY2NzU0OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 5, title: 'DAW Workstation', category: '장비', image: 'https://images.unsplash.com/photo-1760926421866-4ce684285fa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMHdvcmtzdGF0aW9uJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzY5Njc1MTEzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 6, title: 'Sound Engineering', category: '믹싱', image: 'https://images.unsplash.com/photo-1543060797-19e2654eb1b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb3VuZCUyMGVuZ2luZWVyJTIwd29ya2luZyUyMHN0dWRpb3xlbnwxfHx8fDE3Njk2NzUxMTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 7, title: 'Studio Monitors', category: '장비', image: 'https://images.unsplash.com/photo-1762983870490-63e5ba07105b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBtb25pdG9yJTIwc3BlYWtlcnMlMjBzZXR1cHxlbnwxfHx8fDE3Njk2NzUxMTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  
  { id: 8, title: 'Acoustic Treatment', category: '시설', image: 'https://images.unsplash.com/photo-1636294155438-9c62231bc173?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhY291c3RpYyUyMHRyZWF0bWVudCUyMGZvYW0lMjBzdHVkaW98ZW58MXx8fHwxNzY5Njc1MTE1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 9, title: 'Production Session', category: '녹음', image: 'https://images.unsplash.com/photo-1615297658577-dc5cec88e81a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHByb2R1Y2VyJTIwc3R1ZGlvJTIwc2Vzc2lvbnxlbnwxfHx8fDE3Njk2NzUxMTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 10, title: 'Studio Headphones', category: '장비', image: 'https://images.unsplash.com/photo-1763407178461-2efa5726e241?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBoZWFkcGhvbmVzJTIwZXF1aXBtZW50fGVufDF8fHx8MTc2OTY3NTExNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 11, title: 'Audio Interface', category: '장비', image: 'https://images.unsplash.com/photo-1766182065635-75b013345dc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMGludGVyZmFjZSUyMHJlY29yZGluZyUyMGdlYXJ8ZW58MXx8fHwxNzY5Njc1MTE1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 12, title: 'Recording Studio', category: '녹음', image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBlcXVpcG1lbnQlMjBwcm9mZXNzaW9uYWx8ZW58MXx8fHwxNzY5Njc1MTEyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 13, title: 'Mixing Desk', category: '믹싱', image: 'https://images.unsplash.com/photo-1615268734097-12b6b02ca8ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBtaXhpbmclMjBjb25zb2xlJTIwZGVza3xlbnwxfHx8fDE3Njk2NzUxMTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  { id: 14, title: 'Studio Space', category: '시설', image: 'https://images.unsplash.com/photo-1756719164587-3dfcacc9a6e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNpYyUyMHByb2R1Y3Rpb24lMjBzdHVkaW8lMjBpbnRlcmlvcnxlbnwxfHx8fDE3Njk2NzUxMTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
  
  { id: 15, title: 'Pro Equipment', category: '장비', image: 'https://images.unsplash.com/photo-1760926421866-4ce684285fa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMHdvcmtzdGF0aW9uJTIwY29tcHV0ZXJ8ZW58MXx8fHwxNzY5Njc1MTEzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral' },
];

export default function StudioSection() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredRowRef = useRef<number | null>(null);
  const animationFrameIds = useRef<number[]>([]);
  
  // 한 행당 최대 7개 항목
  const ITEMS_PER_ROW = 7;
  
  // 전체 행 수 계산
  const totalRows = Math.ceil(studioItems.length / ITEMS_PER_ROW);
  
  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 각 행별 속도 (다양성 위해 패턴 사용)
  const getRowSpeed = (rowIndex: number) => {
    const speeds = [0.5, 0.7, 0.6, 0.8, 0.55, 0.65, 0.75];
    const baseSpeed = speeds[rowIndex % speeds.length];
    // 모바일에서는 속도를 0.55배로 줄여서 웹과 비슷하게 만듦
    return isMobile ? baseSpeed * 0.55 : baseSpeed;
  };

  useEffect(() => {
    if (!isPlaying) return;

    const animateRow = (ref: HTMLDivElement | null, baseSpeed: number, rowNumber: number) => {
      if (!ref) return;
      
      let position = 0;
      let currentSpeed = baseSpeed;
      
      const animate = () => {
        if (!ref) return;
        
        // hoveredRowRef를 사용하여 현재 hover 상태 확인
        const targetSpeed = hoveredRowRef.current === rowNumber ? 0 : baseSpeed;
        
        // 천천히 감속/가속
        const speedDiff = targetSpeed - currentSpeed;
        currentSpeed += speedDiff * 0.05; // 부드러운 전환을 위한 easing
        
        // 속도가 매우 작으면 0으로 설정
        if (Math.abs(currentSpeed) < 0.01 && targetSpeed === 0) {
          currentSpeed = 0;
        }
        
        position -= currentSpeed;
        
        // Reset position for infinite loop
        const itemWidth = ref.scrollWidth / 2;
        if (Math.abs(position) >= itemWidth) {
          position = 0;
        }
        
        ref.style.transform = `translateX(${position}px)`;
        
        const frameId = requestAnimationFrame(animate);
        animationFrameIds.current.push(frameId);
      };
      
      animate();
    };

    // 모든 행 애니메이션 시작
    rowRefs.current.forEach((ref, index) => {
      if (ref) {
        animateRow(ref, getRowSpeed(index), index);
      }
    });

    return () => {
      animationFrameIds.current.forEach(frameId => cancelAnimationFrame(frameId));
      animationFrameIds.current = [];
    };
  }, [isPlaying, totalRows]);

  const handleRowMouseEnter = (rowNumber: number) => {
    hoveredRowRef.current = rowNumber;
  };

  const handleRowMouseLeave = () => {
    hoveredRowRef.current = null;
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const renderRow = (rowIndex: number) => {
    // 해당 행의 항목들 추출
    const startIdx = rowIndex * ITEMS_PER_ROW;
    const endIdx = startIdx + ITEMS_PER_ROW;
    const items = studioItems.slice(startIdx, endIdx);
    
    if (items.length === 0) return null;
    
    const duplicatedItems = [...items, ...items]; // Duplicate for infinite scroll

    return (
      <div 
        key={rowIndex}
        className="overflow-hidden mb-4"
        onMouseEnter={() => handleRowMouseEnter(rowIndex)}
        onMouseLeave={handleRowMouseLeave}
      >
        <div 
          ref={(el) => rowRefs.current[rowIndex] = el}
          className="flex gap-4" 
          style={{ width: 'fit-content' }}
        >
          {duplicatedItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex-shrink-0 w-[220px] md:w-[400px] h-[130px] md:h-[240px] rounded-lg md:rounded-2xl overflow-hidden relative group cursor-pointer"
            >
              {/* 이미지 */}
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
              />
              
              {/* 겉에서 안으로 퍼지는 블러 효과 */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out pointer-events-none"
                style={{
                  backdropFilter: 'blur(0px)',
                  WebkitBackdropFilter: 'blur(0px)',
                  background: 'radial-gradient(circle, transparent 0%, rgba(0,0,0,0.3) 100%)',
                }}
              >
                <div className="w-full h-full" style={{
                  backdropFilter: 'blur(4px)',
                  WebkitBackdropFilter: 'blur(4px)',
                  maskImage: 'radial-gradient(circle, transparent 30%, black 70%)',
                  WebkitMaskImage: 'radial-gradient(circle, transparent 30%, black 70%)',
                }} />
              </div>
              
              {/* 텍스트 그라데이션 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 md:p-6 transition-opacity duration-500">
                <p className="text-[9px] md:text-xs text-gray-400 mb-0.5 md:mb-1">{item.category}</p>
                <h3 className="text-white text-sm md:text-xl font-medium">{item.title}</h3>
              </div>
              
              {/* 알아보기 버튼 - hover 시 나타남 */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out bg-black/30">
                <button className="bg-white text-black px-3 py-1.5 md:px-6 md:py-3 rounded-full text-[11px] md:text-sm font-medium hover:bg-gray-200 transition-all duration-300 transform translate-y-8 group-hover:translate-y-0">
                  알아보기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section id="studio" className="relative bg-black text-white min-h-screen flex flex-col justify-center py-20 max-w-full overflow-hidden">
      {/* Title */}
      <div className="px-4 md:px-8 lg:px-16 mb-12">
        <h2 className="text-4xl md:text-5xl tracking-tight">Studio</h2>
      </div>

      {/* Scrolling Rows */}
      <div className="space-y-4 mb-12">
        {Array.from({ length: totalRows }, (_, index) => renderRow(index))}
      </div>

      {/* Play/Pause Button - 섹션 내 고정 */}
      <div className="flex justify-end px-4 md:px-8 lg:px-16 mt-8">
        <button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
          aria-label={isPlaying ? '일시정지' : '재생'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" fill="white" />
          ) : (
            <Play className="w-5 h-5 text-white" fill="white" />
          )}
        </button>
      </div>
    </section>
  );
}
