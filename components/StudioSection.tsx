'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Pause, Play, X } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

type StudioPost = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string | null;
};

const ITEMS_PER_ROW = 7;

const formatStudioDate = (value: string | null) => {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

export default function StudioSection() {
  const supabase = useMemo(() => createClient(), []);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [studioPosts, setStudioPosts] = useState<StudioPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<StudioPost | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredRowRef = useRef<number | null>(null);
  const animationFrameIds = useRef<number[]>([]);

  const totalRows = Math.ceil(studioPosts.length / ITEMS_PER_ROW);
  const hasPosts = studioPosts.length > 0;

  useEffect(() => {
    let isMounted = true;

    const fetchStudioPosts = async () => {
      setPostsLoading(true);
      setPostsError(null);

      try {
        const { data, error } = await (supabase as never)
          .from('studio_posts')
          .select('id,title,content,image_url,created_at')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (!isMounted) return;

        setStudioPosts(Array.isArray(data) ? (data as StudioPost[]) : []);
      } catch (error) {
        if (!isMounted) return;

        setStudioPosts([]);
        setPostsError(
          error instanceof Error ? error.message : '스튜디오 게시물을 불러오지 못했습니다.'
        );
      } finally {
        if (isMounted) {
          setPostsLoading(false);
        }
      }
    };

    void fetchStudioPosts();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getRowSpeed = useCallback(
    (rowIndex: number) => {
      const speeds = [0.5, 0.7, 0.6, 0.8, 0.55, 0.65, 0.75];
      const baseSpeed = speeds[rowIndex % speeds.length];
      return isMobile ? baseSpeed * 0.55 : baseSpeed;
    },
    [isMobile]
  );

  useEffect(() => {
    animationFrameIds.current.forEach((frameId) => cancelAnimationFrame(frameId));
    animationFrameIds.current = [];

    if (!isPlaying || totalRows === 0) return;

    const animateRow = (ref: HTMLDivElement | null, baseSpeed: number, rowNumber: number) => {
      if (!ref) return;

      let position = 0;
      let currentSpeed = baseSpeed;

      const animate = () => {
        if (!ref) return;

        const targetSpeed = hoveredRowRef.current === rowNumber ? 0 : baseSpeed;
        const speedDiff = targetSpeed - currentSpeed;
        currentSpeed += speedDiff * 0.05;

        if (Math.abs(currentSpeed) < 0.01 && targetSpeed === 0) {
          currentSpeed = 0;
        }

        position -= currentSpeed;

        const itemWidth = ref.scrollWidth / 2;
        if (Math.abs(position) >= itemWidth) {
          position = 0;
        }

        ref.style.transform = `translateX(${position}px)`;

        const frameId = requestAnimationFrame(animate);
        animationFrameIds.current.push(frameId);
      };

      animate();
    };

    rowRefs.current = rowRefs.current.slice(0, totalRows);

    rowRefs.current.forEach((ref, index) => {
      if (ref) {
        animateRow(ref, getRowSpeed(index), index);
      }
    });

    return () => {
      animationFrameIds.current.forEach((frameId) => cancelAnimationFrame(frameId));
      animationFrameIds.current = [];
    };
  }, [isPlaying, totalRows, getRowSpeed]);

  useEffect(() => {
    if (!selectedPost) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedPost(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPost]);

  const handleRowMouseEnter = (rowNumber: number) => {
    hoveredRowRef.current = rowNumber;
  };

  const handleRowMouseLeave = () => {
    hoveredRowRef.current = null;
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const openStudioPost = (post: StudioPost) => {
    hoveredRowRef.current = null;
    setSelectedPost(post);
  };

  const renderRow = (rowIndex: number) => {
    const startIdx = rowIndex * ITEMS_PER_ROW;
    const endIdx = startIdx + ITEMS_PER_ROW;
    const items = studioPosts.slice(startIdx, endIdx);

    if (items.length === 0) return null;

    const duplicatedItems = [...items, ...items];

    return (
      <div
        key={rowIndex}
        className="mb-4 overflow-hidden"
        onMouseEnter={() => handleRowMouseEnter(rowIndex)}
        onMouseLeave={handleRowMouseLeave}
      >
        <div
          ref={(el) => {
            rowRefs.current[rowIndex] = el;
          }}
          className="flex gap-4"
          style={{ width: 'fit-content' }}
        >
          {duplicatedItems.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              onClick={() => openStudioPost(item)}
              className="group relative h-[130px] w-[220px] flex-shrink-0 overflow-hidden rounded-lg text-left md:h-[240px] md:w-[400px] md:rounded-2xl"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.title ?? 'Studio post image'}
                  className="h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-neutral-900 text-xs uppercase tracking-[0.24em] text-neutral-500 md:text-sm">
                  No Image
                </div>
              )}

              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
                style={{
                  backdropFilter: 'blur(0px)',
                  WebkitBackdropFilter: 'blur(0px)',
                  background: 'radial-gradient(circle, transparent 0%, rgba(0,0,0,0.3) 100%)'
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    maskImage: 'radial-gradient(circle, transparent 30%, black 70%)',
                    WebkitMaskImage: 'radial-gradient(circle, transparent 30%, black 70%)'
                  }}
                />
              </div>

              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 transition-opacity duration-500 md:p-6">
                <p className="mb-0.5 text-[9px] text-gray-400 md:mb-1 md:text-xs">
                  {item.created_at ? formatStudioDate(item.created_at) : 'Studio'}
                </p>
                <h3 className="text-sm font-medium text-white md:text-xl">
                  {item.title?.trim() || 'Untitled Post'}
                </h3>
              </div>

              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100">
                <span className="translate-y-8 rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-black transition-all duration-300 group-hover:translate-y-0 md:px-6 md:py-3 md:text-sm">
                  알아보기
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <section
        id="studio"
        className="relative flex min-h-screen max-w-full flex-col justify-center overflow-hidden bg-black py-20 text-white"
      >
        <div className="mb-12 px-4 md:px-8 lg:px-16">
          <h2 className="text-4xl tracking-tight md:text-5xl">Studio</h2>
        </div>

        <div className="mb-12 space-y-4">
          {postsLoading ? (
            <div className="px-4 md:px-8 lg:px-16">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-white/70">
                Loading studio posts...
              </div>
            </div>
          ) : hasPosts ? (
            Array.from({ length: totalRows }, (_, index) => renderRow(index))
          ) : (
            <div className="px-4 md:px-8 lg:px-16">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-6 text-sm text-white/80">
                No studio posts yet.
              </div>
              {postsError ? <p className="mt-3 text-xs text-red-300/90">{postsError}</p> : null}
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end px-4 md:px-8 lg:px-16">
          <button
            onClick={togglePlayPause}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isPlaying ? '일시정지' : '재생'}
            disabled={!hasPosts}
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-white" fill="white" />
            ) : (
              <Play className="h-5 w-5 text-white" fill="white" />
            )}
          </button>
        </div>
      </section>

      <DialogPrimitive.Root open={Boolean(selectedPost)} onOpenChange={(open) => !open && setSelectedPost(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[94vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-300 md:rounded-3xl">
            {selectedPost && (
              <div className="relative max-h-[88vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedPost(null)}
                  className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 shadow-md backdrop-blur-md transition-all duration-200 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 md:right-5 md:top-5"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                </button>

                {selectedPost.image_url ? (
                  <div className="h-[260px] w-full bg-neutral-950 md:h-[460px]">
                    <img
                      src={selectedPost.image_url}
                      alt={selectedPost.title ?? 'Studio post image'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-[260px] w-full items-center justify-center bg-neutral-950 text-sm uppercase tracking-[0.28em] text-neutral-500 md:h-[460px]">
                    No Image
                  </div>
                )}

                <div className="space-y-5 p-6 md:p-8">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                      {formatStudioDate(selectedPost.created_at)}
                    </p>
                    <DialogPrimitive.Title className="text-2xl font-semibold tracking-tight text-white md:text-4xl">
                      {selectedPost.title?.trim() || 'Untitled Post'}
                    </DialogPrimitive.Title>
                  </div>

                  <div className="h-px w-full bg-white/10" />

                  <DialogPrimitive.Description asChild>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-white/80 md:text-base">
                      {selectedPost.content?.trim() || '내용이 없습니다.'}
                    </p>
                  </DialogPrimitive.Description>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
