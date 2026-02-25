'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ActionButton from '@/components/ui/ActionButton';

type StudioPostOption = {
  id: string;
  title: string | null;
  created_at: string | null;
};

type StudioMediaRow = {
  id: string;
  studio_post_id: string;
  kind: 'image' | 'video';
  r2_bucket: string;
  r2_key: string;
  mime: string | null;
  bytes: number | null;
  created_at: string | null;
};

type ApiPayload = {
  data?: {
    studio_posts?: StudioPostOption[];
    studio_media?: StudioMediaRow[];
  };
  message?: string;
};

type Props = {
  enabled: boolean;
};

type Draft = {
  studio_post_id: string;
  kind: 'image' | 'video';
  r2_bucket: string;
  r2_key: string;
  mime: string;
  bytes: string;
};

const defaultDraft: Draft = {
  studio_post_id: '',
  kind: 'image',
  r2_bucket: '',
  r2_key: '',
  mime: '',
  bytes: ''
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function StudioMediaAdminManager({ enabled }: Props) {
  const [posts, setPosts] = useState<StudioPostOption[]>([]);
  const [mediaRows, setMediaRows] = useState<StudioMediaRow[]>([]);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/25';
  const labelClass = 'text-xs uppercase tracking-[0.18em] text-white/50';

  const fetchMediaAdminData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/studio-media', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as ApiPayload;
      if (!response.ok) {
        throw new Error(payload.message || 'Studio 미디어 데이터를 불러오지 못했습니다.');
      }

      const nextPosts = Array.isArray(payload.data?.studio_posts) ? payload.data!.studio_posts! : [];
      const nextMedia = Array.isArray(payload.data?.studio_media) ? payload.data!.studio_media! : [];

      setPosts(nextPosts);
      setMediaRows(nextMedia);
      setDraft((prev) => ({
        ...prev,
        studio_post_id: prev.studio_post_id || nextPosts[0]?.id || ''
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Studio 미디어 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void fetchMediaAdminData();
  }, [enabled, fetchMediaAdminData]);

  const mediaByPost = useMemo(() => {
    const grouped = new Map<string, StudioMediaRow[]>();
    for (const row of mediaRows) {
      const current = grouped.get(row.studio_post_id) ?? [];
      current.push(row);
      grouped.set(row.studio_post_id, current);
    }
    return grouped;
  }, [mediaRows]);

  const handleCreate = async () => {
    setError(null);
    setMessage(null);

    if (!draft.studio_post_id) {
      setError('Studio 게시글을 선택해 주세요.');
      return;
    }
    if (!draft.r2_key.trim()) {
      setError('R2 key를 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/studio-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio_post_id: draft.studio_post_id,
          kind: draft.kind,
          r2_bucket: draft.r2_bucket.trim() || null,
          r2_key: draft.r2_key.trim(),
          mime: draft.mime.trim() || null,
          bytes: draft.bytes.trim() || null
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        data?: StudioMediaRow;
        message?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || 'Studio 미디어 등록에 실패했습니다.');
      }

      setMediaRows((prev) => [payload.data as StudioMediaRow, ...prev]);
      setDraft((prev) => ({
        ...prev,
        r2_key: '',
        mime: '',
        bytes: ''
      }));
      setMessage('Studio 미디어 메타데이터를 등록했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Studio 미디어 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDirectUpload = async () => {
    setError(null);
    setMessage(null);

    if (!draft.studio_post_id) {
      setError('Studio 게시글을 선택해 주세요.');
      return;
    }
    if (!selectedFile) {
      setError('업로드할 파일을 선택해 주세요.');
      return;
    }

    const contentType = (selectedFile.type || '').trim().toLowerCase();
    if (!contentType) {
      setError('파일 MIME 타입을 확인할 수 없습니다.');
      return;
    }
    if (draft.kind === 'image' && !contentType.startsWith('image/')) {
      setError('kind=image 인 경우 이미지 파일만 업로드할 수 있습니다.');
      return;
    }
    if (draft.kind === 'video' && !contentType.startsWith('video/')) {
      setError('kind=video 인 경우 비디오 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploading(true);

    try {
      const presignResponse = await fetch('/api/r2/presign-put', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioPostId: draft.studio_post_id,
          filename: selectedFile.name,
          contentType,
          bytes: selectedFile.size,
          kind: draft.kind
        })
      });

      const presignPayload = (await presignResponse.json().catch(() => ({}))) as {
        r2_key?: string;
        uploadUrl?: string;
        message?: string;
      };

      if (
        !presignResponse.ok ||
        typeof presignPayload.r2_key !== 'string' ||
        typeof presignPayload.uploadUrl !== 'string'
      ) {
        throw new Error(presignPayload.message || 'R2 업로드 URL 발급에 실패했습니다.');
      }

      const putResponse = await fetch(presignPayload.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType
        },
        body: selectedFile
      });

      if (!putResponse.ok) {
        throw new Error(`R2 업로드 실패 (${putResponse.status})`);
      }

      const registerResponse = await fetch('/api/studio/media/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studioPostId: draft.studio_post_id,
          kind: draft.kind,
          r2_key: presignPayload.r2_key,
          mime: contentType,
          bytes: selectedFile.size
        })
      });

      const registerPayload = (await registerResponse.json().catch(() => ({}))) as {
        data?: StudioMediaRow;
        message?: string;
      };

      if (!registerResponse.ok || !registerPayload.data) {
        throw new Error(registerPayload.message || 'Studio 미디어 등록에 실패했습니다.');
      }

      setMediaRows((prev) => [registerPayload.data as StudioMediaRow, ...prev]);
      setSelectedFile(null);
      setFileInputKey((prev) => prev + 1);
      setDraft((prev) => ({
        ...prev,
        r2_key: '',
        mime: '',
        bytes: ''
      }));
      setMessage('R2 업로드 및 Studio 미디어 등록이 완료되었습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'R2 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (row: StudioMediaRow) => {
    if (!window.confirm(`"${row.r2_key}" 메타데이터를 삭제할까요? (R2 파일은 삭제되지 않음)`)) {
      return;
    }

    setDeletingId(row.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/studio-media/${row.id}`, { method: 'DELETE' });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || 'Studio 미디어 삭제에 실패했습니다.');
      }

      setMediaRows((prev) => prev.filter((item) => item.id !== row.id));
      setMessage('Studio 미디어 메타데이터를 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Studio 미디어 삭제에 실패했습니다.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!enabled) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-white">Studio 미디어 관리 (R2 업로드 + 연결)</h4>
          <p className="mt-1 text-sm text-white/60">
            관리자만 Presigned PUT URL로 R2(비공개)에 직접 업로드하고, 업로드 후 `studio_media`에 메타데이터를 등록합니다.
          </p>
        </div>
        <ActionButton type="button" variant="secondary" size="sm" onClick={fetchMediaAdminData}>
          {loading ? '불러오는 중…' : '새로고침'}
        </ActionButton>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          {message}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-white">R2 직접 업로드 + 미디어 등록</p>
          <span className="text-xs text-white/45">Presigned PUT (5분 만료)</span>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <label className={labelClass}>Studio Post</label>
            <select
              className={inputClass}
              value={draft.studio_post_id}
              onChange={(e) => setDraft((prev) => ({ ...prev, studio_post_id: e.target.value }))}
              disabled={saving || uploading}
            >
              <option value="" className="bg-neutral-900">
                게시글 선택
              </option>
              {posts.map((post) => (
                <option key={post.id} value={post.id} className="bg-neutral-900">
                  {(post.title || '제목 없음').slice(0, 80)} ({post.id.slice(0, 8)}…)
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>Kind</label>
            <select
              className={inputClass}
              value={draft.kind}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  kind: e.target.value === 'video' ? 'video' : 'image'
                }))
              }
              disabled={saving || uploading}
            >
              <option value="image" className="bg-neutral-900">
                image
              </option>
              <option value="video" className="bg-neutral-900">
                video
              </option>
            </select>
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>업로드 파일</label>
            <input
              key={fileInputKey}
              type="file"
              accept={draft.kind === 'video' ? 'video/*' : 'image/*'}
              className="block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border file:border-white/20 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              disabled={saving || uploading}
            />
            <p className="text-xs text-white/45">
              {selectedFile
                ? `${selectedFile.name} · ${selectedFile.type || 'unknown'} · ${selectedFile.size.toLocaleString()} bytes`
                : 'image/* 또는 video/* 파일 선택'}
            </p>
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>R2 Bucket (optional)</label>
            <input
              className={inputClass}
              value={draft.r2_bucket}
              onChange={(e) => setDraft((prev) => ({ ...prev, r2_bucket: e.target.value }))}
              placeholder="비워두면 R2_BUCKET_NAME 사용 (수동 등록용)"
              disabled={saving || uploading}
            />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <label className={labelClass}>R2 Key</label>
            <input
              className={inputClass}
              value={draft.r2_key}
              onChange={(e) => setDraft((prev) => ({ ...prev, r2_key: e.target.value }))}
              placeholder="studio/post-uuid/media/file.mp4"
              disabled={saving || uploading}
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>MIME (optional)</label>
            <input
              className={inputClass}
              value={draft.mime}
              onChange={(e) => setDraft((prev) => ({ ...prev, mime: e.target.value }))}
              placeholder={draft.kind === 'video' ? 'video/mp4' : 'image/jpeg'}
              disabled={saving || uploading}
            />
          </div>

          <div className="grid gap-2">
            <label className={labelClass}>Bytes (optional)</label>
            <input
              className={inputClass}
              inputMode="numeric"
              value={draft.bytes}
              onChange={(e) => setDraft((prev) => ({ ...prev, bytes: e.target.value }))}
              placeholder="1048576"
              disabled={saving || uploading}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <ActionButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleDirectUpload}
            disabled={saving || uploading}
          >
            {uploading ? '업로드 중…' : '파일 업로드 + 등록'}
          </ActionButton>
          <ActionButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCreate}
            disabled={saving || uploading}
            title="수동으로 이미 업로드된 R2 객체를 studio_media에만 등록"
          >
            {saving ? '저장 중…' : '수동 메타데이터 등록'}
          </ActionButton>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-white">연결된 Studio 미디어</p>
          <span className="text-xs text-white/45">{mediaRows.length}개</span>
        </div>

        <div className="space-y-4">
          {posts.length === 0 && !loading && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              Studio 게시글이 없습니다. 먼저 게시글을 생성하세요.
            </div>
          )}

          {posts.map((post) => {
            const rows = mediaByPost.get(post.id) ?? [];
            return (
              <div key={post.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {post.title || '제목 없음'}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {post.id} · {formatDate(post.created_at)}
                    </p>
                  </div>
                  <span className="text-xs text-white/50">{rows.length} media</span>
                </div>

                {rows.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/5 p-3 text-xs text-white/50">
                    연결된 미디어 없음
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {rows.map((row) => (
                      <div
                        key={row.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                              {row.kind} · {row.r2_bucket}
                            </p>
                            <p className="mt-1 break-all text-sm text-white">{row.r2_key}</p>
                            <p className="mt-1 text-xs text-white/45">
                              {row.mime || 'mime 없음'}
                              {row.bytes != null ? ` · ${row.bytes} bytes` : ''}
                              {row.created_at ? ` · ${formatDate(row.created_at)}` : ''}
                            </p>
                          </div>
                          <ActionButton
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => void handleDelete(row)}
                            disabled={deletingId === row.id}
                          >
                            {deletingId === row.id ? '삭제 중…' : '삭제'}
                          </ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
