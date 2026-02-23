import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import StudioPostForm from '@/components/StudioPostForm';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/assets/figma/src/app/components/ui/tabs';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { getUser } from '@/utils/supabase/queries';
import { getAdminEmail, isAdminEmail } from '@/utils/admin';

const FORCED_ADMIN_EMAIL = 'morba9850@gmail.com';

type StudioPostRow = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  user_id: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type SubscriptionRow = {
  user_id: string;
  status: string | null;
};

const hasAdminAccess = (email?: string | null) => {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === FORCED_ADMIN_EMAIL || isAdminEmail(normalized);
};

async function requireAdminUser() {
  const supabase = createClient();
  const user = await getUser(supabase);

  if (!hasAdminAccess(user?.email)) {
    redirect('/');
  }

  return user;
}

async function updateMemberRoleAction(formData: FormData) {
  'use server';

  await requireAdminUser();

  const userId = String(formData.get('user_id') ?? '').trim();
  const role = String(formData.get('role') ?? 'user').trim();
  const currentAppMetadataRaw = String(formData.get('current_app_metadata') ?? '{}');

  if (!userId) return;

  let currentAppMetadata: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(currentAppMetadataRaw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      currentAppMetadata = parsed as Record<string, unknown>;
    }
  } catch {
    currentAppMetadata = {};
  }

  const nextRole = role === 'admin' ? 'admin' : 'user';
  const adminClient = createAdminClient();

  await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...currentAppMetadata,
      role: nextRole
    }
  });

  revalidatePath('/admin');
}

async function deleteMemberAction(formData: FormData) {
  'use server';

  const currentUser = await requireAdminUser();
  const userId = String(formData.get('user_id') ?? '').trim();
  const targetEmail = String(formData.get('target_email') ?? '').trim().toLowerCase();

  if (!userId) return;

  if (currentUser?.id && currentUser.id === userId) {
    revalidatePath('/admin');
    return;
  }

  if (targetEmail === FORCED_ADMIN_EMAIL) {
    revalidatePath('/admin');
    return;
  }

  const adminClient = createAdminClient();
  await adminClient.auth.admin.deleteUser(userId);
  revalidatePath('/admin');
}

async function updateStudioPostAction(formData: FormData) {
  'use server';

  await requireAdminUser();

  const postId = String(formData.get('post_id') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const imageUrlValue = String(formData.get('image_url') ?? '').trim();

  if (!postId || !title || !content) {
    revalidatePath('/admin');
    return;
  }

  const adminClient = createAdminClient();
  await (adminClient as never)
    .from('studio_posts')
    .update({
      title,
      content,
      image_url: imageUrlValue || null
    })
    .eq('id', postId);

  revalidatePath('/admin');
}

async function deleteStudioPostAction(formData: FormData) {
  'use server';

  await requireAdminUser();

  const postId = String(formData.get('post_id') ?? '').trim();
  if (!postId) return;

  const adminClient = createAdminClient();
  await (adminClient as never).from('studio_posts').delete().eq('id', postId);
  revalidatePath('/admin');
}

export default async function AdminPage() {
  const adminEmail = getAdminEmail();
  const user = await requireAdminUser();

  const isForcedAdmin =
    user?.email?.trim().toLowerCase() === FORCED_ADMIN_EMAIL;
  const isConfiguredAdmin = Boolean(adminEmail && isAdminEmail(user?.email));

  if (!isForcedAdmin && !isConfiguredAdmin) {
    redirect('/');
  }

  const adminClient = createAdminClient();
  const [
    { data: authData },
    { data: profileData },
    { data: subscriptionData },
    { data: studioPostsData }
  ] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    adminClient.from('users' as never).select('id,full_name'),
    adminClient.from('subscriptions' as never).select('user_id,status'),
    adminClient
      .from('studio_posts' as never)
      .select('id,title,content,image_url,user_id,created_at')
      .order('created_at', { ascending: false })
  ]);

  const profileMap = new Map(
    ((profileData ?? []) as ProfileRow[]).map((profile) => [profile.id, profile.full_name])
  );
  const subscriptionMap = new Map(
    ((subscriptionData ?? []) as SubscriptionRow[]).map((subscription) => [
      subscription.user_id,
      subscription.status
    ])
  );

  const users = authData?.users ?? [];
  const emailMap = new Map(users.map((member) => [member.id, member.email ?? '-']));
  const studioPosts = (studioPostsData ?? []) as StudioPostRow[];

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
            회원 관리와 Studio/Service 게시물 관리를 한 곳에서 진행할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="bg-white/5 text-white">
            <TabsTrigger value="members" className="text-white">
              Member Management
            </TabsTrigger>
            <TabsTrigger value="manage-posts" className="text-white">
              Post Management
            </TabsTrigger>
            <TabsTrigger value="posts" className="text-white">
              Post Creation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="grid grid-cols-1 gap-0 border-b border-white/10 bg-black/60 px-6 py-4 text-sm uppercase tracking-[0.2em] text-neutral-400 sm:grid-cols-[2fr_1.2fr_1fr_2fr]">
                <span>Email</span>
                <span>Name</span>
                <span>Subscription</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-white/10">
                {users.length === 0 ? (
                  <div className="px-6 py-6 text-sm text-neutral-400">
                    등록된 회원이 없습니다.
                  </div>
                ) : (
                  users.map((member) => {
                    const currentRole =
                      member.app_metadata && typeof member.app_metadata === 'object'
                        ? String((member.app_metadata as Record<string, unknown>).role ?? 'user')
                        : 'user';
                    const isSelf = member.id === user?.id;
                    const isProtectedAdmin =
                      (member.email ?? '').trim().toLowerCase() === FORCED_ADMIN_EMAIL;

                    return (
                      <div
                        key={member.id}
                        className="grid grid-cols-1 gap-4 px-6 py-5 text-sm text-neutral-200 sm:grid-cols-[2fr_1.2fr_1fr_2fr]"
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
                        <div className="flex flex-col gap-2 sm:items-start">
                          <form action={updateMemberRoleAction} className="flex w-full flex-wrap items-center gap-2">
                            <input type="hidden" name="user_id" value={member.id} />
                            <input
                              type="hidden"
                              name="current_app_metadata"
                              value={JSON.stringify(member.app_metadata ?? {})}
                            />
                            <select
                              name="role"
                              defaultValue={currentRole === 'admin' ? 'admin' : 'user'}
                              className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs text-white"
                              disabled={isProtectedAdmin}
                            >
                              <option value="user" className="bg-neutral-900">
                                user
                              </option>
                              <option value="admin" className="bg-neutral-900">
                                admin
                              </option>
                            </select>
                            <button
                              type="submit"
                              className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-medium text-white/90 transition hover:bg-white/20"
                              disabled={isProtectedAdmin}
                            >
                              역할 변경
                            </button>
                          </form>

                          <form action={deleteMemberAction}>
                            <input type="hidden" name="user_id" value={member.id} />
                            <input type="hidden" name="target_email" value={member.email ?? ''} />
                            <button
                              type="submit"
                              className="rounded-full border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-300/20 disabled:cursor-not-allowed disabled:opacity-40"
                              disabled={isSelf || isProtectedAdmin}
                              title={
                                isSelf
                                  ? '현재 로그인한 계정은 삭제할 수 없습니다.'
                                  : isProtectedAdmin
                                    ? '보호된 관리자 계정입니다.'
                                    : '회원 삭제'
                              }
                            >
                              삭제
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="manage-posts" className="mt-6">
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
              <div className="border-b border-white/10 bg-black/60 px-6 py-4">
                <h2 className="text-lg font-semibold text-white">게시글 관리</h2>
                <p className="mt-1 text-sm text-neutral-400">
                  기존 Studio 게시글을 수정하거나 삭제할 수 있습니다.
                </p>
              </div>

              <div className="divide-y divide-white/10">
                {studioPosts.length === 0 ? (
                  <div className="px-6 py-6 text-sm text-neutral-400">
                    등록된 게시글이 없습니다.
                  </div>
                ) : (
                  studioPosts.map((post) => (
                    <div key={post.id} className="px-6 py-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-base font-semibold text-white">
                            {post.title}
                          </p>
                          <p className="text-xs text-neutral-400">
                            작성자: {emailMap.get(post.user_id) ?? post.user_id}
                          </p>
                          <p className="text-xs text-neutral-500">
                            생성일:{' '}
                            {new Intl.DateTimeFormat('ko-KR', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            }).format(new Date(post.created_at))}
                          </p>
                        </div>

                        <form action={deleteStudioPostAction}>
                          <input type="hidden" name="post_id" value={post.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-rose-300/30 bg-rose-300/10 px-4 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-300/20"
                          >
                            Delete
                          </button>
                        </form>
                      </div>

                      <details className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
                        <summary className="cursor-pointer select-none text-sm font-medium text-white">
                          Edit Post
                        </summary>
                        <form action={updateStudioPostAction} className="mt-4 space-y-4">
                          <input type="hidden" name="post_id" value={post.id} />

                          <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-[0.2em] text-neutral-400">
                              Title
                            </label>
                            <input
                              name="title"
                              defaultValue={post.title}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/20"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-[0.2em] text-neutral-400">
                              Image URL
                            </label>
                            <input
                              name="image_url"
                              defaultValue={post.image_url ?? ''}
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/20"
                              placeholder="https://..."
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-xs uppercase tracking-[0.2em] text-neutral-400">
                              Content
                            </label>
                            <textarea
                              name="content"
                              defaultValue={post.content}
                              className="min-h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-white/20"
                              required
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      </details>
                    </div>
                  ))
                )}
              </div>
            </section>
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
