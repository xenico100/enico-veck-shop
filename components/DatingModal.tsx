'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  HeartHandshake,
  Orbit,
  RadioTower,
  Send,
  Sparkles,
  Users2,
  X
} from 'lucide-react';

import { useAuth } from '@/app/context/AuthContext';
import PillTab from '@/components/ui/PillTab';
import ActionButton from '@/components/ui/ActionButton';
import { createClient } from '@/utils/supabase/client';

type Props = {
  hookLabel?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DatingTabKey = 'random-chat';
type MatchStatus = 'idle' | 'waiting' | 'matched' | 'error';
type PresenceStateValue = Record<string, Array<Record<string, unknown>>>;

type LobbyParticipant = {
  key: string;
  label: string;
  joinedAt: string;
  state: 'waiting' | 'matched';
};

type MatchParticipant = {
  key: string;
  label: string;
};

type MatchProposal = {
  roomId: string;
  participants: [MatchParticipant, MatchParticipant];
  issuedAt: string;
};

type ActiveRoom = {
  id: string;
  partnerKey: string;
  partnerLabel: string;
};

type ChatMessage = {
  id: string;
  senderKey: string;
  senderLabel: string;
  body: string;
  sentAt: string;
  system?: boolean;
};

const DATING_PARTICIPANT_STORAGE_KEY = 'evk_dating_participant_key';
const DATING_DISPLAY_NAME_STORAGE_KEY = 'evk_dating_display_name';
const DATING_TAB_LABEL = '1:1 RANDOM CHAT';

const buildRoomId = (left: string, right: string) =>
  `dating-${[left, right]
    .sort((a, b) => a.localeCompare(b))
    .join('-')
    .replace(/[^a-zA-Z0-9_-]/g, '')}`;

const getMessageTimestamp = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

const flattenPresenceParticipants = (
  state: PresenceStateValue
): LobbyParticipant[] => {
  const deduped = new Map<string, LobbyParticipant>();

  Object.entries(state).forEach(([presenceKey, metas]) => {
    metas.forEach((meta) => {
      const key =
        typeof meta.key === 'string' && meta.key.trim().length > 0
          ? meta.key
          : presenceKey;

      if (!key) return;

      const label =
        typeof meta.label === 'string' && meta.label.trim().length > 0
          ? meta.label.trim()
          : `Guest ${key.slice(0, 4)}`;
      const joinedAt =
        typeof meta.joinedAt === 'string' && meta.joinedAt.trim().length > 0
          ? meta.joinedAt
          : new Date().toISOString();
      const participantState = meta.state === 'matched' ? 'matched' : 'waiting';
      const previous = deduped.get(key);

      if (!previous || previous.joinedAt > joinedAt) {
        deduped.set(key, {
          key,
          label,
          joinedAt,
          state: participantState
        });
      }
    });
  });

  return Array.from(deduped.values()).sort((left, right) => {
    if (left.joinedAt === right.joinedAt) {
      return left.key.localeCompare(right.key);
    }

    return left.joinedAt.localeCompare(right.joinedAt);
  });
};

const normalizeMatchProposal = (value: unknown): MatchProposal | null => {
  if (!value || typeof value !== 'object') return null;

  const payload = value as Record<string, unknown>;
  const participants = Array.isArray(payload.participants)
    ? payload.participants.filter((item): item is MatchParticipant => {
        if (!item || typeof item !== 'object') return false;
        const candidate = item as Record<string, unknown>;
        return (
          typeof candidate.key === 'string' &&
          typeof candidate.label === 'string'
        );
      })
    : [];

  if (
    typeof payload.roomId !== 'string' ||
    typeof payload.issuedAt !== 'string' ||
    participants.length !== 2
  ) {
    return null;
  }

  return {
    roomId: payload.roomId,
    issuedAt: payload.issuedAt,
    participants: [participants[0], participants[1]]
  };
};

const createSystemMessage = (body: string): ChatMessage => ({
  id: `system-${crypto.randomUUID()}`,
  senderKey: 'system',
  senderLabel: 'SYSTEM',
  body,
  sentAt: new Date().toISOString(),
  system: true
});

export default function DatingModal({
  open,
  onOpenChange,
  hookLabel = null
}: Props) {
  const { user } = useAuth();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [activeTab, setActiveTab] = useState<DatingTabKey>('random-chat');
  const [participantKey, setParticipantKey] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [lobbyParticipants, setLobbyParticipants] = useState<
    LobbyParticipant[]
  >([]);
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [partnerOnline, setPartnerOnline] = useState(false);

  const lobbyChannelRef = useRef<RealtimeChannel | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const participantKeyRef = useRef<string | null>(null);
  const displayNameRef = useRef('');
  const matchStatusRef = useRef<MatchStatus>('idle');
  const activeRoomRef = useRef<ActiveRoom | null>(null);
  const queueJoinedAtRef = useRef<string | null>(null);
  const pairingLockRef = useRef(false);

  participantKeyRef.current = participantKey;
  displayNameRef.current = displayName;
  matchStatusRef.current = matchStatus;
  activeRoomRef.current = activeRoom;

  const waitingCount = lobbyParticipants.filter(
    (participant) => participant.state === 'waiting'
  ).length;
  const waitingLabel =
    waitingCount > 0
      ? `${waitingCount.toLocaleString('ko-KR')}명 대기 중`
      : '지금 바로 첫 매칭 가능';
  const currentDisplayName =
    displayName.trim() ||
    user?.name?.trim() ||
    (participantKey ? `Guest ${participantKey.slice(0, 4)}` : '');

  const appendMessage = (nextMessage: ChatMessage) => {
    setMessages((previous) => {
      if (previous.some((message) => message.id === nextMessage.id)) {
        return previous;
      }

      return [...previous, nextMessage].sort((left, right) =>
        left.sentAt.localeCompare(right.sentAt)
      );
    });
  };

  const syncLobbyPresence = async (state: 'waiting' | 'matched') => {
    const channel = lobbyChannelRef.current;
    const key = participantKeyRef.current;

    if (!channel || !key) return;

    const joinedAt = queueJoinedAtRef.current ?? new Date().toISOString();
    queueJoinedAtRef.current = joinedAt;

    await channel.track({
      key,
      label:
        displayNameRef.current.trim() ||
        user?.name?.trim() ||
        `Guest ${key.slice(0, 4)}`,
      joinedAt,
      state
    });
  };

  const clearRoomChannel = async () => {
    if (!supabase || !roomChannelRef.current) {
      setPartnerOnline(false);
      return;
    }

    const currentChannel = roomChannelRef.current;
    roomChannelRef.current = null;
    setPartnerOnline(false);

    await currentChannel.untrack().catch(() => undefined);
    await supabase.removeChannel(currentChannel).catch(() => undefined);
  };

  const resetDatingState = async () => {
    pairingLockRef.current = false;
    queueJoinedAtRef.current = null;
    setMatchStatus('idle');
    setActiveRoom(null);
    setMessages([]);
    setMessageDraft('');
    setError(null);

    if (lobbyChannelRef.current) {
      await lobbyChannelRef.current.untrack().catch(() => undefined);
    }

    await clearRoomChannel();
  };

  const joinRoom = async (proposal: MatchProposal) => {
    if (!supabase) {
      setMatchStatus('error');
      setError('실시간 채널 설정이 없어 데이팅 서비스를 시작할 수 없습니다.');
      return;
    }

    const selfKey = participantKeyRef.current;
    if (!selfKey) return;

    const partner = proposal.participants.find(
      (participant) => participant.key !== selfKey
    );
    if (!partner) return;

    if (activeRoomRef.current?.id === proposal.roomId) {
      return;
    }

    pairingLockRef.current = false;
    setMatchStatus('matched');
    setActiveRoom({
      id: proposal.roomId,
      partnerKey: partner.key,
      partnerLabel: partner.label
    });
    setMessages([
      createSystemMessage(
        `${partner.label} 님과 연결됐다. 지금부터 1:1 랜덤 채팅 시작.`
      )
    ]);
    await syncLobbyPresence('matched').catch(() => undefined);
    await clearRoomChannel();

    const nextRoomChannel = supabase.channel(
      `dating-room-v1-${proposal.roomId}`,
      {
        config: {
          broadcast: { self: true },
          presence: { key: selfKey }
        }
      }
    );

    roomChannelRef.current = nextRoomChannel;

    nextRoomChannel
      .on('presence', { event: 'sync' }, () => {
        const presence = flattenPresenceParticipants(
          nextRoomChannel.presenceState() as PresenceStateValue
        );
        setPartnerOnline(
          presence.some((participant) => participant.key === partner.key)
        );
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;

        const data = payload as Record<string, unknown>;
        if (
          typeof data.id !== 'string' ||
          typeof data.senderKey !== 'string' ||
          typeof data.senderLabel !== 'string' ||
          typeof data.body !== 'string' ||
          typeof data.sentAt !== 'string'
        ) {
          return;
        }

        appendMessage({
          id: data.id,
          senderKey: data.senderKey,
          senderLabel: data.senderLabel,
          body: data.body,
          sentAt: data.sentAt
        });
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        if (!payload || typeof payload !== 'object') return;
        const data = payload as Record<string, unknown>;
        if (typeof data.message !== 'string') return;
        appendMessage(createSystemMessage(data.message));
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;

        void nextRoomChannel.track({
          key: selfKey,
          label:
            displayNameRef.current.trim() ||
            user?.name?.trim() ||
            `Guest ${selfKey.slice(0, 4)}`,
          joinedAt: new Date().toISOString(),
          state: 'matched'
        });
      });
  };

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const savedKey =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(DATING_PARTICIPANT_STORAGE_KEY)
        : null;
    const nextKey = savedKey || `dating-${crypto.randomUUID()}`;

    if (typeof window !== 'undefined' && !savedKey) {
      window.localStorage.setItem(DATING_PARTICIPANT_STORAGE_KEY, nextKey);
    }

    const savedDisplayName =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(DATING_DISPLAY_NAME_STORAGE_KEY)
        : null;

    setParticipantKey(nextKey);
    setDisplayName(savedDisplayName || user?.name || '');
  }, [open, user?.name]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    window.localStorage.setItem(
      DATING_DISPLAY_NAME_STORAGE_KEY,
      displayName.trim() || user?.name || ''
    );
  }, [displayName, open, user?.name]);

  useEffect(() => {
    if (!open || !supabase || !participantKey) return;

    let cancelled = false;

    const lobbyChannel = supabase.channel('dating-lobby-v1', {
      config: {
        broadcast: { self: true },
        presence: { key: participantKey }
      }
    });

    lobbyChannelRef.current = lobbyChannel;

    lobbyChannel
      .on('presence', { event: 'sync' }, () => {
        if (cancelled) return;
        setLobbyParticipants(
          flattenPresenceParticipants(
            lobbyChannel.presenceState() as PresenceStateValue
          )
        );
      })
      .on('broadcast', { event: 'match-proposal' }, ({ payload }) => {
        const proposal = normalizeMatchProposal(payload);
        const selfKey = participantKeyRef.current;

        if (!proposal || !selfKey) return;
        if (
          !proposal.participants.some(
            (participant) => participant.key === selfKey
          )
        )
          return;
        if (
          matchStatusRef.current !== 'waiting' &&
          activeRoomRef.current?.id !== proposal.roomId
        ) {
          return;
        }

        void joinRoom(proposal);
      })
      .subscribe();

    return () => {
      cancelled = true;
      void resetDatingState();
      if (roomChannelRef.current) {
        const activeChannel = roomChannelRef.current;
        roomChannelRef.current = null;
        void supabase.removeChannel(activeChannel).catch(() => undefined);
      }
      lobbyChannelRef.current = null;
      setLobbyParticipants([]);
      void supabase.removeChannel(lobbyChannel).catch(() => undefined);
    };
  }, [open, participantKey, supabase]);

  useEffect(() => {
    if (!open || (matchStatus !== 'waiting' && matchStatus !== 'matched'))
      return;

    void syncLobbyPresence(matchStatus === 'matched' ? 'matched' : 'waiting');
  }, [displayName, matchStatus, open]);

  useEffect(() => {
    if (!open || matchStatus !== 'waiting' || !participantKey) return;

    const waitingParticipants = lobbyParticipants.filter(
      (participant) => participant.state === 'waiting'
    );
    const ownIndex = waitingParticipants.findIndex(
      (participant) => participant.key === participantKey
    );

    if (ownIndex < 0 || ownIndex % 2 !== 0) return;

    const partner = waitingParticipants[ownIndex + 1];
    if (!partner || pairingLockRef.current) return;

    const proposal: MatchProposal = {
      roomId: buildRoomId(participantKey, partner.key),
      issuedAt: new Date().toISOString(),
      participants: [
        {
          key: participantKey,
          label: currentDisplayName || `Guest ${participantKey.slice(0, 4)}`
        },
        {
          key: partner.key,
          label: partner.label
        }
      ]
    };

    pairingLockRef.current = true;

    void lobbyChannelRef.current
      ?.send({
        type: 'broadcast',
        event: 'match-proposal',
        payload: proposal
      })
      .then(() => joinRoom(proposal))
      .catch(() => {
        pairingLockRef.current = false;
        setMatchStatus('error');
        setError('매칭 신호를 보내지 못했다. 한 번 더 눌러봐.');
      });
  }, [
    currentDisplayName,
    lobbyParticipants,
    matchStatus,
    open,
    participantKey
  ]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-[rgba(3,8,20,0.72)] backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />

      <div className="fixed inset-0 z-[71] flex items-end justify-center p-2 pt-10 sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dating-title"
          className="flex max-h-[calc(100dvh-0.75rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[1.6rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(86,113,255,0.16),_rgba(6,10,22,0.96)_46%,_rgba(4,7,17,0.98)_100%)] shadow-[0_32px_120px_rgba(0,0,0,0.52)] sm:max-h-[min(calc(100dvh-2rem),46rem)] sm:rounded-[2rem]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 pb-4 pt-4 sm:gap-4 sm:px-7 sm:pb-6 sm:pt-6">
            <div className="min-w-0 flex-1">
              <p className="section-kicker !text-[rgba(210,228,255,0.56)]">
                Dating Service
              </p>
              <h2
                id="dating-title"
                className="display-font mt-2 text-[1.08rem] font-semibold tracking-[0.04em] text-white sm:text-[1.75rem]"
              >
                DATING
              </h2>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/[0.58] sm:text-sm">
                메뉴에서 바로 꺼내 쓰는 1:1 랜덤 채팅 서비스. 로그인 없이도
                게스트 입장 가능하고, 매칭은 실시간으로 붙는다.
              </p>
              {hookLabel ? (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#ff9d7b]/30 bg-[rgba(255,157,123,0.14)] px-3 py-1.5 text-[11px] text-[#ffd9cb] sm:mt-4 sm:text-xs">
                  <HeartHandshake className="h-3.5 w-3.5" />
                  {hookLabel} 프로필에서 채팅 훅 타고 들어옴
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-4">
                <PillTab
                  active={activeTab === 'random-chat'}
                  onClick={() => setActiveTab('random-chat')}
                >
                  {DATING_TAB_LABEL}
                </PillTab>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="y2k-button y2k-button-ghost y2k-button-icon y2k-button-fade-pin shrink-0 self-start"
              aria-label="데이팅 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <div className="grid gap-4 px-4 pb-4 pt-4 sm:px-7 sm:pb-7 sm:pt-5 lg:grid-cols-[0.94fr_1.06fr] lg:gap-5">
              <div className="space-y-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:rounded-[1.75rem] sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="section-kicker !text-[rgba(212,228,255,0.46)]">
                        Queue Signal
                      </p>
                      <p className="mt-2 text-base font-semibold text-white sm:text-lg">
                        {matchStatus === 'matched'
                          ? '매칭 완료'
                          : matchStatus === 'waiting'
                            ? '상대 찾는 중'
                            : '대기열 진입 전'}
                      </p>
                      <p className="mt-2 text-sm text-white/[0.58]">
                        {waitingLabel}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white">
                      {matchStatus === 'matched' ? (
                        <HeartHandshake className="h-5 w-5" />
                      ) : matchStatus === 'waiting' ? (
                        <RadioTower className="h-5 w-5" />
                      ) : (
                        <Orbit className="h-5 w-5" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/[0.45]">
                        Mode
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        1:1 Random
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/[0.45]">
                        Queue
                      </p>
                      <p className="mt-2 text-sm font-semibold text-white">
                        {waitingCount.toLocaleString('ko-KR')}명
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <p className="text-[0.7rem] uppercase tracking-[0.18em] text-white/[0.45]">
                        Room
                      </p>
                      <p className="mt-2 truncate text-sm font-semibold text-white">
                        {activeRoom?.partnerLabel ?? '대기 중'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:rounded-[1.75rem] sm:p-5">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles className="h-4 w-4 text-[#ffd37b]" />
                    <p className="text-sm font-semibold">프로필 셋업</p>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-[0.7rem] uppercase tracking-[0.16em] text-white/[0.45]">
                        Display Name
                      </span>
                      <input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        placeholder="닉네임을 입력해"
                        className="y2k-input w-full px-4 py-3 text-white placeholder:text-white/35"
                        maxLength={24}
                      />
                    </label>

                    <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 px-4 py-3 text-xs leading-relaxed text-white/[0.48]">
                      대화 기록은 세션 동안만 유지된다. 새로고침하거나 나가면
                      방도 같이 끊긴다. 익명맛은 살리고, 과한 장난질은 하지
                      말자.
                    </div>
                  </div>

                  {error ? (
                    <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                      {error}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3 sm:mt-5">
                    {matchStatus === 'idle' || matchStatus === 'error' ? (
                      <ActionButton
                        variant="primary"
                        size="md"
                        className="min-w-[180px]"
                        onClick={async () => {
                          if (!supabase) {
                            setMatchStatus('error');
                            setError(
                              'Supabase 실시간 설정이 없어서 매칭을 열 수 없다.'
                            );
                            return;
                          }

                          if (!participantKeyRef.current) {
                            setMatchStatus('error');
                            setError(
                              '참가자 키를 만드는 중이다. 잠깐 뒤에 다시 눌러.'
                            );
                            return;
                          }

                          setError(null);
                          setMessages([]);
                          setActiveRoom(null);
                          setPartnerOnline(false);
                          setMatchStatus('waiting');
                          queueJoinedAtRef.current = new Date().toISOString();
                          await syncLobbyPresence('waiting').catch(() => {
                            setMatchStatus('error');
                            setError(
                              '대기열 진입에 실패했다. 새로 한 번 눌러봐.'
                            );
                          });
                        }}
                      >
                        <HeartHandshake className="h-4 w-4" />
                        랜덤 매칭 시작
                      </ActionButton>
                    ) : null}

                    {matchStatus === 'waiting' ? (
                      <ActionButton
                        variant="secondary"
                        size="md"
                        className="min-w-[160px]"
                        onClick={() => {
                          void resetDatingState();
                        }}
                      >
                        대기 취소
                      </ActionButton>
                    ) : null}

                    {matchStatus === 'matched' ? (
                      <ActionButton
                        variant="secondary"
                        size="md"
                        className="min-w-[160px]"
                        onClick={async () => {
                          if (roomChannelRef.current) {
                            await roomChannelRef.current
                              .send({
                                type: 'broadcast',
                                event: 'leave',
                                payload: {
                                  message: `${currentDisplayName} 님이 방을 종료했다.`
                                }
                              })
                              .catch(() => undefined);
                          }

                          await resetDatingState();
                        }}
                      >
                        채팅 종료
                      </ActionButton>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 backdrop-blur-md sm:rounded-[1.75rem] sm:p-5">
                  <div className="flex items-center gap-2 text-white">
                    <Users2 className="h-4 w-4 text-[#9dbdff]" />
                    <p className="text-sm font-semibold">서비스 룰</p>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-white/[0.58]">
                    <li>로그인 없이 게스트 입장 가능</li>
                    <li>짝이 맞으면 자동으로 1:1 방 생성</li>
                    <li>대화는 저장 안 하고 현재 세션에서만 유지</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-3.5 backdrop-blur-md sm:rounded-[1.75rem] sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="section-kicker !text-[rgba(212,228,255,0.46)]">
                      Chat Room
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      {activeRoom
                        ? `${activeRoom.partnerLabel} 님과 연결됨`
                        : '매칭되면 여기서 바로 대화'}
                    </p>
                    <p className="mt-1 text-sm text-white/[0.52]">
                      {activeRoom
                        ? partnerOnline
                          ? '상대 접속 중'
                          : '상대 연결 대기 중'
                        : '큐에서 짝 맞으면 탭 안에서 그대로 이어진다'}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-white/[0.58]">
                    {matchStatus}
                  </div>
                </div>

                <div className="mt-4 flex min-h-[18.5rem] flex-col sm:min-h-[25rem]">
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {messages.length === 0 ? (
                      <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-[1.3rem] border border-dashed border-white/12 bg-black/20 px-4 text-center sm:min-h-[18rem] sm:rounded-[1.5rem] sm:px-6">
                        <HeartHandshake className="h-10 w-10 text-[#ff8f7c]" />
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {matchStatus === 'waiting'
                              ? '상대 찾는 중이다'
                              : '아직 연결된 상대가 없다'}
                          </p>
                          <p className="mt-2 text-xs leading-relaxed text-white/[0.48]">
                            메뉴에서 바로 꺼낸 데이팅 탭이다. 대기열 진입하면
                            실시간으로 짝 잡히고, 매칭되면 여기 채팅창이
                            살아난다.
                          </p>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isMine =
                          !message.system &&
                          message.senderKey === participantKeyRef.current;

                        return (
                          <div
                            key={message.id}
                            className={
                              message.system
                                ? 'rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-xs text-white/50'
                                : `max-w-[88%] rounded-[1.4rem] px-4 py-3 ${
                                    isMine
                                      ? 'ml-auto border border-[#ff9d7b]/30 bg-[rgba(255,147,92,0.16)] text-white'
                                      : 'border border-white/10 bg-white/[0.08] text-white'
                                  }`
                            }
                          >
                            {!message.system ? (
                              <div className="mb-1 flex items-center justify-between gap-4 text-[0.65rem] uppercase tracking-[0.16em] text-white/[0.42]">
                                <span>
                                  {isMine ? 'YOU' : message.senderLabel}
                                </span>
                                <span>
                                  {getMessageTimestamp(message.sentAt)}
                                </span>
                              </div>
                            ) : null}
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                              {message.body}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="grid gap-3">
                      <textarea
                        value={messageDraft}
                        onChange={(event) =>
                          setMessageDraft(event.target.value)
                        }
                        placeholder={
                          activeRoom
                            ? '첫 마디 던져봐. 너무 기계적이면 바로 썰린다.'
                            : '매칭 후에 입력 가능'
                        }
                        rows={3}
                        disabled={!activeRoom}
                        className="y2k-input min-h-[88px] w-full resize-none px-4 py-3 text-white placeholder:text-white/35 disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[120px]"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-white/[0.42]">
                          실시간 브로드캐스트 기반. 새로고침하면 현재 방은
                          끊긴다.
                        </p>
                        <ActionButton
                          variant="primary"
                          size="md"
                          className="min-w-[148px]"
                          disabled={
                            !activeRoom || messageDraft.trim().length === 0
                          }
                          onClick={async () => {
                            const channel = roomChannelRef.current;
                            const selfKey = participantKeyRef.current;
                            const body = messageDraft.trim();

                            if (!channel || !selfKey || !body) return;

                            const outgoingMessage: ChatMessage = {
                              id: crypto.randomUUID(),
                              senderKey: selfKey,
                              senderLabel:
                                currentDisplayName ||
                                `Guest ${selfKey.slice(0, 4)}`,
                              body,
                              sentAt: new Date().toISOString()
                            };

                            appendMessage(outgoingMessage);
                            setMessageDraft('');

                            await channel
                              .send({
                                type: 'broadcast',
                                event: 'message',
                                payload: outgoingMessage
                              })
                              .catch(() => {
                                setError(
                                  '메시지 전송이 살짝 꼬였다. 다시 한 번 보내봐.'
                                );
                              });
                          }}
                        >
                          <Send className="h-4 w-4" />
                          보내기
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
