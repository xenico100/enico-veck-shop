'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toasts/use-toast';
import ActionButton from '@/components/ui/ActionButton';
import { createPost, type CreatePostState } from '@/app/posts/actions';

const initialState: CreatePostState = {
  status: 'idle'
};

const STUDIO_POST_ACCESS_OPTIONS = [
  {
    value: 0,
    title: '일반 공개',
    description: '로그인/구독 여부와 관계없이 본문 열람 가능'
  },
  {
    value: 1,
    title: '베이직 멤버십',
    description: '월 4,900원 이상 멤버십에서 열람 가능'
  },
  {
    value: 2,
    title: '플러스 멤버십',
    description: '월 13,900원 이상 멤버십에서 열람 가능'
  },
  {
    value: 3,
    title: '프리미엄 멤버십',
    description: '월 69,000원 멤버십에서만 열람 가능'
  }
] as const;

const buildStudioDetailUrl = (postId?: string | null) => {
  const trimmedId = postId?.trim() || '';
  if (!trimmedId) return '/#studio';
  return `/?studioPost=${encodeURIComponent(trimmedId)}#studio`;
};

const getVideoUploadErrorMessage = (error: unknown) => {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return '동영상 R2 업로드 요청이 브라우저에서 차단되었습니다. 배포 도메인에 대한 R2 CORS 설정을 확인해 주세요.';
  }
  return error instanceof Error ? error.message : 'R2 동영상 업로드에 실패했습니다.';
};

const rollbackCreatedPost = async (postId: string) => {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.message || `게시글 롤백에 실패했습니다. (HTTP ${response.status})`
    );
  }
};

function SubmitButton({ extraPending = false }: { extraPending?: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || extraPending;

  return (
    <ActionButton type="submit" variant="primary" size="md" disabled={disabled}>
      {pending ? '게시물 작성 중...' : extraPending ? '동영상 업로드 중...' : '게시물 작성'}
    </ActionButton>
  );
}

export default function StudioPostForm() {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const handledSuccessPostIdRef = useRef<string | null>(null);
  const [state, formAction] = useFormState(createPost, initialState);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoInputKey, setVideoInputKey] = useState(0);
  const [requiredMembershipLevel, setRequiredMembershipLevel] = useState(0);
  const [videoUploadPending, setVideoUploadPending] = useState(false);

  const navigateToStudioDetailOnMain = useCallback(
    (postId?: string | null) => {
      const href = buildStudioDetailUrl(postId);
      if (typeof window !== 'undefined') {
        window.location.assign(href);
        return;
      }
      router.push(href);
    },
    [router]
  );

  const resetClientVideoFields = () => {
    setVideoFile(null);
    setRequiredMembershipLevel(0);
    setVideoInputKey((prev) => prev + 1);
  };

  const uploadStudioVideo = async (postId: string, file: File, isFreePublic: boolean) => {
    const contentType = (file.type || '').trim().toLowerCase();
    if (!contentType.startsWith('video/')) {
      throw new Error('동영상 파일만 업로드할 수 있습니다.');
    }

    const presignResponse = await fetch('/api/r2/presign-put', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioPostId: postId,
        filename: file.name,
        contentType,
        bytes: file.size,
        kind: 'video'
      })
    });
    const presignPayload = await presignResponse.json().catch(() => ({}));
    if (
      !presignResponse.ok ||
      typeof presignPayload?.r2_key !== 'string' ||
      typeof presignPayload?.uploadUrl !== 'string'
    ) {
      throw new Error(presignPayload?.message || 'R2 업로드 URL 발급에 실패했습니다.');
    }

    const putResponse = await fetch(presignPayload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });
    if (!putResponse.ok) {
      throw new Error(`R2 업로드 실패 (${putResponse.status})`);
    }

    const registerResponse = await fetch('/api/studio/media/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studioPostId: postId,
        kind: 'video',
        r2_key: presignPayload.r2_key,
        mime: contentType,
        bytes: file.size,
        is_free_public: isFreePublic
      })
    });
    const registerPayload = await registerResponse.json().catch(() => ({}));
    if (!registerResponse.ok) {
      throw new Error(registerPayload?.message || '동영상 메타데이터 등록에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (state.status === 'success') {
      const postId = state.postId?.trim() || '';
      if (postId && handledSuccessPostIdRef.current === postId) {
        return;
      }
      if (postId) {
        handledSuccessPostIdRef.current = postId;
      }

      const finalizeSuccess = (description: string) => {
        toast({
          title: '작성 완료',
          description
        });
        formRef.current?.reset();
        resetClientVideoFields();
        navigateToStudioDetailOnMain(postId);
      };

      if (postId && videoFile) {
        setVideoUploadPending(true);
        void (async () => {
          try {
            const shouldVideoBePublic = requiredMembershipLevel === 0;
            await uploadStudioVideo(postId, videoFile, shouldVideoBePublic);
            finalizeSuccess(
              shouldVideoBePublic
                ? '스튜디오 게시물과 일반 공개 영상이 R2에 업로드되었습니다.'
                : '스튜디오 게시물과 멤버십 전용 영상이 R2에 업로드되었습니다.'
            );
          } catch (uploadError) {
            let rollbackErrorMessage: string | null = null;
            try {
              await rollbackCreatedPost(postId);
              handledSuccessPostIdRef.current = null;
            } catch (rollbackError) {
              rollbackErrorMessage =
                rollbackError instanceof Error
                  ? rollbackError.message
                  : '게시글 롤백(삭제)에 실패했습니다.';
            }

            toast({
              title: rollbackErrorMessage ? '동영상 업로드 실패 (롤백 실패)' : '동영상 업로드 실패',
              description: rollbackErrorMessage
                ? `${getVideoUploadErrorMessage(uploadError)} ${rollbackErrorMessage}`
                : `${getVideoUploadErrorMessage(uploadError)} 게시글 생성은 자동 취소되었습니다.`,
              variant: 'destructive'
            });
          } finally {
            setVideoUploadPending(false);
          }
        })();
        return;
      }

      finalizeSuccess('스튜디오 게시물이 등록되었습니다.');
    }

    if (state.status === 'error' && state.message) {
      handledSuccessPostIdRef.current = null;
      toast({
        title: '작성 실패',
        description: state.message
      });
    }
  }, [navigateToStudioDetailOnMain, requiredMembershipLevel, state, toast, videoFile]);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    >
      <input
        type="hidden"
        name="required_membership_level"
        value={String(requiredMembershipLevel)}
      />

      {state.status === 'error' && state.message && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {state.message}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          제목
        </label>
        <input
          name="title"
          maxLength={80}
          required
          placeholder="스튜디오 게시물 제목을 입력하세요."
        />
        {state.status === 'error' && state.fieldErrors?.title && (
          <p className="text-sm text-red-200">{state.fieldErrors.title}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          내용
        </label>
        <textarea
          name="content"
          required
          maxLength={2000}
          rows={6}
          placeholder="작업 스토리와 소개를 작성해 주세요."
        />
        {state.status === 'error' && state.fieldErrors?.content && (
          <p className="text-sm text-red-200">{state.fieldErrors.content}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          게시글 공개 범위
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {STUDIO_POST_ACCESS_OPTIONS.map((option) => {
            const checked = requiredMembershipLevel === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer flex-col rounded-2xl border px-4 py-3 transition ${
                  checked
                    ? 'border-white/40 bg-white/15 text-white'
                    : 'border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="radio"
                    name="required_membership_level_selector"
                    value={option.value}
                    checked={checked}
                    onChange={() => setRequiredMembershipLevel(option.value)}
                    disabled={videoUploadPending}
                  />
                  {option.title}
                </span>
                <span className="mt-1 text-xs text-white/60">{option.description}</span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-neutral-500">
          멤버십 전용으로 설정한 게시글은 클릭 시 멤버십 안내 팝업이 표시됩니다.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          이미지 업로드
        </label>
        <input
          name="image"
          type="file"
          accept="image/*"
        />
        {state.status === 'error' && state.fieldErrors?.image && (
          <p className="text-sm text-red-200">{state.fieldErrors.image}</p>
        )}
        <p className="text-sm text-neutral-500">
          최대 5MB, JPG/PNG 등 이미지 파일만 업로드 가능합니다.
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-400">
          동영상 업로드 (R2)
        </label>
        <input
          key={videoInputKey}
          type="file"
          accept="video/*"
          onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
          disabled={videoUploadPending}
        />
        <p className="text-sm text-neutral-500">
          {videoFile
            ? `${videoFile.name} · ${videoFile.type || 'unknown'} · ${videoFile.size.toLocaleString()} bytes`
            : '선택하면 게시물 생성 직후 R2에 업로드됩니다.'}
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-200">
          <p className="mt-2 text-xs text-neutral-500">
            동영상 공개 범위는 위의 `게시글 공개 범위` 설정과 동일하게 자동 적용됩니다.
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            동영상 파일은 게시물 저장 후 브라우저에서 R2로 직접 업로드됩니다. (서버 액션 폼 제출에는 포함되지 않음)
          </p>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <SubmitButton extraPending={videoUploadPending} />
      </div>
    </form>
  );
}
