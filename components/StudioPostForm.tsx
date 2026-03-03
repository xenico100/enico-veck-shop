'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Film,
  Globe2,
  Lock,
  Sparkles,
  UploadCloud
} from 'lucide-react';
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
  return error instanceof Error
    ? error.message
    : 'R2 동영상 업로드에 실패했습니다.';
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024)
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const rollbackCreatedPost = async (postId: string) => {
  const response = await fetch(`/api/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload?.message ||
        `게시글 롤백에 실패했습니다. (HTTP ${response.status})`
    );
  }
};

function SubmitButton({ extraPending = false }: { extraPending?: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || extraPending;

  return (
    <ActionButton type="submit" variant="primary" size="md" disabled={disabled}>
      {pending
        ? '게시물 작성 중...'
        : extraPending
          ? '동영상 업로드 중...'
          : '게시물 작성'}
    </ActionButton>
  );
}

export default function StudioPostForm() {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const handledSuccessPostIdRef = useRef<string | null>(null);
  const [state, formAction] = useFormState(createPost, initialState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageInputKey, setImageInputKey] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoInputKey, setVideoInputKey] = useState(0);
  const [requiredMembershipLevel, setRequiredMembershipLevel] = useState(0);
  const [videoUploadPending, setVideoUploadPending] = useState(false);
  const selectedAccessOption =
    STUDIO_POST_ACCESS_OPTIONS.find(
      (option) => option.value === requiredMembershipLevel
    ) ?? STUDIO_POST_ACCESS_OPTIONS[0];

  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile]
  );
  const videoPreviewUrl = useMemo(
    () => (videoFile ? URL.createObjectURL(videoFile) : null),
    [videoFile]
  );

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!videoPreviewUrl) return;
    return () => URL.revokeObjectURL(videoPreviewUrl);
  }, [videoPreviewUrl]);

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

  const resetClientUploadFields = () => {
    setImageFile(null);
    setImageInputKey((prev) => prev + 1);
    setVideoFile(null);
    setRequiredMembershipLevel(0);
    setVideoInputKey((prev) => prev + 1);
  };

  const uploadStudioVideo = async (
    postId: string,
    file: File,
    isFreePublic: boolean
  ) => {
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
      throw new Error(
        presignPayload?.message || 'R2 업로드 URL 발급에 실패했습니다.'
      );
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
      throw new Error(
        registerPayload?.message || '동영상 메타데이터 등록에 실패했습니다.'
      );
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
        resetClientUploadFields();
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
              title: rollbackErrorMessage
                ? '동영상 업로드 실패 (롤백 실패)'
                : '동영상 업로드 실패',
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
  }, [
    navigateToStudioDetailOnMain,
    requiredMembershipLevel,
    state,
    toast,
    videoFile
  ]);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="mt-6 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)] md:p-6"
    >
      <input
        type="hidden"
        name="required_membership_level"
        value={String(requiredMembershipLevel)}
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">
            Studio Creator Upload
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-white">
            스튜디오 업로드 센터
          </h3>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80">
          <Sparkles className="h-3.5 w-3.5" />
          TikTok 스타일 업로드 플로우
        </div>
      </div>

      {state.status === 'error' && state.message && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{state.message}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-black/25 p-4 md:p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                1. 게시글 정보
              </p>
              <p className="mt-1 text-sm text-white/65">
                영상 설명처럼 제목/내용을 간결하게 정리하면 피드 노출에
                유리합니다.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="studio-post-title"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55"
                >
                  제목
                </label>
                <input
                  id="studio-post-title"
                  name="title"
                  maxLength={80}
                  required
                  placeholder="예) 오늘 보컬 레코딩 비하인드"
                  disabled={videoUploadPending}
                  className="w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.09]"
                />
                {state.status === 'error' && state.fieldErrors?.title && (
                  <p className="text-sm text-red-200">
                    {state.fieldErrors.title}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="studio-post-content"
                  className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55"
                >
                  내용
                </label>
                <textarea
                  id="studio-post-content"
                  name="content"
                  required
                  maxLength={2000}
                  rows={6}
                  placeholder="작업 과정, 장비, 포인트를 짧고 명확하게 작성해 주세요."
                  disabled={videoUploadPending}
                  className="w-full resize-y rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.09]"
                />
                {state.status === 'error' && state.fieldErrors?.content && (
                  <p className="text-sm text-red-200">
                    {state.fieldErrors.content}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/25 p-4 md:p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                2. 공개 범위
              </p>
              <p className="mt-1 text-sm text-white/65">
                게시글/영상 접근 권한이 동일하게 적용됩니다.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {STUDIO_POST_ACCESS_OPTIONS.map((option) => {
                const checked = requiredMembershipLevel === option.value;
                const isPublic = option.value === 0;
                return (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${
                      checked
                        ? 'border-white/40 bg-white/[0.16]'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          checked
                            ? 'border-white/40 bg-white/15 text-white'
                            : 'border-white/15 bg-white/[0.04] text-white/60'
                        }`}
                      >
                        {isPublic ? (
                          <Globe2 className="h-3.5 w-3.5" />
                        ) : (
                          <Lock className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-sm font-semibold text-white">
                          <input
                            type="radio"
                            name="required_membership_level_selector"
                            value={option.value}
                            checked={checked}
                            onChange={() =>
                              setRequiredMembershipLevel(option.value)
                            }
                            disabled={videoUploadPending}
                            className="h-3.5 w-3.5"
                          />
                          {option.title}
                        </span>
                        <span className="mt-1 block text-xs text-white/60">
                          {option.description}
                        </span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-black/25 p-4 md:p-5">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                3. 미디어 업로드
              </p>
              <p className="mt-1 text-sm text-white/65">
                이미지(썸네일) + 영상(R2)을 함께 올리면 숏폼 UI에서 가장
                자연스럽게 노출됩니다.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    썸네일 이미지
                  </p>
                  {imageFile ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-100">
                      <CheckCircle2 className="h-3 w-3" />
                      선택됨
                    </span>
                  ) : null}
                </div>
                <input
                  key={imageInputKey}
                  id="studio-post-image-upload"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                  disabled={videoUploadPending}
                  className="sr-only"
                />
                <label
                  htmlFor="studio-post-image-upload"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <UploadCloud className="h-4 w-4" />
                  이미지 선택
                </label>
                <p className="mt-2 text-xs text-white/55">
                  {imageFile
                    ? `${imageFile.name} · ${formatBytes(imageFile.size)}`
                    : '최대 5MB, JPG/PNG/WebP'}
                </p>
                {imageFile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImageInputKey((prev) => prev + 1);
                    }}
                    className="mt-2 text-xs text-white/65 underline underline-offset-2 hover:text-white"
                  >
                    이미지 선택 해제
                  </button>
                ) : null}
                {state.status === 'error' && state.fieldErrors?.image && (
                  <p className="mt-2 text-sm text-red-200">
                    {state.fieldErrors.image}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">
                    숏폼 영상 (R2)
                  </p>
                  {videoFile ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-100">
                      <CheckCircle2 className="h-3 w-3" />
                      선택됨
                    </span>
                  ) : null}
                </div>
                <input
                  key={videoInputKey}
                  id="studio-post-video-upload"
                  type="file"
                  accept="video/*"
                  onChange={(event) =>
                    setVideoFile(event.target.files?.[0] ?? null)
                  }
                  disabled={videoUploadPending}
                  className="sr-only"
                />
                <label
                  htmlFor="studio-post-video-upload"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <Film className="h-4 w-4" />
                  영상 선택
                </label>
                <p className="mt-2 text-xs text-white/55">
                  {videoFile
                    ? `${videoFile.name} · ${videoFile.type || 'unknown'} · ${formatBytes(videoFile.size)}`
                    : '게시물 생성 직후 브라우저에서 R2로 업로드'}
                </p>
                {videoFile ? (
                  <button
                    type="button"
                    onClick={() => {
                      setVideoFile(null);
                      setVideoInputKey((prev) => prev + 1);
                    }}
                    className="mt-2 text-xs text-white/65 underline underline-offset-2 hover:text-white"
                  >
                    영상 선택 해제
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-3xl border border-white/10 bg-black/35 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Live Preview
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-2 py-1 text-[10px] text-white/70">
                <Clapperboard className="h-3 w-3" />
                Studio Shorts
              </span>
            </div>

            <div className="mx-auto w-full max-w-[250px] rounded-[28px] border border-white/15 bg-black p-2 shadow-[0_20px_45px_rgba(0,0,0,0.55)]">
              <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-[#111]">
                {videoPreviewUrl ? (
                  <video
                    src={videoPreviewUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="thumbnail preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-center text-white/55">
                    <UploadCloud className="h-8 w-8" />
                    <p className="px-4 text-xs">
                      이미지 또는 영상을 선택하면 미리보기 표시
                    </p>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-white">
                    업로드 후 스튜디오 숏폼 피드에 노출됩니다
                  </p>
                  <p className="mt-1 text-[11px] text-white/75">
                    {selectedAccessOption.title}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
              <p className="font-semibold text-white">업로드 체크리스트</p>
              <p>1. 제목/내용 입력</p>
              <p>2. 공개 범위 선택</p>
              <p>3. 이미지 또는 영상 추가</p>
              <p className="text-white/60">
                영상은 게시글 생성 후 자동으로 R2 업로드가 이어집니다.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-white/65">
          현재 권한:
          <span className="ml-1 font-semibold text-white">
            {selectedAccessOption.title}
          </span>
          {requiredMembershipLevel === 0 ? (
            <span className="ml-1 text-emerald-200">(공개)</span>
          ) : (
            <span className="ml-1 text-amber-200">(멤버십 전용)</span>
          )}
        </p>
        <SubmitButton extraPending={videoUploadPending} />
      </div>
    </form>
  );
}
