'use client';

import { useSearchParams } from 'next/navigation';

import StudioSection from '@/components/StudioSection';

export default function StudioSectionWithSearchParams() {
  const searchParams = useSearchParams();
  const studioPostIdFromQuery = searchParams.get('studioPost')?.trim() || null;

  return (
    <StudioSection
      studioPostIdFromQuery={studioPostIdFromQuery}
      queryString={searchParams.toString()}
    />
  );
}
