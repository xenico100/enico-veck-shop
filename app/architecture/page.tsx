import type { Metadata } from 'next';

import DarkNodeDiagramStack from '@/components/dark-node/DarkNodeDiagramStack';
import { BRAND_NAME } from '@/utils/branding';

export const metadata: Metadata = {
  title: `Architecture | ${BRAND_NAME}`,
  description:
    'REAL_ENICO 시스템 아키텍처와 패션 프로덕션 파이프라인을 다크 노드 다이어그램으로 보여주는 페이지'
};

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black">
      <DarkNodeDiagramStack />
    </main>
  );
}
