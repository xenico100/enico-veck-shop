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
  accentClass: 'text-[rgba(255,216,216,0.94)]',
  borderClass: 'border-[rgba(140,26,26,0.38)]',
  chipClass:
    'border-[rgba(146,27,27,0.4)] bg-[rgba(111,11,11,0.28)] text-[rgba(255,224,224,0.92)]',
  glowClass:
    'bg-[radial-gradient(circle_at_top,rgba(163,18,18,0.26),transparent_70%)]'
};

const purchaseAxis: AxisConfig = {
  name: '에니코 벡',
  role: '창작물을 물성으로 판매',
  caption: '구매 플랫폼',
  accentClass: 'text-[rgba(211,255,184,0.94)]',
  borderClass: 'border-[rgba(77,120,34,0.34)]',
  chipClass:
    'border-[rgba(93,150,38,0.34)] bg-[rgba(40,68,16,0.26)] text-[rgba(214,255,188,0.92)]',
  glowClass:
    'bg-[radial-gradient(circle_at_top,rgba(90,182,48,0.2),transparent_70%)]'
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
      className={`group relative overflow-hidden border bg-[linear-gradient(180deg,rgba(34,4,4,0.94),rgba(9,0,0,0.96))] p-4 shadow-[0_24px_54px_rgba(0,0,0,0.34)] backdrop-blur-sm transition-transform duration-500 hover:-translate-y-1 ${axis.borderClass} rounded-[34px_46px_30px_52px/42px_34px_48px_36px]`}
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-90 ${axis.glowClass}`}
      />
      <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-[rgba(255,225,220,0.08)] blur-2xl transition-transform duration-500 group-hover:scale-110" />
      <div className="pointer-events-none absolute inset-x-5 top-4 h-px bg-[linear-gradient(90deg,transparent,rgba(255,224,224,0.28),transparent)] opacity-70" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(196,162,156,0.44)]">
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
                : 'border-[rgba(108,29,29,0.24)] bg-[rgba(255,255,255,0.03)] text-[rgba(194,170,164,0.56)]'
            }`}
          >
            {item.status === 'active' ? 'LIVE' : 'STANDBY'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 text-sm leading-relaxed text-[rgba(225,206,201,0.8)]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(193,160,154,0.42)]">
              업로드할 것
            </p>
            <p className="mt-1">{item.upload}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-[rgba(193,160,154,0.42)]">
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
    <div className="relative mb-12 overflow-hidden border border-[rgba(117,17,17,0.34)] bg-[linear-gradient(180deg,rgba(16,1,1,0.98),rgba(6,0,0,0.96))] p-5 shadow-[0_34px_90px_rgba(0,0,0,0.5)] md:mb-14 md:p-8 rounded-[48px_68px_54px_70px/54px_46px_64px_48px]">
      <div className="pointer-events-none absolute left-[-8%] top-[6%] h-56 w-56 rounded-full bg-[#4a0808]/28 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6%] top-[18%] h-52 w-52 rounded-full bg-[#204d14]/16 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[36%] h-48 w-48 rounded-full bg-[#772515]/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(194,41,41,0.72),transparent)]" />
      <div className="pointer-events-none absolute inset-x-[12%] top-[7rem] h-px bg-[linear-gradient(90deg,rgba(168,22,22,0),rgba(172,22,22,0.3),rgba(98,255,58,0.12),rgba(168,22,22,0))]" />

      <div className="mb-7 flex flex-col gap-3">
        <p className="section-kicker">Company System Diagram</p>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="display-font text-[clamp(1.6rem,3vw,2.45rem)] font-semibold tracking-[0.02em] text-white">
              원본 3개에서 메시지와 판매가 모두 파생되는 구조
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[rgba(215,191,186,0.68)]">
              대본 작성, CLO 3D 작업, 실물 핸드메이드 제작이 원본이고 나머지
              모든 업로드는 이 세 축에서 파생된다.
            </p>
          </div>
          <div className="rounded-[999px_760px_860px_640px/58%_48%_64%_42%] border border-[rgba(122,24,24,0.32)] bg-[rgba(92,8,8,0.18)] px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-[rgba(233,214,209,0.58)] shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
            Script / Clo / Handmade → Content / Commerce
          </div>
        </div>
      </div>

      <div className="relative grid gap-4 md:grid-cols-3">
        {originItems.map((origin) => (
          <article
            key={origin.label}
            className="border border-[rgba(112,22,22,0.28)] bg-[linear-gradient(180deg,rgba(28,2,2,0.92),rgba(10,0,0,0.94))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.3)] rounded-[30px_44px_26px_48px/42px_30px_44px_28px]"
          >
            <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(194,160,154,0.4)]">
              {origin.label}
            </p>
            <h4 className="mt-2 text-lg font-semibold text-[rgba(245,226,220,0.96)]">
              {origin.title}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[rgba(215,191,186,0.64)]">
              {origin.detail}
            </p>
          </article>
        ))}
      </div>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(165,31,31,0.38)] to-transparent" />
        <div className="rounded-[999px_760px_860px_640px/58%_48%_64%_42%] border border-[rgba(117,17,17,0.28)] bg-[rgba(83,8,8,0.16)] px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-[rgba(217,195,189,0.5)]">
          Derived Upload System
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(109,196,50,0.24)] to-transparent" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4">
          <div className="relative overflow-hidden border border-[rgba(140,26,26,0.34)] bg-[linear-gradient(180deg,rgba(28,2,2,0.94),rgba(10,0,0,0.96))] p-5 rounded-[34px_52px_28px_50px/44px_32px_48px_30px]">
            <div className="pointer-events-none absolute -right-10 top-[-20%] h-32 w-32 rounded-full bg-red-500/12 blur-3xl" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(214,118,118,0.58)]">
              Message Axis
            </p>
            <h4 className="mt-2 text-2xl font-semibold text-[rgba(255,224,224,0.94)]">
              몽상인
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[rgba(224,201,196,0.72)]">
              사람을 모으고, 생각을 전파하는 메시지 채널.
            </p>
            <div className="mt-4 rounded-[28px_36px_24px_38px/30px_24px_34px_26px] border border-[rgba(140,26,26,0.26)] bg-[rgba(89,8,8,0.22)] px-4 py-3 text-sm text-[rgba(255,230,230,0.9)]">
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
          <div className="relative overflow-hidden border border-[rgba(77,120,34,0.3)] bg-[linear-gradient(180deg,rgba(17,11,4,0.92),rgba(6,4,0,0.94))] p-5 rounded-[46px_28px_50px_30px/32px_46px_34px_48px]">
            <div className="pointer-events-none absolute -left-10 top-[-20%] h-32 w-32 rounded-full bg-emerald-400/12 blur-3xl" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-[rgba(170,229,128,0.58)]">
              Purchase Axis
            </p>
            <h4 className="mt-2 text-2xl font-semibold text-[rgba(218,255,198,0.94)]">
              에니코 벡
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[rgba(218,233,204,0.72)]">
              창작물을 물성으로 정리하고 판매까지 연결하는 구매 채널.
            </p>
            <div className="mt-4 rounded-[36px_24px_38px_24px/26px_36px_28px_34px] border border-[rgba(77,120,34,0.24)] bg-[rgba(36,57,15,0.22)] px-4 py-3 text-sm text-[rgba(221,255,205,0.88)]">
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
        <div className="border border-[rgba(77,120,34,0.28)] bg-[rgba(34,52,13,0.16)] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)] rounded-[30px_44px_24px_46px/40px_28px_42px_30px]">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(178,236,140,0.62)]">
            현재 사용 중
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activePlatforms.map((item) => (
              <span
                key={item.platform}
                className="rounded-full border border-[rgba(86,137,40,0.28)] bg-[rgba(41,70,18,0.2)] px-3 py-1.5 text-xs text-[rgba(222,255,209,0.9)]"
              >
                {item.platform}
              </span>
            ))}
          </div>
        </div>

        <div className="border border-[rgba(112,22,22,0.22)] bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_16px_36px_rgba(0,0,0,0.24)] rounded-[42px_26px_44px_28px/30px_40px_32px_44px]">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[rgba(198,170,164,0.48)]">
            현재 미사용
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {inactivePlatforms.map((item) => (
              <span
                key={item.platform}
                className="rounded-full border border-[rgba(108,29,29,0.2)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 text-xs text-[rgba(194,170,164,0.66)]"
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
