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
        'relative min-h-screen w-full overflow-hidden bg-transparent',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 z-20 opacity-10">
        <div className="dark-node-scanlines h-full" />
      </div>

      <div className="dark-node-noise pointer-events-none absolute inset-0 z-10 opacity-5" />

      <div className="relative z-0 w-full px-3 pt-4 md:px-6 md:pt-6">
        <WorkflowHeistTimeline onTabRequest={openDiagramTab} />
      </div>

      <ArchitectureOverlayModal
        open={activeTab !== null}
        activeTab={activeTab ?? 'system'}
        onOpenChange={(open) => {
          if (!open) setActiveTab(null);
        }}
      />

      <div className="relative flex w-full justify-center py-6">
        <div
          className="px-4 text-center font-mono text-[9px] tracking-widest opacity-55 md:text-[10px]"
          style={{ color: 'rgba(216, 229, 255, 0.54)' }}
        >
          [EOF] :: REAL_ENICO ARCHITECTURE DOCUMENTATION :: {currentDate}
        </div>
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
      `}</style>
    </div>
  );
}
