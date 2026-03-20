'use client';

import BrandBuildSection from '@/components/dark-node/BrandBuildSection';

type DarkNodeDiagramStackProps = {
  className?: string;
};

export default function DarkNodeDiagramStack({
  className
}: DarkNodeDiagramStackProps) {
  return (
    <div
      className={`relative w-full overflow-hidden bg-[#f8fbff] ${className ?? ''}`.trim()}
    >
      <div className="pointer-events-none absolute inset-0 z-20 opacity-10">
        <div className="dark-node-scanlines h-full" />
      </div>

      <div className="dark-node-noise pointer-events-none absolute inset-0 z-10 opacity-5" />

      <div className="relative z-0 w-full px-3 py-4 md:px-6 md:py-6">
        <BrandBuildSection />
      </div>

      <style>{`
        .dark-node-scanlines {
          background: linear-gradient(
            to bottom,
            transparent 50%,
            rgba(0, 255, 65, 0.1) 50%
          );
          background-size: 100% 4px;
          animation: dark-node-scanline 8s linear infinite;
        }

        @keyframes dark-node-scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(4px); }
        }

        .dark-node-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .dark-node-glitch {
          position: relative;
          text-shadow:
            0 0 5px #00ff41,
            0 0 10px #00ff41;
        }

        .dark-node-glitch::before {
          content: attr(data-text);
          position: absolute;
          left: -2px;
          top: 0;
          overflow: hidden;
          background: #f8fbff;
          color: #00ff41;
          text-shadow: -2px 0 #ff00ff;
          clip: rect(0, 900px, 0, 0);
          animation: dark-node-glitch-anim 5s infinite linear alternate-reverse;
          opacity: 0.8;
        }

        @keyframes dark-node-glitch-anim {
          0% { clip: rect(42px, 9999px, 44px, 0); }
          5% { clip: rect(12px, 9999px, 59px, 0); }
          10% { clip: rect(48px, 9999px, 29px, 0); }
          15% { clip: rect(42px, 9999px, 73px, 0); }
          20% { clip: rect(63px, 9999px, 27px, 0); }
          25% { clip: rect(34px, 9999px, 55px, 0); }
          30% { clip: rect(86px, 9999px, 73px, 0); }
          35% { clip: rect(20px, 9999px, 20px, 0); }
          40% { clip: rect(26px, 9999px, 60px, 0); }
          45% { clip: rect(25px, 9999px, 66px, 0); }
          50% { clip: rect(57px, 9999px, 98px, 0); }
          55% { clip: rect(5px, 9999px, 46px, 0); }
          60% { clip: rect(82px, 9999px, 31px, 0); }
          65% { clip: rect(54px, 9999px, 27px, 0); }
          70% { clip: rect(28px, 9999px, 99px, 0); }
          75% { clip: rect(45px, 9999px, 69px, 0); }
          80% { clip: rect(23px, 9999px, 85px, 0); }
          85% { clip: rect(54px, 9999px, 84px, 0); }
          90% { clip: rect(45px, 9999px, 47px, 0); }
          95% { clip: rect(37px, 9999px, 20px, 0); }
          100% { clip: rect(4px, 9999px, 91px, 0); }
        }
      `}</style>
    </div>
  );
}
