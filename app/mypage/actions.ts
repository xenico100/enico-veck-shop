'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export type ProfileFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const phone = String(formData.get('phone') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }

  const { error } = await (supabase as never)
    .from('profiles')
    .update({
      phone: phone || null,
      address: address || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) {
    return { status: 'error', message: '회원정보 수정에 실패했습니다.' };
  }

  revalidatePath('/mypage');
  return { status: 'success', message: '회원정보가 저장되었습니다.' };
}
