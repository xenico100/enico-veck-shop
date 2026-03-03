import Link from 'next/link';
import CommunityBoard from '@/components/CommunityBoard';

export default function CommunityPage() {
  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
          >
            홈으로
          </Link>
          <p className="text-xs uppercase tracking-[0.28em] text-white/45">Community</p>
        </div>

        <CommunityBoard />
      </div>
    </section>
  );
}
