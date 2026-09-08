'use client';

import { type FormEvent, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  FileText,
  Save,
  Trash2
} from 'lucide-react';

import { BRAND_NAME } from '@/utils/branding';

import styles from './page.module.css';

const STORAGE_KEY = 'mongsangin-admin-draft-v1';

type Category = '' | '코딩' | '미디어' | '패션';

type Draft = {
  title: string;
  category: Category;
  body: string;
};

type SaveState = 'empty' | 'unsaved' | 'saved';
type FeedbackType = 'success' | 'info' | 'error';

type Feedback = {
  type: FeedbackType;
  message: string;
};

type StoredDraft = Draft & {
  savedAt?: string;
};

const EMPTY_DRAFT: Draft = {
  title: '',
  category: '',
  body: ''
};

const isCategory = (value: unknown): value is Category =>
  value === '' || value === '코딩' || value === '미디어' || value === '패션';

const formatSavedAt = (savedAt: string) => {
  if (!savedAt) return '저장됨';

  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return '저장됨';

  return `${date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  })} 저장됨`;
};

export default function AdminPage() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saveState, setSaveState] = useState<SaveState>('empty');
  const [savedAt, setSavedAt] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (parsed && typeof parsed === 'object') {
          const candidate = parsed as Partial<StoredDraft>;
          const nextDraft: Draft = {
            title: typeof candidate.title === 'string' ? candidate.title : '',
            category: isCategory(candidate.category) ? candidate.category : '',
            body: typeof candidate.body === 'string' ? candidate.body : ''
          };

          if (nextDraft.title || nextDraft.category || nextDraft.body) {
            setDraft(nextDraft);
            setSaveState('saved');
            setSavedAt(
              typeof candidate.savedAt === 'string' ? candidate.savedAt : ''
            );
          }
        }
      }
    } catch {
      setFeedback({
        type: 'error',
        message: '브라우저 임시저장을 불러오지 못했습니다.'
      });
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const hasDraftContent = Boolean(
    draft.title.trim() || draft.category || draft.body.trim()
  );
  const updateDraft = (field: keyof Draft, value: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value
    }));
    setSaveState('unsaved');
    setSavedAt('');
    setFeedback(null);
  };

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isHydrated || !hasDraftContent) return;

    const nextSavedAt = new Date().toISOString();

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...draft, savedAt: nextSavedAt })
      );
      setSavedAt(nextSavedAt);
      setSaveState('saved');
      setFeedback({
        type: 'success',
        message: '이 브라우저에 임시저장했습니다.'
      });
    } catch {
      setFeedback({
        type: 'error',
        message: '브라우저 임시저장에 실패했습니다.'
      });
    }
  };

  const handleClear = () => {
    if (!hasDraftContent) return;

    const shouldClear = window.confirm(
      '작성한 내용과 브라우저 임시저장을 모두 지울까요?'
    );

    if (!shouldClear) return;

    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setDraft(EMPTY_DRAFT);
      setSavedAt('');
      setSaveState('empty');
      setFeedback({
        type: 'success',
        message: '브라우저 임시저장을 지웠습니다.'
      });
    } catch {
      setFeedback({
        type: 'error',
        message: '브라우저 임시저장을 지우지 못했습니다.'
      });
    }
  };

  const storageState = !isHydrated
    ? '확인 중'
    : saveState === 'saved'
      ? formatSavedAt(savedAt)
      : saveState === 'unsaved'
        ? '변경사항 있음'
        : '저장된 초안 없음';

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar} aria-label="관리자 메뉴">
        <div className={styles.sidebarHeader}>
          <a
            className={styles.brandLink}
            href="/"
            aria-label="몽상인"
            title="홈으로 이동"
          >
            <span className={styles.brandLogo} aria-hidden="true">
              {BRAND_NAME}
            </span>
            <span className={styles.brandKorean} aria-hidden="true">
              몽상인
            </span>
          </a>
          <span className={styles.adminLabel}>관리자</span>
        </div>

        <nav className={styles.navigation} aria-label="관리자 내비게이션">
          <a
            className={`${styles.navLink} ${styles.navLinkSelected}`}
            href="/admin"
            aria-current="page"
          >
            <FileText aria-hidden="true" size={17} strokeWidth={1.8} />
            <span>콘텐츠 발행</span>
          </a>
        </nav>

        <a className={styles.returnLink} href="/">
          <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.8} />
          <span>웹사이트로 돌아가기</span>
        </a>
      </aside>

      <main className={styles.main}>
        <div className={styles.mainInner}>
          <header className={styles.mainHeader}>
            <h1 className={styles.pageTitle}>콘텐츠 발행</h1>
            <div
              className={`${styles.storageStatus} ${styles[saveState]}`}
              aria-live="polite"
            >
              <span className={styles.storageMark} aria-hidden="true" />
              <span>
                <span className={styles.storageLabel}>브라우저 임시저장</span>
                <span className={styles.storageState}>{storageState}</span>
              </span>
            </div>
          </header>

          <section className={styles.editorSection} aria-labelledby="editor-title">
            <div className={styles.sectionHeader}>
              <p className={styles.sectionKicker}>새 글</p>
              <h2 id="editor-title" className={styles.sectionTitle}>
                초안 작성
              </h2>
            </div>

            <form className={styles.editorForm} onSubmit={handleSave}>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="content-title">
                    제목
                  </label>
                  <input
                    id="content-title"
                    name="title"
                    type="text"
                    value={draft.title}
                    onChange={(event) => updateDraft('title', event.target.value)}
                    placeholder="제목을 입력하세요"
                    autoComplete="off"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="content-category">
                    카테고리
                  </label>
                  <div className={styles.selectWrap}>
                    <select
                      id="content-category"
                      name="category"
                      value={draft.category}
                      onChange={(event) =>
                        updateDraft('category', event.target.value)
                      }
                    >
                      <option value="">카테고리 선택</option>
                      <option value="코딩">코딩</option>
                      <option value="미디어">미디어</option>
                      <option value="패션">패션</option>
                    </select>
                    <ChevronDown
                      className={styles.selectIcon}
                      aria-hidden="true"
                      size={17}
                      strokeWidth={1.8}
                    />
                  </div>
                </div>
              </div>

              <div className={`${styles.field} ${styles.bodyField}`}>
                <label className={styles.fieldLabel} htmlFor="content-body">
                  본문
                </label>
                <textarea
                  id="content-body"
                  name="body"
                  value={draft.body}
                  onChange={(event) => updateDraft('body', event.target.value)}
                  placeholder="내용을 입력하세요"
                  rows={15}
                />
              </div>

              <div className={styles.formActions}>
                <p className={styles.storageNote}>
                  <Save aria-hidden="true" size={15} strokeWidth={1.8} />
                  <span>이 기기에만 저장됩니다. 서버에는 저장되지 않습니다.</span>
                </p>
                <div className={styles.actionGroup}>
                  <button
                    className={`${styles.button} ${styles.clearButton}`}
                    type="button"
                    onClick={handleClear}
                    disabled={!hasDraftContent}
                  >
                    <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
                    <span>지우기</span>
                  </button>
                  <button
                    className={`${styles.button} ${styles.saveButton}`}
                    type="submit"
                    disabled={!isHydrated || !hasDraftContent}
                  >
                    <Save aria-hidden="true" size={16} strokeWidth={1.8} />
                    <span>임시저장</span>
                  </button>
                </div>
              </div>

              <p
                className={`${styles.feedback} ${feedback ? styles[feedback.type] : ''}`}
                aria-live="polite"
                role={feedback?.type === 'error' ? 'alert' : undefined}
              >
                {feedback?.message ?? ''}
              </p>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
