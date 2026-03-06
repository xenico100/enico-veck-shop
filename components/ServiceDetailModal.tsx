'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { parseServiceContentBlocks } from '@/utils/service-content';

interface ServiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: {
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
    images: string[]; // 여러 이미지를 위한 배열
    isPaidFile: boolean;
    filePriceAmount: number | null;
    downloadFileObjectKey: string | null;
    hasPurchasedPaidFile: boolean;
  } | null;
  isLoading?: boolean;
  error?: string | null;
  onAddToCart?: (service: NonNullable<ServiceDetailModalProps['service']>) => void;
  onPaidFileCheckout?: (service: NonNullable<ServiceDetailModalProps['service']>) => void;
  onPaidFileDownload?: (service: NonNullable<ServiceDetailModalProps['service']>) => void;
  paidFileDownloadPending?: boolean;
  formatMoneyExact?: (value: number | null | undefined, currency?: string) => string | null;
}

export function ServiceDetailModal({
  isOpen,
  onClose,
  service,
  isLoading = false,
  error = null,
  onAddToCart,
  onPaidFileCheckout,
  onPaidFileDownload,
  paidFileDownloadPending = false,
  formatMoneyExact
}: ServiceDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);

  // 이미지 배열 (없으면 기본 이미지 사용)
  const images = service?.images?.length
    ? service.images
    : service
      ? [service.image, service.image, service.image]
      : [];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setCurrentImageIndex(0);
      setSelectedColor(0);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const paidFilePriceText =
    service?.isPaidFile
      ? formatMoneyExact?.(service.filePriceAmount, service.currency) ?? service?.price ?? null
      : null;
  const contentBlocks = parseServiceContentBlocks(service?.description ?? '');

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-[#010811d6] backdrop-blur-sm transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed left-1/2 top-1/2 z-50 h-[min(88dvh,54rem)] w-[calc(100%-1rem)] max-w-[600px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-cyan-100/25 bg-[#041221f2] shadow-2xl transition-all duration-500 ease-out md:h-[85vh] md:rounded-3xl ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="relative h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-100/28 bg-cyan-200/12 text-cyan-50 shadow-md backdrop-blur-md transition-all duration-200 ease-out hover:bg-cyan-200/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/40 md:right-5 md:top-5 md:h-11 md:w-11"
            aria-label="닫기"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>

          {isLoading && (
            <div className="flex min-h-[50vh] items-center justify-center px-5 text-center sm:px-6">
              <div className="space-y-3">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-100/25 border-t-cyan-50" />
                <p className="text-sm text-cyan-50/72">서비스 정보를 불러오는 중입니다…</p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex min-h-[50vh] items-center justify-center px-5 text-center sm:px-6">
              <div className="space-y-2">
                <p className="text-base font-medium text-white">불러오기에 실패했습니다</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && service && (
            <>
          {/* Image Carousel */}
          <div className="group relative flex h-[min(42vh,20rem)] w-full items-center justify-center border-b border-cyan-100/15 bg-[#051423] sm:h-[360px] md:h-[500px]">
            <img
              src={images[currentImageIndex]}
              alt={service.title}
              className="h-full w-full object-contain p-3 transition-opacity duration-300 sm:p-4 md:p-8"
            />

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/25 bg-cyan-200/15 opacity-100 backdrop-blur-md transition-all hover:bg-cyan-200/25 md:left-4 md:h-10 md:w-10 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="h-4 w-4 text-cyan-50 md:h-5 md:w-5" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/25 bg-cyan-200/15 opacity-100 backdrop-blur-md transition-all hover:bg-cyan-200/25 md:right-4 md:h-10 md:w-10 md:opacity-0 md:group-hover:opacity-100"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="h-4 w-4 text-cyan-50 md:h-5 md:w-5" />
                </button>
              </>
            )}

            {/* Image Indicators */}
            {images.length > 1 && (
              <div className="absolute bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${
                      index === currentImageIndex ? 'w-5 bg-cyan-50 md:w-6' : 'bg-cyan-50/35'
                    }`}
                    aria-label={`이미지 ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 md:p-8">
            {/* Category */}
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-cyan-50/62">
              {service.category || '서비스'}
            </p>

            {/* Title */}
            <h2 className="mb-2 break-words text-2xl leading-none tracking-tight text-white sm:text-3xl md:text-4xl">{service.title}</h2>

            {/* Price */}
            <p className="mb-4 break-words text-lg text-white sm:text-xl">{service.price}</p>

            {/* Divider */}
            <div className="my-6 h-px w-full bg-cyan-100/20" />

            {/* Description */}
            <div className="mb-6">
              <div className="space-y-4">
                {contentBlocks.length === 0 ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-cyan-50/72">
                    상세 설명이 준비 중입니다.
                  </p>
                ) : (
                  contentBlocks.map((block, index) =>
                    block.type === 'image' ? (
                      <figure
                        key={`service-content-image-${index}`}
                        className="overflow-hidden rounded-xl border border-cyan-100/18 bg-[#03101b]"
                      >
                        <img
                          src={block.value}
                          alt={`${service.title} 상세 이미지 ${index + 1}`}
                          loading="lazy"
                          className="h-auto max-h-[520px] w-full object-contain"
                        />
                      </figure>
                    ) : (
                      <p
                        key={`service-content-text-${index}`}
                        className="whitespace-pre-line text-sm leading-relaxed text-cyan-50/72"
                      >
                        {block.value}
                      </p>
                    )
                  )
                )}
              </div>
              {service.subtitle ? (
                <p className="mt-3 text-xs text-cyan-50/52">
                  {service.subtitle}
                </p>
              ) : null}
            </div>

            {/* Color Selection */}
            <div className="mb-6">
              <p className="mb-3 text-sm text-cyan-50/62">색상</p>
              <div className="flex flex-wrap gap-3">
                {(service.colors ?? []).map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedColor(idx)}
                    className={`w-12 h-12 rounded-full border-2 transition-all ${
                      selectedColor === idx ? 'scale-110 border-cyan-50' : 'border-cyan-100/35'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`색상 ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* CTA Button */}
            {service.isPaidFile ? (
              service.hasPurchasedPaidFile ? (
                <button
                  type="button"
                  onClick={() => service && onPaidFileDownload?.(service)}
                  disabled={paidFileDownloadPending || !service.downloadFileObjectKey}
                  className="h-11 w-full rounded-full border border-cyan-100/32 bg-cyan-200/12 px-5 text-center text-sm font-semibold leading-tight tracking-[0.2px] text-cyan-50 shadow-md transition-all duration-200 ease-out hover:bg-cyan-200/22 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {paidFileDownloadPending ? '다운로드 링크 준비 중…' : '3D 파일 다운로드'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => service && onPaidFileCheckout?.(service)}
                  className="h-11 w-full rounded-full border border-amber-100/35 bg-amber-100/16 px-5 text-center text-sm font-semibold leading-tight tracking-[0.2px] text-amber-50 shadow-md transition-all duration-200 ease-out hover:bg-amber-100/26 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/45"
                >
                  {`결제하고 다운로드하기 (${paidFilePriceText ?? service.price})`}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => service && onAddToCart?.(service)}
                className="h-11 w-full rounded-full border border-amber-100/35 bg-amber-100/16 px-5 text-center text-sm font-semibold leading-tight tracking-[0.2px] text-amber-50 shadow-md transition-all duration-200 ease-out hover:bg-amber-100/26 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-100/45"
              >
                장바구니에 담기
              </button>
            )}
          </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
