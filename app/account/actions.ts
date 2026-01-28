'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';

export type StudioPostFormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function createStudioPost(
  _prevState: StudioPostFormState,
  formData: FormData
): Promise<StudioPostFormState> {
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const file = formData.get('image');

  if (!title || !content) {
    return { status: 'error', message: '제목과 내용을 모두 입력해 주세요.' };
  }

  if (!(file instanceof File)) {
    return { status: 'error', message: '이미지를 첨부해 주세요.' };
  }

  if (!file.type.startsWith('image/')) {
    return { status: 'error', message: '이미지 파일만 업로드할 수 있습니다.' };
  }

  if (file.size > MAX_UPLOAD_SIZE) {
    return { status: 'error', message: '이미지 파일은 5MB 이하만 가능합니다.' };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }

  const admin = createAdminClient();
  const fileExt = file.name.split('.').pop() ?? 'png';
  const fileName = `${randomUUID()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from('studio-posts')
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { status: 'error', message: '이미지 업로드에 실패했습니다.' };
  }

  const { data: publicData } = admin.storage
    .from('studio-posts')
    .getPublicUrl(filePath);

  const { error: insertError } = await (admin as never)
    .from('studio_posts')
    .insert({
      title,
      content,
      image_url: publicData.publicUrl,
      user_id: user.id
    });

  if (insertError) {
    return { status: 'error', message: '게시물 저장에 실패했습니다.' };
  }

  revalidatePath('/');
  return { status: 'success', message: '작성 완료' };
}
