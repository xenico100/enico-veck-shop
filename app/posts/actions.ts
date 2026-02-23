'use server';

import { randomUUID } from 'crypto';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

const STUDIO_POSTS_TABLE = 'studio_posts';
const STUDIO_BUCKET = 'studio';
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

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

export type StudioPostUpdateState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  postId?: string;
  fieldErrors?: {
    title?: string;
    content?: string;
    image?: string;
  };
};

export type StudioPostDeleteState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  postId?: string;
};

type StudioPostRow = {
  id: string;
  user_id: string;
  image_url: string | null;
};

type ActionResult = {
  ok: true;
  postId: string;
} | {
  ok: false;
  message: string;
  fieldErrors?: {
    title?: string;
    content?: string;
    image?: string;
  };
};

const isImageFile = (file: File) => file.type.startsWith('image/');

const validateImageFile = (file: File | null) => {
  if (!file || file.size <= 0) return null;
  if (!isImageFile(file)) {
    return '이미지 파일만 업로드할 수 있습니다.';
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return '이미지 파일은 5MB 이하만 가능합니다.';
  }
  return null;
};

const extractStudioStoragePath = (url: string | null | undefined) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${STUDIO_BUCKET}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index < 0) return null;
    const rawPath = parsed.pathname.slice(index + marker.length);
    return decodeURIComponent(rawPath);
  } catch {
    return null;
  }
};

const getAdminStorageClient = async () => {
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const hasUrl = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!hasServiceRole || !hasUrl) return null;

  try {
    const { createAdminClient } = await import('@/utils/supabase/adminClient');
    return createAdminClient();
  } catch {
    return null;
  }
};

const ensureStudioBucketExists = async () => {
  const adminClient = await getAdminStorageClient();
  if (!adminClient) return;

  const { data: buckets } = await adminClient.storage.listBuckets();
  const exists = (buckets ?? []).some((bucket) => bucket.name === STUDIO_BUCKET);

  if (!exists) {
    await adminClient.storage.createBucket(STUDIO_BUCKET, {
      public: true
    });
  }
};

const uploadStudioImage = async (
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> => {
  const imageError = validateImageFile(file);
  if (imageError) {
    return { error: imageError };
  }

  await ensureStudioBucketExists();

  const fileExt = file.name.split('.').pop() ?? 'png';
  const fileName = `${randomUUID()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const adminClient = await getAdminStorageClient();
  const supabase = createClient();
  const storageClient = adminClient ?? supabase;

  const { error: uploadError } = await storageClient.storage
    .from(STUDIO_BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: '이미지 업로드에 실패했습니다.' };
  }

  const { data: publicData } = storageClient.storage
    .from(STUDIO_BUCKET)
    .getPublicUrl(filePath);

  if (!publicData?.publicUrl) {
    return { error: '이미지 URL 생성에 실패했습니다.' };
  }

  return { url: publicData.publicUrl };
};

const removeStudioImageIfOwned = async (userId: string, imageUrl: string | null | undefined) => {
  const path = extractStudioStoragePath(imageUrl);
  if (!path) return;
  if (!path.startsWith(`${userId}/`)) return;

  const adminClient = await getAdminStorageClient();
  const supabase = createClient();
  const storageClient = adminClient ?? supabase;

  await storageClient.storage.from(STUDIO_BUCKET).remove([path]);
};

const getAuthenticatedUser = async () => {
  const supabase = createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null as null, error: '로그인이 필요합니다.' };
  }

  return { supabase, user, error: null as string | null };
};

const getOwnedPost = async (
  postId: string,
  userId: string
): Promise<{ post: StudioPostRow | null; message?: string }> => {
  const supabase = createClient();
  const { data, error } = await (supabase as never)
    .from(STUDIO_POSTS_TABLE)
    .select('id,user_id,image_url')
    .eq('id', postId)
    .maybeSingle();

  if (error || !data) {
    return { post: null, message: '게시물을 찾을 수 없습니다.' };
  }

  const post = data as StudioPostRow;

  if (post.user_id !== userId) {
    return { post: null, message: '게시물을 수정/삭제할 권한이 없습니다.' };
  }

  return { post };
};

const revalidateStudioPostPaths = (postId?: string) => {
  revalidatePath('/');
  revalidatePath('/account');
  revalidatePath('/posts');
  if (postId) {
    revalidatePath(`/posts/${postId}`);
    revalidatePath(`/posts/${postId}/edit`);
  }
};

async function createStudioPostInternal(formData: FormData): Promise<ActionResult> {
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const fileValue = formData.get('image');
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  const fieldErrors: CreatePostState['fieldErrors'] = {};
  if (!title) fieldErrors.title = '제목을 입력해 주세요.';
  if (!content) fieldErrors.content = '내용을 입력해 주세요.';

  const imageError = file ? validateImageFile(file) : null;
  if (imageError) fieldErrors.image = imageError;

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: '필수 입력값을 확인해 주세요.', fieldErrors };
  }

  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, message: error ?? '로그인이 필요합니다.' };
  }

  let imageUrl: string | null = null;
  if (file) {
    const upload = await uploadStudioImage(user.id, file);
    if ('error' in upload) {
      return { ok: false, message: upload.error, fieldErrors: { image: upload.error } };
    }
    imageUrl = upload.url;
  }

  const { data, error: insertError } = await (supabase as never)
    .from(STUDIO_POSTS_TABLE)
    .insert({
      title,
      content,
      image_url: imageUrl,
      user_id: user.id
    })
    .select('id')
    .single();

  if (insertError || !data?.id) {
    return { ok: false, message: '게시물 저장에 실패했습니다.' };
  }

  const postId = data.id as string;
  revalidateStudioPostPaths(postId);
  return { ok: true, postId };
}

async function updateStudioPostInternal(formData: FormData): Promise<ActionResult> {
  const postId = String(formData.get('postId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const explicitImageUrl = String(formData.get('imageUrl') ?? '').trim();
  const existingImageUrl = String(formData.get('existingImageUrl') ?? '').trim();
  const removeImage = String(formData.get('removeImage') ?? '') === 'on';
  const fileValue = formData.get('image');
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

  if (!postId) {
    return { ok: false, message: '게시물을 찾을 수 없습니다.' };
  }

  const fieldErrors: StudioPostUpdateState['fieldErrors'] = {};
  if (!title) fieldErrors.title = '제목을 입력해 주세요.';
  if (!content) fieldErrors.content = '내용을 입력해 주세요.';
  const imageError = file ? validateImageFile(file) : null;
  if (imageError) fieldErrors.image = imageError;
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: '입력값을 확인해 주세요.', fieldErrors };
  }

  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, message: error ?? '로그인이 필요합니다.' };
  }

  const { post, message } = await getOwnedPost(postId, user.id);
  if (!post) {
    return { ok: false, message: message ?? '게시물을 찾을 수 없습니다.' };
  }

  let nextImageUrl = explicitImageUrl || post.image_url || null;

  if (removeImage) {
    nextImageUrl = null;
  }

  if (file) {
    const upload = await uploadStudioImage(user.id, file);
    if ('error' in upload) {
      return { ok: false, message: upload.error, fieldErrors: { image: upload.error } };
    }
    nextImageUrl = upload.url;
  }

  const { error: updateError } = await (supabase as never)
    .from(STUDIO_POSTS_TABLE)
    .update({
      title,
      content,
      image_url: nextImageUrl
    })
    .eq('id', postId)
    .eq('user_id', user.id);

  if (updateError) {
    return { ok: false, message: '게시물 수정에 실패했습니다.' };
  }

  const previousImage = post.image_url || (existingImageUrl || null);
  if (previousImage && previousImage !== nextImageUrl) {
    await removeStudioImageIfOwned(user.id, previousImage);
  }

  revalidateStudioPostPaths(postId);
  return { ok: true, postId };
}

async function deleteStudioPostInternal(formData: FormData): Promise<ActionResult> {
  const postId = String(formData.get('postId') ?? '').trim();

  if (!postId) {
    return { ok: false, message: '게시물을 찾을 수 없습니다.' };
  }

  const { supabase, user, error } = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, message: error ?? '로그인이 필요합니다.' };
  }

  const { post, message } = await getOwnedPost(postId, user.id);
  if (!post) {
    return { ok: false, message: message ?? '게시물을 찾을 수 없습니다.' };
  }

  const { error: deleteError } = await (supabase as never)
    .from(STUDIO_POSTS_TABLE)
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id);

  if (deleteError) {
    return { ok: false, message: '게시물 삭제에 실패했습니다.' };
  }

  await removeStudioImageIfOwned(user.id, post.image_url);

  revalidateStudioPostPaths(postId);
  return { ok: true, postId };
}

export async function createPost(
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const result = await createStudioPostInternal(formData);
  if (!result.ok) {
    return {
      status: 'error',
      message: result.message,
      fieldErrors: result.fieldErrors
    };
  }
  return { status: 'success', postId: result.postId };
}

export async function updateStudioPost(
  _prevState: StudioPostUpdateState,
  formData: FormData
): Promise<StudioPostUpdateState> {
  const requestedPostId = String(formData.get('postId') ?? '').trim() || undefined;
  const result = await updateStudioPostInternal(formData);
  if (!result.ok) {
    return {
      status: 'error',
      postId: requestedPostId,
      message: result.message,
      fieldErrors: result.fieldErrors
    };
  }
  return { status: 'success', postId: result.postId };
}

export async function deleteStudioPost(
  _prevState: StudioPostDeleteState,
  formData: FormData
): Promise<StudioPostDeleteState> {
  const requestedPostId = String(formData.get('postId') ?? '').trim() || undefined;
  const result = await deleteStudioPostInternal(formData);
  if (!result.ok) {
    return { status: 'error', postId: requestedPostId, message: result.message };
  }
  return { status: 'success', postId: result.postId };
}

export async function createPostAndRedirect(formData: FormData) {
  const result = await createStudioPostInternal(formData);
  if (!result.ok) {
    redirect(`/posts/new?error=${encodeURIComponent(result.message)}`);
  }
  redirect(`/posts/${result.postId}`);
}

export async function updatePostAndRedirect(formData: FormData) {
  const postId = String(formData.get('postId') ?? '').trim();
  const result = await updateStudioPostInternal(formData);
  if (!result.ok) {
    redirect(`/posts/${postId}/edit?error=${encodeURIComponent(result.message)}`);
  }
  redirect(`/posts/${result.postId}`);
}

export async function deletePostAndRedirect(formData: FormData) {
  const result = await deleteStudioPostInternal(formData);
  if (!result.ok) {
    const postId = String(formData.get('postId') ?? '').trim();
    redirect(`/posts/${postId}?error=${encodeURIComponent(result.message)}`);
  }
  redirect('/posts');
}
