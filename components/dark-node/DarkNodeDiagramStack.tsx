'use client';

import { useState } from 'react';

import ArchitectureOverlayModal, {
  type ArchitectureModalTab
} from '@/components/dark-node/ArchitectureOverlayModal';
import { cn } from '@/utils/cn';
import WorkflowHeistTimeline from '@/components/dark-node/WorkflowHeistTimeline';

type DarkNodeDiagramStackProps = {
  className?: string;
};

export default function DarkNodeDiagramStack({
  className
}: DarkNodeDiagramStackProps) {
  const [currentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<ArchitectureModalTab | null>(null);

  const openDiagramTab = (tab: ArchitectureModalTab) => {
    setActiveTab(tab);
  };

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden bg-transparent',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-20 opacity-[0.06]">
        <div className="dark-node-scanlines h-full" />
      </div>

      <div className="dark-node-noise pointer-events-none absolute inset-0 z-10 opacity-[0.04]" />

      <div className="relative z-0 w-full">
        <WorkflowHeistTimeline onTabRequest={openDiagramTab} />
      </div>

      <ArchitectureOverlayModal
        open={activeTab !== null}
        activeTab={activeTab ?? 'system'}
        onOpenChange={(open) => {
          if (!open) setActiveTab(null);
        }}
      />

      <div className="relative flex w-full justify-center pb-3 pt-5 md:pb-5">
        <div
          className="px-4 text-center font-mono text-[9px] tracking-widest opacity-55 md:text-[10px]"
          style={{ color: 'rgba(143, 80, 80, 0.58)' }}
        >
          [EOF] :: REAL_ENICO ARCHITECTURE DOCUMENTATION :: {currentDate}
        </div>
      </div>

      <style>{`
        .dark-node-scanlines {
          background: linear-gradient(
            to bottom,
            transparent 50%,
            rgba(170, 38, 38, 0.08) 50%
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
      `}</style>
    </div>
  );
}
