'use client';

import StudioPostsGrid from '@/components/StudioPostsGrid';

type StudioPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  user_id: string;
};

type StudioSectionProps = {
  posts: StudioPost[];
};

export function StudioSection({ posts }: StudioSectionProps) {
  return (
    <section
      id="studio"
      className="relative bg-black text-white min-h-screen px-4 md:px-8 lg:px-16 py-20 max-w-full"
    >
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center space-y-12">
        {/* Title */}
        <h2 className="text-5xl md:text-6xl tracking-wide">Studio</h2>
        
        {/* Main Image */}
        <div className="w-full max-w-3xl">
          <img
            src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjByZWNvcmRpbmclMjBzdHVkaW8lMjBpbnRlcmlvcnxlbnwxfHx8fDE3Njk2NTMxMTd8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="ZEUS Studio Interior"
            className="w-full h-auto rounded-lg"
          />
        </div>
        
        {/* Description */}
        <div className="space-y-6 text-sm leading-relaxed max-w-2xl">
          <p className="text-gray-300">
            최첨단 장비와 완벽한 음향 환경을 갖춘<br />
            ZEUS STUDIO에서 당신의 음악을 완성하세요.
          </p>
          
          <p className="text-gray-300">
            편안하고 창의적인 공간에서<br />
            최상의 작업 경험을 제공합니다.
          </p>
          
          <div className="pt-4 space-y-4 text-gray-400 text-xs">
            <p>
              Our studio is equipped with cutting-edge technology<br />
              and acoustically optimized environment.
            </p>
            
            <p>
              We provide a comfortable and inspiring workspace<br />
              for your creative projects.
            </p>
          </div>
        </div>
        
        {/* Contact Info */}
        <div className="pt-8 space-y-2 text-xs text-gray-400">
          <p className="text-white tracking-wider">VISIT US</p>
          <p>서울특별시 강남구 테헤란로 123</p>
          <p>Seoul, South Korea</p>
        </div>
      </div>

      <div className="mt-16">
        <StudioPostsGrid posts={posts} />
      </div>
    </section>
  );
}
