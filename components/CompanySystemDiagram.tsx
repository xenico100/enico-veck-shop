'use client';

type OriginItem = {
  title: string;
  detail: string;
  label: string;
};

type PlatformItem = {
  platform: string;
  upload: string;
  role: string;
  status: 'active' | 'inactive';
};

type AxisConfig = {
  name: string;
  role: string;
  caption: string;
  accentClass: string;
  borderClass: string;
  chipClass: string;
  glowClass: string;
};

const originItems: OriginItem[] = [
  {
    label: 'Origin 01',
    title: '대본 작성',
    detail: '메시지와 서사를 만드는 첫 원본'
  },
  {
    label: 'Origin 02',
    title: 'CLO 3D 작업',
    detail: '의상 설계와 비주얼 구성을 만드는 원본'
  },
  {
    label: 'Origin 03',
    title: '실물 의류 핸드메이드 제작',
    detail: '물성, 완성도, 제품화의 원본'
  }
];

const messageAxis: AxisConfig = {
  name: '몽상인',
  role: '사람 모으기, 생각 전파',
  caption: '메시지 플랫폼',
  accentClass: 'text-fuchsia-100',
  borderClass: 'border-fuchsia-300/25',
  chipClass: 'border-fuchsia-300/25 bg-fuchsia-400/12 text-fuchsia-100',
  glowClass:
    'bg-[radial-gradient(circle_at_top,rgba(217,70,239,0.16),transparent_70%)]'
};

const purchaseAxis: AxisConfig = {
  name: '에니코 벡',
  role: '창작물을 물성으로 판매',
  caption: '구매 플랫폼',
  accentClass: 'text-amber-100',
  borderClass: 'border-amber-300/25',
  chipClass: 'border-amber-300/25 bg-amber-400/12 text-amber-100',
  glowClass:
    'bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_70%)]'
};

const messagePlatforms: PlatformItem[] = [
  {
    platform: '유튜브 롱폼',
    upload: '메인 영상 본편',
    role: '세계관, 서사, 코멘터리, 창작 철학',
    status: 'active'
  },
  {
    platform: '릴스',
    upload: '유튜브 롱폼 컷다운',
    role: '짧은 훅, 비주얼, 무드 확산',
    status: 'active'
  },
  {
    platform: '틱톡',
    upload: '유튜브 롱폼 컷다운',
    role: '강한 장면, 자극적인 포인트',
    status: 'active'
  },
  {
    platform: '쇼츠',
    upload: '유튜브 롱폼 컷다운',
    role: '롱폼 유입용 하이라이트',
    status: 'active'
  },
  {
    platform: '트위터',
    upload: '친근한 커뮤형 글',
    role: '반응, 일상, 작업 뒷말, 인간미',
    status: 'inactive'
  },
  {
    platform: '쓰레드',
    upload: '전문적인 정보성 글',
    role: '의류 제작, CLO, 소재, 창작 인사이트',
    status: 'inactive'
  }
];

const purchasePlatforms: PlatformItem[] = [
  {
    platform: '내 웹사이트',
    upload: '가장 완성된 제품 페이지',
    role: '브랜드 본진, 직접 결제',
    status: 'active'
  },
  {
    platform: '스마트스토어',
    upload: '정리된 상품 등록글',
    role: '검색 유입, 구매 전환',
    status: 'active'
  },
  {
    platform: '번개장터',
    upload: '짧고 직관적인 판매글',
    role: '빠른 판매',
    status: 'inactive'
  },
  {
    platform: '후루츠패밀리',
    upload: '감도 있는 판매글',
    role: '디자이너/무드 소비층 공략',
    status: 'inactive'
  },
  {
    platform: '당근마켓',
    upload: '실속형 짧은 판매글',
    role: '빠른 반응, 재고 소진',
    status: 'inactive'
  },
  {
    platform: '인스타그램 일부',
    upload: '상품 태그, 판매 유도 게시물',
    role: '예쁜 피드에서 구매로 넘기기',
    status: 'active'
  }
];

const allPlatforms = [...messagePlatforms, ...purchasePlatforms];

function PlatformCard({
  item,
  axis
}: {
  item: PlatformItem;
  axis: AxisConfig;
}) {
  return (
    <article
      className={`group relative overflow-hidden rounded-[2rem] border bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1 ${axis.borderClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-90 ${axis.glowClass}`}
      />
      <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl transition-transform duration-500 group-hover:scale-110" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-50/45">
              {axis.caption}
            </p>
            <h4 className={`mt-1 text-base font-semibold ${axis.accentClass}`}>
              {item.platform}
            </h4>
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-[0.18em] ${
              item.status === 'active'
                ? axis.chipClass
                : 'border-white/12 bg-white/[0.04] text-white/55'
            }`}
          >
            {item.status === 'active' ? 'LIVE' : 'STANDBY'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 text-sm leading-relaxed text-cyan-50/78">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-50/40">
              업로드할 것
            </p>
            <p className="mt-1">{item.upload}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-50/40">
              역할
            </p>
            <p className="mt-1">{item.role}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CompanySystemDiagram() {
  const activePlatforms = allPlatforms.filter(
    (item) => item.status === 'active'
  );
  const inactivePlatforms = allPlatforms.filter(
    (item) => item.status === 'inactive'
  );

  return (
    <div className="relative mb-12 overflow-hidden rounded-[3rem] border border-cyan-100/12 bg-[linear-gradient(180deg,rgba(5,10,20,0.96),rgba(7,12,24,0.86))] p-5 shadow-[0_30px_80px_rgba(2,8,23,0.32)] md:mb-14 md:p-8">
      <div className="pointer-events-none absolute left-[-8%] top-[6%] h-56 w-56 rounded-full bg-[#7ad0ff]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6%] top-[18%] h-52 w-52 rounded-full bg-[#ff6b78]/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[36%] h-48 w-48 rounded-full bg-[#ffbf7b]/8 blur-3xl" />

      <div className="mb-7 flex flex-col gap-3">
        <p className="section-kicker">Company System Diagram</p>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="display-font text-[clamp(1.6rem,3vw,2.45rem)] font-semibold tracking-[0.02em] text-white">
              원본 3개에서 메시지와 판매가 모두 파생되는 구조
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-cyan-50/65">
              대본 작성, CLO 3D 작업, 실물 핸드메이드 제작이 원본이고 나머지
              모든 업로드는 이 세 축에서 파생된다.
            </p>
          </div>
          <div className="rounded-full border border-cyan-100/12 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-cyan-50/55 shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
            Script / Clo / Handmade → Content / Commerce
          </div>
        </div>
      </div>

      <div className="relative grid gap-4 md:grid-cols-3">
        {originItems.map((origin) => (
          <article
            key={origin.label}
            className="rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)]"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-50/35">
              {origin.label}
            </p>
            <h4 className="mt-2 text-lg font-semibold text-white">
              {origin.title}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-cyan-50/62">
              {origin.detail}
            </p>
          </article>
        ))}
      </div>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
        <div className="rounded-full border border-cyan-100/12 bg-white/[0.04] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-cyan-50/50">
          Derived Upload System
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-fuchsia-300/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
            <div className="pointer-events-none absolute -right-10 top-[-20%] h-32 w-32 rounded-full bg-fuchsia-400/12 blur-3xl" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-100/55">
              Message Axis
            </p>
            <h4 className="mt-2 text-2xl font-semibold text-fuchsia-100">
              몽상인
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-cyan-50/72">
              사람을 모으고, 생각을 전파하는 메시지 채널.
            </p>
            <div className="mt-4 rounded-[1.6rem] border border-fuchsia-300/15 bg-fuchsia-400/8 px-4 py-3 text-sm text-fuchsia-50/92">
              역할: {messageAxis.role}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {messagePlatforms.map((item) => (
              <PlatformCard
                key={item.platform}
                item={item}
                axis={messageAxis}
              />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-300/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
            <div className="pointer-events-none absolute -left-10 top-[-20%] h-32 w-32 rounded-full bg-amber-400/12 blur-3xl" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-amber-100/55">
              Purchase Axis
            </p>
            <h4 className="mt-2 text-2xl font-semibold text-amber-100">
              에니코 벡
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-cyan-50/72">
              창작물을 물성으로 정리하고 판매까지 연결하는 구매 채널.
            </p>
            <div className="mt-4 rounded-[1.6rem] border border-amber-300/15 bg-amber-400/8 px-4 py-3 text-sm text-amber-50/92">
              역할: {purchaseAxis.role}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {purchasePlatforms.map((item) => (
              <PlatformCard
                key={item.platform}
                item={item}
                axis={purchaseAxis}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="mt-7 grid gap-3 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-emerald-300/18 bg-emerald-400/[0.06] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
          <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-100/60">
            현재 사용 중
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activePlatforms.map((item) => (
              <span
                key={item.platform}
                className="rounded-full border border-emerald-300/18 bg-emerald-400/[0.08] px-3 py-1.5 text-xs text-emerald-50/92"
              >
                {item.platform}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)]">
          <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-50/50">
            현재 미사용
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {inactivePlatforms.map((item) => (
              <span
                key={item.platform}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-cyan-50/68"
              >
                {item.platform}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
