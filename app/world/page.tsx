import type { Metadata } from 'next';
import WorldExplorer from '@/components/WorldExplorer';

export const metadata: Metadata = {
  title: '몽상인 · 잠들지 않는 마을',
  description:
    '자정이 지난 몽상로에서 첫 문장을 되찾는 PS1 감성의 1인칭 밤 산책 게임입니다.',
  robots: { index: false, follow: false }
};

export default function WorldPage() {
  return <WorldExplorer />;
}
