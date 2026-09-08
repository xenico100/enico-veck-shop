'use client';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Fingerprint,
  MessageCircle,
  MoveRight,
  RotateCcw,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import {
  findBuilding,
  type VillageBuildingId
} from '@/utils/village-buildings';
import {
  fragments,
  isRestored,
  residents,
  type FragmentId
} from '@/utils/village-story';
import { useVillageStory } from './useVillageStory';
import VillageRoomArt, { ResidentSprite } from './VillageRoomArt';
import styles from './VillageAdventure.module.css';
const Services = dynamic(() => import('./ServicesSection'));
const Studio = dynamic(() => import('./StudioSectionWithSearchParams'), {
  ssr: false
});
const Letters = dynamic(() => import('./VillageLetterDesk'));
const About = dynamic(() => import('./AboutSection'));

function Room({
  building,
  onCart,
  onProfile,
  onDating
}: {
  building: VillageBuildingId;
  onCart: () => void;
  onProfile: () => void;
  onDating: () => void;
}) {
  const meta = findBuilding(building)!;
  const resident = residents[building];
  const { story, record, saved } = useVillageStory();
  const [line, setLine] = useState(resident.greeting);
  const [activity, setActivity] = useState<'main' | 'archive' | null>(null);
  const [order, setOrder] = useState<FragmentId[]>([]);
  const [puzzleMessage, setPuzzleMessage] = useState('');
  const activityRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (activity)
      activityRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [activity]);
  const fragment = fragments.find((f) => f.room === building);
  const collected = Boolean(fragment && story.fragments.includes(fragment.id));
  const action = () => {
    if (building === 'profile') onProfile();
    else if (building === 'dating') onDating();
    else setActivity('main');
  };
  const inspect = () => {
    if (fragment) {
      record(fragment.id);
      setLine(
        `${resident.clue} 「${fragment.text}」${collected ? ' 수첩에 남겨 둔 조각이다.' : ' 문장 조각을 수첩에 넣었다.'}`
      );
    } else setLine(resident.clue);
  };
  return (
    <>
      <header className={styles.roomHeader}>
        <div>
          <small>
            夢想人 /{' '}
            {String(
              [
                'community',
                'goods',
                'studio',
                'profile',
                'dating',
                'about'
              ].indexOf(building) + 1
            ).padStart(2, '0')}
          </small>
          <Dialog.Title>{meta.name}</Dialog.Title>
        </div>
        <div className={styles.actions}>
          {building === 'goods' && (
            <button
              className={styles.icon}
              aria-label="잡화점 장바구니"
              title="장바구니"
              onClick={onCart}
            >
              <ShoppingBag size={20} />
            </button>
          )}
          <Dialog.Close className={styles.exit}>
            <ArrowLeft size={18} />
            <span>마을로</span>
          </Dialog.Close>
        </div>
      </header>
      <div className={styles.roomBody} hidden={Boolean(activity)}>
        <div className={styles.scene}>
          <div className={styles.sceneArt}>
            <VillageRoomArt room={building} restored={story.completed} />
            <button
              className={`${styles.hotspot} ${styles.residentSpot}`}
              style={{ left: '25%', top: '59%' }}
              onClick={() => setLine(resident.greeting)}
              aria-label={`${resident.name}에게 말 걸기`}
            >
              <ResidentSprite color={meta.color} />
              <span>
                <MessageCircle size={13} />
                {resident.name}
              </span>
            </button>
            <button
              className={styles.hotspot}
              style={{
                left: '49%',
                top: building === 'studio' ? '32%' : '58%'
              }}
              onClick={action}
            >
              <span className={styles.marker}>
                <Fingerprint size={20} />
              </span>
              <strong>{resident.action}</strong>
            </button>
            <button
              className={styles.hotspot}
              style={{ left: '74%', top: '56%' }}
              onClick={inspect}
            >
              <span className={styles.marker}>
                {collected ? <Check size={20} /> : <Sparkles size={20} />}
              </span>
              <strong>
                {fragment?.object ||
                  (building === 'about'
                    ? '작업 노트'
                    : building === 'dating'
                      ? '잔 아래 메모'
                      : '안내인의 수첩')}
              </strong>
            </button>
          </div>
          <div className={styles.sceneCaption}>
            <span>{meta.caption}</span>
            <span>
              {story.completed
                ? '첫 편지 · 배달 완료'
                : `문장 조각 ${story.fragments.length} / 3`}
            </span>
          </div>
        </div>
        <section
          className={styles.dialogue}
          aria-label={`${resident.name}의 대화`}
        >
          <div className={styles.portrait}>
            <ResidentSprite color={meta.color} />
          </div>
          <div className={styles.dialogueText}>
            <div className={styles.speaker}>
              <b>{resident.name}</b>
              <small>{resident.role}</small>
            </div>
            <p aria-live="polite">{line}</p>
            <div className={styles.choices}>
              <button onClick={action}>
                <MoveRight size={16} />
                {resident.action}
              </button>
              <button onClick={() => setLine(resident.answer)}>
                <MessageCircle size={16} />
                {resident.question}
              </button>
              {building === 'about' && (
                <button onClick={() => setActivity('archive')}>
                  <BookOpen size={16} />
                  제작 기록
                </button>
              )}
            </div>
            {!saved && (
              <small role="status">
                저장 공간에 접근할 수 없어 이번 방문 동안만 기억해요.
              </small>
            )}
          </div>
        </section>
      </div>
      {activity && (
        <section
          className={styles.activity}
          ref={activityRef}
          aria-label={activity === 'archive' ? '제작 기록' : resident.action}
        >
          <header className={styles.activityHeader}>
            <button className={styles.exit} onClick={() => setActivity(null)}>
              <ArrowLeft size={18} />
              {meta.name} 돌아가기
            </button>
            <span>{resident.name}의 작업대</span>
          </header>
          <div className={styles.activityContent}>
            <Suspense fallback={<p role="status">잠시만 기다려 주세요...</p>}>
              {activity === 'archive' ? (
                <About />
              ) : building === 'community' ? (
                <Letters />
              ) : building === 'goods' ? (
                <Services
                  mode="modal"
                  game
                  onOpenCart={onCart}
                  sectionId="village-goods"
                />
              ) : building === 'studio' ? (
                <Studio game />
              ) : building === 'about' ? (
                <div className={styles.puzzle}>
                  <small>제작 연구소 · 주소 없는 첫 편지</small>
                  <h2>
                    {story.completed
                      ? '수신인은, 이곳에 온 당신.'
                      : '이 마을이 시작된 한 문장'}
                  </h2>
                  <p>
                    {story.completed
                      ? '버려진 마음에도 머물 자리는 있다. 당신은 이 마을의 첫 편지를 되찾은 기록 배달원입니다.'
                      : '우표에서 시작해 꼬리표를 지나 필름으로. 결이 비워 둔 세 자리에 문장을 이어 보자.'}
                  </p>
                  <div className={styles.wordSlots}>
                    {[0, 1, 2].map((i) => (
                      <button
                        key={i}
                        aria-label={`${i + 1}번째 문장 조각 ${order[i] ? fragments.find((f) => f.id === order[i])?.text : '빈자리'}`}
                        disabled={!order[i] || story.completed}
                        onClick={() => {
                          setOrder(order.filter((_, j) => j !== i));
                          setPuzzleMessage('');
                        }}
                      >
                        {story.completed
                          ? fragments[i].text
                          : fragments.find((f) => f.id === order[i])?.text ||
                            `${i + 1}`}
                      </button>
                    ))}
                  </div>
                  {!story.completed && (
                    <>
                      <div className={styles.wordBank}>
                        {[...fragments].reverse().map((f) => (
                          <button
                            key={f.id}
                            disabled={
                              !story.fragments.includes(f.id) ||
                              order.includes(f.id)
                            }
                            onClick={() => {
                              setOrder([...order, f.id]);
                              setPuzzleMessage('');
                            }}
                          >
                            {story.fragments.includes(f.id)
                              ? f.text
                              : `${f.object} · 미발견`}
                          </button>
                        ))}
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={styles.primary}
                          disabled={order.length !== 3}
                          onClick={() => {
                            if (isRestored(order)) {
                              record('complete');
                              setPuzzleMessage(
                                '첫 편지를 복원했어요. 기록 배달원 인장을 받았습니다.'
                              );
                            } else
                              setPuzzleMessage(
                                '결: 마음, 자리, 존재. 그 순서로 다시 읽어 볼까?'
                              );
                          }}
                        >
                          <Check size={17} />
                          문장 잇기
                        </button>
                        <button
                          className={styles.icon}
                          title="조각 다시 놓기"
                          aria-label="조각 다시 놓기"
                          onClick={() => {
                            setOrder([]);
                            setPuzzleMessage('');
                          }}
                        >
                          <RotateCcw size={17} />
                        </button>
                      </div>
                    </>
                  )}
                  {story.completed && (
                    <div className={styles.endingSeal}>
                      <Check size={24} />
                      <b>기록 배달원</b>
                      <span>夢想人 · 첫 번째 이야기 완료</span>
                    </div>
                  )}
                  <p role="status">{puzzleMessage}</p>
                  <small className={styles.fine}>
                    여행 수첩 · 이 기기에 저장
                  </small>
                </div>
              ) : null}
            </Suspense>
          </div>
        </section>
      )}
    </>
  );
}

export default function VillageInterior({
  building,
  onClose,
  onCart,
  onProfile,
  onDating
}: {
  building: VillageBuildingId | null;
  onClose: () => void;
  onCart: () => void;
  onProfile: () => void;
  onDating: () => void;
}) {
  return (
    <Dialog.Root
      open={Boolean(building)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.room}
          aria-describedby={undefined}
          data-avatar-ui="true"
        >
          {building && (
            <Room
              key={building}
              building={building}
              onCart={onCart}
              onProfile={onProfile}
              onDating={onDating}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
