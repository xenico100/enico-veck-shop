'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export type StudioPostUpdateState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  postId?: string;
};

export type StudioPostDeleteState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  postId?: string;
};

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function updateStudioPost(
  _prevState: StudioPostUpdateState,
  formData: FormData
): Promise<StudioPostUpdateState> {
  const postId = String(formData.get('postId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const file = formData.get('image');

  if (!postId) {
    return { status: 'error', message: '게시물을 찾을 수 없습니다.' };
  }

  if (!title || !content) {
    return {
      status: 'error',
      message: '제목과 내용을 모두 입력해 주세요.',
      postId
    };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.', postId };
  }

  let imageUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) {
      return {
        status: 'error',
        message: '이미지 파일만 업로드할 수 있습니다.',
        postId
      };
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return {
        status: 'error',
        message: '이미지 파일은 5MB 이하만 가능합니다.',
        postId
      };
    }

    const fileExt = file.name.split('.').pop() ?? 'png';
    const fileName = `${randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('studio-posts')
      .upload(filePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return {
        status: 'error',
        message: '이미지 업로드에 실패했습니다.',
        postId
      };
    }

    const { data: publicData } = supabase.storage
      .from('studio-posts')
      .getPublicUrl(filePath);
    imageUrl = publicData.publicUrl;
  }

  const updatePayload = {
    title,
    content,
    ...(imageUrl ? { image_url: imageUrl } : {})
  };

  const { error: updateError } = await (supabase as never)
    .from('studio_posts')
    .update(updatePayload)
    .eq('id', postId);

  if (updateError) {
    return {
      status: 'error',
      message: '게시물 수정에 실패했습니다.',
      postId
    };
  }

  revalidatePath('/');
  revalidatePath('/account');
  return { status: 'success', postId };
}

export async function deleteStudioPost(
  _prevState: StudioPostDeleteState,
  formData: FormData
): Promise<StudioPostDeleteState> {
  const postId = String(formData.get('postId') ?? '').trim();

  if (!postId) {
    return { status: 'error', message: '게시물을 찾을 수 없습니다.' };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.', postId };
  }

  const { error } = await (supabase as never)
    .from('studio_posts')
    .delete()
    .eq('id', postId);

  if (error) {
    return { status: 'error', message: '게시물 삭제에 실패했습니다.', postId };
  }

  revalidatePath('/');
  revalidatePath('/account');
  return { status: 'success', postId };
}
