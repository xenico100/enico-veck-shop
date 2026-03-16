import type { Metadata } from 'next';

import DarkNodeDiagramStack from '@/components/dark-node/DarkNodeDiagramStack';
import { BRAND_NAME } from '@/utils/branding';

export const metadata: Metadata = {
  title: `Architecture | ${BRAND_NAME}`,
  description:
    'REAL_ENICO 시스템 구조와 패션 프로덕션 흐름을 동양적 전략판 미감의 구조도로 정리한 페이지'
};

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-black">
      <DarkNodeDiagramStack />
    </main>
  );
}
