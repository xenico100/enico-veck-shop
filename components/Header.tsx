'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, MessageCircle, SendHorizontal } from 'lucide-react';

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

  const visibleChatMessages = chatMessages.slice(-4);

  return (
    <>
      <div
        data-avatar-ui="true"
        className="pointer-events-none fixed left-3 top-3 z-40 w-[min(16rem,calc(100vw-10.25rem))] sm:left-4 sm:top-4 sm:w-[19rem] md:left-6 md:top-6"
      >
        <div
          ref={chatLogRef}
          className="max-h-[5.4rem] overflow-hidden pr-4 [mask-image:linear-gradient(180deg,#000_76%,transparent_100%)] sm:max-h-[7.35rem]"
        >
          {visibleChatMessages.length > 0 ? (
            <div className="space-y-1.5 bg-[linear-gradient(90deg,rgba(0,0,0,0.62),rgba(0,0,0,0.3)_58%,rgba(0,0,0,0))] py-2 pl-2.5 pr-9 text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
              {visibleChatMessages.map((message) => (
                <p
                  key={message.id}
                  className="truncate text-[0.72rem] font-semibold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-[0.78rem]"
                >
                  <span className="mr-1 text-[rgba(255,255,255,0.72)]">
                    {message.author}
                  </span>
                  {message.text}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <header
        data-avatar-ui="true"
        className="pointer-events-none fixed right-3 top-3 z-40 sm:right-4 sm:top-4 md:right-8 md:top-6"
      >
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

          <div className="pointer-events-auto w-[8.75rem] sm:w-[15rem]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitChat();
              }}
            >
              <div className="flex items-end gap-2">
                <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white shadow-[0_10px_22px_rgba(0,0,0,0.24)] sm:inline-flex">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  maxLength={BIO_VILLAGE_CHAT_MAX_LENGTH}
                  placeholder="채팅"
                  className="h-9 min-w-0 flex-1 rounded-full border border-white/15 bg-black/55 px-3 text-[0.76rem] font-semibold text-white outline-none shadow-[0_10px_22px_rgba(0,0,0,0.22)] transition placeholder:text-white/45 focus:border-white/35 focus:bg-black/70"
                />
                <button
                  type="submit"
                  disabled={!normalizeBioVillageChatText(chatInput)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(255,182,163,0.2)] bg-[linear-gradient(180deg,rgba(155,52,52,0.96),rgba(121,23,23,0.98))] text-[rgba(255,248,244,0.96)] shadow-[0_12px_22px_rgba(0,0,0,0.24)] transition hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label="채팅 보내기"
                >
                  <SendHorizontal className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
