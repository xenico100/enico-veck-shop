import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import StudioPostDeleteButton from '@/components/StudioPostDeleteButton';
import StudioSubscribeButton from '@/components/StudioSubscribeButton';
import StudioProtectedMedia from '@/components/StudioProtectedMedia';

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

type StudioPostRow = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  user_id: string;
  created_at: string;
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

const readSearchParam = (
  params: Record<string, string | string[] | undefined> | undefined,
  key: string
) => {
  const value = params?.[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === 'string' ? value : null;
};

const isActiveStatus = (status?: string | null) => (status || '').toUpperCase() === 'ACTIVE';

const getPayPalBanner = (
  searchParams: Record<string, string | string[] | undefined> | undefined
) => {
  const paypal = readSearchParam(searchParams, 'paypal');
  const status = readSearchParam(searchParams, 'subscription_status');
  const message = readSearchParam(searchParams, 'paypal_message');
  const missingPlanEnv = readSearchParam(searchParams, 'missing_plan_env');

  if (!paypal) return null;

  if (paypal === 'success') {
    return {
      tone: 'success' as const,
      title: 'PayPal 구독이 활성화되었습니다.',
      description: status ? `현재 상태: ${status}` : '전용 미디어를 확인할 수 있습니다.'
    };
  }

  if (paypal === 'inactive') {
    return {
      tone: 'warn' as const,
      title: '구독 승인 후 상태 확인 중입니다.',
      description: status
        ? `현재 상태: ${status}. 잠시 후 다시 새로고침해 주세요.`
        : '잠시 후 다시 시도해 주세요.'
    };
  }

  if (paypal === 'cancel') {
    return {
      tone: 'neutral' as const,
      title: 'PayPal 구독 절차가 취소되었습니다.',
      description: '원할 때 다시 구독을 시작할 수 있습니다.'
    };
  }

  if (message === 'invalid_plan_key') {
    return {
      tone: 'error' as const,
      title: '멤버십 플랜 정보가 올바르지 않습니다.',
      description: '페이지를 새로고침한 뒤 다시 시도해 주세요.'
    };
  }

  if (message === 'missing_paypal_plan_env') {
    return {
      tone: 'error' as const,
      title: 'PayPal 요금제 연동이 아직 설정되지 않았습니다.',
      description: missingPlanEnv
        ? `누락된 환경변수: ${missingPlanEnv}. 관리자에게 설정을 요청해 주세요.`
        : '관리자에게 멤버십 PayPal 플랜 설정을 요청해 주세요.'
    };
  }

  if (message === 'paypal_subscription_create_failed') {
    return {
      tone: 'error' as const,
      title: 'PayPal 구독 세션 생성에 실패했습니다.',
      description: '잠시 후 다시 시도해 주세요.'
    };
  }

  return {
    tone: 'error' as const,
    title: 'PayPal 구독 처리 중 문제가 발생했습니다.',
    description: '잠시 후 다시 시도해 주세요.'
  };
};

export default async function PostDetailPage({ params, searchParams }: PageProps) {
  const supabase = createClient();

  const [
    { data: postData, error },
    { data: authData }
  ] = await Promise.all([
    (supabase as any)
      .from('studio_posts')
      .select('id,title,content,image_url,user_id,created_at')
      .eq('id', params.id)
      .maybeSingle(),
    supabase.auth.getUser()
  ]);

  if (error) {
    return (
      <section className="min-h-screen bg-black pb-24 text-white">
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
            게시글을 불러오지 못했습니다.
          </div>
        </div>
      </section>
    );
  }

  if (!postData) {
    notFound();
  }

  const post = postData as StudioPostRow;
  const currentUserId = authData.user?.id ?? null;
  const isOwner = currentUserId === post.user_id;
  const paypalBanner = getPayPalBanner(searchParams);

  let hasActiveStudioSubscription = false;
  let studioSubscriptionStatus: string | null = null;
  let studioSubscriptionId: string | null = null;

  if (currentUserId) {
    try {
      const [
        { data: accessData },
        { data: subscriptionRows }
      ] = await Promise.all([
        (supabase as any)
          .from('studio_access')
          .select('has_active_subscription')
          .eq('user_id', currentUserId)
          .maybeSingle(),
        (supabase as any)
          .from('paypal_subscriptions')
          .select('id,status,last_event_at')
          .eq('user_id', currentUserId)
          .order('last_event_at', { ascending: false })
          .limit(10)
      ]);

      const rows = Array.isArray(subscriptionRows)
        ? (subscriptionRows as Array<{ id: string; status: string | null }>)
        : [];
      const activeSubscription = rows.find((row) => isActiveStatus(row.status)) ?? null;
      const latestSubscription = rows[0] ?? null;

      // UI gate follows studio_access.has_active_subscription as the source of truth.
      hasActiveStudioSubscription = Boolean(accessData?.has_active_subscription);
      studioSubscriptionStatus = activeSubscription?.status ?? latestSubscription?.status ?? null;
      studioSubscriptionId = activeSubscription?.id ?? latestSubscription?.id ?? null;
    } catch (subscriptionError) {
      console.error('[Studio detail] subscription gate lookup failed', subscriptionError);
    }
  }

  return (
    <section className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-4xl px-4 pb-8 pt-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/posts"
            className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/20"
          >
            목록으로
          </Link>
          {isOwner && (
            <>
              <Link
                href={`/posts/${post.id}/edit`}
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
              >
                수정
              </Link>
              <StudioPostDeleteButton
                postId={post.id}
                className="inline-flex items-center justify-center rounded-full border border-rose-300/30 bg-rose-300/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-300/20"
              >
                삭제
              </StudioPostDeleteButton>
            </>
          )}
        </div>

        <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          {post.image_url ? (
            <img
              src={post.image_url}
              alt={post.title ?? 'Studio post image'}
              className="h-[280px] w-full object-cover sm:h-[420px]"
            />
          ) : (
            <div className="flex h-[280px] w-full items-center justify-center bg-neutral-900 text-sm uppercase tracking-[0.3em] text-neutral-500 sm:h-[420px]">
              No Image
            </div>
          )}

          <div className="space-y-5 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                {formatDateTime(post.created_at)}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {post.title ?? '제목 없음'}
              </h1>
              <p className="text-sm text-neutral-500">작성자: {post.user_id}</p>
            </div>

            <div className="whitespace-pre-wrap text-base leading-relaxed text-neutral-200">
              {post.content ?? ''}
            </div>

            <div className="h-px w-full bg-white/10" />

            <section className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">
                  Studio Membership Media
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                    전용 이미지 / 영상
                  </h2>
                  {hasActiveStudioSubscription && (
                    <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-neutral-400">
                  기본은 멤버십 전용이며, 일반 공개로 체크한 미디어가 있으면 비구독자에게도 표시됩니다.
                </p>
              </div>

              {paypalBanner && (
                <div
                  className={
                    paypalBanner.tone === 'success'
                      ? 'rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4'
                      : paypalBanner.tone === 'warn'
                        ? 'rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4'
                        : paypalBanner.tone === 'error'
                          ? 'rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4'
                          : 'rounded-2xl border border-white/10 bg-white/5 p-4'
                  }
                >
                  <p className="text-sm font-semibold text-white">{paypalBanner.title}</p>
                  <p className="mt-1 text-sm text-neutral-200">{paypalBanner.description}</p>
                </div>
              )}

              {!currentUserId && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white">멤버십 가입이 필요합니다.</p>
                  <p className="mt-2 text-sm text-neutral-400">
                    로그인 후 PayPal 월 구독을 시작하면 전용 미디어를 볼 수 있습니다.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/signin"
                      className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
                    >
                      로그인
                    </Link>
                  </div>
                </div>
              )}

              {currentUserId && !hasActiveStudioSubscription && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm font-semibold text-white">
                    Studio 전용 미디어는 구독자 전용입니다.
                  </p>
                  <p className="mt-2 text-sm text-neutral-400">
                    PayPal 월 구독을 활성화하면 이 게시글의 원본 이미지/영상이 표시됩니다.
                  </p>
                  <div className="mt-4">
                    <StudioSubscribeButton
                      studioPostId={post.id}
                      className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200"
                    />
                  </div>
                </div>
              )}

              {currentUserId && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-neutral-400">
                      Subscription Status
                    </p>
                    {hasActiveStudioSubscription && (
                      <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-neutral-200">
                    studio_access: {hasActiveStudioSubscription ? 'ACTIVE' : 'INACTIVE'}
                  </p>
                  <p className="mt-2 text-sm text-neutral-200">
                    {studioSubscriptionStatus ? `PayPal: ${studioSubscriptionStatus}` : 'PayPal 구독 정보 없음'}
                  </p>
                  {studioSubscriptionId && (
                    <p className="mt-1 break-all text-xs text-neutral-500">
                      Subscription ID: {studioSubscriptionId}
                    </p>
                  )}
                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                    관리/취소는 PayPal 계정의 자동결제(Automatic Payments) 설정에서 진행할 수 있습니다.
                  </p>
                </div>
              )}

              <StudioProtectedMedia studioPostId={post.id} />
            </section>
          </div>
        </article>
      </div>
    </section>
  );
}
