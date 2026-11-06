'use client';

import { useEffect, useState } from 'react';
import {
  BatteryLow,
  BatteryMedium,
  BookOpen,
  Flashlight,
  Gem,
  Heart,
  Moon,
  Sunrise,
  Wind
} from 'lucide-react';
import {
  CHAPTERS,
  CLUES,
  FRAGMENTS,
  NOTES,
  clueCount,
  fragmentCount,
  noteCount,
  type DialogueLine,
  type GameState,
  type WorldSettings
} from '@/utils/world-game';
import styles from './WorldExplorer.module.css';

export type HudSnapshot = {
  chapter: number;
  objective: { title: string; detail: string };
  breath: number;
  battery: number;
  flashlightOwned: boolean;
  flashlightOn: boolean;
  fragments: number;
  clues: number;
  danger: number;
  prompt: { label: string; verb: string } | null;
  blackout: boolean;
  dawn: boolean;
  riding?: boolean;
  cameraMode?: 'third' | 'first';
};

export type DialogueState = {
  lines: DialogueLine[];
  index: number;
  shown: number;
};

export function formatPlayTime(seconds: number) {
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
    minutes % 60
  ).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function TitleScreen({
  logoReady,
  loading,
  failed,
  saveLabel,
  endingSeen,
  confirmNew,
  onNew,
  onConfirmNew,
  onCancelNew,
  onContinue,
  onSettings,
  onList
}: {
  logoReady: boolean;
  loading: boolean;
  failed: boolean;
  saveLabel: string | null;
  endingSeen: boolean;
  confirmNew: boolean;
  onNew(): void;
  onConfirmNew(): void;
  onCancelNew(): void;
  onContinue(): void;
  onSettings(): void;
  onList(): void;
}) {
  return (
    <section className={styles.title} aria-labelledby="world-title" data-voxel-logo={logoReady}>
      <div className={styles.titleMark} aria-hidden="true">
        夢想人
      </div>
      <h1 id="world-title">
        <span className={styles.titleWord}>몽상인</span>
        <small>잠들지 않는 마을</small>
      </h1>
      <p className={styles.titleLead}>
        자정이 지난 몽상로에서 눈을 떴다. 마을은 첫 문장을 잃어버렸고, 가로등만이
        아직 깨어 있다.
      </p>
      {confirmNew ? (
        <div className={styles.menu} role="group" aria-label="새로 시작 확인">
          <p className={styles.menuNote}>저장된 산책 기록을 지우고 처음부터 걸을까요?</p>
          <button className={styles.menuPrimary} onClick={onConfirmNew}>
            기록 지우고 시작
          </button>
          <button onClick={onCancelNew}>돌아가기</button>
        </div>
      ) : (
        <div className={styles.menu} role="group" aria-label="타이틀 메뉴">
          {saveLabel && (
            <button className={styles.menuPrimary} onClick={onContinue}>
              이어 걷기 <small>{saveLabel}</small>
            </button>
          )}
          <button
            className={saveLabel ? undefined : styles.menuPrimary}
            onClick={onNew}
          >
            산책 시작
          </button>
          <button onClick={onSettings}>설정</button>
          <button onClick={onList}>목록으로 둘러보기</button>
        </div>
      )}
      <p className={styles.loadingLine} role="status">
        {loading ? (
          <>
            <span className={styles.spinner} aria-hidden="true" /> NOW LOADING…
            마을을 불러오는 중
          </>
        ) : failed ? (
          '실제 마을을 불러오지 못했습니다 — 임시 장면으로 걸을 수 있어요'
        ) : (
          <span className={styles.pressStart}>
            {endingSeen ? '새벽을 본 몽상인 · ' : ''}PRESS START
          </span>
        )}
      </p>
      <small className={styles.titleFoot}>
        WASD 이동 · R 벡독 타기 · Shift 달리기 · 마우스 시점 · V 1/3인칭 전환 · E 행동 · F 손전등 · J 일지 · M 서울 지도
      </small>
    </section>
  );
}

function Meter({
  label,
  value,
  tone,
  icon
}: {
  label: string;
  value: number;
  tone: 'breath' | 'battery';
  icon: React.ReactNode;
}) {
  const filled = Math.round(Math.max(0, Math.min(100, value)) / 10);
  return (
    <div className={styles.meter} data-tone={tone} data-low={value < 25}>
      <span className={styles.meterIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.meterLabel}>{label}</span>
      <span
        className={styles.meterBar}
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} data-on={index < filled} />
        ))}
      </span>
    </div>
  );
}

export function Hud({ hud }: { hud: HudSnapshot }) {
  const chapter = CHAPTERS[Math.min(hud.chapter, CHAPTERS.length - 1)];
  return (
    <>
      <aside className={styles.objective} aria-live="polite">
        <span className={styles.chapterTag}>
          {hud.dawn ? <Sunrise size={12} /> : <Moon size={12} />} {chapter.title}
        </span>
        <strong>{hud.objective.title}</strong>
        <small>{hud.objective.detail}</small>
      </aside>
      <aside className={styles.status} aria-label="상태">
        <Meter
          label="숨"
          value={hud.breath}
          tone="breath"
          icon={hud.danger > 0.25 ? <Heart size={14} /> : <Wind size={14} />}
        />
        {hud.flashlightOwned && (
          <Meter
            label={hud.flashlightOn ? '손전등 ON' : '손전등 OFF'}
            value={hud.battery}
            tone="battery"
            icon={
              hud.battery < 25 ? (
                <BatteryLow size={14} />
              ) : hud.flashlightOn ? (
                <Flashlight size={14} />
              ) : (
                <BatteryMedium size={14} />
              )
            }
          />
        )}
        <div className={styles.counters}>
          <span>
            <Gem size={13} /> 꿈 조각 {hud.fragments}/{FRAGMENTS.length}
          </span>
          {hud.chapter >= 2 && (
            <span>
              <BookOpen size={13} /> 단서 {hud.clues}/{CLUES.length}
            </span>
          )}
          <span>
            {hud.riding ? '🐕 벡독 탑승 중 (R 하차)' : '🐕 R 벡독 타기'}
          </span>
        </div>
      </aside>
      {hud.prompt && (
        <div className={styles.prompt} aria-live="polite">
          <kbd>E</kbd> {hud.prompt.verb}
          <span>{hud.prompt.label}</span>
        </div>
      )}
    </>
  );
}

export function DialogueBox({
  dialogue,
  onAdvance
}: {
  dialogue: DialogueState;
  onAdvance(): void;
}) {
  const line = dialogue.lines[dialogue.index];
  if (!line) return null;
  const done = dialogue.shown >= line.text.length;
  return (
    <section
      className={styles.dialogue}
      role="dialog"
      aria-modal="false"
      aria-label={line.speaker || '독백'}
      onClick={onAdvance}
    >
      {line.speaker && <span className={styles.speaker}>{line.speaker}</span>}
      <p aria-live="polite">{line.text.slice(0, dialogue.shown)}</p>
      <button
        className={styles.dialogueNext}
        onClick={(event) => {
          event.stopPropagation();
          onAdvance();
        }}
        aria-label={done ? '다음 대사' : '대사 전부 보기'}
      >
        {done ? (dialogue.index + 1 < dialogue.lines.length ? '▼' : '■') : '…'}
        <kbd>E</kbd>
      </button>
    </section>
  );
}

export function NoteCard({
  note,
  onClose
}: {
  note: { title: string; text: string };
  onClose(): void;
}) {
  return (
    <section className={styles.noteCard} role="dialog" aria-label={note.title}>
      <span className={styles.eyebrow}>읽은 것</span>
      <h2>{note.title}</h2>
      <p>{note.text}</p>
      <button className={styles.primary} onClick={onClose} autoFocus>
        닫기 <kbd>E</kbd>
      </button>
    </section>
  );
}

export function JournalPanel({ state }: { state: GameState }) {
  return (
    <div className={styles.journal}>
      <section>
        <h3>장</h3>
        <ol className={styles.chapterList}>
          {CHAPTERS.map((chapter, index) => (
            <li key={chapter.title} data-state={index < state.chapter ? 'done' : index === state.chapter ? 'now' : 'later'}>
              {index <= state.chapter ? chapter.title : '· · ·'}
              {index <= state.chapter && <small>{chapter.subtitle}</small>}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3>
          꿈 조각 {fragmentCount(state)}/{FRAGMENTS.length}
        </h3>
        <ul className={styles.fragmentList}>
          {FRAGMENTS.map((fragment, index) => (
            <li key={fragment.id} data-found={state.collected.includes(fragment.id)}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              {state.collected.includes(fragment.id) ? fragment.text : '아직 줍지 못한 조각'}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>
          첫 문장의 단서 {clueCount(state)}/{CLUES.length}
        </h3>
        <ul className={styles.fragmentList}>
          {CLUES.map((clue) => (
            <li key={clue.id} data-found={state.collected.includes(clue.id)}>
              <b>◇</b>
              {state.collected.includes(clue.id)
                ? clue.text
                : state.talked.includes(clue.npc as never)
                  ? `${clue.name} — 아직 찾는 중`
                  : '누군가 알고 있을 것이다'}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>
          쪽지 {noteCount(state)}/{NOTES.length}
        </h3>
        <ul className={styles.fragmentList}>
          {NOTES.map((note) => (
            <li key={note.id} data-found={state.collected.includes(note.id)}>
              <b>✎</b>
              {state.collected.includes(note.id) ? (
                <>
                  <em>{note.title}</em> {note.text}
                </>
              ) : (
                '읽지 않은 쪽지'
              )}
            </li>
          ))}
        </ul>
      </section>
      <p className={styles.journalStats}>
        걸은 시간 {formatPlayTime(state.playTime)} · 깨어날 뻔한 횟수 {state.wakeCount}
      </p>
    </div>
  );
}

export function SettingsPanel({
  settings,
  onChange,
  onClearSave,
  hasSave
}: {
  settings: WorldSettings;
  onChange(next: WorldSettings): void;
  onClearSave(): void;
  hasSave: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const toggle = (key: 'jitter' | 'dither' | 'wobble' | 'invertY', label: string, hint: string) => (
    <label className={styles.settingRow}>
      <span>
        {label}
        <small>{hint}</small>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={settings[key]}
        onChange={(event) => onChange({ ...settings, [key]: event.target.checked })}
      />
    </label>
  );
  return (
    <div className={styles.settings}>
      <fieldset className={styles.settingGroup}>
        <legend>화면</legend>
        <div className={styles.segmented} role="radiogroup" aria-label="시점">
          {([['third', '3인칭'], ['first', '1인칭']] as const).map(([value, label]) => (
            <button key={value} role="radio" aria-checked={settings.camera === value}
              onClick={() => onChange({ ...settings, camera: value })}>{label}</button>
          ))}
        </div>
        <div className={styles.segmented} role="radiogroup" aria-label="해상도">
          {(
            [
              ['psx', 'PS1 240p'],
              ['crisp', '선명 360p'],
              ['sharp', '고화질']
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              role="radio"
              aria-checked={settings.pixel === value}
              onClick={() => onChange({ ...settings, pixel: value })}
            >
              {label}
            </button>
          ))}
        </div>
        {toggle('jitter', '버텍스 흔들림', '폴리곤 떨림과 텍스처 일그러짐')}
        {toggle('dither', '디더링', '15비트 색과 격자 무늬')}
        {toggle('wobble', '꿈 왜곡', '그림자가 가까울 때 세계가 일렁임')}
      </fieldset>
      <fieldset className={styles.settingGroup}>
        <legend>조작과 소리</legend>
        <label className={styles.settingRow}>
          <span>
            음량 <small>{Math.round(settings.volume * 100)}%</small>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })}
          />
        </label>
        <label className={styles.settingRow}>
          <span>
            마우스 감도 <small>{settings.sensitivity.toFixed(1)}×</small>
          </span>
          <input
            type="range"
            min={0.3}
            max={2.5}
            step={0.1}
            value={settings.sensitivity}
            onChange={(event) =>
              onChange({ ...settings, sensitivity: Number(event.target.value) })
            }
          />
        </label>
        {toggle('invertY', '상하 반전', '마우스·터치 시점')}
      </fieldset>
      {hasSave && (
        <div className={styles.dangerZone}>
          {confirm ? (
            <>
              <span>정말 지울까요? 되돌릴 수 없습니다.</span>
              <button
                onClick={() => {
                  onClearSave();
                  setConfirm(false);
                }}
              >
                지우기
              </button>
              <button onClick={() => setConfirm(false)}>취소</button>
            </>
          ) : (
            <button onClick={() => setConfirm(true)}>메모리 카드 기록 지우기</button>
          )}
        </div>
      )}
    </div>
  );
}

const ENDING_LINES = [
  '문을 열자, 아무것도 적히지 않은 하얀 종이가 있었다.',
  '여덟 개의 조각과 세 개의 단서가 손바닥 위에서 천천히 녹았다.',
  '나는 펜을 들었다.',
  '몽상인은 잠들지 않는다.',
  '다만, 꿈을 걷는다.'
];

export function EndingOverlay({
  state,
  onDawn,
  onTitle
}: {
  state: GameState;
  onDawn(): void;
  onTitle(): void;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step > ENDING_LINES.length) return;
    const timer = window.setTimeout(() => setStep((value) => value + 1), step === 0 ? 1600 : 2300);
    return () => window.clearTimeout(timer);
  }, [step]);
  return (
    <section className={styles.ending} role="dialog" aria-label="엔딩">
      <div className={styles.endingText}>
        {ENDING_LINES.slice(0, step).map((line, index) => (
          <p key={line} data-final={index >= 3}>
            {line}
          </p>
        ))}
      </div>
      {step > ENDING_LINES.length && (
        <div className={styles.endingCard}>
          <span className={styles.eyebrow}>THE FIRST SENTENCE</span>
          <h2>첫 문장을 되찾았다</h2>
          <dl>
            <div>
              <dt>걸은 시간</dt>
              <dd>{formatPlayTime(state.playTime)}</dd>
            </div>
            <div>
              <dt>쪽지</dt>
              <dd>
                {noteCount(state)}/{NOTES.length}
              </dd>
            </div>
            <div>
              <dt>깨어날 뻔한 횟수</dt>
              <dd>{state.wakeCount}</dd>
            </div>
          </dl>
          <div className={styles.endingActions}>
            <button className={styles.primary} onClick={onDawn} autoFocus>
              새벽의 마을 걷기
            </button>
            <button onClick={onTitle}>타이틀로</button>
          </div>
        </div>
      )}
    </section>
  );
}

export function Toasts({
  toasts
}: {
  toasts: { id: number; text: string; tone?: string }[];
}) {
  return (
    <div className={styles.toasts} aria-live="polite">
      {toasts.map((toast) => (
        <p key={toast.id} data-tone={toast.tone ?? 'info'}>
          {toast.text}
        </p>
      ))}
    </div>
  );
}
