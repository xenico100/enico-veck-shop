'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent
} from 'react';
import OrderDetailModal from '@/components/OrderDetailModal';
import StudioPostForm from '@/components/StudioPostForm';
import StudioMediaAdminManager from '@/components/StudioMediaAdminManager';
import { useAuth } from '@/app/context/AuthContext';
import ActionButton from '@/components/ui/ActionButton';
import PillTab from '@/components/ui/PillTab';
import {
  formatOrderDate,
  formatOrderMoney,
  getOrderStatusBadgeClass,
  getShippingStatusBadgeClass,
  mapOrderStatusLabel,
  mapShippingStatusLabel,
  normalizeOrders,
  type OrderRecord
} from '@/utils/orders';
import {
  SERVICE_CATEGORIES,
  USER_ROLE_VALUES,
  getUserRoleLabel,
  normalizeUserRoleValue,
  type ServicePost,
  type UserRoleValue
} from '@/utils/service-posts';
import {
  type StudioMembershipTierLevel,
  STUDIO_MEMBERSHIP_TIER_OPTIONS,
  getStudioMembershipTierLabel,
  resolveStudioMembershipTierLevel
} from '@/utils/studio-membership-tier';

type AdminMember = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  role: UserRoleValue;
  full_name: string | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  subscription_status: string | null;
  studio_membership: {
    user_id: string;
    has_active_subscription: boolean;
    subscription_id: string | null;
    subscription_status: string | null;
    selected_membership: string | null;
    subscribed_at: string | null;
    next_billing_at: string | null;
    plan_id: string | null;
    plan_amount: number | null;
    plan_currency: string | null;
    plan_interval: string | null;
  } | null;
  is_protected_admin: boolean;
};

type AdminStudioPost = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  user_id: string;
  created_at: string;
  required_membership_level: number | null;
};

type DashboardResponse = {
  data?: {
    members?: AdminMember[];
    studio_posts?: AdminStudioPost[];
    daily_metrics?: DailyMetricsSummary;
  };
  warnings?: Partial<{
    profiles: string;
    subscriptions: string;
    studio_posts: string;
    studio_membership: string;
    daily_metrics: string;
  }>;
  message?: string;
};

type DailyMetricsSummary = {
  date: string;
  timezone: string;
  visitor_count: number;
  post_count: number;
  community_post_count: number;
  service_post_count: number;
  studio_post_count: number;
};

type Props = {
  enabled: boolean;
};

type AdminTabKey = 'members' | 'service-posts' | 'studio-posts' | 'daily-metrics';

type MemberOrdersTabKey = 'shipping_todo' | 'shipping_done';
type StudioSectionTabKey = 'list' | 'create' | 'media';

type AdminServicePostDraft = {
  title: string;
  category: string;
  summary: string;
  content: string;
  price_from: string;
  currency: string;
  is_published: boolean;
  image_urls_text: string;
};

type AdminServiceCreateDraft = AdminServicePostDraft & {
  files: File[];
};

const emptyServiceCreateDraft = (): AdminServiceCreateDraft => ({
  title: '',
  category: SERVICE_CATEGORIES[0] ?? '',
  summary: '',
  content: '',
  price_from: '',
  currency: 'KRW',
  is_published: true,
  image_urls_text: '',
  files: []
});

const sanitizeDailyMetrics = (value: unknown): DailyMetricsSummary | null => {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const toNonNegativeInt = (input: unknown) =>
    typeof input === 'number' && Number.isFinite(input) && input >= 0 ? Math.floor(input) : 0;

  const date = typeof row.date === 'string' ? row.date : '';
  if (!date) return null;

  return {
    date,
    timezone: typeof row.timezone === 'string' && row.timezone.trim() ? row.timezone : 'Asia/Seoul',
    visitor_count: toNonNegativeInt(row.visitor_count),
    post_count: toNonNegativeInt(row.post_count),
    community_post_count: toNonNegativeInt(row.community_post_count),
    service_post_count: toNonNegativeInt(row.service_post_count),
    studio_post_count: toNonNegativeInt(row.studio_post_count)
  };
};

function DailyMetricsDonut({
  visitors,
  posts
}: {
  visitors: number;
  posts: number;
}) {
  const safeVisitors = Number.isFinite(visitors) ? Math.max(0, visitors) : 0;
  const safePosts = Number.isFinite(posts) ? Math.max(0, posts) : 0;
  const total = Math.max(1, safeVisitors + safePosts);
  const visitorRatio = safeVisitors / total;
  const postRatio = safePosts / total;
  const size = 208;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const visitorArc = circumference * visitorRatio;
  const postArc = circumference * postRatio;
  const postArcOffset = circumference - visitorArc;

  return (
    <div className="relative h-56 w-56 sm:h-60 sm:w-60">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 h-full w-full drop-shadow-[0_0_30px_rgba(56,189,248,0.18)]"
        role="img"
        aria-label={`방문자 ${safeVisitors}명, 게시글 ${safePosts}개`}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#38bdf8"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={`${visitorArc} ${circumference}`}
          strokeDashoffset={0}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f97316"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={`${postArc} ${circumference}`}
          strokeDashoffset={postArcOffset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-white/55">Daily Total</p>
        <p className="mt-1 text-3xl font-semibold text-white">{safeVisitors + safePosts}</p>
        <p className="mt-1 text-xs text-white/60">방문 + 게시글</p>
      </div>
    </div>
  );
}

export default function MyPageAdminPanel({ enabled }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('members');
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [studioPosts, setStudioPosts] = useState<AdminStudioPost[]>([]);
  const [servicePosts, setServicePosts] = useState<ServicePost[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetricsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRoleValue>>({});
  const [membershipTierDrafts, setMembershipTierDrafts] = useState<
    Record<string, StudioMembershipTierLevel>
  >({});
  const [memberProfileDrafts, setMemberProfileDrafts] = useState<
    Record<string, { name: string; phone: string; address: string }>
  >({});
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [busyServicePostId, setBusyServicePostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingServicePostId, setEditingServicePostId] = useState<string | null>(null);
  const [editingMemberProfileId, setEditingMemberProfileId] = useState<string | null>(null);
  const [postDrafts, setPostDrafts] = useState<
    Record<
      string,
      {
        title: string;
        content: string;
        image_url: string;
        required_membership_level: number;
      }
    >
  >({});
  const [servicePostDrafts, setServicePostDrafts] = useState<
    Record<string, AdminServicePostDraft>
  >({});
  const [serviceCreateOpen, setServiceCreateOpen] = useState(false);
  const [serviceCreateDraft, setServiceCreateDraft] = useState<AdminServiceCreateDraft>(
    emptyServiceCreateDraft
  );
  const [serviceCreateSubmitting, setServiceCreateSubmitting] = useState(false);
  const [serviceCreateContentUploading, setServiceCreateContentUploading] = useState(false);
  const [serviceCreateContentDragOver, setServiceCreateContentDragOver] = useState(false);
  const [serviceEditContentUploadingById, setServiceEditContentUploadingById] = useState<
    Record<string, boolean>
  >({});
  const [serviceEditContentDragOverById, setServiceEditContentDragOverById] = useState<
    Record<string, boolean>
  >({});
  const [memberOrdersModalOpen, setMemberOrdersModalOpen] = useState(false);
  const [memberOrdersLoading, setMemberOrdersLoading] = useState(false);
  const [memberOrdersError, setMemberOrdersError] = useState<string | null>(null);
  const [memberOrdersTarget, setMemberOrdersTarget] = useState<AdminMember | null>(null);
  const [memberOrders, setMemberOrders] = useState<OrderRecord[]>([]);
  const [memberOrdersTab, setMemberOrdersTab] = useState<MemberOrdersTabKey>('shipping_todo');
  const [studioSectionTab, setStudioSectionTab] = useState<StudioSectionTabKey>('list');
  const [selectedMemberOrder, setSelectedMemberOrder] = useState<OrderRecord | null>(null);
  const [memberOrderDetailOpen, setMemberOrderDetailOpen] = useState(false);
  const [memberOrderShippingSaving, setMemberOrderShippingSaving] = useState(false);
  const [memberOrderShippingError, setMemberOrderShippingError] = useState<string | null>(null);

  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const segmentedWrapClass = `flex min-w-max flex-wrap items-center gap-3 ${appleFontClass}`;
  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/25';

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const normalizeRequiredMembershipLevel = (value: unknown) => {
    const numeric =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim()
          ? Number(value)
          : 0;
    if (!Number.isFinite(numeric)) return 0;
    return Math.min(3, Math.max(0, Math.floor(numeric)));
  };

  const getStudioPostMembershipLabel = (level: number) => {
    if (level >= 3) return '프리미엄 멤버십';
    if (level >= 2) return '플러스 멤버십';
    if (level >= 1) return '베이직 멤버십';
    return '일반 공개';
  };

  const resolveMemberTierLevel = (member: AdminMember): StudioMembershipTierLevel => {
    const level = resolveStudioMembershipTierLevel({
      has_active_subscription: member.studio_membership?.has_active_subscription ?? false,
      selected_membership: member.studio_membership?.selected_membership ?? null,
      plan_amount: member.studio_membership?.plan_amount ?? null
    });
    return normalizeRequiredMembershipLevel(level) as StudioMembershipTierLevel;
  };

  const isShippingDoneBucket = useCallback((order: OrderRecord) => {
    const status = String(order.shipping_status || '')
      .trim()
      .toLowerCase();
    return status === 'delivered' || status === 'canceled' || status === 'returned';
  }, []);

  const memberOrdersGrouped = useMemo(() => {
    const shippingTodo: OrderRecord[] = [];
    const shippingDone: OrderRecord[] = [];

    for (const order of memberOrders) {
      if (isShippingDoneBucket(order)) {
        shippingDone.push(order);
      } else {
        shippingTodo.push(order);
      }
    }

    return { shippingTodo, shippingDone };
  }, [isShippingDoneBucket, memberOrders]);

  const activeMemberOrders =
    memberOrdersTab === 'shipping_done'
      ? memberOrdersGrouped.shippingDone
      : memberOrdersGrouped.shippingTodo;

  const hydrateFromResponse = useCallback((payload: DashboardResponse) => {
    const nextMembers = Array.isArray(payload?.data?.members) ? payload.data.members : [];
    const nextPosts = Array.isArray(payload?.data?.studio_posts)
      ? payload.data.studio_posts
      : [];
    const nextDailyMetrics = sanitizeDailyMetrics(payload?.data?.daily_metrics);

    setMembers(nextMembers);
    setStudioPosts(nextPosts);
    setDailyMetrics(nextDailyMetrics);
    setRoleDrafts(
      Object.fromEntries(nextMembers.map((member) => [member.id, member.role])) as Record<
        string,
        UserRoleValue
      >
    );
    setMembershipTierDrafts(
      Object.fromEntries(
        nextMembers.map((member) => [
          member.id,
          resolveStudioMembershipTierLevel({
            has_active_subscription: member.studio_membership?.has_active_subscription ?? false,
            selected_membership: member.studio_membership?.selected_membership ?? null,
            plan_amount: member.studio_membership?.plan_amount ?? null
          }) as StudioMembershipTierLevel
        ])
      ) as Record<string, StudioMembershipTierLevel>
    );
    setMemberProfileDrafts(
      Object.fromEntries(
        nextMembers.map((member) => [
          member.id,
          {
            name: member.name ?? member.full_name ?? '',
            phone: member.phone ?? '',
            address: member.address ?? ''
          }
        ])
      )
    );
    setPostDrafts(
      Object.fromEntries(
        nextPosts.map((post) => [
          post.id,
          {
            title: post.title ?? '',
            content: post.content ?? '',
            image_url: post.image_url ?? '',
            required_membership_level: normalizeRequiredMembershipLevel(
              post.required_membership_level
            )
          }
        ])
      )
    );
  }, []);

  const hydrateServicePosts = useCallback((rows: ServicePost[]) => {
    setServicePosts(rows);
    setServicePostDrafts(
      Object.fromEntries(
        rows.map((post) => [
          post.id,
          {
            title: post.title ?? '',
            category: post.category ?? '',
            summary: post.summary ?? '',
            content: post.content ?? '',
            price_from: post.price_from != null ? String(post.price_from) : '',
            currency: post.currency ?? 'KRW',
            is_published: Boolean(post.is_published),
            image_urls_text: (post.image_urls ?? []).join('\n')
          }
        ])
      )
    );
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const [dashboardResponse, servicePostsResponse] = await Promise.all([
        fetch('/api/admin/dashboard', { cache: 'no-store' }),
        fetch('/api/service-posts?all=true', { cache: 'no-store' })
      ]);

      const dashboardPayload = (await dashboardResponse.json()) as DashboardResponse;
      if (!dashboardResponse.ok) {
        throw new Error(dashboardPayload?.message || '관리자 데이터를 불러오지 못했습니다.');
      }
      hydrateFromResponse(dashboardPayload);
      const warningMessages = Object.values(dashboardPayload?.warnings ?? {})
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);
      if (warningMessages.length > 0) {
        setMessage(`일부 관리자 데이터가 제한적으로 로드되었습니다. ${warningMessages[0]}`);
      }

      const servicePayload = await servicePostsResponse.json().catch(() => ({}));
      if (!servicePostsResponse.ok) {
        throw new Error(servicePayload?.message || 'Service 게시글을 불러오지 못했습니다.');
      }
      const serviceRows = Array.isArray(servicePayload?.data)
        ? (servicePayload.data as ServicePost[])
        : [];
      hydrateServicePosts(serviceRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [enabled, hydrateFromResponse, hydrateServicePosts]);

  useEffect(() => {
    if (!enabled) return;
    fetchDashboard();
  }, [enabled, fetchDashboard]);

  const currentUserId = user?.id ?? null;

  const memberCountLabel = useMemo(() => `${members.length}명`, [members.length]);
  const studioPostCountLabel = useMemo(
    () => `${studioPosts.length}개`,
    [studioPosts.length]
  );
  const servicePostCountLabel = useMemo(
    () => `${servicePosts.length}개`,
    [servicePosts.length]
  );
  const dailyMetricsPostingRateLabel = useMemo(() => {
    if (!dailyMetrics) return '0.0%';
    const visitors = Math.max(0, Number(dailyMetrics.visitor_count || 0));
    const posts = Math.max(0, Number(dailyMetrics.post_count || 0));
    if (visitors <= 0) return posts > 0 ? '100.0%' : '0.0%';
    return `${((posts / visitors) * 100).toFixed(1)}%`;
  }, [dailyMetrics]);

  const handleRoleSave = async (member: AdminMember) => {
    const nextRole = roleDrafts[member.id] ?? member.role;
    if (nextRole === member.role) return;

    setBusyMemberId(member.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '역할 변경에 실패했습니다.');
      }

      setMembers((prev) =>
        prev.map((row) => (row.id === member.id ? { ...row, role: nextRole } : row))
      );
      setMessage('회원 역할을 변경했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 변경에 실패했습니다.');
      setRoleDrafts((prev) => ({ ...prev, [member.id]: member.role }));
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleMemberDelete = async (member: AdminMember) => {
    if (!window.confirm(`"${member.email ?? member.id}" 계정을 삭제할까요?`)) return;

    setBusyMemberId(member.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '회원 삭제에 실패했습니다.');
      }
      setMembers((prev) => prev.filter((row) => row.id !== member.id));
      setMessage('회원을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 삭제에 실패했습니다.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleMemberProfileDraftChange = (
    memberId: string,
    key: 'name' | 'phone' | 'address',
    value: string
  ) => {
    setMemberProfileDrafts((prev) => ({
      ...prev,
      [memberId]: {
        name: prev[memberId]?.name ?? '',
        phone: prev[memberId]?.phone ?? '',
        address: prev[memberId]?.address ?? '',
        [key]: value
      }
    }));
  };

  const handleMemberProfileSave = async (member: AdminMember) => {
    const draft = memberProfileDrafts[member.id] ?? {
      name: member.name ?? member.full_name ?? '',
      phone: member.phone ?? '',
      address: member.address ?? ''
    };

    const phone = draft.phone.trim();
    const address = draft.address.trim();

    if (phone && phone.length < 9) {
      setError('전화번호는 최소 9자 이상 입력해 주세요.');
      setMessage(null);
      return;
    }

    if (address && address.length < 5) {
      setError('주소는 최소 5자 이상 입력해 주세요.');
      setMessage(null);
      return;
    }

    setBusyMemberId(member.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          address: draft.address
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '회원 정보 수정에 실패했습니다.');
      }

      setMembers((prev) =>
        prev.map((row) =>
          row.id === member.id
            ? {
                ...row,
                name: draft.name.trim() || null,
                full_name: draft.name.trim() || null,
                phone: draft.phone.trim() || null,
                address: draft.address.trim() || null
              }
            : row
        )
      );
      setMessage('회원 정보를 수정했습니다.');
      setEditingMemberProfileId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원 정보 수정에 실패했습니다.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleStudioMembershipManage = async (member: AdminMember) => {
    const nextLevel = normalizeRequiredMembershipLevel(
      membershipTierDrafts[member.id] ?? resolveMemberTierLevel(member)
    ) as StudioMembershipTierLevel;
    const nextLabel = getStudioMembershipTierLabel(nextLevel);
    const confirmMessage =
      nextLevel > 0
        ? `"${member.email ?? member.id}" 회원의 Studio 멤버십을 ${nextLabel}(으)로 설정할까요?`
        : `"${member.email ?? member.id}" 회원의 Studio 멤버십을 해제할까요?`;

    if (!window.confirm(confirmMessage)) return;

    setBusyMemberId(member.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studio_membership_level: nextLevel
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Studio 멤버십 등급 변경에 실패했습니다.');
      }

      const nowIso = new Date().toISOString();
      setMembers((prev) =>
        prev.map((row) => {
          if (row.id !== member.id) return row;
          const tierOption =
            STUDIO_MEMBERSHIP_TIER_OPTIONS.find((option) => option.level === nextLevel) ??
            STUDIO_MEMBERSHIP_TIER_OPTIONS[0];
          const nextAmount = tierOption.priceKrw;
          return {
            ...row,
            studio_membership: {
              user_id: row.id,
              has_active_subscription: nextLevel > 0,
              subscription_id: nextLevel > 0 ? `manual:${row.id}` : null,
              subscription_status: nextLevel > 0 ? 'ACTIVE' : null,
              selected_membership: nextLevel > 0 ? getStudioMembershipTierLabel(nextLevel) : null,
              subscribed_at: nextLevel > 0 ? nowIso : null,
              next_billing_at: null,
              plan_id: nextLevel > 0 ? `manual_monthly_${nextAmount}` : null,
              plan_amount: nextAmount,
              plan_currency: nextLevel > 0 ? 'KRW' : null,
              plan_interval: nextLevel > 0 ? 'month' : null
            }
          };
        })
      );
      setMessage(
        nextLevel > 0
          ? `Studio 멤버십 등급을 ${nextLabel}(으)로 설정했습니다.`
          : 'Studio 멤버십을 해제했습니다.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Studio 멤버십 등급 변경에 실패했습니다.');
    } finally {
      setBusyMemberId(null);
    }
  };

  const closeMemberOrdersModal = () => {
    setMemberOrdersModalOpen(false);
    setMemberOrdersTarget(null);
    setMemberOrders([]);
    setMemberOrdersTab('shipping_todo');
    setMemberOrdersError(null);
    setMemberOrdersLoading(false);
    setSelectedMemberOrder(null);
    setMemberOrderDetailOpen(false);
    setMemberOrderShippingSaving(false);
    setMemberOrderShippingError(null);
  };

  const handleOpenMemberOrders = async (member: AdminMember) => {
    setMemberOrdersTarget(member);
    setMemberOrders([]);
    setMemberOrdersError(null);
    setMemberOrdersModalOpen(true);
    setMemberOrdersLoading(true);
    setMemberOrdersTab('shipping_todo');
    setSelectedMemberOrder(null);
    setMemberOrderDetailOpen(false);
    setMemberOrderShippingError(null);

    try {
      const response = await fetch(`/api/admin/users/${member.id}/orders`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '회원 주문 내역을 불러오지 못했습니다.');
      }
      const normalizedOrders = normalizeOrders(payload?.data);
      setMemberOrders(normalizedOrders);
      setMemberOrdersTab(
        normalizedOrders.some((order) => !isShippingDoneBucket(order)) ? 'shipping_todo' : 'shipping_done'
      );
    } catch (err) {
      setMemberOrdersError(
        err instanceof Error ? err.message : '회원 주문 내역을 불러오지 못했습니다.'
      );
    } finally {
      setMemberOrdersLoading(false);
    }
  };

  const handleSaveMemberOrderShipping = async (payload: {
    orderId: string;
    shippingCarrier: string;
    trackingNumber: string;
    shippingStatus: string;
  }) => {
    setMemberOrderShippingSaving(true);
    setMemberOrderShippingError(null);
    setError(null);

    try {
      const response = await fetch(`/api/admin/orders/${payload.orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_carrier: payload.shippingCarrier || null,
          tracking_number: payload.trackingNumber || null,
          shipping_status: payload.shippingStatus || null
        })
      });

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.message || '배송 정보 저장에 실패했습니다.');
      }

      const nextOrder = normalizeOrders(body?.data ? [body.data] : [])[0] ?? null;
      if (!nextOrder) {
        throw new Error('저장 후 주문 데이터를 불러오지 못했습니다.');
      }

      setMemberOrders((prev) => prev.map((row) => (row.id === nextOrder.id ? nextOrder : row)));
      setSelectedMemberOrder((prev) => (prev?.id === nextOrder.id ? nextOrder : prev));
      setMessage('배송 정보를 저장했습니다.');
    } catch (err) {
      setMemberOrderShippingError(
        err instanceof Error ? err.message : '배송 정보 저장에 실패했습니다.'
      );
    } finally {
      setMemberOrderShippingSaving(false);
    }
  };

  const handlePostDraftChange = (
    postId: string,
    key: 'title' | 'content' | 'image_url' | 'required_membership_level',
    value: string | number
  ) => {
    setPostDrafts((prev) => ({
      ...prev,
      [postId]: {
        title: prev[postId]?.title ?? '',
        content: prev[postId]?.content ?? '',
        image_url: prev[postId]?.image_url ?? '',
        required_membership_level: normalizeRequiredMembershipLevel(
          prev[postId]?.required_membership_level
        ),
        [key]:
          key === 'required_membership_level'
            ? normalizeRequiredMembershipLevel(value)
            : value
      }
    }));
  };

  const handleStudioPostSave = async (post: AdminStudioPost) => {
    const draft = postDrafts[post.id] ?? {
      title: post.title,
      content: post.content,
      image_url: post.image_url ?? '',
      required_membership_level: normalizeRequiredMembershipLevel(post.required_membership_level)
    };

    setBusyPostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/studio-posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '게시글 수정에 실패했습니다.');
      }

      const updated = payload?.data as AdminStudioPost | undefined;
      if (updated?.id) {
        setStudioPosts((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        setPostDrafts((prev) => ({
          ...prev,
          [updated.id]: {
            title: updated.title,
            content: updated.content,
            image_url: updated.image_url ?? '',
            required_membership_level: normalizeRequiredMembershipLevel(
              updated.required_membership_level
            )
          }
        }));
      }
      setMessage('Studio 게시글을 수정했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 수정에 실패했습니다.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleStudioPostDelete = async (post: AdminStudioPost) => {
    if (!window.confirm(`"${post.title}" 게시글을 삭제할까요?`)) return;

    setBusyPostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/studio-posts/${post.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '게시글 삭제에 실패했습니다.');
      }
      setStudioPosts((prev) => prev.filter((row) => row.id !== post.id));
      setMessage('Studio 게시글을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시글 삭제에 실패했습니다.');
    } finally {
      setBusyPostId(null);
    }
  };

  const handleServicePostDraftChange = (
    postId: string,
    key: keyof AdminServicePostDraft,
    value: string | boolean
  ) => {
    setServicePostDrafts((prev) => ({
      ...prev,
      [postId]: {
        title: prev[postId]?.title ?? '',
        category: prev[postId]?.category ?? '',
        summary: prev[postId]?.summary ?? '',
        content: prev[postId]?.content ?? '',
        price_from: prev[postId]?.price_from ?? '',
        currency: prev[postId]?.currency ?? 'KRW',
        is_published: prev[postId]?.is_published ?? true,
        image_urls_text: prev[postId]?.image_urls_text ?? '',
        [key]: value
      } as AdminServicePostDraft
    }));
  };

  const handleServiceCreateDraftChange = (
    key: keyof AdminServiceCreateDraft,
    value: string | boolean | File[]
  ) => {
    setServiceCreateDraft((prev) => ({
      title: prev.title,
      category: prev.category,
      summary: prev.summary,
      content: prev.content,
      price_from: prev.price_from,
      currency: prev.currency,
      is_published: prev.is_published,
      image_urls_text: prev.image_urls_text,
      files: prev.files,
      [key]: value
    }) as AdminServiceCreateDraft);
  };

  const resetServiceCreateDraft = () => {
    setServiceCreateDraft(emptyServiceCreateDraft());
    setServiceCreateContentDragOver(false);
    setServiceCreateContentUploading(false);
  };

  const handleServiceCreateFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    handleServiceCreateDraftChange('files', files);
  };

  const appendServiceContentImageUrls = (current: string, imageUrls: string[]) => {
    const normalizedUrls = imageUrls.map((url) => url.trim()).filter(Boolean);
    if (normalizedUrls.length === 0) return current;
    const suffix = normalizedUrls.join('\n');
    const trimmed = current.trimEnd();
    return trimmed ? `${trimmed}\n\n${suffix}` : suffix;
  };

  const uploadServiceContentImages = async (files: File[]) => {
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      throw new Error('이미지 파일만 드래그해서 업로드할 수 있습니다.');
    }

    const uploadForm = new FormData();
    imageFiles.forEach((file) => uploadForm.append('files', file));

    const uploadResponse = await fetch('/api/service-posts/upload', {
      method: 'POST',
      body: uploadForm
    });
    const uploadPayload = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) {
      throw new Error(uploadPayload?.message || 'Service 상세 이미지 업로드에 실패했습니다.');
    }

    const uploadedImageUrls = Array.isArray(uploadPayload?.data?.image_urls)
      ? (uploadPayload.data.image_urls as string[]).map((url) => String(url || '').trim()).filter(Boolean)
      : [];

    if (uploadedImageUrls.length === 0) {
      throw new Error('업로드된 이미지 URL을 확인하지 못했습니다.');
    }

    return uploadedImageUrls;
  };

  const handleServiceCreateContentDrop = async (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setServiceCreateContentDragOver(false);

    if (serviceCreateSubmitting || serviceCreateContentUploading) return;

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;

    setServiceCreateContentUploading(true);
    setError(null);
    setMessage(null);

    try {
      const uploadedImageUrls = await uploadServiceContentImages(files);
      setServiceCreateDraft((prev) => ({
        ...prev,
        content: appendServiceContentImageUrls(prev.content, uploadedImageUrls)
      }));
      setMessage(
        `상세 내용에 이미지 ${uploadedImageUrls.length}개를 추가했습니다. (한 줄 이미지 URL 형식)`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '상세 내용 이미지 업로드에 실패했습니다.');
    } finally {
      setServiceCreateContentUploading(false);
    }
  };

  const handleServiceEditContentDrop = async (
    postId: string,
    event: DragEvent<HTMLTextAreaElement>
  ) => {
    event.preventDefault();
    setServiceEditContentDragOverById((prev) => ({ ...prev, [postId]: false }));

    if (busyServicePostId === postId || serviceEditContentUploadingById[postId]) return;

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;

    setServiceEditContentUploadingById((prev) => ({ ...prev, [postId]: true }));
    setError(null);
    setMessage(null);

    try {
      const uploadedImageUrls = await uploadServiceContentImages(files);
      setServicePostDrafts((prev) => ({
        ...prev,
        [postId]: {
          title: prev[postId]?.title ?? '',
          category: prev[postId]?.category ?? '',
          summary: prev[postId]?.summary ?? '',
          content: appendServiceContentImageUrls(prev[postId]?.content ?? '', uploadedImageUrls),
          price_from: prev[postId]?.price_from ?? '',
          currency: prev[postId]?.currency ?? 'KRW',
          is_published: prev[postId]?.is_published ?? true,
          image_urls_text: prev[postId]?.image_urls_text ?? ''
        }
      }));
      setMessage(
        `상세 내용에 이미지 ${uploadedImageUrls.length}개를 추가했습니다. (한 줄 이미지 URL 형식)`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '상세 내용 이미지 업로드에 실패했습니다.');
    } finally {
      setServiceEditContentUploadingById((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleServicePostCreate = async () => {
    if (!serviceCreateDraft.title.trim()) {
      setError('Service 게시글 제목을 입력해 주세요.');
      setMessage(null);
      return;
    }
    if (serviceCreateContentUploading) {
      setError('상세 내용 이미지 업로드가 끝난 뒤 게시글을 업로드해 주세요.');
      setMessage(null);
      return;
    }

    setServiceCreateSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      let uploadedImageUrls: string[] = [];
      if (serviceCreateDraft.files.length > 0) {
        const uploadForm = new FormData();
        serviceCreateDraft.files.forEach((file) => uploadForm.append('files', file));

        const uploadResponse = await fetch('/api/service-posts/upload', {
          method: 'POST',
          body: uploadForm
        });
        const uploadPayload = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.message || 'Service 이미지 업로드에 실패했습니다.');
        }
        uploadedImageUrls = Array.isArray(uploadPayload?.data?.image_urls)
          ? uploadPayload.data.image_urls
          : [];
      }

      const manualImageUrls = serviceCreateDraft.image_urls_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const response = await fetch('/api/service-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: serviceCreateDraft.title.trim(),
          category: serviceCreateDraft.category.trim() || null,
          summary: serviceCreateDraft.summary.trim() || null,
          content: serviceCreateDraft.content.trim() || null,
          price_from: serviceCreateDraft.price_from ? Number(serviceCreateDraft.price_from) : null,
          currency: serviceCreateDraft.currency.trim() || 'KRW',
          is_published: serviceCreateDraft.is_published,
          image_urls: [...manualImageUrls, ...uploadedImageUrls]
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const serverMessage =
          typeof payload?.error?.message === 'string' ? payload.error.message : null;
        const serverDetails =
          typeof payload?.error?.details === 'string' ? payload.error.details : null;
        const mergedMessage = [payload?.message, serverMessage, serverDetails]
          .filter((value) => typeof value === 'string' && value.trim().length > 0)
          .join(' | ');
        throw new Error(mergedMessage || 'Service 게시글 생성에 실패했습니다.');
      }

      const created = payload?.data as ServicePost | undefined;
      if (created?.id) {
        setServicePosts((prev) => [created, ...prev.filter((row) => row.id !== created.id)]);
        setServicePostDrafts((prev) => ({
          ...prev,
          [created.id]: {
            title: created.title ?? '',
            category: created.category ?? '',
            summary: created.summary ?? '',
            content: created.content ?? '',
            price_from: created.price_from != null ? String(created.price_from) : '',
            currency: created.currency ?? 'KRW',
            is_published: Boolean(created.is_published),
            image_urls_text: (created.image_urls ?? []).join('\n')
          }
        }));
      } else {
        await fetchDashboard();
      }

      setEditingServicePostId(null);
      setServiceCreateOpen(false);
      resetServiceCreateDraft();
      setMessage('Service 게시글을 생성했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Service 게시글 생성에 실패했습니다.');
    } finally {
      setServiceCreateSubmitting(false);
    }
  };

  const handleServicePostSave = async (post: ServicePost) => {
    const draft = servicePostDrafts[post.id];
    if (!draft) return;
    if (serviceEditContentUploadingById[post.id]) {
      setError('상세 내용 이미지 업로드가 끝난 뒤 저장해 주세요.');
      setMessage(null);
      return;
    }

    setBusyServicePostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const imageUrls = draft.image_urls_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const response = await fetch(`/api/service-posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          category: draft.category.trim() || null,
          summary: draft.summary.trim() || null,
          content: draft.content.trim() || null,
          price_from: draft.price_from ? Number(draft.price_from) : null,
          currency: draft.currency.trim() || 'KRW',
          is_published: draft.is_published,
          image_urls: imageUrls
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Service 게시글 수정에 실패했습니다.');
      }

      const updated = payload?.data as ServicePost | undefined;
      if (updated?.id) {
        setServicePosts((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        setServicePostDrafts((prev) => ({
          ...prev,
          [updated.id]: {
            title: updated.title ?? '',
            category: updated.category ?? '',
            summary: updated.summary ?? '',
            content: updated.content ?? '',
            price_from: updated.price_from != null ? String(updated.price_from) : '',
            currency: updated.currency ?? 'KRW',
            is_published: Boolean(updated.is_published),
            image_urls_text: (updated.image_urls ?? []).join('\n')
          }
        }));
      }
      setMessage('Service 게시글을 수정했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Service 게시글 수정에 실패했습니다.');
    } finally {
      setBusyServicePostId(null);
    }
  };

  const handleServicePostDelete = async (post: ServicePost) => {
    if (!window.confirm(`"${post.title}" Service 게시글을 삭제할까요?`)) return;

    setBusyServicePostId(post.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/service-posts/${post.id}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Service 게시글 삭제에 실패했습니다.');
      }
      setServicePosts((prev) => prev.filter((row) => row.id !== post.id));
      setServicePostDrafts((prev) => {
        const next = { ...prev };
        delete next[post.id];
        return next;
      });
      setMessage('Service 게시글을 삭제했습니다.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Service 게시글 삭제에 실패했습니다.');
    } finally {
      setBusyServicePostId(null);
    }
  };

  if (!enabled) {
    return null;
  }

  return (
    <div className={`space-y-6 ${appleFontClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-white">관리자 패널</h3>
          <p className="mt-1 text-sm text-white/60">
            회원/서비스/스튜디오 관리와 일일 방문·게시글 지표를 마이페이지 안에서 바로 확인합니다.
          </p>
        </div>
        <ActionButton
          type="button"
          onClick={fetchDashboard}
          variant="primary"
          size="md"
          className={appleFontClass}
          disabled={loading}
        >
          {loading ? '불러오는 중…' : '새로고침'}
        </ActionButton>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className={segmentedWrapClass}>
          {[
            { key: 'members', label: `회원 관리 (${memberCountLabel})` },
            { key: 'service-posts', label: `서비스 섹션 관리 (${servicePostCountLabel})` },
            { key: 'studio-posts', label: `스튜디오 섹션 관리 (${studioPostCountLabel})` },
            { key: 'daily-metrics', label: '일일데이터' }
          ].map((tab) => (
            <PillTab
              key={tab.key}
              onClick={() => setActiveTab(tab.key as AdminTabKey)}
              active={activeTab === tab.key}
              className="whitespace-nowrap"
            >
              {tab.label}
            </PillTab>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          {message}
        </div>
      )}

      {activeTab === 'daily-metrics' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-6">
          {!dailyMetrics && !loading ? (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/65">
              일일 지표 데이터를 아직 불러오지 못했습니다.
            </div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="relative overflow-hidden rounded-3xl border border-sky-300/20 bg-gradient-to-br from-sky-500/15 via-cyan-500/10 to-orange-400/10 p-5">
                <div className="pointer-events-none absolute -left-16 -top-14 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 rounded-full bg-orange-400/15 blur-3xl" />
                <div className="relative">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/65">
                    일일 데이터
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    기준일: {dailyMetrics?.date ?? '-'} ({dailyMetrics?.timezone ?? 'Asia/Seoul'})
                  </p>
                  <div className="mt-4 flex justify-center">
                    <DailyMetricsDonut
                      visitors={dailyMetrics?.visitor_count ?? 0}
                      posts={dailyMetrics?.post_count ?? 0}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 content-start">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">오늘 방문자</p>
                  <p className="mt-1 text-3xl font-semibold text-sky-200">
                    {(dailyMetrics?.visitor_count ?? 0).toLocaleString('ko-KR')}
                    <span className="ml-1 text-base text-sky-100/80">명</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">오늘 게시글 작성</p>
                  <p className="mt-1 text-3xl font-semibold text-orange-200">
                    {(dailyMetrics?.post_count ?? 0).toLocaleString('ko-KR')}
                    <span className="ml-1 text-base text-orange-100/80">개</span>
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    방문 대비 작성률: <span className="font-semibold text-white">{dailyMetricsPostingRateLabel}</span>
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">게시글 구성</p>
                  <div className="mt-2 grid gap-2 text-sm text-white/85 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      커뮤니티 <span className="ml-1 font-semibold">{dailyMetrics?.community_post_count ?? 0}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      서비스 <span className="ml-1 font-semibold">{dailyMetrics?.service_post_count ?? 0}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      스튜디오 <span className="ml-1 font-semibold">{dailyMetrics?.studio_post_count ?? 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <div className="space-y-3">
            {members.length === 0 && !loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                등록된 회원이 없습니다.
              </div>
            ) : (
              members.map((member) => {
                const isSelf = currentUserId === member.id;
                const isBusy = busyMemberId === member.id;
                const protectedAdmin = member.is_protected_admin;
                const isEditingProfile = editingMemberProfileId === member.id;
                const studioMembership = member.studio_membership;
                const currentStudioTier = resolveMemberTierLevel(member);
                const draftStudioTier = (membershipTierDrafts[member.id] ??
                  currentStudioTier) as StudioMembershipTierLevel;
                const membershipTierChanged = draftStudioTier !== currentStudioTier;
                const memberProfileDraft = memberProfileDrafts[member.id] ?? {
                  name: member.name ?? member.full_name ?? '',
                  phone: member.phone ?? '',
                  address: member.address ?? ''
                };
                return (
                  <div
                    key={member.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium text-white">
                          {member.email ?? member.id}
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          이름: {member.name ?? member.full_name ?? '-'} · Stripe구독:{' '}
                          {member.subscription_status ?? 'none'}
                        </p>
                        <p className="mt-1 text-xs text-white/45">권한: {getUserRoleLabel(member.role)}</p>
                        <p className="mt-1 text-xs text-white/45">
                          가입: {formatDate(member.created_at)} · 최근 로그인:{' '}
                          {formatDate(member.last_sign_in_at)}
                        </p>
                        {(member.phone || member.address) && (
                          <p className="mt-1 text-xs text-white/45">
                            {member.phone ? `전화: ${member.phone}` : ''}{' '}
                            {member.address ? `· 주소: ${member.address}` : ''}
                          </p>
                        )}
                        <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                              Studio Membership
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                                studioMembership?.has_active_subscription
                                  ? 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100'
                                  : 'border-white/15 bg-white/5 text-white/70'
                              }`}
                            >
                              {studioMembership?.has_active_subscription ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                            {studioMembership?.subscription_status && (
                              <span className="text-[11px] text-white/60">
                                PayPal: {studioMembership.subscription_status}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-white/75">
                            현재 등급: {getStudioMembershipTierLabel(currentStudioTier)}
                          </p>
                          <p className="mt-1 text-xs text-white/70">
                            선택 멤버십: {studioMembership?.selected_membership ?? '미가입'}
                          </p>
                          <p className="mt-1 text-xs text-white/55">
                            구독 날짜: {formatDate(studioMembership?.subscribed_at ?? null)} · 결제예정일:{' '}
                            {formatDate(studioMembership?.next_billing_at ?? null)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <select
                          value={roleDrafts[member.id] ?? member.role}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [member.id]: normalizeUserRoleValue(e.target.value)
                            }))
                          }
                          className="h-9 rounded-full border border-white/20 bg-white/10 px-3 pr-8 text-sm font-medium text-white shadow-sm backdrop-blur-sm outline-none focus:ring-2 focus:ring-white/40"
                          disabled={isBusy || protectedAdmin}
                        >
                          {USER_ROLE_VALUES.map((roleValue) => (
                            <option key={`member-role-${member.id}-${roleValue}`} value={roleValue} className="bg-neutral-900">
                              {getUserRoleLabel(roleValue)}
                            </option>
                          ))}
                        </select>
                        <ActionButton
                          type="button"
                          onClick={() => handleRoleSave(member)}
                          variant="primary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy || protectedAdmin}
                        >
                          역할 변경
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() =>
                            setEditingMemberProfileId((prev) => (prev === member.id ? null : member.id))
                          }
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          {isEditingProfile ? '닫기' : '회원정보 수정'}
                        </ActionButton>
                        <select
                          value={String(draftStudioTier)}
                          onChange={(e) =>
                            setMembershipTierDrafts((prev) => ({
                              ...prev,
                              [member.id]: normalizeRequiredMembershipLevel(
                                e.target.value
                              ) as StudioMembershipTierLevel
                            }))
                          }
                          className="h-9 rounded-full border border-white/20 bg-white/10 px-3 pr-8 text-sm font-medium text-white shadow-sm backdrop-blur-sm outline-none focus:ring-2 focus:ring-white/40"
                          disabled={isBusy}
                        >
                          {STUDIO_MEMBERSHIP_TIER_OPTIONS.map((option) => (
                            <option
                              key={`member-tier-${member.id}-${option.level}`}
                              value={String(option.level)}
                              className="bg-neutral-900"
                            >
                              {option.level === 0
                                ? option.title
                                : `${option.title} (${option.description})`}
                            </option>
                          ))}
                        </select>
                        <ActionButton
                          type="button"
                          onClick={() => void handleStudioMembershipManage(member)}
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy || !membershipTierChanged}
                        >
                          {membershipTierChanged ? '멤버십 저장' : '멤버십 유지'}
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => void handleOpenMemberOrders(member)}
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          주문정보
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => handleMemberDelete(member)}
                          variant="destructive"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy || isSelf || protectedAdmin}
                          title={
                            isSelf
                              ? '현재 로그인한 계정은 삭제할 수 없습니다.'
                              : protectedAdmin
                                ? '보호된 관리자 계정입니다.'
                                : '회원 삭제'
                          }
                        >
                          삭제
                        </ActionButton>
                      </div>
                    </div>

                    {isEditingProfile && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              이름
                            </label>
                            <input
                              className={inputClass}
                              value={memberProfileDraft.name}
                              onChange={(e) =>
                                handleMemberProfileDraftChange(member.id, 'name', e.target.value)
                              }
                              disabled={isBusy}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              전화번호
                            </label>
                            <input
                              className={inputClass}
                              value={memberProfileDraft.phone}
                              onChange={(e) =>
                                handleMemberProfileDraftChange(member.id, 'phone', e.target.value)
                              }
                              placeholder="010-0000-0000"
                              disabled={isBusy}
                            />
                          </div>
                          <div className="grid gap-2 md:col-span-1">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              주소
                            </label>
                            <input
                              className={inputClass}
                              value={memberProfileDraft.address}
                              onChange={(e) =>
                                handleMemberProfileDraftChange(member.id, 'address', e.target.value)
                              }
                              placeholder="주소 입력"
                              disabled={isBusy}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <ActionButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingMemberProfileId(null)}
                            className={appleFontClass}
                            disabled={isBusy}
                          >
                            취소
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleMemberProfileSave(member)}
                            className={appleFontClass}
                            disabled={isBusy}
                          >
                            {isBusy ? '저장 중…' : '저장'}
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'studio-posts' && (
        <div className="overflow-x-auto pb-1">
          <div className={segmentedWrapClass}>
            {[
              { key: 'list', label: '게시글 목록/수정' },
              { key: 'create', label: '게시글 업로드' },
              { key: 'media', label: '추가 미디어(R2)' }
            ].map((tab) => (
              <PillTab
                key={tab.key}
                onClick={() => setStudioSectionTab(tab.key as StudioSectionTabKey)}
                active={studioSectionTab === tab.key}
                className="whitespace-nowrap"
              >
                {tab.label}
              </PillTab>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/45">
            `게시글 업로드`는 스튜디오 게시글 생성용, `추가 미디어(R2)`는 이미 만든 게시글에 영상/추가 이미지를 연결하는 고급 관리용입니다.
          </p>
        </div>
      )}

      {activeTab === 'studio-posts' && studioSectionTab === 'list' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <div className="mb-4 flex flex-col gap-1">
            <p className="text-sm font-medium text-white">스튜디오 섹션 관리</p>
            <p className="text-xs text-white/55">
              `studio_posts` 목록 관리(수정/삭제), 게시글 생성, R2 미디어 연결을 이 섹션에서 함께 처리합니다.
            </p>
          </div>
          <div className="space-y-3">
            {studioPosts.length === 0 && !loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                등록된 Studio 게시글이 없습니다.
              </div>
            ) : (
              studioPosts.map((post) => {
                const isBusy = busyPostId === post.id;
                const draft = postDrafts[post.id] ?? {
                  title: post.title,
                  content: post.content,
                  image_url: post.image_url ?? '',
                  required_membership_level: normalizeRequiredMembershipLevel(
                    post.required_membership_level
                  )
                };
                const currentMembershipLevel = normalizeRequiredMembershipLevel(
                  post.required_membership_level
                );

                return (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{post.title}</p>
                        <p className="mt-1 text-xs text-white/55">
                          작성자 ID: {post.user_id}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          생성일: {formatDate(post.created_at)}
                        </p>
                        <p className="mt-1 text-xs text-white/45">
                          접근 권한: {getStudioPostMembershipLabel(currentMembershipLevel)}
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <ActionButton
                          type="button"
                          onClick={() =>
                            setEditingPostId((prev) => (prev === post.id ? null : post.id))
                          }
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                        >
                          {editingPostId === post.id ? '닫기' : '수정'}
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => handleStudioPostDelete(post)}
                          variant="destructive"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          삭제
                        </ActionButton>
                      </div>
                    </div>

                    {editingPostId === post.id && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            제목
                          </label>
                          <input
                            className={inputClass}
                            value={draft.title}
                            onChange={(e) =>
                              handlePostDraftChange(post.id, 'title', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            접근 권한
                          </label>
                          <select
                            className={inputClass}
                            value={String(draft.required_membership_level)}
                            onChange={(e) =>
                              handlePostDraftChange(
                                post.id,
                                'required_membership_level',
                                e.target.value
                              )
                            }
                            disabled={isBusy}
                          >
                            <option value="0">일반 공개</option>
                            <option value="1">베이직 멤버십 (월 4,900원 이상)</option>
                            <option value="2">플러스 멤버십 (월 13,900원 이상)</option>
                            <option value="3">프리미엄 멤버십 (월 69,000원)</option>
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            이미지 URL
                          </label>
                          <input
                            className={inputClass}
                            value={draft.image_url}
                            onChange={(e) =>
                              handlePostDraftChange(post.id, 'image_url', e.target.value)
                            }
                            placeholder="https://..."
                            disabled={isBusy}
                          />
                        </div>
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            내용
                          </label>
                          <textarea
                            className={`${inputClass} min-h-28 resize-y`}
                            value={draft.content}
                            onChange={(e) =>
                              handlePostDraftChange(post.id, 'content', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>
                        <div className="flex justify-end">
                          <ActionButton
                            type="button"
                            onClick={() => handleStudioPostSave(post)}
                            variant="primary"
                            size="sm"
                            className={appleFontClass}
                            disabled={isBusy}
                          >
                            {isBusy ? '저장 중…' : '저장'}
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'studio-posts' && studioSectionTab === 'create' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <div className="mb-1">
            <p className="text-sm font-medium text-white">Studio 게시글 업로드</p>
            <p className="mt-1 text-xs text-white/55">
              스튜디오 섹션 메인 게시글(썸네일/본문/선택 동영상)을 생성합니다.
            </p>
          </div>
          <StudioPostForm />
        </div>
      )}

      {activeTab === 'studio-posts' && studioSectionTab === 'media' && (
        <StudioMediaAdminManager
          enabled={enabled}
          onRequestCreatePost={() => setStudioSectionTab('create')}
        />
      )}

      {activeTab === 'service-posts' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">서비스 섹션 관리</p>
              <p className="text-xs text-white/55">
                Services 섹션 게시글 업로드/수정/삭제를 이 탭에서 처리합니다.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ActionButton
                type="button"
                onClick={() => setServiceCreateOpen((prev) => !prev)}
                variant="primary"
                size="sm"
                className={appleFontClass}
                disabled={serviceCreateSubmitting || serviceCreateContentUploading}
              >
                {serviceCreateOpen ? '업로드 폼 닫기' : '새 Service 게시글'}
              </ActionButton>
              <ActionButton
                type="button"
                onClick={fetchDashboard}
                variant="secondary"
                size="sm"
                className={appleFontClass}
                disabled={loading}
              >
                새로고침
              </ActionButton>
            </div>
          </div>

          {serviceCreateOpen && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Service 게시글 업로드</p>
                  <p className="mt-1 text-xs text-white/50">
                    새 Service 게시글을 생성하고 이미지 URL/업로드 파일을 함께 등록합니다.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-white/50">제목</label>
                  <input
                    className={inputClass}
                    value={serviceCreateDraft.title}
                    onChange={(e) => handleServiceCreateDraftChange('title', e.target.value)}
                    placeholder="서비스 제목"
                    disabled={serviceCreateSubmitting}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                      카테고리
                    </label>
                    <select
                      className={inputClass}
                      value={serviceCreateDraft.category}
                      onChange={(e) => handleServiceCreateDraftChange('category', e.target.value)}
                      disabled={serviceCreateSubmitting}
                    >
                      {SERVICE_CATEGORIES.map((category) => (
                        <option key={category} value={category} className="bg-neutral-900">
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                      가격 시작
                    </label>
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={serviceCreateDraft.price_from}
                      onChange={(e) => handleServiceCreateDraftChange('price_from', e.target.value)}
                      placeholder="150000"
                      disabled={serviceCreateSubmitting}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                    요약
                  </label>
                  <input
                    className={inputClass}
                    value={serviceCreateDraft.summary}
                    onChange={(e) => handleServiceCreateDraftChange('summary', e.target.value)}
                    placeholder="카드에 표시될 짧은 요약"
                    disabled={serviceCreateSubmitting}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                    상세 내용
                  </label>
                  <textarea
                    className={`${inputClass} min-h-28 resize-y ${
                      serviceCreateContentDragOver
                        ? 'border-sky-300/50 bg-sky-500/10 ring-2 ring-sky-300/40'
                        : ''
                    }`}
                    value={serviceCreateDraft.content}
                    onChange={(e) => handleServiceCreateDraftChange('content', e.target.value)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      if (!serviceCreateContentDragOver) {
                        setServiceCreateContentDragOver(true);
                      }
                    }}
                    onDragLeave={() => setServiceCreateContentDragOver(false)}
                    onDrop={(event) => void handleServiceCreateContentDrop(event)}
                    placeholder="상세 설명"
                    disabled={serviceCreateSubmitting || serviceCreateContentUploading}
                  />
                  <p className="text-xs text-white/45">
                    {serviceCreateContentUploading
                      ? '이미지 업로드 중... 완료되면 상세 내용에 URL이 자동 추가됩니다.'
                      : '이미지를 이 칸으로 드래그하면 자동 업로드 후 상세 내용에 삽입됩니다.'}
                  </p>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                    이미지 URL 목록 (한 줄에 하나)
                  </label>
                  <textarea
                    className={`${inputClass} min-h-24 resize-y`}
                    value={serviceCreateDraft.image_urls_text}
                    onChange={(e) =>
                      handleServiceCreateDraftChange('image_urls_text', e.target.value)
                    }
                    placeholder="https://..."
                    disabled={serviceCreateSubmitting}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                    이미지 업로드
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleServiceCreateFilesChange}
                    className="block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border file:border-white/20 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                    disabled={serviceCreateSubmitting}
                  />
                  {serviceCreateDraft.files.length > 0 && (
                    <p className="text-xs text-white/50">
                      선택됨: {serviceCreateDraft.files.map((file) => file.name).join(', ')}
                    </p>
                  )}
                </div>

                <label className="flex items-center gap-2 text-sm text-white/85">
                  <input
                    type="checkbox"
                    checked={serviceCreateDraft.is_published}
                    onChange={(e) =>
                      handleServiceCreateDraftChange('is_published', e.target.checked)
                    }
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                    disabled={serviceCreateSubmitting}
                  />
                  게시글 공개
                </label>

                <div className="flex flex-wrap justify-end gap-2">
                  <ActionButton
                    type="button"
                    onClick={() => {
                      setServiceCreateOpen(false);
                      resetServiceCreateDraft();
                    }}
                    variant="secondary"
                    size="sm"
                    className={appleFontClass}
                    disabled={serviceCreateSubmitting || serviceCreateContentUploading}
                  >
                    취소
                  </ActionButton>
                  <ActionButton
                    type="button"
                    onClick={() => void handleServicePostCreate()}
                    variant="primary"
                    size="sm"
                    className={appleFontClass}
                    disabled={serviceCreateSubmitting || serviceCreateContentUploading}
                  >
                    {serviceCreateSubmitting ? '업로드 중…' : '게시글 업로드'}
                  </ActionButton>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {servicePosts.length === 0 && !loading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                등록된 Service 게시글이 없습니다.
              </div>
            ) : (
              servicePosts.map((post) => {
                const isBusy = busyServicePostId === post.id;
                const isEditing = editingServicePostId === post.id;
                const isContentUploading = Boolean(serviceEditContentUploadingById[post.id]);
                const isContentDragOver = Boolean(serviceEditContentDragOverById[post.id]);
                const draft = servicePostDrafts[post.id] ?? {
                  title: post.title ?? '',
                  category: post.category ?? '',
                  summary: post.summary ?? '',
                  content: post.content ?? '',
                  price_from: post.price_from != null ? String(post.price_from) : '',
                  currency: post.currency ?? 'KRW',
                  is_published: Boolean(post.is_published),
                  image_urls_text: (post.image_urls ?? []).join('\n')
                };

                return (
                  <div key={post.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{post.title}</p>
                        <p className="mt-1 text-xs text-white/55">
                          {post.category || '카테고리 없음'} · {post.is_published ? '공개' : '비공개'} · 수정{' '}
                          {formatDate(post.updated_at)}
                        </p>
                        {post.summary && (
                          <p className="mt-1 line-clamp-2 text-xs text-white/45">{post.summary}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <ActionButton
                          type="button"
                          onClick={() =>
                            setEditingServicePostId((prev) => (prev === post.id ? null : post.id))
                          }
                          variant="secondary"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          {isEditing ? '닫기' : '수정'}
                        </ActionButton>
                        <ActionButton
                          type="button"
                          onClick={() => handleServicePostDelete(post)}
                          variant="destructive"
                          size="sm"
                          className={appleFontClass}
                          disabled={isBusy}
                        >
                          삭제
                        </ActionButton>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            제목
                          </label>
                          <input
                            className={inputClass}
                            value={draft.title}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'title', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              카테고리
                            </label>
                            <input
                              className={inputClass}
                              value={draft.category}
                              onChange={(e) =>
                                handleServicePostDraftChange(post.id, 'category', e.target.value)
                              }
                              disabled={isBusy}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                              가격 시작
                            </label>
                            <input
                              className={inputClass}
                              type="number"
                              min={0}
                              value={draft.price_from}
                              onChange={(e) =>
                                handleServicePostDraftChange(post.id, 'price_from', e.target.value)
                              }
                              disabled={isBusy}
                            />
                          </div>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            요약
                          </label>
                          <input
                            className={inputClass}
                            value={draft.summary}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'summary', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            상세 내용
                          </label>
                          <textarea
                            className={`${inputClass} min-h-28 resize-y ${
                              isContentDragOver
                                ? 'border-sky-300/50 bg-sky-500/10 ring-2 ring-sky-300/40'
                                : ''
                            }`}
                            value={draft.content}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'content', e.target.value)
                            }
                            onDragOver={(event) => {
                              event.preventDefault();
                              if (!isContentDragOver) {
                                setServiceEditContentDragOverById((prev) => ({
                                  ...prev,
                                  [post.id]: true
                                }));
                              }
                            }}
                            onDragLeave={() =>
                              setServiceEditContentDragOverById((prev) => ({
                                ...prev,
                                [post.id]: false
                              }))
                            }
                            onDrop={(event) => void handleServiceEditContentDrop(post.id, event)}
                            disabled={isBusy || isContentUploading}
                          />
                          <p className="text-xs text-white/45">
                            {isContentUploading
                              ? '이미지 업로드 중... 완료되면 상세 내용에 URL이 자동 추가됩니다.'
                              : '이미지를 이 칸으로 드래그하면 자동 업로드 후 상세 내용에 삽입됩니다.'}
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <label className="text-xs uppercase tracking-[0.18em] text-white/50">
                            이미지 URL 목록 (한 줄에 하나)
                          </label>
                          <textarea
                            className={`${inputClass} min-h-24 resize-y`}
                            value={draft.image_urls_text}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'image_urls_text', e.target.value)
                            }
                            disabled={isBusy}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-white/85">
                          <input
                            type="checkbox"
                            checked={draft.is_published}
                            onChange={(e) =>
                              handleServicePostDraftChange(post.id, 'is_published', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-white/20 bg-white/10"
                            disabled={isBusy}
                          />
                          게시글 공개
                        </label>

                        <div className="flex justify-end">
                          <ActionButton
                            type="button"
                            onClick={() => handleServicePostSave(post)}
                            variant="primary"
                            size="sm"
                            className={appleFontClass}
                            disabled={isBusy || isContentUploading}
                          >
                            {isBusy ? '저장 중…' : '저장'}
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {memberOrdersModalOpen && (
        <div
          className="fixed inset-0 z-[84] bg-black/70 backdrop-blur-sm"
          onClick={closeMemberOrdersModal}
          aria-hidden="true"
        />
      )}
      {memberOrdersModalOpen && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="회원 주문 내역"
            className="w-full max-w-3xl rounded-3xl border border-white/10 bg-black/75 p-5 shadow-2xl backdrop-blur-xl md:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h4 className="text-base font-semibold tracking-tight text-white">
                  회원 주문 내역
                </h4>
                <p className="mt-1 break-all text-sm text-white/60">
                  {memberOrdersTarget?.email ?? memberOrdersTarget?.id ?? '-'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    memberOrdersTarget ? void handleOpenMemberOrders(memberOrdersTarget) : undefined
                  }
                  className={appleFontClass}
                  disabled={memberOrdersLoading || !memberOrdersTarget}
                >
                  {memberOrdersLoading ? '불러오는 중…' : '새로고침'}
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={closeMemberOrdersModal}
                  className={appleFontClass}
                >
                  닫기
                </ActionButton>
              </div>
            </div>

	            {memberOrdersError && (
              <div className="mb-4 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
                {memberOrdersError}
              </div>
	            )}

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <PillTab
                  onClick={() => setMemberOrdersTab('shipping_todo')}
                  active={memberOrdersTab === 'shipping_todo'}
                  className="whitespace-nowrap"
                >
                  배송해야될거 ({memberOrdersGrouped.shippingTodo.length})
                </PillTab>
                <PillTab
                  onClick={() => setMemberOrdersTab('shipping_done')}
                  active={memberOrdersTab === 'shipping_done'}
                  className="whitespace-nowrap"
                >
                  배송완료/종료 ({memberOrdersGrouped.shippingDone.length})
                </PillTab>
              </div>

	            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
	              <p className="text-xs text-white/50">주문 카드를 누르면 주문 상세가 열립니다.</p>
                  {memberOrdersTab === 'shipping_done' && (
                    <p className="text-xs text-white/40">배송완료 탭에는 반송/취소 주문도 함께 표시됩니다.</p>
                  )}
	              {!memberOrdersLoading && activeMemberOrders.length === 0 ? (
	                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
                      {memberOrders.length === 0
                        ? '주문 내역이 없습니다.'
                        : memberOrdersTab === 'shipping_todo'
                          ? '배송해야될 주문이 없습니다.'
                          : '배송완료/종료 주문이 없습니다.'}
	                </div>
	              ) : (
	                activeMemberOrders.map((order) => {
                  const firstItem = order.items[0];
                  const extraCount = Math.max(0, order.items.length - 1);
                  const contactName = order.customer_contact?.name?.trim() || null;
                  const contactPhone = order.customer_contact?.phone?.trim() || null;
                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setMemberOrderShippingError(null);
                        setSelectedMemberOrder(order);
                        setMemberOrderDetailOpen(true);
                      }}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusBadgeClass(order.status)}`}
                            >
                              {mapOrderStatusLabel(order.status)}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getShippingStatusBadgeClass(order.shipping_status)}`}
                            >
                              {mapShippingStatusLabel(order.shipping_status)}
                            </span>
                            <span className="text-xs text-white/55">
                              {formatOrderDate(order.created_at)}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-white">
                            {firstItem?.title ?? '주문 항목'}
                            {extraCount > 0 ? ` 외 ${extraCount}건` : ''}
                          </p>
                          <p className="mt-1 text-xs text-white/45">
                            주문번호 {order.id.slice(0, 8)}…
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            주문자 {contactName ?? '-'} {contactPhone ? `· ${contactPhone}` : ''}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            {order.shipping_carrier?.trim() ? order.shipping_carrier : '택배사 미입력'}
                            {order.tracking_number?.trim()
                              ? ` · 운송장 ${order.tracking_number}`
                              : ' · 운송장 미입력'}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm font-semibold text-white">
                            {formatOrderMoney(order.amount_total, order.currency || 'KRW')}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            항목 {order.items.length || 0}개
                          </p>
                          <p className="mt-1 text-xs font-medium text-white/70">주문상세 보기</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <OrderDetailModal
        open={memberOrderDetailOpen}
        onOpenChange={(next) => {
          setMemberOrderDetailOpen(next);
          if (!next) {
            setSelectedMemberOrder(null);
            setMemberOrderShippingError(null);
          }
        }}
        order={selectedMemberOrder}
        adminShippingEditable
        onSaveShipping={handleSaveMemberOrderShipping}
        shippingSavePending={memberOrderShippingSaving}
        shippingSaveError={memberOrderShippingError}
      />
    </div>
  );
}
