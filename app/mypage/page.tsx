import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import MyPageProfileForm from '@/components/MyPageProfileForm';

export default async function MyPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/signin');
  }

  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('phone,address')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <section className="mb-32 bg-black">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:pt-24 lg:px-8">
        <div className="sm:align-center sm:flex sm:flex-col">
          <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
            My Page
          </h1>
          <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
            회원 정보를 확인하고 업데이트하세요.
          </p>
        </div>
      </div>
      <div className="p-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-400">
              Profile
            </p>
            <h2 className="text-2xl font-semibold text-white">회원정보</h2>
            <p className="text-sm text-neutral-300">
              로그인한 계정의 정보만 표시됩니다.
            </p>
          </div>
          <div className="mt-6 grid gap-4 text-sm text-neutral-200">
            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/40 p-4">
              <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                이메일
              </span>
              <span className="text-white">{user.email ?? '-'}</span>
            </div>
          </div>
          <MyPageProfileForm
            phone={profile?.phone ?? null}
            address={profile?.address ?? null}
          />
        </div>
      </div>
    </section>
  );
}
