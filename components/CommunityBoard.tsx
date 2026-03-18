'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, Flame, MessageCircle, ThumbsDown, ThumbsUp, X } from 'lucide-react';
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

const buildOptimisticPostReactionState = (
  post: CommunityPost,
  nextReaction: CommunityReactionValue
) => {
  const nextViewerReaction: CommunityReactionValue | null =
    post.viewerReaction === nextReaction ? null : nextReaction;
  const likeDelta =
    (nextViewerReaction === 'like' ? 1 : 0) -
    (post.viewerReaction === 'like' ? 1 : 0);
  const dislikeDelta =
    (nextViewerReaction === 'dislike' ? 1 : 0) -
    (post.viewerReaction === 'dislike' ? 1 : 0);

  return {
    likeCount: Math.max(0, post.likeCount + likeDelta),
    dislikeCount: Math.max(0, post.dislikeCount + dislikeDelta),
    dailyLikeCount: Math.max(0, post.dailyLikeCount + likeDelta),
    viewerReaction: nextViewerReaction
  };
};

const getFirstTextExcerpt = (content: string) => {
  const blocks = parseRichContentBlocks(content || '');
  const text = blocks
    .filter((block): block is Extract<RichContentBlock, { type: 'text' }> => block.type === 'text')
    .map((block) => block.text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!text) return '내용이 아직 입력되지 않았습니다.';
  return text.length > 84 ? `${text.slice(0, 84).trim()}…` : text;
};

const formatRelativeTime = (value: string) => {
  const target = new Date(value).getTime();
  const diffMs = Date.now() - target;

  if (!Number.isFinite(target) || diffMs < 0) {
    return formatDateTime(value);
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMinutes}분 전`;
  }
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}일 전`;
  }

  return formatDateTime(value);
};

const getCommunityCategoryLabel = (post: CommunityPost) => {
  const combined = `${post.title} ${post.content}`.toLowerCase();
  if (
    /(패션|의류|옷|브랜드|룩북|컬렉션|신발|재킷|웨어|fashion|lookbook|collection|jacket|shoe)/.test(
      combined
    )
  ) {
    return '패션';
  }
  if (/(코딩|개발|프론트|백엔드|api|react|next|typescript|javascript|python|coding|dev)/.test(combined)) {
    return '코딩';
  }
  if (/(유튜브|영상|편집|촬영|미디어|뮤직|음악|youtube|video|media|sound)/.test(combined)) {
    return '미디어';
  }
  return '커뮤니티';
};

type CommunityPreviewVisual =
  | { kind: 'image'; src: string }
  | { kind: 'placeholder'; toneClassName: string; panelLabel: string; mark: string };

const getCommunityPreviewVisual = (post: CommunityPost): CommunityPreviewVisual => {
  const blocks = parseRichContentBlocks(post.content || '');
  const youtubeBlock = blocks.find(
    (block): block is Extract<RichContentBlock, { type: 'youtube' }> => block.type === 'youtube'
  );

  if (youtubeBlock) {
    return {
      kind: 'image',
      src: `https://i.ytimg.com/vi/${youtubeBlock.videoId}/hqdefault.jpg`
    };
  }

  const category = getCommunityCategoryLabel(post);
  const toneClassByCategory: Record<string, string> = {
    패션: 'from-[#dfe7f1] via-[#ffffff] to-[#eef1f5]',
    코딩: 'from-[#dde7ed] via-[#ffffff] to-[#ebf0f4]',
    미디어: 'from-[#ede3e3] via-[#ffffff] to-[#f2eeee]',
    커뮤니티: 'from-[#ece8e3] via-[#ffffff] to-[#f4f1ed]'
  };

  return {
    kind: 'placeholder',
    toneClassName: toneClassByCategory[category] ?? toneClassByCategory['커뮤니티'],
    panelLabel: category,
    mark: post.title.trim().slice(0, 2).toUpperCase()
  };
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
              className="block break-all border-t border-white/10 px-3 py-2 text-xs text-white/65 hover:text-white/85"
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
  const [activeFeed, setActiveFeed] = useState<'latest' | 'popular'>('latest');
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
  const [reactionPendingByPostId, setReactionPendingByPostId] = useState<
    Record<string, boolean>
  >({});

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
    if (reactionPendingByPostId[postId]) return;
    if (!isLoggedIn) {
      setError('로그인 후 좋아요/싫어요를 누를 수 있습니다.');
      return;
    }

    setReactionPendingByPostId((prev) => ({ ...prev, [postId]: true }));
    setError(null);

    let previousPost: CommunityPost | null = null;
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        previousPost = post;
        return {
          ...post,
          ...buildOptimisticPostReactionState(post, reaction)
        };
      })
    );

    if (!previousPost) {
      setReactionPendingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      return;
    }

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
      const rollbackPost = previousPost;
      if (rollbackPost) {
        setPosts((prev) =>
          prev.map((post) => (post.id === postId ? rollbackPost : post))
        );
      }
      setError(err instanceof Error ? err.message : '좋아요/싫어요 저장에 실패했습니다.');
    } finally {
      setReactionPendingByPostId((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
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
  const latestPosts = useMemo(
    () =>
      [...posts.filter((post) => !post.isNotice)].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [posts]
  );
  const popularPosts = useMemo(
    () =>
      [...posts.filter((post) => !post.isNotice)].sort((a, b) => {
        if (b.dailyLikeCount !== a.dailyLikeCount) return b.dailyLikeCount - a.dailyLikeCount;
        if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [posts]
  );
  const feedPosts = activeFeed === 'latest' ? latestPosts : popularPosts;
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

  useEffect(() => {
    if (!selectedPostId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        setSelectedPostId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPostId, submitting]);

  return (
    <section className="space-y-6 border-t border-stone-200 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-kicker !tracking-[0.24em]">Community</p>
          <p className="mt-2 text-[1.65rem] font-semibold tracking-[-0.02em] text-stone-950 md:text-[2.2rem]">
            커뮤니티 보드
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
            코딩, 미디어, 패션 이야기를 기사형 보드로 정리해 보는 커뮤니티 공간입니다.
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
            className="y2k-button y2k-button-ghost y2k-button-fade-tight !min-h-9 !px-3 !text-[0.66rem] !tracking-[0.14em]"
          >
            게시물 작성
          </button>
          <button
            type="button"
            onClick={() => void loadPosts()}
            disabled={loading || submitting}
            className="y2k-button y2k-button-ghost y2k-button-fade-tight !min-h-9 !px-3 !text-[0.66rem] !tracking-[0.14em]"
          >
            새로고침
          </button>
        </div>
      </div>

      {notices.length > 0 && !loading && (
        <div className="rounded-[0.2rem] border border-stone-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#b1071e]">
              Notice
            </span>
            {notices.slice(0, 3).map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => {
                  setError(null);
                  setSelectedPostId(post.id);
                }}
                className="text-left text-sm text-stone-700 transition hover:text-stone-950"
              >
                {post.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {setupNotice && !error && (
        <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
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
            className="relative z-[91] w-full max-w-2xl space-y-3 border border-stone-200 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-stone-950">게시글 작성</p>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return;
                  setCreateOpen(false);
                }}
                disabled={submitting}
                className="y2k-button y2k-button-ghost y2k-button-fade-pin !min-h-9 !px-3 !text-[0.66rem] !tracking-[0.14em]"
              >
                닫기
              </button>
            </div>
            {!isLoggedIn ? (
              <p className="text-sm text-stone-600">
                글 작성은 로그인 후 가능합니다.{' '}
                <Link href="/signin" className="underline underline-offset-4 text-stone-950">
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
                  className="w-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
                <textarea
                  value={createContent}
                  onChange={(event) => setCreateContent(event.target.value)}
                  rows={6}
                  maxLength={10000}
                  placeholder={'내용\n유튜브 링크를 한 줄에 입력하면 자동 재생됩니다.'}
                  className="w-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
                />
                <p className="text-xs text-stone-500">
                  유튜브 링크를 한 줄에 단독으로 입력하면 플레이어로 표시됩니다.
                </p>
                {isAdmin && (
                  <label className="inline-flex items-center gap-2 text-sm text-stone-700">
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
                    className="y2k-button y2k-button-primary y2k-button-service-fade !min-h-10 !px-5 !text-[0.72rem] !tracking-[0.14em]"
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
                    className="y2k-button y2k-button-ghost y2k-button-fade-tight !min-h-9 !px-4 !text-[0.66rem] !tracking-[0.14em]"
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
        <div className="border border-stone-200 bg-white p-5 text-sm text-stone-600">
          게시글을 불러오는 중입니다...
        </div>
      ) : null}

      {!loading && (
        <div className="border-t border-stone-200">
          <div className="grid grid-cols-2 border-b border-stone-200 text-center">
            <button
              type="button"
              onClick={() => setActiveFeed('latest')}
              className={`relative px-4 py-4 text-sm font-semibold transition ${
                activeFeed === 'latest' ? 'text-stone-950' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              최신
              {activeFeed === 'latest' && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-stone-950" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveFeed('popular')}
              className={`relative px-4 py-4 text-sm font-semibold transition ${
                activeFeed === 'popular' ? 'text-stone-950' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              인기 글
              {activeFeed === 'popular' && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-stone-950" />
              )}
            </button>
          </div>

          {feedPosts.length > 0 ? (
            <div>
              {feedPosts.map((post, index) => (
                <CommunityMagazineRow
                  key={post.id}
                  post={post}
                  order={index + 1}
                  featuredLabel={
                    activeFeed === 'popular' && index === 0
                      ? `24시간 좋아요 ${post.dailyLikeCount}`
                      : undefined
                  }
                  onOpen={() => {
                    setError(null);
                    setSelectedPostId(post.id);
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="border-b border-stone-200 bg-white p-6 text-center text-sm text-stone-500">
              아직 게시글이 없습니다. 첫 글을 작성해 보세요.
            </div>
          )}
        </div>
      )}

      {selectedPost && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-3">
          <div
            className="absolute inset-0 bg-[rgba(10,10,10,0.62)] backdrop-blur-[2px]"
            onClick={() => {
              if (submitting) return;
              setSelectedPostId(null);
            }}
          />
          <div className="relative z-[91] flex h-[100dvh] w-full max-w-[72rem] flex-col overflow-hidden border border-stone-200 bg-[#fbfdff] shadow-[0_30px_100px_rgba(0,0,0,0.22)] sm:h-[min(100dvh-1rem,68rem)]">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#b1071e]">
                  {getCommunityCategoryLabel(selectedPost)}
                </p>
                <p className="mt-1 break-words text-base font-semibold text-stone-950 sm:text-lg">
                  {selectedPost.title}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {selectedPost.authorName} · {formatDateTime(selectedPost.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (submitting) return;
                  setSelectedPostId(null);
                }}
                disabled={submitting}
                className="y2k-button y2k-button-ghost y2k-button-fade-pin !min-h-10 !px-4 !text-[0.68rem] !tracking-[0.14em]"
                aria-label="게시글 닫기"
              >
                <X className="h-4 w-4" />
                <span>닫기</span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-3 sm:px-6 sm:pb-8 sm:pt-4">
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
                reactionPending={Boolean(reactionPendingByPostId[selectedPost.id])}
                onCommentDraftChange={(value) =>
                  setCommentDraftByPostId((prev) => ({ ...prev, [selectedPost.id]: value }))
                }
                onCreateComment={() => void handleCreateComment(selectedPost.id)}
                onDeleteComment={(commentId) => void handleDeleteComment(commentId)}
                isLoggedIn={isLoggedIn}
                inModal
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function CommunityMagazineRow({
  post,
  order,
  featuredLabel,
  onOpen
}: {
  post: CommunityPost;
  order: number;
  featuredLabel?: string;
  onOpen: () => void;
}) {
  const categoryLabel = getCommunityCategoryLabel(post);
  const previewVisual = getCommunityPreviewVisual(post);
  const excerpt = getFirstTextExcerpt(post.content);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full gap-6 border-b border-stone-200 px-0 py-7 text-left transition hover:bg-stone-50 md:grid-cols-[minmax(0,1.02fr)_minmax(18rem,0.98fr)] md:items-stretch"
    >
      <div className="flex min-h-[16rem] flex-col">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-semibold tracking-[-0.02em] text-[#1f3a7d]">
            {categoryLabel}
          </span>
          {post.isNotice && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b1071e]">
              Notice
            </span>
          )}
          {featuredLabel && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              {featuredLabel}
            </span>
          )}
        </div>

        <p className="mt-4 text-[2rem] font-semibold leading-[1.16] tracking-[-0.04em] text-stone-950 md:text-[2.2rem]">
          {post.title}
        </p>
        <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-stone-500">{excerpt}</p>
        <p className="mt-6 text-sm text-stone-500">
          By {post.authorName} / {formatRelativeTime(post.createdAt)}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-8">
          <div className="flex items-center gap-4 text-sm text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-4 w-4" />
              <span>{post.likeCount}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments.length}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              {String(order).padStart(2, '0')}
            </span>
            <Bookmark className="h-4 w-4 text-stone-400" />
          </div>
        </div>
      </div>

      <div className="relative min-h-[16rem] overflow-hidden border border-stone-200 bg-white">
        {previewVisual.kind === 'image' ? (
          <img
            src={previewVisual.src}
            alt={post.title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div
            className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${previewVisual.toneClassName} p-6`}
          >
            <div className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
              {previewVisual.panelLabel}
            </div>
            <div className="self-end text-[4.8rem] font-semibold leading-none tracking-[-0.08em] text-stone-300">
              {previewVisual.mark}
            </div>
          </div>
        )}
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
  reactionPending,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
  isLoggedIn,
  inModal = false
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
  reactionPending: boolean;
  onCommentDraftChange: (value: string) => void;
  onCreateComment: () => void;
  onDeleteComment: (commentId: string) => void;
  isLoggedIn: boolean;
  inModal?: boolean;
}) {
  const canManagePost = Boolean(currentUserId && (currentUserId === post.userId || isAdmin));
  const isEditing = editingPostId === post.id;

  return (
    <article
      className={`border ${
        post.isNotice ? 'border-[#d8b6ab] bg-[#fff9f5]' : 'border-stone-200 bg-white'
      } ${inModal ? 'flex min-h-full flex-col p-4 sm:p-6' : 'p-4 sm:p-5'}`}
    >
      {(!inModal || canManagePost) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {!inModal ? (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {post.isNotice && (
                  <span className="inline-flex items-center border border-[#d8b6ab] bg-[#fff0e6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b1071e]">
                    Notice
                  </span>
                )}
                {featuredLabel && (
                  <span className="inline-flex items-center border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    {featuredLabel}
                  </span>
                )}
                <p className="break-words text-base font-semibold text-stone-950 sm:text-lg">
                  {post.title}
                </p>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {post.authorName} · {formatDateTime(post.createdAt)}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {post.isNotice && (
                <span className="inline-flex items-center border border-[#d8b6ab] bg-[#fff0e6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b1071e]">
                  Notice
                </span>
              )}
              {featuredLabel && (
                <span className="inline-flex items-center border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                  {featuredLabel}
                </span>
              )}
            </div>
          )}

          {canManagePost && (
            <div className="flex flex-wrap items-center gap-2">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={onOpenEdit}
                  disabled={submitting}
                  className="y2k-button y2k-button-ghost y2k-button-fade-pin !min-h-9 !px-3 !text-[0.64rem] !tracking-[0.14em]"
                >
                  수정
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCloseEdit}
                  disabled={submitting}
                  className="y2k-button y2k-button-ghost y2k-button-fade-pin !min-h-9 !px-3 !text-[0.64rem] !tracking-[0.14em]"
                >
                  취소
                </button>
              )}
              <button
                type="button"
                onClick={onDeletePost}
                disabled={submitting}
                className="y2k-button y2k-button-ghost y2k-button-fade-pin !min-h-9 !px-3 !text-[0.64rem] !tracking-[0.14em]"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      )}

      {!isEditing ? (
        <RichTextWithYouTube
          content={post.content}
          containerClassName={`${inModal ? 'mt-2 max-h-[24vh] overflow-y-auto pr-1 sm:max-h-[28vh]' : 'mt-3'} space-y-3`}
          textClassName="whitespace-pre-wrap text-sm leading-relaxed text-stone-700"
        />
      ) : (
        <div className="mt-3 space-y-2">
          <input
            value={editTitle}
            onChange={(event) => onEditTitleChange(event.target.value)}
            maxLength={160}
            className="w-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
          <textarea
            value={editContent}
            onChange={(event) => onEditContentChange(event.target.value)}
            rows={4}
            maxLength={10000}
            placeholder={'내용\n유튜브 링크를 한 줄에 입력하면 자동 재생됩니다.'}
            className="w-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
          />
          {isAdmin && (
            <label className="inline-flex items-center gap-2 text-sm text-stone-700">
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
              className="y2k-button y2k-button-primary y2k-button-service-fade !min-h-9 !px-4 !text-[0.66rem] !tracking-[0.14em]"
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
          disabled={reactionPending || !isLoggedIn}
          className={`inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
            post.viewerReaction === 'like'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
          }`}
          title={isLoggedIn ? '좋아요' : '로그인 후 사용할 수 있습니다.'}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          <span>{post.likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => onReactPost('dislike')}
          disabled={reactionPending || !isLoggedIn}
          className={`inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
            post.viewerReaction === 'dislike'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
          }`}
          title={isLoggedIn ? '싫어요' : '로그인 후 사용할 수 있습니다.'}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          <span>{post.dislikeCount}</span>
        </button>
        {!isLoggedIn && <span className="text-xs text-stone-400">로그인 후 반응을 남길 수 있습니다.</span>}
      </div>

      <div className={`mt-5 flex flex-col gap-3 border border-stone-200 bg-[#fafafa] ${inModal ? 'min-h-0 flex-1 p-4 sm:p-5' : 'p-4'}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          댓글 {post.comments.length}
        </p>
        {post.comments.length === 0 ? (
          <p className="text-sm text-stone-500">아직 댓글이 없습니다.</p>
        ) : (
          <ul className={`${inModal ? 'min-h-0 flex-1 overflow-y-auto pr-1' : ''} space-y-2`}>
            {post.comments.map((comment) => {
              const canDeleteComment = Boolean(
                currentUserId && (currentUserId === comment.userId || isAdmin)
              );
              return (
                <li
                  key={comment.id}
                  className="border border-stone-200 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-stone-500">
                        {comment.authorName} · {formatDateTime(comment.createdAt)}
                      </p>
                      <RichTextWithYouTube
                        content={comment.content}
                        containerClassName="mt-1 space-y-2"
                        textClassName="whitespace-pre-wrap text-sm text-stone-700"
                      />
                    </div>
                    {canDeleteComment && (
                      <button
                        type="button"
                        onClick={() => onDeleteComment(comment.id)}
                        disabled={submitting}
                        className="y2k-button y2k-button-ghost y2k-button-fade-pin !min-h-8 !px-2.5 !text-[0.6rem] !tracking-[0.12em]"
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

        <div
          className={
            inModal
              ? 'mt-2 border border-stone-200 bg-white p-3 shadow-[0_-10px_24px_rgba(0,0,0,0.04)] sm:p-4'
              : ''
          }
        >
          {!isLoggedIn ? (
            <p className="text-sm text-stone-500">
              댓글 작성은 로그인 후 가능합니다.{' '}
              <Link href="/signin" className="underline underline-offset-4 text-stone-950">
                로그인
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={commentDraft}
                onChange={(event) => onCommentDraftChange(event.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="댓글을 입력해 주세요."
                className="w-full border border-stone-200 bg-white px-3 py-3 text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
              />
              <div>
                <button
                  type="button"
                  onClick={onCreateComment}
                  disabled={submitting}
                  className="y2k-button y2k-button-ghost y2k-button-fade-tight !min-h-9 !px-4 !text-[0.64rem] !tracking-[0.14em]"
                >
                  댓글 등록
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
