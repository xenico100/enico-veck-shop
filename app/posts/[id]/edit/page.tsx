import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import StudioPostEditForm from '@/components/StudioPostEditForm';
import { createClient } from '@/utils/supabase/server';

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

export default async function EditPostPage({ params }: PageProps) {
  const supabase = createClient();
  const [
    { data: authData },
    { data: postData, error }
  ] = await Promise.all([
    supabase.auth.getUser(),
    (supabase as never)
      .from('studio_posts')
      .select('id,title,content,image_url,user_id,created_at')
      .eq('id', params.id)
      .maybeSingle()
  ]);

  const user = authData.user;
  if (!user) {
    redirect('/signin');
  }

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
  if (post.user_id !== user.id) {
    redirect(`/posts/${post.id}`);
  }

  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
          >
            상세로 돌아가기
          </Link>
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">Studio</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            게시물 수정
          </h1>
        </div>

        <StudioPostEditForm post={post} />
      </div>
    </section>
  );
}
