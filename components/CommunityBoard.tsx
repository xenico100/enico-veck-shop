'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, RefreshCw, Search, PenLine, X } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import styles from '@/app/community/page.module.css';
import PoopPostModal from './PoopPostModal';

type Post = React.ComponentProps<typeof PoopPostModal>['post'] & {
  isNotice: boolean;
};

export default function CommunityBoard({
  embedded = false
}: {
  embedded?: boolean;
}) {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [writeError, setWriteError] = useState('');

  const loadPosts = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/community/posts', {
        signal,
        cache: 'no-store'
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || '게시글을 불러오지 못했습니다.');
      setSetupRequired(Boolean(result.setupRequired));
      setPosts(Array.isArray(result.data) ? result.data : []);
      window.dispatchEvent(new CustomEvent('village:posts-changed'));
    } catch (reason) {
      if (signal?.aborted) return;
      setError(
        reason instanceof Error ? reason.message : '연결을 확인해 주세요.'
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPosts(controller.signal);
    return () => controller.abort();
  }, [loadPosts]);

  const filtered = useMemo(
    () =>
      posts.filter((post) =>
        `${post.title} ${post.content} ${post.authorName}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase())
      ),
    [posts, query]
  );

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !title.trim() || !content.trim()) return;
    setSaving(true);
    setWriteError('');
    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() })
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || '발행하지 못했습니다.');
      setTitle('');
      setContent('');
      setWriting(false);
      await loadPosts();
    } catch (reason) {
      setWriteError(
        reason instanceof Error ? reason.message : '발행하지 못했습니다.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      {!embedded && (
        <header className={styles.header}>
          <Link href="/" aria-label="광장으로 돌아가기">
            <ArrowLeft size={18} />
            <b>夢想人</b>
          </Link>
          <span>COMMUNITY</span>
          <span>{user?.name || '방문자'}</span>
        </header>
      )}
      <div className={styles.body}>
        <div className={styles.title}>
          <div>
            <span>몽상인 게시판</span>
            <h1>광장 이야기</h1>
          </div>
          <button
            disabled={authLoading || setupRequired || loading}
            onClick={() => {
              if (user) {
                setWriting(true);
                setSelected(null);
              } else
                void signInWithGoogle().catch(() =>
                  setError('로그인을 시작하지 못했습니다.')
                );
            }}
          >
            <PenLine size={17} />
            {user ? '글쓰기' : '로그인'}
          </button>
        </div>
        <div className={styles.toolbar}>
          <label>
            <Search size={17} />
            <input
              aria-label="게시글 검색"
              placeholder="검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <span>{filtered.length}개의 이야기</span>
          <button
            title="새로고침"
            aria-label="게시글 새로고침"
            disabled={loading}
            onClick={() => void loadPosts()}
          >
            <RefreshCw size={17} />
          </button>
        </div>
        {writing && (
          <form className={styles.editor} onSubmit={publish}>
            <div className={styles.title}>
              <h2>새 이야기</h2>
              <button
                type="button"
                aria-label="작성 닫기"
                disabled={saving}
                onClick={() => setWriting(false)}
              >
                <X size={18} />
              </button>
            </div>
            <label>
              제목
              <input
                required
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label>
              내용
              <textarea
                required
                rows={8}
                maxLength={10000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
            </label>
            {writeError && <p role="alert">{writeError}</p>}
            <button disabled={saving || !title.trim() || !content.trim()}>
              {saving ? '발행 중' : '발행'}
            </button>
          </form>
        )}
        {error && (
          <p className={styles.empty} role="alert">
            {error}
          </p>
        )}
        {loading ? (
          <p className={styles.empty} role="status">
            이야기를 불러오는 중...
          </p>
        ) : setupRequired ? (
          <p className={styles.empty} role="status">
            게시판 연결을 준비 중입니다. 잠시 후 다시 방문해 주세요.
          </p>
        ) : !error && filtered.length === 0 ? (
          <p className={styles.empty}>
            {query ? '검색 결과가 없습니다.' : '아직 올라온 이야기가 없습니다.'}
          </p>
        ) : (
          <div className={styles.list}>
            {filtered.map((post) => (
              <article key={post.id}>
                <button
                  className={styles.post}
                  onClick={() => {
                    setSelected(selected === post.id ? null : post.id);
                    setWriting(false);
                  }}
                  aria-expanded={selected === post.id}
                >
                  <small>
                    {post.isNotice ? '공지 · ' : ''}
                    {post.authorName}
                  </small>
                  <h2>{post.title}</h2>
                  <p>{post.content.slice(0, 120)}</p>
                </button>
                {selected === post.id && (
                  <PoopPostModal
                    post={post}
                    onClose={() => setSelected(null)}
                    onDelete={() => {
                      setSelected(null);
                      void loadPosts();
                    }}
                    onCommentAdded={() => void loadPosts()}
                  />
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
