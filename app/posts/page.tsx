import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export default async function PostsPage() {
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let posts:
    | Array<{
        id: string;
        title: string;
        content: string;
        created_at: string;
        image_url: string | null;
      }>
    | null = null;

  if (isSupabaseConfigured) {
    const supabase = createClient();
    const { data } = await supabase
      .from('studio_posts' as never)
      .select('id,title,content,created_at,image_url')
      .order('created_at', { ascending: false });
    posts = data as typeof posts;
  }

  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.45em] text-neutral-400">
            Studio
          </p>
          <h1 className="text-4xl font-semibold sm:text-5xl">게시물</h1>
          <p className="mx-auto max-w-2xl text-base text-neutral-400">
            최신 Studio 게시물을 확인하고 영감을 받아 보세요.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-neutral-300">
            Supabase 설정이 필요합니다.
          </div>
        )}

        {isSupabaseConfigured && posts && posts.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-neutral-300">
            아직 게시물이 없습니다.
          </div>
        )}

        {posts && posts.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map((post) => (
              <article
                key={post.id}
                className="flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                      {new Intl.DateTimeFormat('ko-KR', {
                        dateStyle: 'medium'
                      }).format(new Date(post.created_at))}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold">
                      {post.title}
                    </h2>
                  </div>
                  <Link
                    href="/account"
                    className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/60"
                  >
                    작성하기
                  </Link>
                </div>
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="h-48 w-full rounded-2xl object-cover"
                  />
                )}
                <p className="text-sm leading-relaxed text-neutral-300">
                  {post.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
