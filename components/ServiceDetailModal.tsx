'use client';

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] md:w-[600px] max-w-[95vw] h-[85vh] md:max-h-[85vh] bg-[#0a0a0a] z-50 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ease-out ${
          isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="relative h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 shadow-md backdrop-blur-md transition-all duration-200 ease-out hover:bg-white/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:right-5 md:top-5"
            aria-label="닫기"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>

          {isLoading && (
            <div className="flex h-[70vh] items-center justify-center px-6 text-center">
              <div className="space-y-3">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                <p className="text-sm text-white/70">서비스 정보를 불러오는 중입니다…</p>
              </div>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex h-[70vh] items-center justify-center px-6 text-center">
              <div className="space-y-2">
                <p className="text-base font-medium text-white">불러오기에 실패했습니다</p>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && service && (
            <>
          {/* Image Carousel */}
          <div className="relative w-full h-[250px] md:h-[500px] bg-[#1a1a1a] flex items-center justify-center group">
            <img
              src={images[currentImageIndex]}
              alt={service.title}
              className="w-full h-full object-contain p-4 md:p-8 transition-opacity duration-300"
            />

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
                  aria-label="이전 이미지"
                >
                  <ChevronLeft className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
                  aria-label="다음 이미지"
                >
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
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
                      index === currentImageIndex ? 'bg-white w-5 md:w-6' : 'bg-white/40'
                    }`}
                    aria-label={`이미지 ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* Category */}
            <p className="text-xs text-red-500 mb-2 uppercase tracking-wide">
              {service.category || '서비스'}
            </p>

            {/* Title */}
            <h2 className="text-3xl md:text-4xl mb-2 tracking-tight text-white">{service.title}</h2>

            {/* Price */}
            <p className="text-xl text-white mb-4">{service.price}</p>

            {/* Divider */}
            <div className="w-full h-px bg-gray-800 my-6" />

            {/* Description */}
            <div className="mb-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
                {service.description}
              </p>
              {service.subtitle ? (
                <p className="mt-3 text-xs text-gray-500">
                  {service.subtitle}
                </p>
              ) : null}
            </div>

            {/* Color Selection */}
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">색상</p>
              <div className="flex gap-3">
                {(service.colors ?? []).map((color, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedColor(idx)}
                    className={`w-12 h-12 rounded-full border-2 transition-all ${
                      selectedColor === idx ? 'border-white scale-110' : 'border-gray-600'
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
                  className="h-11 w-full rounded-full border border-white/15 bg-white px-5 text-sm font-semibold tracking-[0.2px] text-black shadow-md transition-all duration-200 ease-out hover:bg-neutral-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paidFileDownloadPending ? '다운로드 링크 준비 중…' : '3D 파일 다운로드'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => service && onPaidFileCheckout?.(service)}
                  className="h-11 w-full rounded-full border border-white/15 bg-white px-5 text-sm font-semibold tracking-[0.2px] text-black shadow-md transition-all duration-200 ease-out hover:bg-neutral-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  {`결제하고 다운로드하기 (${paidFilePriceText ?? service.price})`}
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => service && onAddToCart?.(service)}
                className="h-11 w-full rounded-full border border-white/15 bg-white px-5 text-sm font-semibold tracking-[0.2px] text-black shadow-md transition-all duration-200 ease-out hover:bg-neutral-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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
