import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import StudioPostDeleteButton from '@/components/StudioPostDeleteButton';

type PageProps = {
  params: { id: string };
};

type StudioPostRow = {
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

export default async function PostDetailPage({ params }: PageProps) {
  const supabase = createClient();

  const [
    { data: postData, error },
    { data: authData }
  ] = await Promise.all([
    (supabase as never)
      .from('studio_posts')
      .select('id,title,content,image_url,user_id,created_at')
      .eq('id', params.id)
      .maybeSingle(),
    supabase.auth.getUser()
  ]);

  if (error) {
    return (
      <section className="min-h-screen bg-black pb-24 text-white">
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            게시글을 불러오지 못했습니다.
          </div>
        </div>
      </section>
    );
  }

  if (!postData) {
    notFound();
  }

  const post = postData as StudioPostRow;
  const currentUserId = authData.user?.id ?? null;
  const isOwner = currentUserId === post.user_id;

  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/posts"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
          >
            목록으로
          </Link>
          {isOwner && (
            <>
              <Link
                href={`/posts/${post.id}/edit`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
              >
                수정
              </Link>
              <StudioPostDeleteButton
                postId={post.id}
                className="inline-flex items-center justify-center rounded-full border border-rose-300/30 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-300/20"
              >
                삭제
              </StudioPostDeleteButton>
            </>
          )}
        </div>

        <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {post.image_url ? (
            <img
              src={post.image_url}
              alt={post.title ?? 'Studio post image'}
              className="h-[280px] w-full object-cover sm:h-[420px]"
            />
          ) : (
            <div className="flex h-[280px] w-full items-center justify-center bg-neutral-900 text-sm uppercase tracking-[0.3em] text-neutral-500 sm:h-[420px]">
              No Image
            </div>
          )}

          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                {formatDateTime(post.created_at)}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {post.title ?? '제목 없음'}
              </h1>
              <p className="text-sm text-neutral-500">작성자: {post.user_id}</p>
            </div>

            <div className="whitespace-pre-wrap text-base leading-relaxed text-neutral-200">
              {post.content ?? ''}
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
