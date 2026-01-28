import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileForm from '@/components/ProfileForm';

export default async function MyPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles' as never)
    .select('phone,address')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <section className="min-h-screen bg-black pb-24">
      <div className="mx-auto max-w-5xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.45em] text-neutral-400">
            My Page
          </p>
          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            내 정보
          </h1>
          <p className="mx-auto max-w-2xl text-sm text-neutral-400">
            계정 이메일과 연락처, 주소를 관리할 수 있습니다.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-black/70 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
            Email
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {user.email ?? '-'}
          </p>
        </div>

        <ProfileForm
          initialPhone={profile?.phone ?? ''}
          initialAddress={profile?.address ?? ''}
        />
      </div>
    </section>
  );
}
