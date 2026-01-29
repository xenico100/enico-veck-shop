'use client';

import Image from 'next/image';

export function AboutSection() {
  return (
    <section id="about" className="relative bg-black text-white min-h-screen flex items-center justify-center px-4 md:px-8 lg:px-16 py-20 max-w-full">
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center text-center space-y-12">
        {/* Title */}
        <h2 className="text-5xl md:text-6xl tracking-wide">About</h2>
        
        {/* Image */}
        <div className="relative w-full max-w-2xl">
          <Image
            src="/images/studio/astudiomain.png"
            alt="ZEUS Studio Recording Equipment"
            width={800}
            height={600}
            className="h-auto w-full rounded-lg"
          />
        </div>
        
        {/* Text Content */}
        <div className="space-y-6 text-sm leading-relaxed">
          <p className="text-gray-300">
            제우스 스튜디오는<br />
            전문적인 오디오 작업과 다양한 서비스를<br />
            최고의 퀄리티로 제공하기 위해 노력하고 있습니다.
          </p>
          
          <p className="text-gray-300">
            제우스 스튜디오의 전문적인 엔지니어들과 믿을만 있는 매니저들이<br />
            최고의 예술 작업과 프로젝트 컨설팅 서비스를 약속드립니다.
          </p>
          
          <p className="text-gray-300">
            항상 최신을 다하여 최고의 콘텐츠를 만들 수 있도록 노력하겠습니다.<br />
            앞서가 다디어로 소통과 작업을 최고로 대하겠습니다.
          </p>
          
          <div className="pt-4 space-y-4 text-gray-400 text-xs">
            <p>
              <strong className="text-white">ZEUS STUDIO</strong> provides high-quality sound works and the best<br />
              services on sound production & mixing, dubbing etc.
            </p>
            
            <p>
              We promise that our professional sound engineers and reliable<br />
              project managers do our best to support your project and<br />
              expand your content business with outstanding sound works.
            </p>
            
            <p>
              <strong className="text-white">ZEUS STUDIO</strong> will be your capable production partner of your<br />
              future business.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
