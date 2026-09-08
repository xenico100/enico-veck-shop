'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Mail,
  PenLine,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import styles from './VillageAdventure.module.css';
const DRAFT_KEY = 'mongsangin-letter-draft-v1';

type Letter = {
  id: string;
  userId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
  comments: {
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
  }[];
};
export default function VillageLetterDesk({
  initialPostId,
  onChanged,
  onDeleted
}: {
  initialPostId?: string;
  onChanged?: () => void;
  onDeleted?: () => void;
}) {
  const { user, loading: authLoading } = useAuth();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selected, setSelected] = useState(initialPostId || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState('');
  const [guest, setGuest] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState('');
  const [draftReady, setDraftReady] = useState(false);
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      if (typeof draft?.title === 'string' && typeof draft?.body === 'string') {
        setTitle(draft.title.slice(0, 160));
        setBody(draft.body.slice(0, 10000));
        setWriting(Boolean(draft.title || draft.body));
      }
    } catch {
      /* Draft storage is optional; writing still works without it. */
    }
    setDraftReady(true);
  }, []);
  useEffect(() => {
    if (!draftReady) return;
    try {
      if (title || body)
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, body }));
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* No persistent draft when session storage is unavailable. */
    }
  }, [title, body, draftReady]);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/community/posts', {
        cache: 'no-store',
        signal
      });
      const result = await response.json();
      if (!response.ok || result.setupRequired)
        throw new Error(result.message || '편지함에 연결하지 못했어요.');
      setLetters(Array.isArray(result.data) ? result.data : []);
      setError('');
    } catch (e) {
      if (!signal?.aborted)
        setError(e instanceof Error ? e.message : '연결을 확인해 주세요.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const c = new AbortController();
    void load(c.signal);
    return () => c.abort();
  }, [load]);
  const filtered = letters.filter((p) =>
    `${p.title} ${p.content} ${p.authorName}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );
  const letter = filtered.find((p) => p.id === selected) || filtered[0];
  const index = filtered.findIndex((p) => p.id === letter?.id);
  useEffect(() => {
    setReply('');
    setConfirmDelete(false);
  }, [letter?.id]);
  const changed = async () => {
    await load();
    window.dispatchEvent(new CustomEvent('village:posts-changed'));
    onChanged?.();
  };
  async function mutate(url: string, method: string, payload?: unknown) {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        result.message || '저장하지 못했어요. 다시 시도해 주세요.'
      );
    return result;
  }
  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !user || !title.trim() || !body.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await mutate('/api/community/posts', 'POST', {
        title: title.trim(),
        content: body.trim()
      });
      setSelected(result.data?.id || '');
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* Optional local draft. */
      }
      setTitle('');
      setBody('');
      setWriting(false);
      setQuery('');
      setNotice('편지가 마을에 도착했어요.');
      await changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : '발행 실패');
    } finally {
      setBusy(false);
    }
  }
  async function respond(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !letter || !reply.trim() || (!user && !guest.trim())) return;
    setBusy(true);
    setError('');
    try {
      await mutate('/api/community/comments', 'POST', {
        postId: letter.id,
        content: reply.trim(),
        anonymousName: user ? undefined : guest.trim()
      });
      setReply('');
      setNotice('답장을 남겼어요.');
      await changed();
    } catch (e) {
      setError(e instanceof Error ? e.message : '답장 실패');
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (busy || !letter) return;
    setBusy(true);
    setError('');
    try {
      await mutate(`/api/community/posts/${letter.id}`, 'DELETE');
      setConfirmDelete(false);
      setNotice('내 편지를 회수했어요.');
      await changed();
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.letterDesk}>
      <header className={styles.deskHeader}>
        <div>
          <small>똥 우체국 · 열린 편지함</small>
          <h2>{writing ? '마을에 남기는 편지' : '누군가 두고 간 마음'}</h2>
        </div>
        <button
          className={styles.icon}
          title={writing ? '편지함으로' : '편지 쓰기'}
          aria-label={writing ? '편지 작성 닫기' : '편지 쓰기'}
          onClick={() => setWriting(!writing)}
          disabled={busy}
        >
          {writing ? <X size={20} /> : <PenLine size={20} />}
        </button>
      </header>
      {error && (
        <p className={styles.error} role="alert">
          {error}
          <button
            className={styles.icon}
            aria-label="편지함 다시 연결"
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
          </button>
        </p>
      )}
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {writing ? (
        <form className={styles.paper} onSubmit={publish}>
          <span className={styles.postmark}>
            夢想人
            <br />
            OPEN LETTER
          </span>
          <label>
            제목
            <input
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>
          <label>
            편지 내용
            <textarea
              required
              maxLength={10000}
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <p className={styles.fine}>마을 모두에게 공개되는 편지입니다.</p>
          {user ? (
            <button
              className={styles.primary}
              disabled={busy || !title.trim() || !body.trim()}
            >
              <Send size={16} />
              {busy ? '배달 중...' : '편지 발행'}
            </button>
          ) : (
            <button
              type="button"
              className={styles.primary}
              disabled={authLoading}
              onClick={() =>
                window.dispatchEvent(new CustomEvent('auth:open-modal'))
              }
            >
              로그인하고 편지 남기기
            </button>
          )}
        </form>
      ) : (
        <>
          <div className={styles.letterTools}>
            <label>
              <Search size={16} />
              <input
                aria-label="편지 검색"
                placeholder="기억나는 말, 보낸 사람"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <span>{filtered.length}통</span>
          </div>
          {loading ? (
            <p role="status" className={styles.empty}>
              모아가 편지를 꺼내고 있어요...
            </p>
          ) : !letter ? (
            <div className={styles.empty}>
              <Mail size={42} />
              <h3>
                {query
                  ? '그 말이 담긴 편지는 아직 없네요.'
                  : '아직 아무도 봉투를 열지 않은 날.'}
              </h3>
              <p>
                {query
                  ? '다른 말로 찾아볼까요?'
                  : '첫 편지에는 거창한 인사가 없어도 괜찮아요.'}
              </p>
              <button
                className={styles.primary}
                onClick={() => (query ? setQuery('') : setWriting(true))}
              >
                {query ? '모든 편지 보기' : '첫 편지 쓰기'}
              </button>
            </div>
          ) : (
            <>
              <nav className={styles.pageTurn} aria-label="편지 넘기기">
                <button
                  className={styles.icon}
                  disabled={index <= 0 || busy}
                  aria-label="이전 편지"
                  onClick={() => setSelected(filtered[index - 1].id)}
                >
                  <ArrowLeft size={18} />
                </button>
                <span>
                  {index + 1} / {filtered.length}
                </span>
                <button
                  className={styles.icon}
                  disabled={index >= filtered.length - 1 || busy}
                  aria-label="다음 편지"
                  onClick={() => setSelected(filtered[index + 1].id)}
                >
                  <ArrowRight size={18} />
                </button>
              </nav>
              <article className={styles.paper} key={letter.id}>
                <div className={styles.letterFrom}>
                  <span>
                    보낸 사람 · {letter.authorName || '이름 없는 주민'}
                  </span>
                  <time>
                    {new Date(letter.createdAt).toLocaleDateString('ko-KR')}
                  </time>
                </div>
                <h3>{letter.title}</h3>
                <p className={styles.letterContent}>
                  {letter.content
                    .replace(/\[POS:\d+(?:\.\d+)?,\d+(?:\.\d+)?\]$/, '')
                    .trim()}
                </p>
                {user?.id === letter.userId && (
                  <div className={styles.actions}>
                    <button
                      className={styles.textButton}
                      disabled={busy}
                      onClick={() =>
                        confirmDelete ? void remove() : setConfirmDelete(true)
                      }
                    >
                      <Trash2 size={14} />
                      {confirmDelete ? '편지 삭제 확인' : '내 편지 회수'}
                    </button>
                    {confirmDelete && (
                      <button
                        className={styles.textButton}
                        onClick={() => setConfirmDelete(false)}
                        disabled={busy}
                      >
                        취소
                      </button>
                    )}
                  </div>
                )}
              </article>
              <section className={styles.replies} aria-label="도착한 답장">
                <h3>
                  이 편지에 도착한 답장{' '}
                  <span>{letter.comments?.length || 0}</span>
                </h3>
                {letter.comments?.map((c) => (
                  <blockquote key={c.id}>
                    <p>{c.content}</p>
                    <cite>{c.authorName || '이름 없는 주민'}</cite>
                  </blockquote>
                ))}
                <form onSubmit={respond}>
                  {!user && (
                    <label>
                      보낸 사람
                      <input
                        required
                        maxLength={20}
                        value={guest}
                        onChange={(e) => setGuest(e.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    답장
                    <textarea
                      required
                      maxLength={2000}
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                  </label>
                  <button
                    className={styles.primary}
                    disabled={busy || !reply.trim() || (!user && !guest.trim())}
                  >
                    <Send size={16} />
                    {busy ? '배달 중...' : '답장 보내기'}
                  </button>
                </form>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
