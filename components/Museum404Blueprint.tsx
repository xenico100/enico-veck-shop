'use client';

type LoopStep = {
  id: string;
  title: string;
  detail: string;
};

type StackItem = {
  layer: string;
  tool: string;
  reason: string;
};

type TableField = {
  name: string;
  accent?: boolean;
};

type TableShape = {
  name: string;
  relation?: string;
  fields: TableField[];
};

type SprintCard = {
  week: string;
  title: string;
  tasks: string[];
};

type TonePoint = {
  title: string;
  detail: string;
};

type MonetizePhase = {
  phase: string;
  model: string;
};

const loopSteps: LoopStep[] = [
  {
    id: '01',
    title: '캐릭터 생성',
    detail: '3~5종 도트 아바타와 컬러 팔레트를 고른다.'
  },
  {
    id: '02',
    title: '미스터리 맵 탐험',
    detail: '방마다 기억의 조각 퍼즐과 퀘스트를 진행한다.'
  },
  {
    id: '03',
    title: '업로드 스테이션',
    detail: '그림, 사진, PDF, 음성 파일을 드래그 드롭으로 올린다.'
  },
  {
    id: '04',
    title: 'AI 변환',
    detail: 'GPT 요약과 128px 도트 썸네일 생성을 선택 적용한다.'
  },
  {
    id: '05',
    title: '전시 슬롯 배치',
    detail: '오브젝트 배치 후 짧은 캡션과 좌표를 저장한다.'
  },
  {
    id: '06',
    title: '파이널 룸',
    detail: '엔딩 컷을 보고 플레이 기록을 봉인한다.'
  },
  {
    id: '07',
    title: '자동 게시',
    detail: '완주 기록이 404 MUSEUM 전시관에 영구 저장된다.'
  },
  {
    id: '08',
    title: '탐험 & 공감',
    detail: '다른 유저 전시관에 랜덤 입장해 공명만 남긴다.'
  }
];

const stackItems: StackItem[] = [
  {
    layer: '2D 도트 게임',
    tool: 'GDevelop Cloud',
    reason: '노코드 퍼즐, 씬 전환, HTTP 요청까지 혼자 빨리 굴리기 좋다.'
  },
  {
    layer: '스토리지',
    tool: 'Supabase',
    reason: 'Postgres, Storage, Realtime을 한 군데서 같이 처리한다.'
  },
  {
    layer: '인증',
    tool: 'Supabase Magic-Link',
    reason: 'SNS 로그인보다 구현이 단순하고 MVP 속도가 빠르다.'
  },
  {
    layer: 'AI 요약·썸네일',
    tool: 'OpenAI API',
    reason: '기억 요약과 도트 썸네일 프롬프트 파이프라인을 붙이기 쉽다.'
  },
  {
    layer: '웹 호스팅',
    tool: 'Netlify',
    reason: '정적 배포와 CI가 가볍고 빠르다.'
  },
  {
    layer: '분석',
    tool: 'PostHog / Vercel Analytics',
    reason: '유입, 리텐션, 공명 버튼 반응을 바로 볼 수 있다.'
  }
];

const tableShapes: TableShape[] = [
  {
    name: 'users',
    fields: [
      { name: 'id (PK)', accent: true },
      { name: 'email' },
      { name: 'avatar' }
    ]
  },
  {
    name: 'memories',
    relation: 'N:1 → users',
    fields: [
      { name: 'id (PK)', accent: true },
      { name: 'user_id', accent: true },
      { name: 'type' },
      { name: 'file_url' },
      { name: 'thumb' },
      { name: 'summary' }
    ]
  },
  {
    name: 'exhibits',
    relation: 'N:1 → memories',
    fields: [
      { name: 'id (PK)', accent: true },
      { name: 'memory_id', accent: true },
      { name: 'room' },
      { name: 'caption' },
      { name: 'pos_x / pos_y' },
      { name: 'likes' }
    ]
  },
  {
    name: 'visits / likes',
    relation: 'logs → exhibits',
    fields: [
      { name: 'id (PK)', accent: true },
      { name: 'user_id' },
      { name: 'exhibit_id' },
      { name: 'resonance_at' }
    ]
  }
];

const sprintCards: SprintCard[] = [
  {
    week: '1주',
    title: '로비 + 로그인',
    tasks: [
      'GDevelop 로비 맵, 이동, 충돌 구현',
      'Supabase 로그인과 프로필 저장 연결'
    ]
  },
  {
    week: '2주',
    title: '업로드 스테이션',
    tasks: ['파일 업로드 씬 제작', 'Storage 업로드와 DB row 생성']
  },
  {
    week: '3주',
    title: '전시 배치 UI',
    tasks: ['벽 배치 드래그 UI', '방 JSON 저장·로드와 엔딩 룸 트리거']
  },
  {
    week: '4주',
    title: 'AI + SNS 루프',
    tasks: ['요약, 도트 썸네일, 랜덤 탐험 모드', '공명 버튼, 배포, 소수 테스트']
  }
];

const tonePoints: TonePoint[] = [
  {
    title: '404 코드 모티프',
    detail: '곳곳에 NOT FOUND 팻말, 깨진 단서, 글리치 사운드를 심는다.'
  },
  {
    title: '조명·배경',
    detail: '팔레트는 #0c0c0c, #232323, #384048, #8b9ca3 네 축으로 고정한다.'
  },
  {
    title: '사운드',
    detail: '로우파이 위에 리버브 강한 기계음으로 폐허 미술관 무드를 만든다.'
  },
  {
    title: '텍스트 톤',
    detail: 'NPC 대사는 짧고 단호하게. “기억은 값을 요구한다.”'
  }
];

const monetizePhases: MonetizePhase[] = [
  {
    phase: 'MVP',
    model: '무료 플레이 + Supabase 무료 구간으로 초기 검증'
  },
  {
    phase: '1차',
    model: '프리미엄 슬롯: 업로드 용량과 방 수 확장, 월 3,000원'
  },
  {
    phase: '2차',
    model: '고해상도 추출 + PDF 아카이브, 1회 5,000원'
  },
  {
    phase: '3차+',
    model: 'ENICO VECK 실물 드랍, 오프라인 팝업, QR 기반 전시 확장'
  }
];

const nextActions = [
  'GDevelop 가입 후 기본 플레이어와 타일셋 임포트',
  'Supabase 프로젝트 생성 후 users / memories / exhibits 테이블 구성',
  '1주 안에 로비 맵 + 파일 업로드 프로토타입 제작',
  '막히는 퍼즐 / UI / 데이터 흐름은 바로 분해해서 보정'
];

function DataTableCard({ table }: { table: TableShape }) {
  return (
    <article className="relative overflow-hidden rounded-[32px_44px_30px_46px/36px_30px_44px_32px] border border-[rgba(136,30,30,0.24)] bg-[linear-gradient(180deg,rgba(17,2,2,0.96),rgba(5,0,0,0.98))] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.34)]">
      <div className="pointer-events-none absolute inset-x-4 top-4 h-px bg-[linear-gradient(90deg,transparent,rgba(255,198,198,0.3),transparent)]" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(194,159,159,0.46)]">
              schema
            </p>
            <h4 className="mt-1 font-[var(--font-mono)] text-lg font-semibold text-[rgba(255,233,233,0.94)]">
              {table.name}
            </h4>
          </div>
          {table.relation ? (
            <span className="rounded-full border border-[rgba(142,35,35,0.28)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[rgba(223,198,198,0.62)]">
              {table.relation}
            </span>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {table.fields.map((field) => (
            <div
              key={field.name}
              className={`rounded-[18px] border px-3 py-2 text-sm ${
                field.accent
                  ? 'border-[rgba(171,49,49,0.32)] bg-[rgba(109,12,12,0.22)] text-[rgba(255,230,230,0.92)]'
                  : 'border-[rgba(118,33,33,0.18)] bg-[rgba(255,255,255,0.03)] text-[rgba(216,196,196,0.72)]'
              }`}
            >
              {field.name}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

export default function Museum404Blueprint() {
  return (
    <section className="relative mb-12 overflow-hidden rounded-[54px_72px_60px_68px/58px_48px_72px_52px] border border-[rgba(122,16,16,0.34)] bg-[linear-gradient(180deg,rgba(10,1,1,0.98),rgba(4,0,0,0.98))] p-5 shadow-[0_36px_110px_rgba(0,0,0,0.48)] md:mb-14 md:p-8">
      <div className="pointer-events-none absolute left-[-8%] top-[4%] h-56 w-56 rounded-full bg-[#6a0b0b]/24 blur-3xl" />
      <div className="pointer-events-none absolute right-[-8%] top-[14%] h-64 w-64 rounded-full bg-[#24344b]/18 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[36%] h-56 w-56 rounded-full bg-[#5f5f79]/16 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(198,48,48,0.76),transparent)]" />

      <div className="relative z-10">
        <div className="flex flex-col gap-4">
          <p className="section-kicker">404 Museum Blueprint</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="display-font text-[clamp(1.7rem,3.2vw,2.8rem)] font-semibold tracking-[0.02em] text-white">
                잃어버린 기억을 수집하고 전시하는
                <br className="hidden sm:block" /> 도트 미술관형 SNS 루프
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[rgba(219,198,198,0.72)]">
                완주한 기록이 영구히 404 MUSEUM에 남고, 다른 유저는 그 방에 랜덤
                입장해 공명만 남기는 구조. 게임이면서 기록 플랫폼이고,
                전시관이면서 SNS인 흐름이다.
              </p>
            </div>
            <div className="rounded-[999px_840px_920px_760px/58%_44%_62%_40%] border border-[rgba(137,22,22,0.34)] bg-[rgba(98,10,10,0.16)] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-[rgba(230,209,209,0.58)] shadow-[0_14px_36px_rgba(0,0,0,0.28)]">
              ENICO PLACE / 404 / DOT MUSEUM / MEMORY SNS
            </div>
          </div>
        </div>

        <div className="mt-7 rounded-[42px_58px_46px_62px/40px_52px_44px_56px] border border-[rgba(142,27,27,0.28)] bg-[linear-gradient(180deg,rgba(37,3,3,0.76),rgba(9,0,0,0.88))] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[rgba(204,159,159,0.48)]">
            concept line
          </p>
          <p className="mt-3 text-lg leading-relaxed text-[rgba(255,238,238,0.94)] md:text-[1.18rem]">
            “잃어버린 기억을 수집-전시하며 완주하면, 그 기록이 영구히
            <span className="text-[rgba(255,133,133,0.96)]"> 404 MUSEUM</span>에
            남는다.”
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="relative overflow-hidden rounded-[46px_62px_48px_68px/44px_54px_46px_60px] border border-[rgba(124,18,18,0.3)] bg-[linear-gradient(180deg,rgba(19,1,1,0.96),rgba(7,0,0,0.98))] p-5 shadow-[0_28px_72px_rgba(0,0,0,0.4)]">
            <div className="pointer-events-none absolute left-[4%] top-[10%] h-32 w-32 rounded-full bg-[#7d1111]/18 blur-3xl" />
            <div className="pointer-events-none absolute bottom-[8%] right-[6%] h-40 w-40 rounded-full bg-[#375171]/12 blur-3xl" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(207,170,170,0.5)]">
              core game loop
            </p>
            <div className="relative mt-5 space-y-4 before:absolute before:left-[1.05rem] before:top-3 before:h-[calc(100%-1.5rem)] before:w-px before:bg-[linear-gradient(180deg,rgba(191,36,36,0.52),rgba(101,122,149,0.28),transparent)]">
              {loopSteps.map((step, index) => (
                <div
                  key={step.id}
                  className="relative pl-12"
                  style={{ zIndex: loopSteps.length - index }}
                >
                  <div className="absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(191,47,47,0.34)] bg-[linear-gradient(180deg,rgba(121,10,10,0.34),rgba(255,255,255,0.04))] font-[var(--font-mono)] text-[11px] text-[rgba(255,228,228,0.88)] shadow-[0_0_20px_rgba(166,31,31,0.22)]">
                    {step.id}
                  </div>
                  <article className="rounded-[28px_36px_24px_38px/30px_24px_34px_26px] border border-[rgba(131,25,25,0.22)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                    <h4 className="text-base font-semibold text-[rgba(255,232,232,0.94)]">
                      {step.title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-[rgba(216,196,196,0.68)]">
                      {step.detail}
                    </p>
                  </article>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[40px_58px_44px_52px/36px_52px_42px_50px] border border-[rgba(121,25,25,0.28)] bg-[linear-gradient(180deg,rgba(20,2,2,0.94),rgba(7,0,0,0.98))] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.36)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(211,170,170,0.48)]">
                tech stack
              </p>
              <div className="mt-4 space-y-3">
                {stackItems.map((item) => (
                  <article
                    key={item.layer}
                    className="rounded-[24px_30px_22px_32px/28px_24px_30px_22px] border border-[rgba(118,24,24,0.2)] bg-[rgba(255,255,255,0.03)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[rgba(141,30,30,0.26)] bg-[rgba(110,13,13,0.18)] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[rgba(233,206,206,0.62)]">
                        {item.layer}
                      </span>
                      <h4 className="text-sm font-semibold text-[rgba(255,237,237,0.94)]">
                        {item.tool}
                      </h4>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[rgba(214,194,194,0.68)]">
                      {item.reason}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[46px_32px_48px_36px/28px_40px_30px_44px] border border-[rgba(112,35,35,0.24)] bg-[linear-gradient(180deg,rgba(16,2,2,0.94),rgba(7,0,0,0.98))] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.34)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(201,164,164,0.48)]">
                next action
              </p>
              <div className="mt-4 space-y-3">
                {nextActions.map((action, index) => (
                  <div
                    key={action}
                    className="flex items-start gap-3 rounded-[22px] border border-[rgba(120,30,30,0.18)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-sm text-[rgba(221,204,204,0.74)]"
                  >
                    <span className="mt-0.5 font-[var(--font-mono)] text-[11px] text-[rgba(255,148,148,0.82)]">
                      0{index + 1}
                    </span>
                    <span>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="overflow-hidden rounded-[48px_62px_42px_66px/46px_44px_52px_50px] border border-[rgba(122,18,18,0.28)] bg-[linear-gradient(180deg,rgba(17,2,2,0.96),rgba(5,0,0,0.98))] p-5 shadow-[0_28px_74px_rgba(0,0,0,0.38)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(204,168,168,0.46)]">
                  data structure
                </p>
                <h4 className="mt-2 text-2xl font-semibold text-[rgba(255,236,236,0.94)]">
                  최소 ERD
                </h4>
              </div>
              <div className="rounded-full border border-[rgba(127,34,34,0.24)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-[rgba(221,198,198,0.58)]">
                users → memories → exhibits → resonance logs
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {tableShapes.map((table) => (
                <DataTableCard key={table.name} table={table} />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[42px_54px_40px_56px/44px_34px_48px_36px] border border-[rgba(122,22,22,0.28)] bg-[linear-gradient(180deg,rgba(18,2,2,0.96),rgba(5,0,0,0.98))] p-5 shadow-[0_24px_66px_rgba(0,0,0,0.36)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(206,168,168,0.48)]">
                4 week sprint
              </p>
              <div className="mt-4 grid gap-3">
                {sprintCards.map((card) => (
                  <article
                    key={card.week}
                    className="rounded-[26px_34px_24px_38px/30px_24px_34px_26px] border border-[rgba(128,28,28,0.2)] bg-[rgba(255,255,255,0.03)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-[rgba(255,233,233,0.94)]">
                        {card.title}
                      </h4>
                      <span className="rounded-full border border-[rgba(142,38,38,0.26)] bg-[rgba(106,14,14,0.18)] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[rgba(255,214,214,0.72)]">
                        {card.week}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {card.tasks.map((task) => (
                        <p
                          key={task}
                          className="rounded-[18px] border border-[rgba(118,28,28,0.16)] bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-[rgba(214,194,194,0.68)]"
                        >
                          {task}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[44px_28px_48px_32px/34px_46px_36px_48px] border border-[rgba(114,30,30,0.24)] bg-[linear-gradient(180deg,rgba(16,2,2,0.96),rgba(5,0,0,0.98))] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.34)]">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(203,165,165,0.48)]">
                mystery tone
              </p>
              <div className="mt-4 grid gap-3">
                {tonePoints.map((point) => (
                  <article
                    key={point.title}
                    className="rounded-[22px] border border-[rgba(119,28,28,0.18)] bg-[rgba(255,255,255,0.03)] px-4 py-3"
                  >
                    <h5 className="text-sm font-semibold text-[rgba(255,232,232,0.9)]">
                      {point.title}
                    </h5>
                    <p className="mt-2 text-sm leading-relaxed text-[rgba(214,194,194,0.68)]">
                      {point.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
          <div className="overflow-hidden rounded-[44px_58px_38px_60px/38px_48px_40px_54px] border border-[rgba(117,24,24,0.26)] bg-[linear-gradient(180deg,rgba(18,2,2,0.96),rgba(6,0,0,0.98))] p-5 shadow-[0_24px_64px_rgba(0,0,0,0.34)]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(203,167,167,0.48)]">
              monetization
            </p>
            <div className="mt-4 space-y-3">
              {monetizePhases.map((item) => (
                <div
                  key={item.phase}
                  className="rounded-[24px] border border-[rgba(119,28,28,0.18)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-[rgba(140,34,34,0.24)] bg-[rgba(109,13,13,0.18)] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-[rgba(255,214,214,0.72)]">
                      {item.phase}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[rgba(216,196,196,0.72)]">
                    {item.model}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-[52px_68px_46px_70px/40px_56px_44px_58px] border border-[rgba(116,24,24,0.28)] bg-[linear-gradient(180deg,rgba(24,3,3,0.94),rgba(6,0,0,0.98))] p-5 shadow-[0_28px_78px_rgba(0,0,0,0.38)]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(203,167,167,0.48)]">
              one line summary
            </p>
            <div className="mt-4 rounded-[34px_44px_30px_48px/32px_42px_34px_46px] border border-[rgba(133,28,28,0.22)] bg-[rgba(255,255,255,0.03)] px-5 py-5">
              <p className="text-lg leading-relaxed text-[rgba(255,236,236,0.94)]">
                ENICO PLACE: 404 MUSEUM을
                <span className="text-[rgba(255,146,146,0.96)]">
                  {' '}
                  “도트 미술관 × 감정 SNS”
                </span>
                로 세팅하고,
                <br className="hidden sm:block" />
                <span className="text-[rgba(220,228,255,0.88)]">
                  GDevelop + Supabase + OpenAI
                </span>
                조합으로 4주 안에
                <span className="text-[rgba(255,223,223,0.96)]">
                  {' '}
                  캐릭터 생성 → 감정 업로드 → 전시 SNS
                </span>
                루프까지 완주한다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
