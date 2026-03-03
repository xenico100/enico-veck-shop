'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { isAdminUserLike } from '@/utils/service-posts';

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
  createdAt: string;
  updatedAt: string;
  comments: CommunityComment[];
};

type CommunityPostsResponse = {
  message?: string;
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
    try {
      const response = await fetch('/api/community/posts', {
        method: 'GET',
        cache: 'no-store'
      });
      const payload = (await response.json().catch(() => ({}))) as CommunityPostsResponse;
      if (!response.ok) {
        throw new Error(payload.message || '커뮤니티 게시글을 불러오지 못했습니다.');
      }
      setPosts(Array.isArray(payload.data) ? payload.data : []);
    } catch (err) {
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

  const notices = posts.filter((post) => post.isNotice);
  const regularPosts = posts.filter((post) => !post.isNotice);

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

      {error && (
        <div className="rounded-2xl border border-rose-300/25 bg-rose-500/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreatePost}
        className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-5"
      >
        <h2 className="text-lg font-semibold text-white">게시글 작성</h2>
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
              rows={4}
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
            <div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
              >
                {submitting ? '저장 중...' : '게시글 올리기'}
              </button>
            </div>
          </>
        )}
      </form>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          게시글을 불러오는 중입니다...
        </div>
      ) : null}

      {!loading && notices.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">공지사항</p>
          {notices.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              submitting={submitting}
              editingPostId={editingPostId}
              editTitle={editTitle}
              editContent={editContent}
              editNotice={editNotice}
              commentDraft={commentDraftByPostId[post.id] || ''}
              onOpenEdit={() => openEditForm(post)}
              onCloseEdit={closeEditForm}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              onEditNoticeChange={setEditNotice}
              onUpdatePost={() => void handleUpdatePost(post.id)}
              onDeletePost={() => void handleDeletePost(post.id)}
              onCommentDraftChange={(value) =>
                setCommentDraftByPostId((prev) => ({ ...prev, [post.id]: value }))
              }
              onCreateComment={() => void handleCreateComment(post.id)}
              onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      )}

      {!loading && regularPosts.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">자유게시판</p>
          {regularPosts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              submitting={submitting}
              editingPostId={editingPostId}
              editTitle={editTitle}
              editContent={editContent}
              editNotice={editNotice}
              commentDraft={commentDraftByPostId[post.id] || ''}
              onOpenEdit={() => openEditForm(post)}
              onCloseEdit={closeEditForm}
              onEditTitleChange={setEditTitle}
              onEditContentChange={setEditContent}
              onEditNoticeChange={setEditNotice}
              onUpdatePost={() => void handleUpdatePost(post.id)}
              onDeletePost={() => void handleDeletePost(post.id)}
              onCommentDraftChange={(value) =>
                setCommentDraftByPostId((prev) => ({ ...prev, [post.id]: value }))
              }
              onCreateComment={() => void handleCreateComment(post.id)}
              onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
              isLoggedIn={isLoggedIn}
            />
          ))}
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

function CommunityPostCard({
  post,
  currentUserId,
  isAdmin,
  submitting,
  editingPostId,
  editTitle,
  editContent,
  editNotice,
  commentDraft,
  onOpenEdit,
  onCloseEdit,
  onEditTitleChange,
  onEditContentChange,
  onEditNoticeChange,
  onUpdatePost,
  onDeletePost,
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
  commentDraft: string;
  onOpenEdit: () => void;
  onCloseEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onEditContentChange: (value: string) => void;
  onEditNoticeChange: (value: boolean) => void;
  onUpdatePost: () => void;
  onDeletePost: () => void;
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
