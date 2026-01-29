import { redirect } from 'next/navigation';
import StudioPostForm from '@/components/StudioPostForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/assets/figma/src/app/components/ui/tabs';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { getUser } from '@/utils/supabase/queries';
import { getAdminEmail, isAdminEmail } from '@/utils/admin';

export default async function AdminPage() {
  const adminEmail = getAdminEmail();
  const supabase = createClient();
  const user = await getUser(supabase);

  if (!adminEmail || !isAdminEmail(user?.email)) {
    redirect('/');
  }

  const adminClient = createAdminClient();
  const [{ data: authData }, { data: profileData }, { data: subscriptionData }] =
    await Promise.all([
      adminClient.auth.admin.listUsers(),
      adminClient
        .from('users' as never)
        .select('id,full_name'),
      adminClient
        .from('subscriptions' as never)
        .select('user_id,status')
    ]);

  const profileMap = new Map(
    (profileData ?? []).map((profile) => [profile.id, profile.full_name])
  );
  const subscriptionMap = new Map(
    (subscriptionData ?? []).map((subscription) => [
      subscription.user_id,
      subscription.status
    ])
  );

  const users = authData?.users ?? [];

  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm uppercase tracking-[0.45em] text-neutral-400">
            Admin
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Admin Dashboard
          </h1>
          <p className="mx-auto max-w-2xl text-base text-neutral-400">
            회원 관리와 Studio 게시물 작성을 한 곳에서 진행할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-white/5 text-white">
            <TabsTrigger value="members" className="text-white">
              Member Management
            </TabsTrigger>
            <TabsTrigger value="posts" className="text-white">
              Post Creation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="grid grid-cols-1 gap-0 border-b border-white/10 bg-black/60 px-6 py-4 text-sm uppercase tracking-[0.2em] text-neutral-400 sm:grid-cols-[2fr_2fr_1fr]">
                <span>Email</span>
                <span>Name</span>
                <span>Subscription</span>
              </div>
              <div className="divide-y divide-white/10">
                {users.length === 0 ? (
                  <div className="px-6 py-6 text-sm text-neutral-400">
                    등록된 회원이 없습니다.
                  </div>
                ) : (
                  users.map((member) => (
                    <div
                      key={member.id}
                      className="grid grid-cols-1 gap-4 px-6 py-5 text-sm text-neutral-200 sm:grid-cols-[2fr_2fr_1fr]"
                    >
                      <span className="break-all text-white">
                        {member.email ?? '-'}
                      </span>
                      <span className="text-neutral-300">
                        {profileMap.get(member.id) ?? '-'}
                      </span>
                      <span className="text-neutral-400">
                        {subscriptionMap.get(member.id) ?? 'none'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-black via-neutral-950 to-black p-8">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-neutral-400">
                  Studio
                </p>
                <h2 className="text-2xl font-semibold text-white md:text-3xl">
                  게시물 작성
                </h2>
                <p className="text-base text-neutral-400">
                  관리자 전용으로 Studio/News 게시물을 등록할 수 있습니다.
                </p>
              </div>
              <StudioPostForm />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
