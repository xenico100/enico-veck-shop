'use client';
import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Navigation,
  Check,
  RotateCcw,
  X
} from 'lucide-react';
import { useVillageStory } from './useVillageStory';
import { fragments, nextStoryRoom } from '@/utils/village-story';
import { findBuilding, VILLAGE_TRAVEL_EVENT } from '@/utils/village-buildings';
import styles from './VillageAdventure.module.css';

export default function VillageStoryJournal() {
  const { story, record, saved } = useVillageStory();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const expanded = open || !story.started;
  const destination = nextStoryRoom(story);
  return (
    <aside
      className={styles.journal}
      data-avatar-ui="true"
      onClick={(e) => e.stopPropagation()}
      aria-label="여행 수첩"
    >
      <button
        className={styles.journalToggle}
        onClick={() => {
          if (!story.started) record('start');
          setOpen(!expanded);
        }}
        aria-expanded={expanded}
      >
        <BookOpen size={18} />
        <span>
          <small>夢想人 · 첫 번째 이야기</small>
          <strong>
            {story.completed ? '머물 자리는 있다' : '사라진 첫 문장'}
          </strong>
        </span>
        <b>
          {story.completed ? (
            <Check size={18} />
          ) : (
            `${story.fragments.length}/3`
          )}
        </b>
        <ChevronDown size={16} />
      </button>
      {expanded && (
        <div className={styles.journalBody}>
          <p>
            {story.completed
              ? '문장을 되찾았다. 이제 이 마을에는 당신의 자리도 있다.'
              : '주소 없는 편지 한 통. 세 조각으로 흩어진 문장의 수신인을 찾는 중.'}
          </p>
          <ol>
            {fragments.map((f) => (
              <li key={f.id}>
                <span>
                  {story.fragments.includes(f.id) ? <Check size={14} /> : '·'}
                </span>
                {story.fragments.includes(f.id) ? f.text : f.object}
              </li>
            ))}
          </ol>
          {!story.completed && (
            <button
              className={styles.primary}
              onClick={() => {
                record('start');
                window.dispatchEvent(
                  new CustomEvent(VILLAGE_TRAVEL_EVENT, { detail: destination })
                );
                setOpen(false);
              }}
            >
              <Navigation size={16} />
              {findBuilding(destination)?.name}에 가기
            </button>
          )}
          {story.completed && (
            <div className={styles.actions}>
              <button
                className={styles.textButton}
                onClick={() => {
                  if (confirmReset) {
                    record('reset');
                    setConfirmReset(false);
                    setOpen(true);
                  } else setConfirmReset(true);
                }}
              >
                <RotateCcw size={14} />
                {confirmReset ? '이 기기의 이야기 초기화' : '다시 여행하기'}
              </button>
              {confirmReset && (
                <button
                  className={styles.icon}
                  aria-label="초기화 취소"
                  onClick={() => setConfirmReset(false)}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}
          <small>
            {saved
              ? '여행 수첩 · 이 기기에 저장됨'
              : '기기 저장 불가 · 이번 방문 동안만 기억해요'}
          </small>
        </div>
      )}
    </aside>
  );
}
