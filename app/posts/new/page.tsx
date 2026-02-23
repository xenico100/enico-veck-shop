import { redirect } from 'next/navigation';
import StudioPostForm from '@/components/StudioPostForm';
import { createClient } from '@/utils/supabase/server';

export default async function NewPostPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-neutral-400">Studio</p>
          <h1 className="text-3xl font-semibold text-white md:text-4xl">게시물 작성</h1>
          <p className="text-base text-neutral-400">
            제목과 내용을 입력하고 필요하면 이미지를 업로드해 Studio 게시물을 작성하세요.
          </p>
        </div>
        <StudioPostForm />
      </div>
    </section>
  );
}
