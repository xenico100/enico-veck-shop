import type { Metadata } from 'next';
import WorldExplorer from '@/components/WorldExplorer';

export const metadata: Metadata = {
  title: '몽상인 · 잠들지 않는 마을 (3D 서울 월드)',
  description:
    '몽상녀와 벡독이 자정의 몽상로와 서울 도심·한강을 달리는 PS1 감성의 3D 밤 산책 월드입니다. 3인칭과 1인칭 시점, 벡독 탑승을 지원합니다.'
};

export default function LandingPage() {
  return <WorldExplorer />;
}
