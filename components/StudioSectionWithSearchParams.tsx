'use client';

import { useSearchParams } from 'next/navigation';

import StudioSection from '@/components/StudioSection';

export default function StudioSectionWithSearchParams({
  game = false
}: {
  game?: boolean;
}) {
  const searchParams = useSearchParams();
  const studioPostIdFromQuery = searchParams.get('studioPost')?.trim() || null;

  return (
    <StudioSection
      game={game}
      studioPostIdFromQuery={studioPostIdFromQuery}
      queryString={searchParams.toString()}
    />
  );
}
