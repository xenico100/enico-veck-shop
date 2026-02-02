'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export type CreatePostState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  postId?: string;
  fieldErrors?: {
    title?: string;
    content?: string;
    image?: string;
  };
};

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

export async function createPost(
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const file = formData.get('image');

  const fieldErrors: CreatePostState['fieldErrors'] = {};

  if (!title) {
    fieldErrors.title = '제목을 입력해 주세요.';
  }

  if (!content) {
    fieldErrors.content = '내용을 입력해 주세요.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      message: '필수 입력값을 확인해 주세요.',
      fieldErrors
    };
  }

  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: 'error', message: '로그인이 필요합니다.' };
  }

  let imageUrl: string | null = null;

  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) {
      return {
        status: 'error',
        message: '이미지 파일만 업로드할 수 있습니다.',
        fieldErrors: { image: '이미지 파일만 업로드할 수 있습니다.' }
      };
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return {
        status: 'error',
        message: '이미지 파일은 5MB 이하만 가능합니다.',
        fieldErrors: { image: '이미지 파일은 5MB 이하만 가능합니다.' }
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
      return { status: 'error', message: '이미지 업로드에 실패했습니다.' };
    }

    const { data: publicData } = supabase.storage
      .from('studio-posts')
      .getPublicUrl(filePath);
    imageUrl = publicData.publicUrl;
  }

  const { data, error: insertError } = await (supabase as never)
    .from('studio_posts')
    .insert({
      title,
      content,
      image_url: imageUrl,
      user_id: user.id
    })
    .select('id')
    .single();

  if (insertError || !data?.id) {
    return { status: 'error', message: '게시물 저장에 실패했습니다.' };
  }

  const postId = data.id as string;

  revalidatePath('/');
  revalidatePath('/account');
  revalidatePath('/posts');
  revalidatePath(`/posts/${postId}`);

  return { status: 'success', postId };
}
