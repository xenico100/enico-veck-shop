import type { Metadata } from 'next';
import WorldExplorer from '@/components/WorldExplorer';

export const metadata: Metadata = {
  title: '산책하는 작업 지도 · 3D 시제품',
  description: '몽상인 마을의 이동과 충돌을 확인하는 단독 탐색 시제품입니다.',
  robots: { index: false, follow: false }
};

export default function WorldPage() {
  return <WorldExplorer />;
}
