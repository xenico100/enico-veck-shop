import 'server-only';

import { deleteR2Objects } from '@/utils/r2';

type StudioMediaCleanupFailure = {
  key: string;
  bucketName: string | null;
  reason: string;
};

export type StudioMediaR2CleanupResult = {
  ok: boolean;
  deletedCount: number;
  failedCount: number;
  failed: StudioMediaCleanupFailure[];
  message?: string;
};

const hasMissingStudioMediaTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const row = error as Record<string, unknown>;
  const message = typeof row.message === 'string' ? row.message : '';
  const details = typeof row.details === 'string' ? row.details : '';
  const hint = typeof row.hint === 'string' ? row.hint : '';
  const combined = `${message} ${details} ${hint}`.toLowerCase();
  return combined.includes('studio_media') && combined.includes('does not exist');
};

const normalizeString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

export async function cleanupStudioPostMediaFromR2(
  adminClient: any,
  studioPostId: string
): Promise<StudioMediaR2CleanupResult> {
  const postId = studioPostId.trim();
  if (!postId) {
    return {
      ok: false,
      deletedCount: 0,
      failedCount: 0,
      failed: [],
      message: '잘못된 Studio 게시글 ID입니다.'
    };
  }

  const { data, error } = await (adminClient as any)
    .from('studio_media')
    .select('r2_key,r2_bucket')
    .eq('studio_post_id', postId);

  if (error) {
    if (hasMissingStudioMediaTableError(error)) {
      return {
        ok: false,
        deletedCount: 0,
        failedCount: 0,
        failed: [],
        message:
          'studio_media 테이블이 없어 R2 파일을 정리할 수 없습니다. 마이그레이션 적용 후 다시 시도해 주세요.'
      };
    }
    return {
      ok: false,
      deletedCount: 0,
      failedCount: 0,
      failed: [],
      message: '게시글에 연결된 Studio 미디어 조회에 실패했습니다.'
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const objectMap = new Map<string, { key: string; bucketName: string | null }>();

  for (const row of rows) {
    const key = normalizeString((row as Record<string, unknown>).r2_key);
    if (!key) continue;
    const bucketName = normalizeString((row as Record<string, unknown>).r2_bucket) || null;
    objectMap.set(`${bucketName ?? ''}:${key}`, {
      key,
      bucketName
    });
  }

  const objects = Array.from(objectMap.values());
  if (objects.length === 0) {
    return {
      ok: true,
      deletedCount: 0,
      failedCount: 0,
      failed: []
    };
  }

  const { deleted, failed } = await deleteR2Objects(objects);

  if (failed.length > 0) {
    return {
      ok: false,
      deletedCount: deleted.length,
      failedCount: failed.length,
      failed,
      message: 'R2 파일 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.'
    };
  }

  return {
    ok: true,
    deletedCount: deleted.length,
    failedCount: 0,
    failed: []
  };
}
