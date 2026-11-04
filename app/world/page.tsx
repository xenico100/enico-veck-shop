import type { Metadata } from 'next';
import WorldExplorer from '@/components/WorldExplorer';

export const metadata: Metadata = {
  title: '몽상인 · 잠들지 않는 마을',
  description:
    '몽상녀와 벡독이 자정의 몽상로에서 첫 문장을 되찾는 PS1 감성의 밤 산책 게임입니다. 3인칭과 1인칭 시점을 지원합니다.',
  robots: { index: false, follow: false }
};

export default function WorldPage() {
  return <WorldExplorer />;
}
