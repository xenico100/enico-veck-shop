'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import cn from 'classnames';

type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
};

type PostsSectionProps = {
  isAuthenticated: boolean;
  userEmail: string | null;
  posts: Post[];
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

export default function PostsSection({
  isAuthenticated,
  userEmail,
  posts
}: PostsSectionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const canSubmit = useMemo(
    () => title.trim().length > 0 && content.trim().length > 0,
    [title, content]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? '글 작성에 실패했습니다.');
      }

      setTitle('');
      setContent('');
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="posts"
      className="bg-gradient-to-b from-black via-neutral-950 to-black py-24 px-4"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-neutral-400">
                Community
              </p>
              <h2 className="text-3xl font-semibold text-white">
                ZEUS Studio 게시판
              </h2>
              <p className="text-sm text-neutral-300">
                작업 후기와 문의를 남겨주세요. 로그인한 사용자만 글쓰기가
                가능합니다.
              </p>
            </div>
            {isAuthenticated ? (
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="text-xs text-neutral-400">
                  {userEmail ? `${userEmail} 로그인됨` : '로그인됨'}
                </div>
                <button
                  onClick={() => setIsOpen(true)}
                  className="rounded-full border border-white/30 bg-white/10 px-6 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20"
                >
                  글쓰기
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2 text-sm text-neutral-300">
                <span>글쓰기는 로그인 후 가능합니다.</span>
                <Link
                  href="/login"
                  className="text-white underline underline-offset-4 transition hover:text-neutral-300"
                >
                  로그인하러 가기
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-sm text-neutral-400">
              아직 등록된 글이 없습니다. 첫 글을 작성해 주세요!
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-white/40"
              >
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                    {formatDate(post.created_at)}
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    {post.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-300">
                    {post.content}
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-neutral-950 p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">새 글 작성</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                닫기
              </button>
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  제목
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                  placeholder="제목을 입력해 주세요."
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                  내용
                </label>
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-[140px] w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
                  placeholder="작업 후기를 남겨주세요."
                  maxLength={1000}
                />
              </div>

              {errorMessage && (
                <p className="text-sm text-rose-300">{errorMessage}</p>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-neutral-500">
                  {title.length}/80 · {content.length}/1000
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting}
                  className={cn(
                    'rounded-full px-6 py-2 text-sm font-semibold text-white transition',
                    {
                      'border border-white/30 bg-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20':
                        canSubmit && !isSubmitting,
                      'cursor-not-allowed bg-neutral-700 text-neutral-300':
                        !canSubmit || isSubmitting
                    }
                  )}
                >
                  {isSubmitting ? '작성 중...' : '게시하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
