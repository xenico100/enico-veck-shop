'use client';

import { useState, useMemo, useRef, useEffect, useCallback, type DragEvent } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PillTab from '@/components/ui/PillTab';
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
import { extractServiceContentText } from '@/utils/service-content';

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
  isPaidFile: boolean;
  filePriceAmount: number | null;
  downloadFileObjectKey: string | null;
  hasPurchasedPaidFile: boolean;
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
  is_paid_file: boolean;
  file_price: string;
  paid_download_file: File | null;
  is_published: boolean;
};

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
  const [serviceItems, setServiceItems] = useState<ServiceCardItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceCardItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createContentUploading, setCreateContentUploading] = useState(false);
  const [createContentDragOver, setCreateContentDragOver] = useState(false);
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
    is_paid_file: false,
    file_price: '',
    paid_download_file: null,
    is_published: true
  });
  const [paidFileDownloadPendingServiceId, setPaidFileDownloadPendingServiceId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const appleFontClass =
    '[font-family:var(--font-sans),"IBM Plex Sans KR","Pretendard",sans-serif]';
  const segmentedContainerClass = `flex min-w-max flex-wrap items-center gap-3 ${appleFontClass}`;
  const serviceSecondaryButtonClass = `y2k-button y2k-button-ghost h-11 flex-1 !min-h-11 !px-4 !text-[0.72rem] !tracking-[0.06em] ${appleFontClass}`;
  const servicePrimaryButtonClass = `y2k-button y2k-button-primary h-11 flex-1 !min-h-11 !px-5 !text-[0.72rem] !tracking-[0.06em] ${appleFontClass}`;
  const arrowButtonClass = 'y2k-button y2k-button-ghost y2k-button-icon size-11';
  const adminWriteButtonClass = `y2k-button y2k-button-ghost !min-h-10 !px-4 !text-[0.74rem] !tracking-[0.08em] ${appleFontClass}`;
  const createInputClass =
    'y2k-input w-full px-4 py-3 text-sm text-cyan-100 placeholder:text-cyan-100/40 outline-none';
  const createLabelClass = `text-xs uppercase tracking-[0.18em] text-cyan-100/55 ${appleFontClass}`;
  const adminCloseButtonClass =
    'y2k-button y2k-button-ghost y2k-button-icon';
  const isAdmin = isAdminUserLike(user);

  const getSwatchClass = (color: string) =>
    serviceSwatchBgClasses[color] ?? 'bg-white/30';

  const formatMoneyExact = (value: number | null | undefined, currency = 'KRW') => {
    if (value == null || Number.isNaN(value)) return null;
    try {
      return new Intl.NumberFormat(currency === 'KRW' ? 'ko-KR' : 'en-US', {
        style: 'currency',
        currency
      }).format(value);
    } catch {
      return `${value}`;
    }
  };

  const mapPostToCardItem = (
    post: Partial<ServicePost> & { id: string },
    options?: { hasPurchasedPaidFile?: boolean }
  ): ServiceCardItem => {
    const images =
      Array.isArray(post.image_urls) && post.image_urls.length > 0
        ? post.image_urls.filter(Boolean)
        : ['https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'];
    const category = (post.category?.trim() || '녹음') as string;
    const summary = post.summary?.trim() || category;
    const content = post.content?.trim() || post.summary?.trim() || '서비스 설명이 준비 중입니다.';
    const parsedFilePrice =
      typeof post.file_price === 'number'
        ? post.file_price
        : typeof post.file_price === 'string' && post.file_price.trim()
          ? Number(post.file_price)
          : null;

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
      colors: categoryColorPresets[category] ?? ['#1a1a1a', '#4a4a4a', '#8a8a8a'],
      isPaidFile: Boolean(post.is_paid_file),
      filePriceAmount: Number.isFinite(parsedFilePrice ?? NaN) ? parsedFilePrice : null,
      downloadFileObjectKey:
        typeof post.download_file_url === 'string' && post.download_file_url.trim()
          ? post.download_file_url.trim()
          : null,
      hasPurchasedPaidFile: Boolean(options?.hasPurchasedPaidFile)
    };
  };

  const toCartItem = (service: ServiceCardItem): CartItemInput => ({
    id: service.id,
    type: 'service',
    title: service.title,
    image: service.image,
    price: service.isPaidFile ? service.filePriceAmount ?? service.priceAmount : service.priceAmount,
    currency: service.currency || 'KRW'
  });

  const handleAddToCart = (service: ServiceCardItem) => {
    if (service.isPaidFile && !user) {
      toast({
        title: '로그인이 필요합니다',
        description: '유료 3D 파일은 로그인 후 결제해야 다운로드 권한을 저장할 수 있습니다.'
      });
      return;
    }

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
          className="!text-[0.72rem]"
        >
          장바구니 보기
        </ToastAction>
      ) : undefined
    });
  };

  const fetchServices = useCallback(async () => {
    setServicesLoading(true);
    setServicesError(null);
    try {
      const response = await fetch('/api/service-posts');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || '서비스 목록을 불러오지 못했습니다.');
      }

      const rows = Array.isArray(payload?.data) ? (payload.data as ServicePost[]) : [];
      setServiceItems(rows.length > 0 ? rows.map((row) => mapPostToCardItem(row)) : []);
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
      is_paid_file: false,
      file_price: '',
      paid_download_file: null,
      is_published: true
    });
    setCreateContentDragOver(false);
    setCreateContentUploading(false);
  };

  const handleCreateFormFieldChange = (
    key: keyof ServiceCreateFormState,
    value: string | boolean | File[] | File | null
  ) => {
    setCreateForm((prev) => ({ ...prev, [key]: value } as ServiceCreateFormState));
  };

  const handleCreateFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    setCreateForm((prev) => ({ ...prev, files }));
  };

  const handlePaidDownloadFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setCreateForm((prev) => ({ ...prev, paid_download_file: file }));
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
      throw new Error(uploadPayload?.message || '상세 내용 이미지 업로드에 실패했습니다.');
    }

    const uploadedImageUrls = Array.isArray(uploadPayload?.data?.image_urls)
      ? (uploadPayload.data.image_urls as string[]).map((url) => String(url || '').trim()).filter(Boolean)
      : [];

    if (uploadedImageUrls.length === 0) {
      throw new Error('업로드된 이미지 URL을 확인하지 못했습니다.');
    }

    return uploadedImageUrls;
  };

  const handleCreateContentDrop = async (event: DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setCreateContentDragOver(false);

    if (createSubmitting || createContentUploading) return;

    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;

    setCreateContentUploading(true);
    setCreateError(null);
    setCreateMessage(null);

    try {
      const uploadedImageUrls = await uploadServiceContentImages(files);
      setCreateForm((prev) => ({
        ...prev,
        content: appendServiceContentImageUrls(prev.content, uploadedImageUrls)
      }));
      setCreateMessage(
        `상세 내용에 이미지 ${uploadedImageUrls.length}개를 추가했습니다. (한 줄 이미지 URL 형식)`
      );
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '상세 내용 이미지 업로드에 실패했습니다.');
    } finally {
      setCreateContentUploading(false);
    }
  };

  const uploadServicePaidFileToR2 = async (servicePostId: string, file: File) => {
    const contentType = (file.type || '').trim().toLowerCase() || 'application/octet-stream';
    const presignResponse = await fetch('/api/r2/presign-put', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        servicePostId,
        filename: file.name,
        contentType,
        bytes: file.size,
        kind: 'file'
      })
    });

    const presignPayload = await presignResponse.json().catch(() => ({}));
    if (
      !presignResponse.ok ||
      typeof presignPayload?.r2_key !== 'string' ||
      typeof presignPayload?.uploadUrl !== 'string'
    ) {
      throw new Error(presignPayload?.message || '3D 파일 업로드 URL 발급에 실패했습니다.');
    }

    const putResponse = await fetch(presignPayload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file
    });

    if (!putResponse.ok) {
      throw new Error(`3D 파일 업로드 실패 (${putResponse.status})`);
    }

    return String(presignPayload.r2_key);
  };

  const handleSubmitCreatePost = async () => {
    if (!isAdmin) return;
    if (!createForm.title.trim()) {
      setCreateError('제목을 입력해 주세요.');
      setCreateMessage(null);
      return;
    }
    if (createContentUploading) {
      setCreateError('상세 내용 이미지 업로드가 끝난 뒤 게시글을 생성해 주세요.');
      setCreateMessage(null);
      return;
    }
    if (createForm.is_paid_file) {
      const filePrice = Number(createForm.file_price);
      if (!Number.isFinite(filePrice) || filePrice <= 0) {
        setCreateError('유료 3D 파일 가격을 입력해 주세요.');
        setCreateMessage(null);
        return;
      }
      if (!createForm.paid_download_file) {
        setCreateError('유료 3D 파일을 업로드해 주세요.');
        setCreateMessage(null);
        return;
      }
    }

    setCreateSubmitting(true);
    setCreateError(null);
    setCreateMessage(null);

    try {
      let createdServicePostId: string | null = null;
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
          is_paid_file: createForm.is_paid_file,
          file_price: createForm.is_paid_file ? Number(createForm.file_price) : null,
          download_file_url: null,
          is_published: createForm.is_published,
          image_urls: [...manualUrls, ...uploadedImageUrls]
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
        throw new Error(mergedMessage || '게시글 생성에 실패했습니다.');
      }
      createdServicePostId =
        payload?.data && typeof payload.data.id === 'string' ? payload.data.id : null;

      if (createForm.is_paid_file && createForm.paid_download_file && createdServicePostId) {
        const r2ObjectKey = await uploadServicePaidFileToR2(
          createdServicePostId,
          createForm.paid_download_file
        );
        const patchResponse = await fetch(`/api/service-posts/${createdServicePostId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_paid_file: true,
            file_price: Number(createForm.file_price),
            download_file_url: r2ObjectKey
          })
        });
        const patchPayload = await patchResponse.json().catch(() => ({}));
        if (!patchResponse.ok) {
          throw new Error(
            patchPayload?.message || '게시글은 생성되었지만 다운로드 파일 연결에 실패했습니다.'
          );
        }
      }

      setCreateMessage(
        createForm.is_paid_file
          ? '서비스 게시글과 유료 3D 다운로드 파일을 생성했습니다.'
          : '서비스 게시글을 생성했습니다.'
      );
      resetCreateForm();
      setIsCreateModalOpen(false);
      await fetchServices();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '게시글 생성에 실패했습니다.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleCheckoutPaidFile = (service: ServiceCardItem) => {
    if (!user) {
      toast({
        title: '로그인이 필요합니다',
        description: '유료 3D 파일 구매 후 다운로드를 위해 로그인한 상태에서 결제해 주세요.'
      });
      return;
    }

    addItem(toCartItem(service));
    toast({
      title: '결제 대기',
      description: `${service.title} 3D 파일을 장바구니에 담았습니다.`,
      action: onOpenCart ? (
        <ToastAction
          altText="장바구니 보기"
          onClick={() => {
            onOpenCart();
          }}
          className="!text-[0.72rem]"
        >
          장바구니 보기
        </ToastAction>
      ) : undefined
    });
    onOpenCart?.();
  };

  const handleDownloadPaidFile = async (service: ServiceCardItem) => {
    if (!service.id) return;
    setPaidFileDownloadPendingServiceId(service.id);

    try {
      const response = await fetch(`/api/service-posts/${service.id}/download`, {
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || '다운로드 링크를 발급하지 못했습니다.');
      }
      const url = typeof payload?.data?.url === 'string' ? payload.data.url : null;
      if (!url) {
        throw new Error('다운로드 URL이 비어 있습니다.');
      }

      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    } catch (error) {
      toast({
        title: '다운로드 실패',
        description: error instanceof Error ? error.message : '다운로드 링크 발급에 실패했습니다.',
        variant: 'destructive'
      });
    } finally {
      setPaidFileDownloadPendingServiceId(null);
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
      const viewerHasPaidFileAccess = Boolean(payload?.meta?.viewer_has_paid_file_access);
      if (detail?.id) {
        setSelectedService(
          mapPostToCardItem(detail, {
            hasPurchasedPaidFile: viewerHasPaidFileAccess
          })
        );
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

  const renderServiceSkeletonCards = (count: number, mobile = false) =>
    Array.from({ length: count }).map((_, index) => (
      <div
        key={`service-skeleton-${mobile ? 'm' : 'd'}-${index}`}
        className={`flex-shrink-0 w-[280px] overflow-hidden border-t border-white/10 pt-5 ${
          mobile ? '' : 'min-h-[420px]'
        }`}
        aria-hidden="true"
      >
        <div className={`${mobile ? 'h-56' : 'h-64'} w-full bg-white/5/40`} />
        <div className="flex justify-center gap-2 py-4">
          <div className="h-3 w-3 rounded-full bg-white/10" />
          <div className="h-3 w-3 rounded-full bg-white/10" />
          <div className="h-3 w-3 rounded-full bg-white/10" />
        </div>
        <div className="space-y-3 p-6">
          <div className="h-6 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/10" />
          <div className="h-4 w-full rounded bg-white/5" />
          <div className="h-4 w-5/6 rounded bg-white/5" />
          <div className="h-4 w-2/3 rounded bg-white/5" />
          <div className="mt-2 h-5 w-24 rounded bg-white/10" />
          <div className="flex gap-2.5 pt-1">
            <div className="h-11 flex-1 bg-white/10" />
            <div className="h-11 flex-1 bg-white/5" />
          </div>
        </div>
      </div>
    ));

  return (
    <section
      id="services"
      className="relative px-4 py-16 text-white md:px-8 md:py-24"
    >
      <div className="mx-auto w-full max-w-7xl tech-panel scanline animate-rise p-5 md:p-8">
        {/* Title */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">Services</p>
            <h2 className="section-title !mt-2 !text-[clamp(1.8rem,4vw,3rem)]">Service Matrix</h2>
          </div>
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
              <PillTab
                key={category}
                onClick={() => handleCategoryChange(category)}
                active={activeCategory === category}
                className="whitespace-nowrap"
              >
                {category}
              </PillTab>
            ))}
          </div>
        </div>
        
        {/* Services Carousel */}
        <div className="relative">
          {servicesError && (
            <div className="mb-6 rounded-2xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">
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
              {servicesLoading && renderServiceSkeletonCards(4)}
              {!servicesLoading && filteredServices.length === 0 && (
                <div className="flex min-h-[360px] w-full items-center justify-center border-t border-cyan-100/12 py-8 text-center text-cyan-50/75">
                  등록된 서비스 게시글이 없습니다.
                </div>
              )}
              {!servicesLoading && filteredServices.map((service, index) => {
                const previewDescription =
                  extractServiceContentText(service.description) || '상세 설명이 준비 중입니다.';
                return (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-[280px] flex flex-col overflow-hidden border-t border-cyan-200/16 pt-5 transition-all duration-300 hover:border-cyan-200/35 ${
                    !isChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  {/* Image */}
                  <div className="relative flex h-64 w-full items-center justify-center bg-transparent p-0">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-contain"
                      draggable="false"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  
                  {/* Color Options */}
                  <div className="flex justify-center gap-2 py-4">
                    {service.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className={`h-3 w-3 rounded-full border border-cyan-50/40 ${getSwatchClass(color)}`}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="flex flex-1 flex-col px-0 pb-0 pt-5">
                    <h3 className="text-xl mb-1 tracking-tight text-white">{service.title}</h3>
                    <p className="text-xs text-cyan-100/55 mb-3">{service.subtitle}</p>
                    <p className="text-xs text-cyan-50/68 leading-relaxed mb-4 whitespace-pre-line flex-1">
                      {previewDescription}
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
                );
              })}
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
              {servicesLoading && renderServiceSkeletonCards(2, true)}
              {!servicesLoading && filteredServices.length === 0 && (
                <div className="flex min-h-[280px] w-full items-center justify-center border-t border-cyan-100/12 py-6 text-center text-sm text-cyan-50/75">
                  등록된 서비스 게시글이 없습니다.
                </div>
              )}
              {!servicesLoading && filteredServices.map((service, index) => {
                const previewDescription =
                  extractServiceContentText(service.description) || '상세 설명이 준비 중입니다.';
                return (
                <div 
                  key={index} 
                  className={`flex-shrink-0 w-[280px] flex flex-col overflow-hidden border-t border-cyan-200/16 pt-5 transition-all duration-300 ${
                    !isChanging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  {/* Image */}
                  <div className="relative flex h-56 w-full items-center justify-center bg-transparent p-0">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  
                  {/* Color Options */}
                  <div className="flex justify-center gap-2 py-4">
                    {service.colors.map((color, idx) => (
                      <div
                        key={idx}
                        className={`h-3 w-3 rounded-full border border-cyan-50/40 ${getSwatchClass(color)}`}
                      />
                    ))}
                  </div>
                  
                  {/* Content */}
                  <div className="px-0 pb-0 pt-5">
                    <h3 className="text-xl mb-1 tracking-tight text-white">{service.title}</h3>
                    <p className="text-xs text-cyan-100/55 mb-3">{service.subtitle}</p>
                    <p className="text-xs text-cyan-50/68 leading-relaxed mb-4 whitespace-pre-line">
                      {previewDescription}
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
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {isAdmin && isCreateModalOpen && (
        <div
          className="fixed inset-0 z-[72] flex items-center justify-center bg-black/70 p-4"
          onClick={() => {
            if (createSubmitting || createContentUploading) return;
            setIsCreateModalOpen(false);
          }}
        >
          <div
            className={`w-full max-w-2xl rounded-[1.35rem] border border-cyan-100/18 bg-[#041221ee] p-5 shadow-[0_26px_70px_rgba(0,0,0,0.42)] backdrop-blur-xl md:p-6 ${appleFontClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-50/55">Services</p>
                <h3 className="display-font mt-2 text-lg font-medium tracking-[0.04em] text-white">
                  게시물 작성
                </h3>
                <p className="mt-1 text-sm text-cyan-50/68">
                  Services 섹션용 새 게시글을 생성합니다.
                </p>
              </div>
              <button
                type="button"
                className={adminCloseButtonClass}
                onClick={() =>
                  !(createSubmitting || createContentUploading) && setIsCreateModalOpen(false)
                }
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
                  className={`${createInputClass} min-h-32 resize-y ${
                    createContentDragOver
                      ? 'border-sky-300/50 bg-sky-500/10 ring-2 ring-sky-300/40'
                      : ''
                  }`}
                  value={createForm.content}
                  onChange={(e) => handleCreateFormFieldChange('content', e.target.value)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (!createContentDragOver) {
                      setCreateContentDragOver(true);
                    }
                  }}
                  onDragLeave={() => setCreateContentDragOver(false)}
                  onDrop={(event) => void handleCreateContentDrop(event)}
                  placeholder="상세 설명"
                  disabled={createSubmitting || createContentUploading}
                />
                <p className="text-xs text-cyan-50/55">
                  {createContentUploading
                    ? '이미지 업로드 중... 완료되면 상세 내용에 URL이 자동 추가됩니다.'
                    : '이미지를 이 칸으로 드래그하면 자동 업로드 후 상세 내용에 삽입됩니다.'}
                </p>
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
                  className="block w-full text-sm text-cyan-50/82"
                />
                {createForm.files.length > 0 && (
                  <p className="text-xs text-cyan-50/55">
                    선택됨: {createForm.files.map((file) => file.name).join(', ')}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-cyan-100/20 bg-cyan-200/10 p-4">
                <label className="flex items-center gap-2 text-sm text-cyan-50/82">
                  <input
                    type="checkbox"
                    checked={createForm.is_paid_file}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCreateForm((prev) => ({
                        ...prev,
                        is_paid_file: checked,
                        ...(checked
                          ? {}
                          : {
                              file_price: '',
                              paid_download_file: null
                            })
                      }));
                    }}
                    className="h-4 w-4 rounded border-cyan-100/25 bg-cyan-200/10"
                    disabled={createSubmitting}
                  />
                  유료 3D 파일 포함
                </label>
                <p className="mt-2 text-xs text-cyan-50/55">
                  체크 시 결제 완료 사용자에게만 3D 파일 다운로드 버튼이 노출됩니다.
                </p>

                {createForm.is_paid_file && (
                  <div className="mt-4 grid gap-4">
                    <div className="grid gap-2 md:max-w-sm">
                      <label className={createLabelClass}>파일 가격 ({createForm.currency || 'KRW'})</label>
                      <input
                        className={createInputClass}
                        type="number"
                        min={0}
                        step="0.01"
                        value={createForm.file_price}
                        onChange={(e) => handleCreateFormFieldChange('file_price', e.target.value)}
                        placeholder={createForm.currency === 'USD' ? '19.99' : '4900'}
                        disabled={createSubmitting}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className={createLabelClass}>파일 업로드 (R2 / 3D 파일)</label>
                      <input
                        type="file"
                        onChange={handlePaidDownloadFileChange}
                        disabled={createSubmitting}
                        className="block w-full text-sm text-cyan-50/82"
                      />
                      <p className="text-xs text-cyan-50/55">
                        {createForm.paid_download_file
                          ? `선택됨: ${createForm.paid_download_file.name} · ${createForm.paid_download_file.type || 'unknown'} · ${createForm.paid_download_file.size.toLocaleString()} bytes`
                          : '게시글 생성 후 Presigned PUT으로 R2에 업로드되고 object key가 저장됩니다.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-cyan-50/82">
                <input
                  type="checkbox"
                  checked={createForm.is_published}
                  onChange={(e) => handleCreateFormFieldChange('is_published', e.target.checked)}
                  className="h-4 w-4 rounded border-cyan-100/25 bg-cyan-200/10"
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
                <div className="rounded-2xl border border-cyan-100/20 bg-cyan-200/10 p-3 text-sm text-cyan-50/82">
                  {createMessage}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className={serviceSecondaryButtonClass}
                  disabled={createSubmitting || createContentUploading}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmitCreatePost}
                  className={servicePrimaryButtonClass}
                  disabled={createSubmitting || createContentUploading}
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
        onPaidFileCheckout={handleCheckoutPaidFile}
        onPaidFileDownload={handleDownloadPaidFile}
        paidFileDownloadPending={
          Boolean(selectedService?.id) && paidFileDownloadPendingServiceId === selectedService?.id
        }
        formatMoneyExact={formatMoneyExact}
      />
    </section>
  );
}
