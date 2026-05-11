'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, SendHorizontal } from 'lucide-react';

import {
  BIO_VILLAGE_CHAT_EVENT_MESSAGE,
  BIO_VILLAGE_CHAT_EVENT_SEND,
  BIO_VILLAGE_CHAT_LOG_LIMIT,
  BIO_VILLAGE_CHAT_MAX_LENGTH,
  type BioVillageChatEntry,
  type BioVillageChatSendDetail,
  normalizeBioVillageChatText
} from '@/utils/bio-village-chat';

interface HeaderProps {
  onMenuClick: () => void;
}

const HOLD_MS = {
  clean: 2000,
  poop: 3000
} as const;

type HoldKind = keyof typeof HOLD_MS;

const HOLD_EVENT_MAP: Record<
  HoldKind,
  { end: string; start: string; trigger: string }
> = {
  clean: {
    end: 'bio-village:poop-clean-hold-end',
    start: 'bio-village:poop-clean-hold-start',
    trigger: 'bio-village:poop-clean-trigger'
  },
  poop: {
    end: 'bio-village:poop-hold-end',
    start: 'bio-village:poop-hold-start',
    trigger: 'bio-village:poop-trigger'
  }
};

export default function Header({ onMenuClick }: HeaderProps) {
  const [activeHold, setActiveHold] = useState<HoldKind | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<BioVillageChatEntry[]>([]);
  const [holdProgress, setHoldProgress] = useState(0);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const holdActiveRef = useRef(false);
  const holdKindRef = useRef<HoldKind | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdTriggeredRef = useRef(false);

  const resetHold = (keepProgress = false) => {
    const activeKind = holdKindRef.current;
    const hadActiveHold =
      holdActiveRef.current ||
      holdStartRef.current !== null ||
      holdTriggeredRef.current ||
      activeKind !== null;

    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (holdRafRef.current !== null) {
      window.cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }

    holdActiveRef.current = false;
    holdKindRef.current = null;
    holdStartRef.current = null;
    holdTriggeredRef.current = false;
    setActiveHold(null);

    if (hadActiveHold && activeKind) {
      window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[activeKind].end));
    }

    if (!keepProgress) {
      setHoldProgress(0);
    }
  };

  useEffect(() => {
    return () => resetHold();
  }, []);

  useEffect(() => {
    const handleVillageChatMessage = (event: Event) => {
      const detail = (event as CustomEvent<BioVillageChatEntry>).detail;
      if (
        !detail ||
        typeof detail.id !== 'string' ||
        typeof detail.author !== 'string' ||
        typeof detail.text !== 'string'
      ) {
        return;
      }

      setChatMessages((previous) =>
        [...previous, detail].slice(-BIO_VILLAGE_CHAT_LOG_LIMIT)
      );
    };

    window.addEventListener(
      BIO_VILLAGE_CHAT_EVENT_MESSAGE,
      handleVillageChatMessage as EventListener
    );

    return () => {
      window.removeEventListener(
        BIO_VILLAGE_CHAT_EVENT_MESSAGE,
        handleVillageChatMessage as EventListener
      );
    };
  }, []);

  useEffect(() => {
    const target = chatLogRef.current;
    if (!target) return;

    target.scrollTo({
      top: target.scrollHeight,
      behavior: chatMessages.length > 1 ? 'smooth' : 'auto'
    });
  }, [chatMessages]);

  const beginHold = (kind: HoldKind) => {
    if (holdActiveRef.current) return;

    holdActiveRef.current = true;
    holdKindRef.current = kind;
    holdTriggeredRef.current = false;
    holdStartRef.current = performance.now();
    setActiveHold(kind);
    setHoldProgress(0);
    window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[kind].start));

    const tick = () => {
      if (holdStartRef.current === null) return;
      const elapsed = performance.now() - holdStartRef.current;
      const nextProgress = Math.min(1, elapsed / HOLD_MS[kind]);
      setHoldProgress(nextProgress);

      if (nextProgress < 1) {
        holdRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    holdRafRef.current = window.requestAnimationFrame(tick);
    holdTimeoutRef.current = window.setTimeout(() => {
      holdTriggeredRef.current = true;
      holdActiveRef.current = false;
      holdKindRef.current = null;
      holdStartRef.current = null;
      setActiveHold(null);
      setHoldProgress(1);
      window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[kind].end));
      window.dispatchEvent(new CustomEvent(HOLD_EVENT_MAP[kind].trigger));
      window.setTimeout(() => {
        setHoldProgress(0);
      }, 420);
    }, HOLD_MS[kind]);
  };

  const stopHold = (keepProgress = false) => {
    if (holdTriggeredRef.current) {
      holdTriggeredRef.current = false;
      return;
    }

    resetHold(keepProgress);
  };

  const startHoldPointer =
    (kind: HoldKind) => (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      beginHold(kind);
    };

  const startHoldMouse =
    (kind: HoldKind) => (event: React.MouseEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      beginHold(kind);
    };

  const startHoldTouch =
    (kind: HoldKind) => (event: React.TouchEvent<HTMLButtonElement>) => {
      event.preventDefault();
      beginHold(kind);
    };

  const preventDefaultEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
  };

  const submitChat = () => {
    const text = normalizeBioVillageChatText(chatInput);
    if (!text) return;

    window.dispatchEvent(
      new CustomEvent<BioVillageChatSendDetail>(BIO_VILLAGE_CHAT_EVENT_SEND, {
        detail: { text }
      })
    );
    setChatInput('');
  };

  const renderHoldOrb = (kind: HoldKind) => {
    if (activeHold === kind) {
      return (
        <span
          aria-hidden="true"
          className="relative h-[13px] w-[13px] rounded-full border border-[rgba(255,243,233,0.36)]"
          style={{
            background: `conic-gradient(${kind === 'clean' ? 'rgba(188,224,186,0.96)' : 'rgba(255,196,120,0.96)'} ${
              holdProgress * 360
            }deg, rgba(255,255,255,0.08) 0deg)`
          }}
        >
          <span className="absolute inset-[2px] rounded-full bg-[rgba(44,16,10,0.96)]" />
        </span>
      );
    }

    return (
      <span
        aria-hidden="true"
        className="h-[13px] w-[13px] rounded-full border border-[rgba(255,243,233,0.26)] bg-[rgba(255,255,255,0.08)]"
      />
    );
  };

  const buttonBaseClassName =
    'pointer-events-auto relative overflow-hidden rounded-full border px-3 py-2 font-[var(--font-brush)] text-[0.64rem] font-bold tracking-[0.14em] text-[rgba(255,235,219,0.96)] shadow-[0_10px_22px_rgba(0,0,0,0.26)] transition-transform duration-200 hover:-translate-y-[1px] sm:px-4';

  const buttonSharedStyle = {
    MozUserSelect: 'none' as const,
    WebkitTapHighlightColor: 'transparent',
    WebkitTouchCallout: 'none' as const,
    WebkitUserSelect: 'none' as const,
    touchAction: 'none' as const,
    userSelect: 'none' as const
  };

  const renderHoldButton = (
    kind: HoldKind,
    label: string,
    toneClassName: string,
    ariaLabel: string
  ) => (
    <button
      type="button"
      onPointerDown={startHoldPointer(kind)}
      onPointerUp={() => stopHold()}
      onPointerLeave={() => stopHold()}
      onPointerCancel={() => stopHold()}
      onMouseDown={startHoldMouse(kind)}
      onMouseUp={() => stopHold()}
      onMouseLeave={() => stopHold()}
      onTouchStart={startHoldTouch(kind)}
      onTouchEnd={() => stopHold()}
      onTouchCancel={() => stopHold()}
      onContextMenu={preventDefaultEvent}
      onDragStart={preventDefaultEvent}
      className={`${buttonBaseClassName} ${toneClassName} ${
        activeHold === kind ? 'scale-[0.985]' : ''
      }`}
      style={buttonSharedStyle}
      aria-label={ariaLabel}
      draggable={false}
    >
      <span className="relative z-[1] inline-flex items-center gap-2">
        {renderHoldOrb(kind)}
        <span>{label}</span>
      </span>
      {activeHold === kind ? (
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.14),transparent)] opacity-70" />
      ) : null}
    </button>
  );

  return (
    <header className="pointer-events-none fixed right-0 top-0 z-40 px-3 pt-3 sm:px-4 sm:pt-4 md:px-8 md:pt-6">
      <div className="flex flex-col items-end gap-2">
        <button
          onClick={onMenuClick}
          className="pointer-events-auto inline-flex items-center gap-2 border border-[rgba(96,24,24,0.9)] bg-[rgba(24,3,3,0.96)] px-3 py-2 font-[var(--font-brush)] text-[0.7rem] font-bold tracking-[0.16em] text-[rgba(255,241,236,0.96)] shadow-[0_10px_24px_rgba(0,0,0,0.34)] transition-transform duration-200 hover:-translate-y-[1px] sm:px-4"
          aria-label="메뉴 열기"
        >
          <span>ACCESS</span>
          <Menu className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-[1px]" />
        </button>

        {renderHoldButton(
          'poop',
          '똥싸기',
          'border-[rgba(96,24,24,0.76)] bg-[rgba(44,16,10,0.94)]',
          '똥싸기 버튼'
        )}

        {renderHoldButton(
          'clean',
          '똥치우기',
          'border-[rgba(52,90,57,0.76)] bg-[rgba(18,43,22,0.94)]',
          '똥치우기 버튼'
        )}

        <div className="pointer-events-auto w-[min(19.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.6rem] border border-[rgba(77,28,28,0.7)] bg-[linear-gradient(180deg,rgba(16,5,5,0.95),rgba(31,11,11,0.92))] shadow-[0_18px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div className="border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-[var(--font-brush)] text-[0.78rem] font-bold tracking-[0.16em] text-[rgba(255,235,219,0.96)]">
                  실시간 필드 채팅
                </p>
                <p className="mt-1 text-[0.65rem] leading-relaxed text-[rgba(255,226,214,0.62)]">
                  입력하면 게임 채팅처럼 바로 올라가고, 머리 위 말풍선으로도
                  보여요.
                </p>
              </div>
              <span className="rounded-full border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] px-2.5 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[rgba(255,232,224,0.72)]">
                live
              </span>
            </div>
          </div>

          <div
            ref={chatLogRef}
            className="max-h-60 space-y-2 overflow-y-auto px-3 py-3"
          >
            {chatMessages.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-[0.68rem] leading-relaxed text-[rgba(255,228,220,0.6)]">
                아직 말이 없어요. 한마디 던지면 필드 로그랑 아바타 머리 위
                말풍선이 같이 반응합니다.
              </div>
            ) : (
              chatMessages.map((message) => {
                const isSelf = message.tone === 'self';

                return (
                  <div
                    key={message.id}
                    className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-[1.15rem] px-3 py-2 ${
                        isSelf
                          ? 'border border-[rgba(255,179,160,0.22)] bg-[linear-gradient(180deg,rgba(139,42,42,0.92),rgba(107,18,18,0.96))] text-[rgba(255,244,240,0.98)]'
                          : 'border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.07)] text-[rgba(255,236,230,0.9)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-[rgba(255,233,225,0.66)]">
                          {message.author}
                        </span>
                        <span className="text-[0.52rem] text-[rgba(255,229,220,0.48)]">
                          {new Date(message.sentAt).toLocaleTimeString(
                            'ko-KR',
                            {
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )}
                        </span>
                      </div>
                      <p className="mt-1 text-[0.78rem] leading-relaxed">
                        {message.text}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            className="border-t border-[rgba(255,255,255,0.08)] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submitChat();
            }}
          >
            <div className="flex items-end gap-2">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                maxLength={BIO_VILLAGE_CHAT_MAX_LENGTH}
                placeholder="필드에 띄울 말을 입력해요..."
                className="min-w-0 flex-1 rounded-[1.1rem] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.07)] px-3 py-3 text-[0.78rem] text-[rgba(255,244,240,0.96)] outline-none transition placeholder:text-[rgba(255,224,216,0.34)] focus:border-[rgba(255,196,181,0.32)] focus:bg-[rgba(255,255,255,0.1)]"
              />
              <button
                type="submit"
                disabled={!normalizeBioVillageChatText(chatInput)}
                className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-full border border-[rgba(255,182,163,0.2)] bg-[linear-gradient(180deg,rgba(155,52,52,0.96),rgba(121,23,23,0.98))] text-[rgba(255,248,244,0.96)] shadow-[0_14px_26px_rgba(0,0,0,0.24)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="채팅 보내기"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}
