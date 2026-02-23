'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/context/AuthContext';
import { useCart, type CartItemInput } from '@/app/context/CartContext';
import { useToast } from '@/components/ui/Toasts/use-toast';
import { ToastAction } from '@/components/ui/Toasts/toast';
import { ServiceDetailModal } from './ServiceDetailModal';
import {
  SERVICE_CATEGORIES,
  categoryColorPresets,
  formatPriceFrom,
  isAdminUserLike,
  type ServicePost
} from '@/utils/service-posts';

const services = [
  // 녹음 카테고리
  {
    title: 'Studio Recording',
    subtitle: 'Professional Vocal Recording',
    description: '최고급 장비와 전문 엔지니어가 함께하는\n완벽한 레코딩 경험을 제공합니다.',
    price: '₩150,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBtaWNyb3Bob25lJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTY1MjE4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1a1a1a', '#4a4a4a', '#8a8a8a'],
  },
  {
    title: 'Premium Microphone',
    subtitle: 'High-End Condenser Mic',
    description: '프로페셔널 보컬 녹음을 위한\n최상급 콘덴서 마이크 제공',
    price: '₩120,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1745848413076-cdf1fa5d4d71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtaWNyb3Bob25lJTIwc3RhbmQlMjBzdHVkaW98ZW58MXx8fHwxNzY5Njc0Mjk3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a2a2a', '#5a5a5a', '#9a9a9a'],
  },
  {
    title: 'Audio Interface',
    subtitle: 'Professional Recording Interface',
    description: '고해상도 오디오 변환\n레이턴시 제로 모니터링',
    price: '₩180,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1760348213351-76638ffff25c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMGludGVyZmFjZSUyMHJlY29yZGluZyUyMGVxdWlwbWVudHxlbnwxfHx8fDE3Njk2NzQyOTh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3a3a3a', '#6a6a6a', '#aaaaaa'],
  },
  {
    title: 'Studio Headphones',
    subtitle: 'Reference Monitoring',
    description: '정확한 모니터링을 위한\n레퍼런스급 스튜디오 헤드폰',
    price: '₩90,000부터',
    category: '녹음',
    image: 'https://images.unsplash.com/photo-1737885197886-9e34a03ad226?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBoZWFkcGhvbmVzJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTYxNjkzN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1a1a2a', '#4a4a5a', '#8a8a9a'],
  },
  
  // 믹스/마스터 카테고리
  {
    title: 'Mixing & Mastering',
    subtitle: 'Expert Sound Engineering',
    description: '프로페셔널한 믹싱과 마스터링으로\n최상의 사운드 퀄리티를 완성합니다.',
    price: '₩200,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1622134955998-50a54e8b5d63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMG1peGluZyUyMGNvbnNvbGUlMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzY5Njc0MTUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a3a5a', '#4a5a7a', '#6a7a9a'],
  },
  {
    title: 'Analog Mixing',
    subtitle: 'Vintage Sound Character',
    description: '아날로그 장비로 만드는\n따뜻하고 풍부한 사운드',
    price: '₩250,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1622134955998-50a54e8b5d63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMG1peGluZyUyMGNvbnNvbGUlMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzY5Njc0MTUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3a4a6a', '#5a6a8a', '#7a8aaa'],
  },
  {
    title: 'Mastering Suite',
    subtitle: 'Final Polish & Enhancement',
    description: '최종 마스터링으로\n완벽한 사운드 밸런스 구현',
    price: '₩180,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1712303700832-57d2b2b916b8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdHVkaW8lMjBtb25pdG9yJTIwc3BlYWtlcnN8ZW58MXx8fHwxNzY5Njc0Mjk5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a3a4a', '#4a5a6a', '#6a7a8a'],
  },
  {
    title: 'Stem Mixing',
    subtitle: 'Flexible Mix Approach',
    description: '스템 단위 믹싱으로\n세밀한 컨트롤 제공',
    price: '₩220,000부터',
    category: '믹스/마스터',
    image: 'https://images.unsplash.com/photo-1622134955998-50a54e8b5d63?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdWRpbyUyMG1peGluZyUyMGNvbnNvbGUlMjBlcXVpcG1lbnR8ZW58MXx8fHwxNzY5Njc0MTUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#4a5a6a', '#6a7a8a', '#8a9aaa'],
  },
  
  // 더빙/성우 카테고리
  {
    title: 'Voice Over',
    subtitle: 'Multi-Language Dubbing',
    description: '다양한 언어의 더빙 및 후시 녹음\n전문 성우와 함께합니다.',
    price: '₩100,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1581650127213-e72e2271ff15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2ljZSUyMGFjdGluZyUyMGR1YmJpbmclMjBib290aHxlbnwxfHx8fDE3Njk2NzQxNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3a2a4a', '#5a4a6a', '#7a6a8a'],
  },
  {
    title: 'Character Voice',
    subtitle: 'Animation & Game Dubbing',
    description: '애니메이션과 게임을 위한\n캐릭터 보이스 연기',
    price: '₩130,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1581650127213-e72e2271ff15?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2b2ljZSUyMGFjdGluZyUyMGR1YmJpbmclMjBib290aHxlbnwxfHx8fDE3Njk2NzQxNTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#4a3a5a', '#6a5a7a', '#8a7a9a'],
  },
  {
    title: 'Commercial VO',
    subtitle: 'Advertisement Voice Over',
    description: '광고 내레이션과\nCM송 녹음 서비스',
    price: '₩80,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBtaWNyb3Bob25lJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTY1MjE4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#5a4a6a', '#7a6a8a', '#9a8aaa'],
  },
  {
    title: 'Audiobook Recording',
    subtitle: 'Professional Narration',
    description: '오디오북과 팟캐스트\n전문 내레이션 녹음',
    price: '₩110,000부터',
    category: '더빙/성우',
    image: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWNvcmRpbmclMjBzdHVkaW8lMjBtaWNyb3Bob25lJTIwcHJvZmVzc2lvbmNsfGVufDF8fHx8MTc2OTY1MjE4Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2a1a3a', '#4a3a5a', '#6a5a7a'],
  },
];

const categories = ['모든 제품', '녹음', '믹스/마스터', '더빙/성우'];

type ServiceCardItem = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  priceAmount: number | null;
  currency: string;
  category: string;
  image: string;
  colors: string[];
  images: string[];
};

type ServiceCreateFormState = {
  title: string;
  category: string;
  summary: string;
  content: string;
  price_from: string;
  currency: string;
  image_urls_text: string;
  files: File[];
  is_published: boolean;
};

const fallbackServices: ServiceCardItem[] = services.map((service, index) => {
  const parsedPrice = Number(service.price.replace(/[^\d]/g, ''));
  return {
    id: `fallback-${index}`,
    ...service,
    priceAmount: Number.isFinite(parsedPrice) && parsedPrice > 0 ? parsedPrice : null,
    currency: 'KRW',
    images: [service.image, service.image, service.image]
  };
});

const serviceSwatchBgClasses: Record<string, string> = {
  '#1a1a1a': 'bg-[#1a1a1a]',
  '#4a4a4a': 'bg-[#4a4a4a]',
  '#8a8a8a': 'bg-[#8a8a8a]',
  '#2a2a2a': 'bg-[#2a2a2a]',
  '#5a5a5a': 'bg-[#5a5a5a]',
  '#9a9a9a': 'bg-[#9a9a9a]',
  '#3a3a3a': 'bg-[#3a3a3a]',
  '#6a6a6a': 'bg-[#6a6a6a]',
  '#aaaaaa': 'bg-[#aaaaaa]',
  '#1a1a2a': 'bg-[#1a1a2a]',
  '#4a4a5a': 'bg-[#4a4a5a]',
  '#8a8a9a': 'bg-[#8a8a9a]',
  '#2a3a5a': 'bg-[#2a3a5a]',
  '#4a5a7a': 'bg-[#4a5a7a]',
  '#6a7a9a': 'bg-[#6a7a9a]',
  '#3a4a6a': 'bg-[#3a4a6a]',
  '#5a6a8a': 'bg-[#5a6a8a]',
  '#7a8aaa': 'bg-[#7a8aaa]',
  '#2a3a4a': 'bg-[#2a3a4a]',
  '#4a5a6a': 'bg-[#4a5a6a]',
  '#6a7a8a': 'bg-[#6a7a8a]',
  '#8a9aaa': 'bg-[#8a9aaa]',
  '#3a2a4a': 'bg-[#3a2a4a]',
  '#5a4a6a': 'bg-[#5a4a6a]',
  '#7a6a8a': 'bg-[#7a6a8a]',
  '#4a3a5a': 'bg-[#4a3a5a]',
  '#6a5a7a': 'bg-[#6a5a7a]',
  '#8a7a9a': 'bg-[#8a7a9a]',
  '#9a8aaa': 'bg-[#9a8aaa]',
  '#2a1a3a': 'bg-[#2a1a3a]',
};

type ServicesSectionProps = {
  onOpenCart?: () => void;
};

export default function ServicesSection({ onOpenCart }: ServicesSectionProps) {
  const { user } = useAuth();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState('모든 제품');
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isChanging, setIsChanging] = useState(false);
  const [isDraggingUi, setIsDraggingUi] = useState(false);
  const [serviceItems, setServiceItems] = useState<ServiceCardItem[]>(fallbackServices);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceCardItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<ServiceCreateFormState>({
    title: '',
    category: SERVICE_CATEGORIES[0],
    summary: '',
    content: '',
    price_from: '',
    currency: 'KRW',
    image_urls_text: '',
    files: [],
    is_published: true
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const appleFontClass =
    '[font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Helvetica,Arial,sans-serif]';
  const segmentedContainerClass = `inline-flex min-w-max items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md ${appleFontClass}`;
  const segmentedTabBaseClass = `rounded-full px-4 py-2 text-sm font-medium tracking-[0.2px] transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30`;
  const serviceSecondaryButtonClass = `h-11 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold tracking-[0.2px] text-white/90 no-underline shadow-sm backdrop-blur-md transition-all duration-200 ease-out hover:scale-[1.01] hover:bg-white/20 hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
  const servicePrimaryButtonClass = `h-11 rounded-full bg-white px-5 text-sm font-semibold tracking-[0.2px] text-black no-underline shadow-md transition-all duration-200 ease-out hover:scale-[1.01] hover:bg-neutral-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
  const arrowButtonClass = `size-11 rounded-full border border-white/20 bg-white/10 text-white/90 shadow-sm backdrop-blur-md transition-all duration-200 ease-out hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30`;
  const adminWriteButtonClass = `inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium tracking-[0.2px] text-white/90 backdrop-blur-md transition-colors duration-200 ease-out hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${appleFontClass}`;
  const createInputClass =
    'w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/25';
  const createLabelClass = `text-xs uppercase tracking-[0.18em] text-white/50 ${appleFontClass}`;
  const adminCloseButtonClass =
    'flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.15] bg-white/[0.08] text-white/90 backdrop-blur-md transition-colors duration-200 ease-in-out hover:bg-white/[0.18] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30';
  const isAdmin = isAdminUserLike(user);

  const getSwatchClass = (color: string) =>
    serviceSwatchBgClasses[color] ?? 'bg-white/30';

  const mapPostToCardItem = (post: Partial<ServicePost> & { id: string }): ServiceCardItem => {
    const images =
      Array.isArray(post.image_urls) && post.image_urls.length > 0
        ? post.image_urls.filter(Boolean)
        : ['https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'];
    const category = (post.category?.trim() || '녹음') as string;
    const summary = post.summary?.trim() || category;
    const content = post.content?.trim() || post.summary?.trim() || '서비스 설명이 준비 중입니다.';

    return {
      id: post.id,
      title: post.title?.trim() || 'Untitled Service',
      subtitle: summary,
      description: content,
      price: formatPriceFrom(post.price_from, post.currency || 'KRW'),
      priceAmount: typeof post.price_from === 'number' ? post.price_from : null,
      currency: post.currency || 'KRW',
      category,
      image: images[0],
      images,
      colors: categoryColorPresets[category] ?? ['#1a1a1a', '#4a4a4a', '#8a8a8a']
    };
  };

  const toCartItem = (service: ServiceCardItem): CartItemInput => ({
    id: service.id,
    type: 'service',
    title: service.title,
    image: service.image,
    price: service.priceAmount,
    currency: service.currency || 'KRW'
  });

  const handleAddToCart = (service: ServiceCardItem) => {
    addItem(toCartItem(service));
    toast({
      title: '장바구니에 담았습니다',
      description: `${service.title} (${service.price})`,
      action: onOpenCart ? (
        <ToastAction
          altText="장바구니 보기"
          onClick={() => {
            onOpenCart();
          }}
          className="rounded-full"
        >
          View cart
        </ToastAction>
      ) : undefined
    });
  };

  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const response = await fetch('/api/service-posts', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '서비스 목록을 불러오지 못했습니다.');
      }

      const rows = Array.isArray(payload?.data) ? (payload.data as ServicePost[]) : [];
      setServiceItems(rows.length > 0 ? rows.map(mapPostToCardItem) : []);
    } catch (error) {
      setServicesError(error instanceof Error ? error.message : '서비스 목록을 불러오지 못했습니다.');
      setServiceItems([]);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const resetCreateForm = () => {
    setCreateForm({
      title: '',
      category: SERVICE_CATEGORIES[0],
      summary: '',
      content: '',
      price_from: '',
      currency: 'KRW',
      image_urls_text: '',
      files: [],
      is_published: true
    });
  };

  const handleCreateFormFieldChange = (
    key: keyof ServiceCreateFormState,
    value: string | boolean | File[]
  ) => {
    setCreateForm((prev) => ({ ...prev, [key]: value } as ServiceCreateFormState));
  };

  const handleCreateFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setCreateForm((prev) => ({ ...prev, files }));
  };

  const handleSubmitCreatePost = async () => {
    if (!isAdmin) return;
    if (!createForm.title.trim()) {
      setCreateError('제목을 입력해 주세요.');
      setCreateMessage(null);
      return;
    }

    setCreateSubmitting(true);
    setCreateError(null);
    setCreateMessage(null);

    try {
      let uploadedImageUrls: string[] = [];
      if (createForm.files.length > 0) {
        const uploadForm = new FormData();
        createForm.files.forEach((file) => uploadForm.append('files', file));
        const uploadResponse = await fetch('/api/service-posts/upload', {
          method: 'POST',
          body: uploadForm
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadPayload?.message || '이미지 업로드에 실패했습니다.');
        }
        uploadedImageUrls = Array.isArray(uploadPayload?.data?.image_urls)
          ? uploadPayload.data.image_urls
          : [];
      }

      const manualUrls = createForm.image_urls_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const response = await fetch('/api/service-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: createForm.title.trim(),
          category: createForm.category || null,
          summary: createForm.summary.trim() || null,
          content: createForm.content.trim() || null,
          price_from: createForm.price_from ? Number(createForm.price_from) : null,
          currency: createForm.currency || 'KRW',
          is_published: createForm.is_published,
          image_urls: [...manualUrls, ...uploadedImageUrls]
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '게시글 생성에 실패했습니다.');
      }

      setCreateMessage('서비스 게시글을 생성했습니다.');
      resetCreateForm();
      setIsCreateModalOpen(false);
      await fetchServices();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '게시글 생성에 실패했습니다.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // 카테고리별 필터링
  const filteredServices = useMemo(() => {
    if (activeCategory === '모든 제품') {
      return serviceItems;
    }
    return serviceItems.filter(service => service.category === activeCategory);
  }, [activeCategory, serviceItems]);

  // 서비스 상세보기 열기
  const openServiceDetail = async (service: ServiceCardItem) => {
    setSelectedService(service);
    setDetailError(null);
    setDetailLoading(true);
    setIsModalOpen(true);

    try {
      const response = await fetch(`/api/service-posts/${service.id}`, {
        cache: 'no-store'
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '서비스 상세를 불러오지 못했습니다.');
      }
      const detail = payload?.data as ServicePost | undefined;
      if (detail?.id) {
        setSelectedService(mapPostToCardItem(detail));
      }
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : '서비스 상세를 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  // 서비스 상세보기 닫기
  const closeServiceDetail = () => {
    setIsModalOpen(false);
    setDetailLoading(false);
    setDetailError(null);
    setTimeout(() => {
      setSelectedService(null);
    }, 300);
  };

  // 카테고리 변경 핸들러
  const handleCategoryChange = (category: string) => {
    setIsChanging(true);
    setTimeout(() => {
      setActiveCategory(category);
      setScrollPosition(0);
      if (containerRef.current) {
        containerRef.current.scrollLeft = 0;
      }
      setTimeout(() => {
        setIsChanging(false);
      }, 50);
    }, 150);
  };

  // 마우스 드래그 이벤트
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    setIsDraggingUi(true);
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeft.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    setIsDraggingUi(false);
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    setIsDraggingUi(false);
  };

  // 스크롤 처리
  const handleScroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    
    const scrollAmount = 400;
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount);
    
    container.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = scrollPosition < (filteredServices.length * 300);

  return (
    <section id="services" className="relative bg-[#0a0a0a] text-white min-h-screen flex flex-col justify-center px-4 md:px-8 lg:px-16 py-20 max-w-full">
      <div className="max-w-7xl mx-auto w-full">
        {/* Title */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-4xl tracking-tight md:text-5xl">Services</h2>
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setCreateMessage(null);
                setIsCreateModalOpen(true);
              }}
              className={adminWriteButtonClass}
            >
              <Plus className="h-4 w-4" />
              게시물 작성
            </button>
          )}
        </div>
        
        {/* Category Tabs */}
        <div className="mb-12 overflow-x-auto pb-2">
          <div className={segmentedContainerClass}>
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleCategoryChange(category)}
                className={`${segmentedTabBaseClass} whitespace-nowrap ${
                  activeCategory === category
                    ? 'bg-white text-black shadow-sm hover:bg-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Services Carousel */}
        <div className="relative">
          {servicesError && (
            <div className="mb-6 rounded-2xl border border-red-300/20 bg-red-300/10 p-4 text-sm text-red-100">
              {servicesError}
            </div>
          )}

          {/* Desktop: Scrollable Row */}
          <div className={`hidden md:block relative transition-opacity duration-150 ${isChanging ? 'opacity-0' : 'opacity-100'}`}>
            {/* Left Arrow */}
            {canScrollLeft && (
              <button
                onClick={() => handleScroll('left')}
                className={`absolute left-0 top-1/2 z-10 -ml-6 -translate-y-1/2 ${arrowButtonClass}`}
                aria-label="이전 서비스"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            
            {/* Scrollable Container */}
            <div
              ref={containerRef}
              className={`scrollbar-hide flex gap-6 overflow-x-auto scroll-smooth ${
                isDraggingUi ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {!servicesLoading && filteredServices.length === 0 && (
                <div className="flex min-h-[360px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
                  등록된 서비스 게시글이 없습니다.
                </div>
              )}
              {filteredServices.map((service, index) => (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-[280px] flex flex-col bg-[#1a1a1a] rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-white/10 transition-all duration-300 ${
                    !isChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-full h-64 bg-[#0f0f0f] flex items-center justify-center p-8">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-contain"
                      draggable="false"
                    />
                  </div>
                  
                  {/* Color Options */}
                  <div className="flex gap-2 justify-center py-4">
                    {service.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className={`h-3 w-3 rounded-full border border-gray-600 ${getSwatchClass(color)}`}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="text-xl mb-1 tracking-tight text-white">{service.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{service.subtitle}</p>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4 whitespace-pre-line flex-1">
                      {service.description}
                    </p>
                    <p className="text-sm text-white mb-4">{service.price}</p>
                    
                    {/* Buttons */}
                    <div className="flex items-center gap-2.5">
                      <Button
                        type="button"
                        onClick={() => openServiceDetail(service)}
                        className={servicePrimaryButtonClass}
                      >
                        더 알아보기
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAddToCart(service)}
                        className={serviceSecondaryButtonClass}
                      >
                        장바구니 담기
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Right Arrow */}
            {canScrollRight && (
              <button
                onClick={() => handleScroll('right')}
                className={`absolute right-0 top-1/2 z-10 -mr-6 -translate-y-1/2 ${arrowButtonClass}`}
                aria-label="다음 서비스"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Mobile: Simple Scroll */}
          <div className={`md:hidden overflow-x-auto pb-4 transition-opacity duration-150 ${isChanging ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex gap-4">
              {!servicesLoading && filteredServices.length === 0 && (
                <div className="flex min-h-[280px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/70">
                  등록된 서비스 게시글이 없습니다.
                </div>
              )}
              {filteredServices.map((service, index) => (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-[280px] flex flex-col bg-[#1a1a1a] rounded-2xl overflow-hidden transition-all duration-300 ${
                    !isChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-full h-56 bg-[#0f0f0f] flex items-center justify-center p-6">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  {/* Color Options */}
                  <div className="flex gap-2 justify-center py-4">
                    {service.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className={`h-3 w-3 rounded-full border border-gray-600 ${getSwatchClass(color)}`}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl mb-1 tracking-tight text-white">{service.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{service.subtitle}</p>
                    <p className="text-xs text-gray-400 leading-relaxed mb-4 whitespace-pre-line">
                      {service.description}
                    </p>
                    <p className="text-sm text-white mb-4">{service.price}</p>
                    
                    {/* Buttons */}
                    <div className="flex items-center gap-2.5">
                      <Button
                        type="button"
                        onClick={() => openServiceDetail(service)}
                        className={servicePrimaryButtonClass}
                      >
                        더 알아보기
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAddToCart(service)}
                        className={serviceSecondaryButtonClass}
                      >
                        장바구니 담기
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {isAdmin && isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[72] flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            if (createSubmitting) return;
            setIsCreateModalOpen(false);
          }}
        >
          <div
            className={`w-full max-w-2xl rounded-3xl border border-white/10 bg-black/70 p-5 shadow-2xl backdrop-blur-xl md:p-6 ${appleFontClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">Services</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
                  게시물 작성
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Services 섹션용 새 게시글을 생성합니다.
                </p>
              </div>
              <button
                type="button"
                className={adminCloseButtonClass}
                onClick={() => !createSubmitting && setIsCreateModalOpen(false)}
                aria-label="작성 모달 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className={createLabelClass}>제목</label>
                <input
                  className={createInputClass}
                  value={createForm.title}
                  onChange={(e) => handleCreateFormFieldChange('title', e.target.value)}
                  placeholder="서비스 제목"
                  disabled={createSubmitting}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <label className={createLabelClass}>카테고리</label>
                  <select
                    className={createInputClass}
                    value={createForm.category}
                    onChange={(e) => handleCreateFormFieldChange('category', e.target.value)}
                    disabled={createSubmitting}
                  >
                    {SERVICE_CATEGORIES.map((category) => (
                      <option key={category} value={category} className="bg-neutral-900">
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className={createLabelClass}>가격 시작 (KRW)</label>
                  <input
                    className={createInputClass}
                    type="number"
                    min={0}
                    value={createForm.price_from}
                    onChange={(e) => handleCreateFormFieldChange('price_from', e.target.value)}
                    placeholder="150000"
                    disabled={createSubmitting}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label className={createLabelClass}>요약</label>
                <input
                  className={createInputClass}
                  value={createForm.summary}
                  onChange={(e) => handleCreateFormFieldChange('summary', e.target.value)}
                  placeholder="카드에 표시될 짧은 요약"
                  disabled={createSubmitting}
                />
              </div>

              <div className="grid gap-2">
                <label className={createLabelClass}>상세 내용</label>
                <textarea
                  className={`${createInputClass} min-h-32 resize-y`}
                  value={createForm.content}
                  onChange={(e) => handleCreateFormFieldChange('content', e.target.value)}
                  placeholder="상세 설명"
                  disabled={createSubmitting}
                />
              </div>

              <div className="grid gap-2">
                <label className={createLabelClass}>이미지 URL 목록 (한 줄에 하나)</label>
                <textarea
                  className={`${createInputClass} min-h-24 resize-y`}
                  value={createForm.image_urls_text}
                  onChange={(e) =>
                    handleCreateFormFieldChange('image_urls_text', e.target.value)
                  }
                  placeholder="https://..."
                  disabled={createSubmitting}
                />
              </div>

              <div className="grid gap-2">
                <label className={createLabelClass}>이미지 업로드</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleCreateFilesChange}
                  disabled={createSubmitting}
                  className="block w-full text-sm text-white/80 file:mr-3 file:rounded-full file:border file:border-white/15 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white/85 hover:file:bg-white/20"
                />
                {createForm.files.length > 0 && (
                  <p className="text-xs text-white/50">
                    선택됨: {createForm.files.map((file) => file.name).join(', ')}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={createForm.is_published}
                  onChange={(e) => handleCreateFormFieldChange('is_published', e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/10"
                  disabled={createSubmitting}
                />
                게시글 공개
              </label>

              {createError && (
                <div className="rounded-2xl border border-red-300/20 bg-red-300/10 p-3 text-sm text-red-100">
                  {createError}
                </div>
              )}
              {createMessage && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                  {createMessage}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={serviceSecondaryButtonClass}
                  disabled={createSubmitting}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCreatePost}
                  className={servicePrimaryButtonClass}
                  disabled={createSubmitting}
                >
                  {createSubmitting ? '저장 중…' : '게시글 생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Service Detail Modal */}
      <ServiceDetailModal 
        isOpen={isModalOpen} 
        service={selectedService} 
        onClose={closeServiceDetail} 
        isLoading={detailLoading}
        error={detailError}
        onAddToCart={handleAddToCart}
      />
    </section>
  );
}
