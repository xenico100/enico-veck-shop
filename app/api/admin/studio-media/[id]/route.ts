import { NextResponse } from 'next/server';
import { getAdminApiContext } from '@/utils/admin-api';

type RouteContext = {
  params: { id: string };
};

const jsonError = (message: string, status = 500, details?: unknown) =>
  NextResponse.json({ message, ...(details ? { details } : {}) }, { status });

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { user, isAdmin, adminClient } = await getAdminApiContext();

  if (!user) return jsonError('로그인이 필요합니다.', 401);
  if (!isAdmin || !adminClient) return jsonError('관리자 권한이 없습니다.', 403);

  const id = (params.id || '').trim();
  if (!id) return jsonError('잘못된 미디어 ID입니다.', 400);

  const { error } = await (adminClient as any).from('studio_media').delete().eq('id', id);
  if (error) return jsonError('Studio 미디어 삭제에 실패했습니다.', 500, error);

  return NextResponse.json({ ok: true });
}
