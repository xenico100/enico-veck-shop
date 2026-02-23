import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

type StudioPostListRow = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  user_id: string;
  created_at: string;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

export default async function PostsPage() {
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let posts: StudioPostListRow[] = [];
  let errorMessage: string | null = null;
  let currentUserId: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = createClient();
    const [
      { data: postsData, error: postsError },
      { data: authData }
    ] = await Promise.all([
      (supabase as never)
        .from('studio_posts')
        .select('id,title,content,image_url,user_id,created_at')
        .order('created_at', { ascending: false }),
      supabase.auth.getUser()
    ]);

    if (postsError) {
      errorMessage = '게시물 목록을 불러오지 못했습니다.';
    } else {
      posts = (postsData ?? []) as StudioPostListRow[];
    }

    currentUserId = authData.user?.id ?? null;
  }

  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.45em] text-neutral-400">Studio</p>
            <h1 className="text-4xl font-semibold sm:text-5xl">게시물</h1>
            <p className="mx-auto max-w-2xl text-base text-neutral-400 sm:mx-0">
              최신 Studio 게시물을 확인하고, 로그인한 사용자는 직접 게시물을 작성할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 sm:justify-start">
            <Link
              href={currentUserId ? '/posts/new' : '/signin'}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-neutral-200"
            >
              게시물 작성
            </Link>
            {currentUserId && (
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/20"
              >
                내 게시물 관리
              </Link>
            )}
          </div>
        </div>

        {!isSupabaseConfigured && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-neutral-300">
            Supabase 설정이 필요합니다.
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-100">
            {errorMessage}
          </div>
        )}

        {isSupabaseConfigured && !errorMessage && posts.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-neutral-300">
            아직 게시물이 없습니다.
          </div>
        )}

        {posts.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              >
                <Link href={`/posts/${post.id}`} className="block">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.title ?? 'Studio post image'}
                      className="h-52 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-52 w-full items-center justify-center bg-neutral-900 text-sm uppercase tracking-[0.3em] text-neutral-500">
                      No Image
                    </div>
                  )}
                  <div className="space-y-3 p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                      {formatDateTime(post.created_at)}
                    </p>
                    <h2 className="line-clamp-2 text-2xl font-semibold text-white">
                      {post.title ?? '제목 없음'}
                    </h2>
                    <p className="line-clamp-3 text-sm leading-relaxed text-neutral-300">
                      {post.content ?? ''}
                    </p>
                    <p className="text-xs text-neutral-500">작성자: {post.user_id}</p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
