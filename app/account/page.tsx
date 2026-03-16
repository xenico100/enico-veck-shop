import CustomerPortalForm from '@/components/ui/AccountForms/CustomerPortalForm';
import EmailForm from '@/components/ui/AccountForms/EmailForm';
import NameForm from '@/components/ui/AccountForms/NameForm';
import StudioPostForm from '@/components/StudioPostForm';
import StudioPostManager from '@/components/StudioPostManager';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getUserDetails,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';

export default async function Account() {
  const supabase = createClient();
  const user = await getUser(supabase);

  if (!user) {
    return redirect('/signin');
  }

  const [userDetails, subscription, studioPosts] = await Promise.all([
    getUserDetails(supabase),
    getSubscription(supabase),
    supabase
      .from('studio_posts' as never)
      .select('id,title,content,image_url,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
  ]);

  return (
    <section className="mypage-account min-h-screen pb-24">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="flex flex-col gap-4 text-center">
          <p className="section-kicker !tracking-[0.3em]">
            회원정보
          </p>
          <h1 className="section-title !mt-0 !text-[clamp(2.6rem,6vw,4.6rem)]">
            마이페이지
          </h1>
          <p className="mx-auto max-w-2xl text-base text-stone-600">
            계정 정보와 Studio 게시물을 한 곳에서 관리하세요. 변경 사항은
            실시간으로 Studio 게시판에 반영됩니다.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:gap-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <CustomerPortalForm subscription={subscription} />
          <div className="space-y-6">
            <NameForm userName={userDetails?.full_name ?? ''} />
            <EmailForm userEmail={user.email} />
          </div>
        </div>

        <section className="tech-panel border-t border-stone-900/10 p-4 sm:p-6 md:p-8">
          <div className="space-y-2">
            <p className="section-kicker">
              Studio
            </p>
            <h2 className="display-font text-2xl font-semibold tracking-[0.02em] text-stone-950 md:text-3xl">
              게시물 작성
            </h2>
            <p className="text-base text-stone-600">
              작업 스토리와 이미지를 등록하면 Studio 섹션에 바로
              노출됩니다.
            </p>
          </div>
          <StudioPostForm />
        </section>

        <StudioPostManager posts={studioPosts.data ?? []} />
      </div>
    </section>
  );
}
