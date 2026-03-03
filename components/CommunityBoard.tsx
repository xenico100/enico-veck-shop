'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { isAdminUserLike } from '@/utils/service-posts';

type CommunityReactionValue = 'like' | 'dislike';

type CommunityComment = {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type CommunityPost = {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  content: string;
  isNotice: boolean;
  likeCount: number;
  dislikeCount: number;
  dailyLikeCount: number;
  viewerReaction: CommunityReactionValue | null;
  createdAt: string;
  updatedAt: string;
  comments: CommunityComment[];
};

type CommunityPostsResponse = {
  message?: string;
  setupRequired?: boolean;
  data?: CommunityPost[];
};

type CommunityPostResponse = {
  message?: string;
  data?: CommunityPost;
};

type CommunityCommentResponse = {
  message?: string;
  data?: CommunityComment;
};

type CommunityReactionResponse = {
  message?: string;
  data?: {
    postId: string;
    likeCount: number;
    dislikeCount: number;
    dailyLikeCount: number;
    viewerReaction: CommunityReactionValue | null;
  };
};

type RichContentBlock =
  | { type: 'text'; text: string }
  | { type: 'youtube'; sourceUrl: string; videoId: string; startSeconds: number | null };

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

const parseYouTubeStartSeconds = (raw: string | null) => {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const direct = Number.parseInt(value, 10);
    return Number.isFinite(direct) && direct > 0 ? direct : null;
  }

  const hmsMatch = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!hmsMatch) return null;

  const hours = Number.parseInt(hmsMatch[1] || '0', 10);
  const minutes = Number.parseInt(hmsMatch[2] || '0', 10);
  const seconds = Number.parseInt(hmsMatch[3] || '0', 10);
  const total = hours * 3600 + minutes * 60 + seconds;

  return Number.isFinite(total) && total > 0 ? total : null;
};

const extractYouTubeEmbedInfo = (urlText: string) => {
  try {
    const url = new URL(urlText.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    const pathParts = url.pathname.split('/').filter(Boolean);
    let videoId = '';

    if (hostname === 'youtu.be') {
      videoId = pathParts[0] || '';
    } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') || '';
      } else if (pathParts[0] === 'embed' || pathParts[0] === 'shorts' || pathParts[0] === 'live') {
        videoId = pathParts[1] || '';
      }
    }

    if (!/^[A-Za-z0-9_-]{10,15}$/.test(videoId)) {
      return null;
    }

    const hashValue = url.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hashValue.includes('=') ? hashValue : '');
    const rawStart =
      url.searchParams.get('t') ||
      url.searchParams.get('start') ||
      hashParams.get('t') ||
      hashParams.get('start') ||
      (hashValue && !hashValue.includes('=') ? hashValue : null);

    return {
      sourceUrl: url.toString(),
      videoId,
      startSeconds: parseYouTubeStartSeconds(rawStart)
    };
  } catch {
    return null;
  }
};

const parseRichContentBlocks = (value: string): RichContentBlock[] => {
  const lines = value.split(/\r?\n/);
  const blocks: RichContentBlock[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    const text = textBuffer.join('\n');
    if (text.trim()) {
      blocks.push({ type: 'text', text });
    }
    textBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const embedInfo = trimmed ? extractYouTubeEmbedInfo(trimmed) : null;
    if (embedInfo) {
      flushText();
      blocks.push({
        type: 'youtube',
        sourceUrl: embedInfo.sourceUrl,
        videoId: embedInfo.videoId,
        startSeconds: embedInfo.startSeconds
      });
      continue;
    }

    textBuffer.push(line);
  }

  flushText();
  return blocks;
};

const normalizeReactionValue = (value: unknown): CommunityReactionValue | null => {
  if (value === 'like' || value === 'dislike') return value;
  return null;
};

function RichTextWithYouTube({
  content,
  containerClassName,
  textClassName
}: {
  content: string;
  containerClassName: string;
  textClassName: string;
}) {
  const blocks = useMemo(() => parseRichContentBlocks(content || ''), [content]);
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={containerClassName}>
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          return (
            <p key={`text-${index}`} className={textClassName}>
              {block.text}
            </p>
          );
        }

        const src =
          block.startSeconds && block.startSeconds > 0
            ? `https://www.youtube.com/embed/${block.videoId}?start=${block.startSeconds}`
            : `https://www.youtube.com/embed/${block.videoId}`;

        return (
          <div
            key={`youtube-${block.videoId}-${index}`}
            className="overflow-hidden rounded-2xl border border-white/15 bg-black/60"
          >
            <div className="aspect-video w-full">
              <iframe
                src={src}
                title={`YouTube video ${index + 1}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
            <a
              href={block.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate border-t border-white/10 px-3 py-2 text-xs text-white/65 hover:text-white/85"
            >
              {block.sourceUrl}
            </a>
          </div>
        );
      })}
    </div>
  );
}

export default function CommunityBoard() {
  const auth = useAuth();
  const currentUserId = auth.user?.id ?? null;
  const isLoggedIn = Boolean(auth.isAuthenticated && currentUserId);
  const isAdmin = useMemo(() => isAdminUserLike(auth.user), [auth.user]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [setupNotice, setSetupNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [createTitle, setCreateTitle] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createNotice, setCreateNotice] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editNotice, setEditNotice] = useState(false);
  const [commentDraftByPostId, setCommentDraftByPostId] = useState<Record<string, string>>({});

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSetupNotice(null);
    try {
      const response = await fetch('/api/community/posts', {
        method: 'GET',
        cache: 'no-store'
      });
      const payload = (await response.json().catch(() => ({}))) as CommunityPostsResponse;
      if (!response.ok) {
        throw new Error(payload.message || '커뮤니티 게시글을 불러오지 못했습니다.');
      }
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setPosts(
        rows.map((row) => ({
          ...row,
          likeCount: typeof row.likeCount === 'number' ? row.likeCount : 0,
          dislikeCount: typeof row.dislikeCount === 'number' ? row.dislikeCount : 0,
          dailyLikeCount: typeof row.dailyLikeCount === 'number' ? row.dailyLikeCount : 0,
          viewerReaction: normalizeReactionValue(row.viewerReaction)
        }))
      );
      if (payload.setupRequired && typeof payload.message === 'string' && payload.message.trim()) {
        setSetupNotice(payload.message);
      }
    } catch (err) {
      setSetupNotice(null);
      setError(err instanceof Error ? err.message : '커뮤니티 게시글을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  const resetCreateForm = () => {
    setCreateTitle('');
    setCreateContent('');
    setCreateNotice(false);
  };

  const handleCreatePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const title = createTitle.trim();
    const content = createContent.trim();
    if (!title || !content) {
      setError('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          isNotice: isAdmin ? createNotice : false
        })
      });
      const payload = (await response.json().catch(() => ({}))) as CommunityPostResponse;
      if (!response.ok) {
        throw new Error(payload.message || '게시글 작성에 실패했습니다.');
      }
      resetCreateForm();
      setCreateOpen(false);
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditForm = (post: CommunityPost) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditNotice(post.isNotice);
    setError(null);
  };

  const closeEditForm = () => {
    setEditingPostId(null);
    setEditTitle('');
    setEditContent('');
    setEditNotice(false);
  };

  const handleUpdatePost = async (postId: string) => {
    if (submitting) return;
    const title = editTitle.trim();
    const content = editContent.trim();
    if (!title || !content) {
      setError('제목과 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          isNotice: isAdmin ? editNotice : false
        })
      });
      const payload = (await response.json().catch(() => ({}))) as CommunityPostResponse;
      if (!response.ok) {
        throw new Error(payload.message || '게시글 수정에 실패했습니다.');
      }
      closeEditForm();
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 수정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (submitting) return;
    if (!window.confirm('게시글을 삭제하시겠어요? 댓글도 함께 삭제됩니다.')) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/community/posts/${encodeURIComponent(postId)}`, {
        method: 'DELETE'
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || '게시글 삭제에 실패했습니다.');
      }
      if (editingPostId === postId) {
        closeEditForm();
      }
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateComment = async (postId: string) => {
    if (submitting) return;
    const content = (commentDraftByPostId[postId] || '').trim();
    if (!content) {
      setError('댓글 내용을 입력해 주세요.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content })
      });
      const payload = (await response.json().catch(() => ({}))) as CommunityCommentResponse;
      if (!response.ok) {
        throw new Error(payload.message || '댓글 작성에 실패했습니다.');
      }
      setCommentDraftByPostId((prev) => ({ ...prev, [postId]: '' }));
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 작성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (submitting) return;
    if (!window.confirm('댓글을 삭제하시겠어요?')) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/community/comments/${encodeURIComponent(commentId)}`, {
        method: 'DELETE'
      });
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || '댓글 삭제에 실패했습니다.');
      }
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReactPost = async (postId: string, reaction: CommunityReactionValue) => {
    if (submitting) return;
    if (!isLoggedIn) {
      setError('로그인 후 좋아요/싫어요를 누를 수 있습니다.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/community/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, reaction })
      });
      const payload = (await response.json().catch(() => ({}))) as CommunityReactionResponse;
      if (!response.ok) {
        throw new Error(payload.message || '좋아요/싫어요 저장에 실패했습니다.');
      }

      if (payload.data) {
        setPosts((prev) =>
          prev.map((post) =>
            post.id === payload.data?.postId
              ? {
                  ...post,
                  likeCount: payload.data.likeCount,
                  dislikeCount: payload.data.dislikeCount,
                  dailyLikeCount:
                    typeof payload.data.dailyLikeCount === 'number'
                      ? payload.data.dailyLikeCount
                      : post.dailyLikeCount,
                  viewerReaction: normalizeReactionValue(payload.data.viewerReaction)
                }
              : post
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '좋아요/싫어요 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const notices = posts.filter((post) => post.isNotice);
  const popularPost = useMemo(() => {
    const candidates = posts.filter((post) => !post.isNotice);
    if (candidates.length === 0) return null;

    return [...candidates].sort((a, b) => {
      if (b.dailyLikeCount !== a.dailyLikeCount) return b.dailyLikeCount - a.dailyLikeCount;
      if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
  }, [posts]);
  const regularPosts = posts.filter((post) => !post.isNotice && post.id !== popularPost?.id);
  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

  useEffect(() => {
    if (!selectedPostId) return;
    const exists = posts.some((post) => post.id === selectedPostId);
    if (!exists) {
      setSelectedPostId(null);
    }
  }, [posts, selectedPostId]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">커뮤니티 자유게시판</h1>
            <p className="mt-2 text-sm text-neutral-300">
              회원 누구나 자유롭게 글을 쓰고 댓글로 소통할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCreateOpen(true);
              }}
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
            >
              글쓰기
            </button>
            <button
              type="button"
              onClick={() => void loadPosts()}
              disabled={loading || submitting}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      {setupNotice && !error && (
        <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {setupNotice}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="작성창 닫기"
            disabled={submitting}
            onClick={() => {
              if (submitting) return;
              setCreateOpen(false);
            }}
            className="absolute inset-0 bg-black/75"
          />
          <form
            onSubmit={handleCreatePost}
            className="relative z-[91] w-full max-w-2xl space-y-3 rounded-3xl border border-white/10 bg-black p-5 shadow-[0_30px_100px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">게시글 작성</h2>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return;
                  setCreateOpen(false);
                }}
                disabled={submitting}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                닫기
              </button>
            </div>
            {!isLoggedIn ? (
              <p className="text-sm text-neutral-300">
                글 작성은 로그인 후 가능합니다.{' '}
                <Link href="/signin" className="underline underline-offset-4">
                  로그인하러 가기
                </Link>
              </p>
            ) : (
              <>
                <input
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                  maxLength={160}
                  placeholder="제목"
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <textarea
                  value={createContent}
                  onChange={(event) => setCreateContent(event.target.value)}
                  rows={6}
                  maxLength={10000}
                  placeholder={'내용\n유튜브 링크를 한 줄에 입력하면 자동 재생됩니다.'}
                  className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
                <p className="text-xs text-white/55">
                  유튜브 링크를 한 줄에 단독으로 입력하면 플레이어로 표시됩니다.
                </p>
                {isAdmin && (
                  <label className="inline-flex items-center gap-2 text-sm text-amber-100">
                    <input
                      type="checkbox"
                      checked={createNotice}
                      onChange={(event) => setCreateNotice(event.target.checked)}
                      className="h-4 w-4"
                    />
                    공지로 등록 (관리자 전용)
                  </label>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
                  >
                    {submitting ? '저장 중...' : '게시글 올리기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (submitting) return;
                      setCreateOpen(false);
                    }}
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
                  >
                    취소
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          게시글을 불러오는 중입니다...
        </div>
      ) : null}

      {!loading && notices.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">공지사항</p>
          {notices.map((post) => (
            <CommunityPostTitleRow
              key={post.id}
              post={post}
              onOpen={() => {
                setError(null);
                setSelectedPostId(post.id);
              }}
            />
          ))}
        </div>
      )}

      {!loading && popularPost && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200">
            인기글 (최근 24시간 좋아요 1등)
          </p>
          <CommunityPostTitleRow
            key={popularPost.id}
            post={popularPost}
            featuredLabel={`24시간 좋아요 ${popularPost.dailyLikeCount}`}
            onOpen={() => {
              setError(null);
              setSelectedPostId(popularPost.id);
            }}
          />
        </div>
      )}

      {!loading && regularPosts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">자유게시판</p>
          {regularPosts.map((post) => (
            <CommunityPostTitleRow
              key={post.id}
              post={post}
              onOpen={() => {
                setError(null);
                setSelectedPostId(post.id);
              }}
            />
          ))}
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
          <button
            type="button"
            aria-label="게시글 닫기"
            onClick={() => {
              if (submitting) return;
              setSelectedPostId(null);
            }}
            className="absolute inset-0 bg-black/80"
          />
          <div className="relative z-[91] max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/15 bg-black p-3 sm:p-5">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (submitting) return;
                  setSelectedPostId(null);
                }}
                disabled={submitting}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                닫기
              </button>
            </div>
            <CommunityPostCard
              post={selectedPost}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              submitting={submitting}
              editingPostId={editingPostId}
              editTitle={editTitle}
              editContent={editContent}
              editNotice={editNotice}
              commentDraft={commentDraftByPostId[selectedPost.id] || ''}
              onOpenEdit={() => openEditForm(selectedPost)}
              onCloseEdit={closeEditForm}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              onEditNoticeChange={setEditNotice}
              onUpdatePost={() => void handleUpdatePost(selectedPost.id)}
              onDeletePost={() => void handleDeletePost(selectedPost.id)}
              onReactPost={(reaction) => void handleReactPost(selectedPost.id, reaction)}
              onCommentDraftChange={(value) =>
                setCommentDraftByPostId((prev) => ({ ...prev, [selectedPost.id]: value }))
              }
              onCreateComment={() => void handleCreateComment(selectedPost.id)}
              onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
              isLoggedIn={isLoggedIn}
            />
          </div>
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-neutral-300">
          아직 게시글이 없습니다. 첫 글을 작성해 보세요.
        </div>
      )}
    </section>
  );
}

function CommunityPostTitleRow({
  post,
  featuredLabel,
  onOpen
}: {
  post: CommunityPost;
  featuredLabel?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={
        post.isNotice
          ? 'w-full rounded-2xl border border-amber-300/30 bg-amber-500/10 px-4 py-3 text-left transition hover:bg-amber-400/15'
          : 'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10'
      }
    >
      <div className="flex items-center gap-2">
        {post.isNotice && (
          <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">
            Notice
          </span>
        )}
        {featuredLabel && (
          <span className="inline-flex items-center rounded-full border border-sky-300/35 bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-100">
            {featuredLabel}
          </span>
        )}
        <p className="line-clamp-1 text-sm font-semibold text-white">{post.title}</p>
      </div>
    </button>
  );
}

function CommunityPostCard({
  post,
  currentUserId,
  isAdmin,
  submitting,
  editingPostId,
  editTitle,
  editContent,
  editNotice,
  featuredLabel,
  commentDraft,
  onOpenEdit,
  onCloseEdit,
  onEditTitleChange,
  onEditContentChange,
  onEditNoticeChange,
  onUpdatePost,
  onDeletePost,
  onReactPost,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
  isLoggedIn
}: {
  post: CommunityPost;
  currentUserId: string | null;
  isAdmin: boolean;
  submitting: boolean;
  editingPostId: string | null;
  editTitle: string;
  editContent: string;
  editNotice: boolean;
  featuredLabel?: string;
  commentDraft: string;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditNoticeChange: (value: boolean) => void;
  onUpdatePost: () => void;
  onDeletePost: () => void;
  onReactPost: (reaction: CommunityReactionValue) => void;
  onCommentDraftChange: (value: string) => void;
  onCreateComment: () => void;
  onDeleteComment: (commentId: string) => void;
  isLoggedIn: boolean;
}) {
  const canManagePost = Boolean(currentUserId && (currentUserId === post.userId || isAdmin));
  const isEditing = editingPostId === post.id;

  return (
    <article
      className={
        post.isNotice
          ? 'rounded-3xl border border-amber-300/30 bg-amber-500/10 p-5'
          : 'rounded-3xl border border-white/10 bg-white/5 p-5'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {post.isNotice && (
              <span className="inline-flex items-center rounded-full border border-amber-300/35 bg-amber-300/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-100">
                Notice
              </span>
            )}
            {featuredLabel && (
              <span className="inline-flex items-center rounded-full border border-sky-300/35 bg-sky-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100">
                {featuredLabel}
              </span>
            )}
            <h3 className="text-lg font-semibold text-white">{post.title}</h3>
          </div>
          <p className="mt-1 text-xs text-white/55">
            {post.authorName} · {formatDateTime(post.createdAt)}
          </p>
        </div>

        {canManagePost && (
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                type="button"
                onClick={onOpenEdit}
                disabled={submitting}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                수정
              </button>
            ) : (
              <button
                type="button"
                onClick={onCloseEdit}
                disabled={submitting}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                취소
              </button>
            )}
            <button
              type="button"
              onClick={onDeletePost}
              disabled={submitting}
              className="rounded-full border border-rose-300/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <RichTextWithYouTube
          content={post.content}
          containerClassName="mt-3 space-y-3"
          textClassName="whitespace-pre-wrap text-sm leading-relaxed text-white/85"
        />
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={editTitle}
            onChange={(event) => onEditTitleChange(event.target.value)}
            maxLength={160}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <textarea
            value={editContent}
            onChange={(event) => onEditContentChange(event.target.value)}
            rows={4}
            maxLength={10000}
            placeholder={'내용\n유튜브 링크를 한 줄에 입력하면 자동 재생됩니다.'}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          {isAdmin && (
            <label className="inline-flex items-center gap-2 text-sm text-amber-100">
              <input
                type="checkbox"
                checked={editNotice}
                onChange={(event) => onEditNoticeChange(event.target.checked)}
                className="h-4 w-4"
              />
              공지로 설정
            </label>
          )}
          <div>
            <button
              type="button"
              onClick={onUpdatePost}
              disabled={submitting}
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
            >
              저장
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onReactPost('like')}
          disabled={submitting || !isLoggedIn}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
            post.viewerReaction === 'like'
              ? 'border-emerald-300/50 bg-emerald-400/15 text-emerald-100'
              : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isLoggedIn ? '좋아요' : '로그인 후 사용할 수 있습니다.'}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>{post.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => onReactPost('dislike')}
          disabled={submitting || !isLoggedIn}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
            post.viewerReaction === 'dislike'
              ? 'border-rose-300/50 bg-rose-400/15 text-rose-100'
              : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isLoggedIn ? '싫어요' : '로그인 후 사용할 수 있습니다.'}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          <span>{post.dislikeCount}</span>
        </button>
        {!isLoggedIn && <span className="text-xs text-white/45">로그인 후 반응을 남길 수 있습니다.</span>}
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-black/35 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          댓글 {post.comments.length}
        </p>
        {post.comments.length === 0 ? (
          <p className="text-sm text-white/55">아직 댓글이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {post.comments.map((comment) => {
              const canDeleteComment = Boolean(
                currentUserId && (currentUserId === comment.userId || isAdmin)
              );
              return (
                <li
                  key={comment.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-white/55">
                        {comment.authorName} · {formatDateTime(comment.createdAt)}
                      </p>
                      <RichTextWithYouTube
                        content={comment.content}
                        containerClassName="mt-1 space-y-2"
                        textClassName="whitespace-pre-wrap text-sm text-white/85"
                      />
                    </div>
                    {canDeleteComment && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(comment.id)}
                        disabled={submitting}
                        className="rounded-full border border-rose-300/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!isLoggedIn ? (
          <p className="text-sm text-white/60">
            댓글 작성은 로그인 후 가능합니다.{' '}
            <Link href="/signin" className="underline underline-offset-4">
              로그인
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="댓글을 입력해 주세요."
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
            <div>
              <button
                type="button"
                onClick={onCreateComment}
                disabled={submitting}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
              >
                댓글 등록
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
