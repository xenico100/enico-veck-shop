import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/adminClient';
import { signR2GetUrl } from '@/utils/r2';
import { isAdminEmailValue } from '@/utils/service-posts';

type RouteContext = {
  params: { id: string };
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: RouteContext) {
  const servicePostId = String(params.id || '').trim();
  if (!servicePostId) {
    return jsonError('잘못된 서비스 게시글 ID입니다.', 400);
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonError('로그인이 필요합니다.', 401);
  }

  const adminClient = createAdminClient();
  const { data: post, error: postError } = await (adminClient as any)
    .from('service_posts')
    .select('id,title,is_paid_file,download_file_url,created_by,is_published')
    .eq('id', servicePostId)
    .maybeSingle();

  if (postError) {
    return jsonError('서비스 게시글을 확인하지 못했습니다.', 500, postError);
  }
  if (!post) {
    return jsonError('서비스 게시글을 찾을 수 없습니다.', 404);
  }

  if (post.is_paid_file !== true) {
    return jsonError('유료 다운로드 파일이 설정된 게시글이 아닙니다.', 400);
  }

  const r2Key =
    typeof post.download_file_url === 'string' && post.download_file_url.trim()
      ? post.download_file_url.trim()
      : null;

  if (!r2Key) {
    return jsonError('다운로드 파일이 아직 등록되지 않았습니다.', 404);
  }

  const isAdmin = isAdminEmailValue(user.email) || post.created_by === user.id;
  let hasPurchased = false;
  if (!isAdmin) {
    const { data: purchase, error: purchaseError } = await (adminClient as any)
      .from('service_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('service_post_id', servicePostId)
      .eq('status', 'completed')
      .maybeSingle();

    if (purchaseError) {
      return jsonError('구매 내역 확인에 실패했습니다.', 500, purchaseError);
    }

    hasPurchased = Boolean(purchase?.id);
    if (!hasPurchased) {
      return jsonError('구매 내역이 확인되지 않아 다운로드할 수 없습니다.', 403);
    }
  }

  try {
    const url = await signR2GetUrl(r2Key, { expiresIn: 300 });
    return NextResponse.json({
      data: {
        url,
        expires_in: 300
      }
    });
  } catch (error) {
    console.error('[service-posts/download] signR2GetUrl failed', {
      servicePostId,
      userId: user.id,
      error
    });
    return jsonError(error instanceof Error ? error.message : '다운로드 링크 생성 실패', 500);
  }
}
