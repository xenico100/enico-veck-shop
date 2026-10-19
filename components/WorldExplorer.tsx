'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  ArrowUpRight,
  Compass,
  Footprints,
  List,
  LockKeyhole,
  Map,
  Mouse,
  Pause,
  Play,
  RotateCcw,
  VolumeX,
  X
} from 'lucide-react';
import {
  findNearbyBuilding,
  initialWorldPose,
  stepWorldMovement,
  worldBuildings,
  worldRoads,
  WORLD_BOUNDS,
  type WorldBuilding,
  type WorldPose,
  type WorldMovementOptions
} from '@/utils/world-layout';
import {
  createWorldRenderer,
  type WorldRenderer
} from '@/utils/world-renderer';
import { createAssetWorldRenderer } from '@/utils/world-asset-renderer';
import { loadWorldGlb, type WorldGlbScene } from '@/utils/world-glb';
import { parseWorldCollisionMap } from '@/utils/world-collisions';
import {
  initialWorldAnimation,
  stepWorldAnimation
} from '@/utils/world-animation';
import {
  VILLAGE_BUILDING_EVENT,
  VILLAGE_PAUSE_EVENT,
  VILLAGE_TRAVEL_EVENT
} from '@/utils/village-buildings';
import type { WorldWorkshopData } from '@/utils/world-workshop';
import { useAuth } from '@/app/context/AuthContext';
import styles from './WorldExplorer.module.css';

const WorldVillageAdapter = dynamic(() => import('./WorldVillageAdapter'), {
  ssr: false
});
const arrivalPose: WorldPose = {
  ...initialWorldPose,
  x: -18,
  yaw: Math.PI / 2 - 0.12
};
type View = 'map' | 'list' | 'sound' | null;
type WorkshopState = {
  loading: boolean;
  identity?: string | null;
  data?: WorldWorkshopData;
  message?: string;
  status?: number;
};
const publicDescriptions: Record<string, string> = {
  community: '마을에 남겨진 이야기를 읽고, 새로운 편지를 보내는 공간입니다.',
  goods: 'ENICO VECK의 의류와 디지털 굿즈를 만나는 작은 상점입니다.',
  studio: '영상과 작업의 기록이 쌓이는 마을의 작은 극장입니다.',
  profile: '내 정보, 주문과 멤버십을 확인하는 주민 센터입니다.',
  dating: '마을 사람들과 만나고 대화를 이어가는 공간입니다.',
  about: '코딩, 미디어, 패션 프로젝트의 제작 기록을 살펴봅니다.',
  dot: '소유자가 최신 미리보기와 제작·백업·복원 검증 상태를 확인하는 개인 작업실입니다.'
};

export default function WorldExplorer() {
  const { user } = useAuth();
  const identity = user?.id ?? null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<WorldPose>({ ...arrivalPose });
  const animationRef = useRef({ ...initialWorldAnimation });
  const movementOptions = useRef<WorldMovementOptions>({});
  const [assetState, setAssetState] = useState<'loading' | 'ready' | 'error'>(
    'loading'
  );
  const keys = useRef(new Set<string>());
  const stick = useRef({ forward: 0, right: 0 });
  const cameraDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const joystickDrag = useRef<{ id: number; x: number; y: number } | null>(
    null
  );
  const [pose, setPose] = useState<WorldPose>({ ...arrivalPose });
  const [labels, setLabels] = useState<
    { id: string; name: string; x: number; y: number }[]
  >([]);
  const [started, setStarted] = useState(false);
  const [manualPause, setManualPause] = useState(false);
  const [adapterPause, setAdapterPause] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [view, setView] = useState<View>(null);
  const [selected, setSelected] = useState<WorldBuilding | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [graphicsError, setGraphicsError] = useState('');
  const [locked, setLocked] = useState(false);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [workshop, setWorkshop] = useState<WorkshopState>({ loading: false });
  const near = findNearbyBuilding(pose, assetState === 'ready' ? 1.5 : 3.4);
  const paused =
    !started ||
    manualPause ||
    adapterPause ||
    hidden ||
    Boolean(view || selected);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const openBuilding = useCallback((building: WorldBuilding) => {
    document.exitPointerLock?.();
    keys.current.clear();
    stick.current = { forward: 0, right: 0 };
    setSelected(building);
  }, []);
  const nearRef = useRef(near);
  nearRef.current = near;

  useEffect(() => {
    if (!paused) return;
    keys.current.clear();
    stick.current = { forward: 0, right: 0 };
    setThumb({ x: 0, y: 0 });
    document.exitPointerLock?.();
  }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WorldRenderer;
    let assetRenderer: ReturnType<typeof createAssetWorldRenderer> | null =
      null;
    let disposed = false;
    let loadedScene: WorldGlbScene | null = null;
    let characterAnchor: { x: number; y: number; z: number } | null = null;
    let characterRequested = false;
    const controller = new AbortController();
    canvas.dataset.worldScene = 'placeholder';
    canvas.dataset.worldAssetState = 'loading';
    canvas.dataset.worldCharacterState = 'unloaded';
    try {
      renderer = createWorldRenderer(canvas);
    } catch {
      canvas.dataset.worldAssetState = 'error';
      setAssetState('error');
      setGraphicsError(
        '이 브라우저에서 3D 화면을 시작하지 못했습니다. 지도와 목록에서 모든 공간을 살펴볼 수 있습니다.'
      );
      return;
    }
    let frame = 0;
    let last = 0;
    let lastUi = 0;
    let dirty = true;
    let previousPose = { ...poseRef.current };
    let actualFirstFrame = false;
    Promise.all([
      loadWorldGlb('/world-assets/village.glb', {
        signal: controller.signal
      }).then((scene) => {
        if (disposed || controller.signal.aborted) {
          scene.dispose();
          throw new DOMException('Cancelled', 'AbortError');
        }
        loadedScene = scene;
        return scene;
      }),
      fetch('/world-assets/colliders.json', { signal: controller.signal }).then(
        async (response) => {
          if (!response.ok) throw new Error('충돌 지도를 불러오지 못했습니다.');
          return parseWorldCollisionMap(await response.json());
        }
      )
    ])
      .then(([scene, collisionMap]) => {
        if (disposed) {
          scene.dispose();
          return;
        }
        renderer.dispose();
        try {
          assetRenderer = createAssetWorldRenderer(canvas, scene);
          renderer = assetRenderer;
        } catch (error) {
          renderer = createWorldRenderer(canvas);
          throw error;
        }
        movementOptions.current = {
          colliders: collisionMap.colliders,
          radius: 0.144,
          speedScale: 0.4
        };
        characterAnchor = collisionMap.characterAnchor;
        canvas.dataset.worldScene = 'approved-village';
        canvas.dataset.worldAssetState = 'ready';
        performance.mark('world:asset-ready');
        setAssetState('ready');
        dirty = true;
      })
      .catch((error: unknown) => {
        if (
          process.env.NODE_ENV === 'development' &&
          !controller.signal.aborted
        )
          console.warn('World asset initialization failed', error);
        controller.abort();
        loadedScene?.dispose();
        if (!disposed) {
          canvas.dataset.worldAssetState = 'error';
          setAssetState('error');
        }
      });
    const requestCharacter = () => {
      if (
        characterRequested ||
        !assetRenderer ||
        !characterAnchor ||
        Math.hypot(
          poseRef.current.x - characterAnchor.x,
          poseRef.current.z - characterAnchor.z
        ) > 6
      )
        return;
      characterRequested = true;
      canvas.dataset.worldCharacterState = 'loading';
      loadWorldGlb('/world-assets/companion.glb', { signal: controller.signal })
        .then((scene) => {
          if (disposed || !assetRenderer) {
            scene.dispose();
            return;
          }
          try {
            assetRenderer.addScene(scene);
          } catch (error) {
            scene.dispose();
            throw error;
          }
          canvas.dataset.worldCharacterState = 'ready';
          performance.mark('world:character-ready');
          dirty = true;
        })
        .catch(() => {
          if (!disposed) canvas.dataset.worldCharacterState = 'error';
        });
    };
    const resize = () => {
      renderer.resize();
      dirty = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (time - last < 1000 / 30) return;
      const dt = last ? (time - last) / 1000 : 0;
      last = time;
      if (document.hidden) return;
      if (!pausedRef.current) {
        const forward =
          Number(keys.current.has('KeyW') || keys.current.has('ArrowUp')) -
          Number(keys.current.has('KeyS') || keys.current.has('ArrowDown')) +
          stick.current.forward;
        const right =
          Number(keys.current.has('KeyD') || keys.current.has('ArrowRight')) -
          Number(keys.current.has('KeyA') || keys.current.has('ArrowLeft')) +
          stick.current.right;
        poseRef.current = stepWorldMovement(
          poseRef.current,
          { forward, right },
          dt,
          movementOptions.current
        );
        dirty = true;
      }
      requestCharacter();
      const nextAnimation = stepWorldAnimation(
        previousPose,
        poseRef.current,
        animationRef.current,
        Math.min(dt, 0.05),
        pausedRef.current
      );
      previousPose = { ...poseRef.current };
      const previousAnimation = animationRef.current;
      animationRef.current = nextAnimation;
      canvas.dataset.locomotion = nextAnimation.state;
      canvas.dataset.animationSource = nextAnimation.source;
      if (
        nextAnimation.state !== previousAnimation.state ||
        Math.abs(nextAnimation.speed - previousAnimation.speed) > 0.05 ||
        Math.abs(nextAnimation.turnRate - previousAnimation.turnRate) > 0.05
      ) {
        window.dispatchEvent(
          new CustomEvent('world:locomotion', { detail: nextAnimation })
        );
      }
      if (dirty) {
        renderer.render(poseRef.current, time / 1000);
        if (assetRenderer && !actualFirstFrame) {
          performance.mark('world:first-frame');
          actualFirstFrame = true;
        }
        if (time - lastUi > 120) {
          setPose({ ...poseRef.current });
          setLabels(
            worldBuildings.flatMap((building) => {
              const point = renderer.project({
                x: building.x,
                y: assetRenderer ? 2.8 : 4.8,
                z: building.z
              });
              return point?.visible &&
                Math.hypot(
                  building.x - poseRef.current.x,
                  building.z - poseRef.current.z
                ) < 36
                ? [
                    {
                      id: building.id,
                      name: building.name,
                      x: point.x,
                      y: point.y
                    }
                  ]
                : [];
            })
          );
          lastUi = time;
        }
        dirty = false;
      }
    };
    resize();
    frame = requestAnimationFrame(render);
    const lost = (event: Event) => {
      event.preventDefault();
      setGraphicsError(
        '3D 연결이 중단되었습니다. 지도로 계속 둘러보거나 화면을 새로고침해 주세요.'
      );
    };
    const restored = () =>
      requestAnimationFrame(() => {
        if (disposed) return;
        setGraphicsError(
          assetRenderer?.stats.restoreFailed
            ? '3D 화면을 복구하지 못했습니다. 지도로 계속 둘러보거나 새로고침해 주세요.'
            : ''
        );
        dirty = true;
      });
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer.dispose();
      if (!assetRenderer) loadedScene?.dispose();
      movementOptions.current = {};
    };
  }, []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]'
        )
      )
        return;
      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight'
        ].includes(event.code)
      ) {
        if (!pausedRef.current) {
          event.preventDefault();
          keys.current.add(event.code);
        }
      }
      if (event.repeat) return;
      if (event.code === 'KeyE' && !pausedRef.current && nearRef.current)
        openBuilding(nearRef.current);
      if (event.code === 'KeyM' && !adapterPause && !selected)
        setView((current) => (current === 'map' ? null : 'map'));
      if (event.code === 'KeyL' && !adapterPause && !selected)
        setView((current) => (current === 'list' ? null : 'list'));
      if (
        event.code === 'KeyP' &&
        started &&
        !adapterPause &&
        !view &&
        !selected
      )
        setManualPause((current) => !current);
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const clear = () => {
      keys.current.clear();
      stick.current = { forward: 0, right: 0 };
      cameraDrag.current = null;
      setThumb({ x: 0, y: 0 });
    };
    const blur = () => {
      clear();
      setManualPause(true);
    };
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden) clear();
    };
    const mouse = (event: MouseEvent) => {
      if (
        document.pointerLockElement !== canvasRef.current ||
        pausedRef.current
      )
        return;
      poseRef.current.yaw -= event.movementX * 0.003;
      poseRef.current.pitch = Math.max(
        -0.65,
        Math.min(0.5, poseRef.current.pitch - event.movementY * 0.003)
      );
    };
    const lockChange = () => {
      const isLocked = document.pointerLockElement === canvasRef.current;
      setLocked(isLocked);
      if (!isLocked) clear();
    };
    const pause = (event: Event) =>
      setAdapterPause((event as CustomEvent).detail === true);
    const travel = (event: Event) => {
      const id = (event as CustomEvent).detail;
      const building = worldBuildings.find((item) => item.id === id);
      if (building) {
        setDestination(building.id);
        setView(null);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('mousemove', mouse);
    document.addEventListener('pointerlockchange', lockChange);
    window.addEventListener(VILLAGE_PAUSE_EVENT, pause);
    window.addEventListener(VILLAGE_TRAVEL_EVENT, travel);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('mousemove', mouse);
      document.removeEventListener('pointerlockchange', lockChange);
      window.removeEventListener(VILLAGE_PAUSE_EVENT, pause);
      window.removeEventListener(VILLAGE_TRAVEL_EVENT, travel);
    };
  }, [openBuilding, adapterPause, selected, started, view]);

  useEffect(() => {
    setWorkshop({ loading: false });
    if (selected?.id !== 'dot') return;
    const controller = new AbortController();
    setWorkshop({ loading: true });
    fetch('/api/world/workshop', {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal
    })
      .then(async (response) => {
        const body = await response.json();
        if (controller.signal.aborted) return;
        setWorkshop(
          response.ok
            ? { loading: false, identity, data: body.data }
            : {
                loading: false,
                message:
                  body.message || '소유자 인증 후에 열 수 있는 작업실입니다.',
                status: response.status
              }
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setWorkshop({
            loading: false,
            message:
              '작업실을 확인하지 못했습니다. 실제 제작·백업 상태는 미확인입니다.'
          });
      });
    return () => controller.abort();
  }, [selected, identity]);

  const navigate = (building: WorldBuilding) => {
    setDestination(building.id);
    setView(null);
    setSelected(null);
    setStarted(true);
    setManualPause(false);
  };
  const target = worldBuildings.find((item) => item.id === destination);
  const targetDistance = target
    ? Math.round(Math.hypot(target.x - pose.x, target.z - pose.z))
    : 0;
  const releaseStick = () => {
    joystickDrag.current = null;
    stick.current = { forward: 0, right: 0 };
    setThumb({ x: 0, y: 0 });
  };

  return (
    <main
      className={styles.world}
      data-scene={assetState === 'ready' ? 'approved' : 'proxy'}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label={
          assetState === 'ready'
            ? '몽상인 실제 마을 GLB 시제품 · 캐릭터 모션 임시'
            : '몽상인 임시 3D 충돌 테스트 마을'
        }
        tabIndex={0}
        onClick={() => {
          if (!paused && matchMedia('(pointer:fine)').matches) {
            canvasRef.current?.focus();
            try {
              const request = canvasRef.current?.requestPointerLock();
              if (request && 'catch' in request)
                (request as Promise<void>).catch(() => setLocked(false));
            } catch {
              setLocked(false);
            }
          }
        }}
        onPointerDown={(event) => {
          if (paused || document.pointerLockElement) return;
          cameraDrag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = cameraDrag.current;
          if (!drag || drag.id !== event.pointerId || paused) return;
          poseRef.current.yaw -= (event.clientX - drag.x) * 0.006;
          poseRef.current.pitch = Math.max(
            -0.65,
            Math.min(
              0.5,
              poseRef.current.pitch - (event.clientY - drag.y) * 0.004
            )
          );
          cameraDrag.current = { ...drag, x: event.clientX, y: event.clientY };
        }}
        onPointerUp={() => {
          cameraDrag.current = null;
        }}
        onPointerCancel={() => {
          cameraDrag.current = null;
        }}
      />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.sceneLabels} aria-hidden="true">
        {labels.map((label) => (
          <span key={label.id} style={{ left: label.x, top: label.y }}>
            {label.id === 'dot' && <LockKeyhole size={9} />}
            {label.name}
          </span>
        ))}
      </div>
      <header className={styles.header}>
        <Link
          href="/"
          prefetch={false}
          className={styles.brand}
          aria-label="기존 몽상인 마을로"
        >
          <span className={styles.brandMark}>夢</span>
          <span>
            MONGSANGIN<small>산책하는 작업 지도</small>
          </span>
        </Link>
        <span className={styles.version}>
          WORLD / 0.2 <i /> SOLO
        </span>
        <nav aria-label="탐색 도구" className={styles.tools}>
          <button onClick={() => setView('map')} aria-label="지도 열기">
            <Map size={18} />
            <span>지도</span>
          </button>
          <button onClick={() => setView('list')} aria-label="목록 열기">
            <List size={18} />
            <span>목록</span>
          </button>
          <button onClick={() => setView('sound')} aria-label="사운드 안내">
            <VolumeX size={18} />
            <span>사운드</span>
          </button>
          <button
            onClick={() => setManualPause((current) => !current)}
            aria-label={manualPause ? '산책 계속' : '일시정지'}
          >
            {manualPause ? <Play size={18} /> : <Pause size={18} />}
          </button>
        </nav>
      </header>
      <aside className={styles.sceneNotice}>
        <span className={styles.noticeDot} />
        {assetState === 'ready'
          ? '실제 마을 자산 · 웹 변환 검증 중'
          : assetState === 'loading'
            ? '임시 충돌 장면 · 실제 자산 로딩 중'
            : '임시 충돌 장면 · 실제 자산 로딩 실패'}
        <span>· 몽상녀·최종 모션 적용 대기</span>
      </aside>
      <aside className={styles.location} aria-label="현재 위치">
        <Compass size={20} style={{ transform: `rotate(${-pose.yaw}rad)` }} />
        <span>
          몽상로
          <small>
            {pose.x.toFixed(1)} / {pose.z.toFixed(1)}
          </small>
        </span>
      </aside>
      {target && (
        <button
          className={styles.destination}
          onClick={() => openBuilding(target)}
        >
          <span>목적지</span> {target.name} <b>{targetDistance}m</b>
          <ArrowUpRight size={16} />
        </button>
      )}
      <div className={styles.reticle} aria-hidden="true">
        +
      </div>
      {graphicsError && (
        <p role="alert" className={styles.graphicsError}>
          {graphicsError}
          <button onClick={() => setView('list')}>공간 목록 열기</button>
        </p>
      )}
      {!started ? (
        <section className={styles.welcome}>
          <span className={styles.eyebrow}>
            MONGSANGIN · EXPLORATION PROTOTYPE
          </span>
          <h1>
            생각이 머무는 곳,
            <br />
            <em>걸어서 만나는 작업들.</em>
          </h1>
          <p>
            작은 마을을 산책하며 프로젝트를 찾아보세요.
            <br />
            {assetState === 'ready'
              ? '승인된 실제 마을 자산의 웹 변환을 검증하는 버전입니다.'
              : '지금은 이동과 충돌을 검증하는 임시 장면입니다.'}
          </p>
          <div className={styles.welcomeActions}>
            <button
              className={styles.primary}
              onClick={() => {
                setStarted(true);
                performance.mark('world:interactive');
                setManualPause(false);
                canvasRef.current?.focus();
              }}
            >
              <Footprints size={18} /> 산책 시작 <ArrowUpRight size={18} />
            </button>
            <button onClick={() => setView('list')}>목록으로 둘러보기</button>
          </div>
          <small>단독 탐색 · 샘플 상태 데이터 · 소유자 전용 작업실</small>
        </section>
      ) : manualPause && !view && !selected && !adapterPause ? (
        <section className={styles.pauseCard}>
          <span className={styles.eyebrow}>TAKE YOUR TIME</span>
          <h2>잠시 쉬어가는 중</h2>
          <button
            className={styles.primary}
            onClick={() => {
              setManualPause(false);
              canvasRef.current?.focus();
            }}
          >
            <Play size={16} /> 산책 계속
          </button>
          <button
            onClick={() => {
              poseRef.current = { ...arrivalPose };
              setPose({ ...arrivalPose });
              setManualPause(false);
            }}
          >
            <RotateCcw size={16} /> 광장으로 돌아가기
          </button>
        </section>
      ) : null}
      {started && !paused && near && (
        <aside className={styles.nearCard} aria-live="polite">
          <span className={styles.nearIcon}>
            {near.id === 'dot' ? (
              <LockKeyhole size={22} />
            ) : (
              <ArrowUpRight size={22} />
            )}
          </span>
          <span>
            <small>{near.id === 'dot' ? 'OWNER ONLY' : '가까운 공간'}</small>
            <strong>{near.name}</strong>
            <span>{near.caption}</span>
          </span>
          <button onClick={() => openBuilding(near)}>
            공간 살펴보기 <kbd>E</kbd>
          </button>
        </aside>
      )}
      <footer className={styles.footer}>
        <span>
          © MONGSANGIN <i /> WALK SLOWLY, DREAM FREELY.
        </span>
        <span className={styles.desktopHelp}>
          <kbd>W A S D</kbd> 이동 <Mouse size={13} />{' '}
          {locked ? '마우스 시점 · Esc 해제' : '화면 클릭 또는 드래그로 시점'}{' '}
          <kbd>E</kbd> 공간
        </span>
        <Link href="/" prefetch={false}>
          <ArrowLeft size={13} /> 기존 마을
        </Link>
      </footer>
      {started && !paused && (
        <div className={styles.touchControls}>
          <div
            className={styles.joystick}
            role="group"
            aria-label="터치 이동 패드"
            onPointerDown={(event) => {
              event.preventDefault();
              joystickDrag.current = {
                id: event.pointerId,
                x: event.clientX,
                y: event.clientY
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const drag = joystickDrag.current;
              if (!drag || drag.id !== event.pointerId) return;
              const dx = event.clientX - drag.x;
              const dy = event.clientY - drag.y;
              const length = Math.max(36, Math.hypot(dx, dy));
              stick.current = { right: dx / length, forward: -dy / length };
              setThumb({ x: (dx / length) * 30, y: (dy / length) * 30 });
            }}
            onPointerUp={releaseStick}
            onPointerCancel={releaseStick}
            onLostPointerCapture={releaseStick}
          >
            <span
              style={{ transform: `translate(${thumb.x}px,${thumb.y}px)` }}
            />
            <small>이동</small>
          </div>
          <span className={styles.touchHint}>오른쪽 화면을 밀어 둘러보기</span>
        </div>
      )}
      <Dialog.Root
        open={Boolean(view)}
        onOpenChange={(open) => {
          if (!open) setView(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              canvasRef.current?.focus();
            }}
            className={`${styles.panel} ${view === 'map' ? styles.mapPanel : ''}`}
          >
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {view === 'sound'
                    ? 'SOUND / QUIET BY DEFAULT'
                    : 'A SMALL GUIDE TO THE VILLAGE'}
                </span>
                <Dialog.Title>
                  {view === 'map'
                    ? '마을 지도'
                    : view === 'list'
                      ? '공간 목록'
                      : '마을의 소리'}
                </Dialog.Title>
              </div>
              <Dialog.Close className={styles.close} aria-label="닫기">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className={styles.description}>
              {view === 'sound'
                ? 'Epidemic Sound 음원 연결을 준비하고 있습니다. 현재 시제품은 무음입니다.'
                : '공간을 고르면 정보를 보거나 산책의 목적지로 지정할 수 있습니다.'}
            </Dialog.Description>
            {view === 'map' && (
              <svg
                className={styles.map}
                viewBox={`${WORLD_BOUNDS.minX - 2} ${WORLD_BOUNDS.minZ - 2} ${WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 4} ${WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 4}`}
                role="img"
                aria-label="임시 마을 지도와 현재 위치"
              >
                <rect
                  x={WORLD_BOUNDS.minX - 2}
                  y={WORLD_BOUNDS.minZ - 2}
                  width={WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 4}
                  height={WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 4}
                  fill="#dce1d3"
                />
                {worldRoads.map((road, index) => (
                  <rect
                    key={index}
                    x={road.x - road.width / 2}
                    y={road.z - road.depth / 2}
                    width={road.width}
                    height={road.depth}
                    fill="#b4b8b1"
                  />
                ))}
                {worldBuildings.map((building, index) => (
                  <g key={building.id}>
                    <rect
                      x={building.x - building.width / 2}
                      y={building.z - building.depth / 2}
                      width={building.width}
                      height={building.depth}
                      fill={building.color}
                      stroke={
                        destination === building.id ? '#203f39' : '#fff6df'
                      }
                      strokeWidth=".5"
                    />
                    <text
                      x={building.x}
                      y={building.z + 0.7}
                      textAnchor="middle"
                      fontSize="2.2"
                      fill="#fff"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </text>
                  </g>
                ))}
                <circle
                  cx={pose.x}
                  cy={pose.z}
                  r="1.05"
                  fill="#e85b36"
                  stroke="#fff"
                  strokeWidth=".45"
                />
                <path
                  d="M0 -3 1 -1 -1 -1Z"
                  fill="#e85b36"
                  transform={`translate(${pose.x} ${pose.z}) rotate(${(-pose.yaw * 180) / Math.PI + 180})`}
                />
              </svg>
            )}
            {view !== 'sound' ? (
              <div className={styles.buildingList}>
                {worldBuildings.map((building, index) => (
                  <div className={styles.buildingRow} key={building.id}>
                    <span
                      className={styles.buildingNumber}
                      style={{ color: building.color }}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => {
                        setView(null);
                        openBuilding(building);
                      }}
                    >
                      <strong>
                        {building.name}
                        {building.id === 'dot' && <LockKeyhole size={12} />}
                      </strong>
                      <small>{building.caption}</small>
                    </button>
                    <button
                      className={styles.routeButton}
                      onClick={() => navigate(building)}
                      aria-label={`${building.name} 길 찾기`}
                    >
                      <Compass size={16} /> 길 찾기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.soundInfo}>
                Epidemic Sound의 M — Lofive, Waltz of the Ancients — Guustavv와
                발걸음·공간 열기 효과음을 후보로 검토했습니다. 이용 권한과 웹
                배포 조건을 확인한 파일만 추후 연결합니다. 자동 재생은 사용하지
                않습니다.
              </p>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              canvasRef.current?.focus();
            }}
            className={styles.detailPanel}
          >
            <div className={styles.panelHeader}>
              <div>
                <span className={styles.eyebrow}>
                  {selected?.id === 'dot'
                    ? 'PRIVATE / OWNER ONLY'
                    : 'VILLAGE PROJECT'}
                </span>
                <Dialog.Title>{selected?.name}</Dialog.Title>
              </div>
              <Dialog.Close
                className={styles.close}
                aria-label="공간 정보 닫기"
              >
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className={styles.detailDescription}>
              {selected && publicDescriptions[selected.id]}
            </Dialog.Description>
            {selected?.id === 'dot' ? (
              <div className={styles.workshop}>
                {workshop.loading ? (
                  <p role="status">
                    서버에서 소유자 접근 권한을 확인하고 있습니다…
                  </p>
                ) : workshop.data && workshop.identity === identity ? (
                  <>
                    <span className={styles.sampleBadge}>
                      샘플 데이터 · 실제 상태 미확인
                    </span>
                    <h3>dot 작업실</h3>
                    <p>{workshop.data.notice}</p>
                    <dl>
                      <div>
                        <dt>미리보기</dt>
                        <dd>
                          <Link href={workshop.data.latestPreview.url}>
                            {workshop.data.latestPreview.label} ↗
                          </Link>
                        </dd>
                      </div>
                      <div>
                        <dt>버전</dt>
                        <dd>{workshop.data.version}</dd>
                      </div>
                    </dl>
                    <ul>
                      {workshop.data.stages.map((stage) => (
                        <li key={stage.id}>
                          <span>{stage.label}</span>
                          <span>
                            예시:{' '}
                            {stage.demoStatus === 'complete'
                              ? '완료'
                              : '진행 중'}
                            <small>실제: 미확인</small>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {workshop.data.driveUrl ? (
                      <a
                        className={styles.primary}
                        href={workshop.data.driveUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        비공개 Drive 열기 <ArrowUpRight size={16} />
                      </a>
                    ) : (
                      <p>Drive 연결 미설정 · 원본 링크는 공개되지 않습니다.</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.lockIllustration}>
                      <LockKeyhole size={34} />
                    </div>
                    <h3>소유자의 개인 작업실입니다.</h3>
                    <p role="status">
                      {workshop.message ||
                        '소유자 인증 후에 확인할 수 있습니다.'}
                    </p>
                    <small>제작·백업·복원 검증 실제 상태: 미확인</small>
                    {workshop.status === 401 && (
                      <button
                        className={styles.primary}
                        onClick={() => {
                          setSelected(null);
                          window.dispatchEvent(
                            new CustomEvent('auth:open-modal', {
                              detail: { mode: 'login' }
                            })
                          );
                        }}
                      >
                        기존 계정으로 로그인 <ArrowUpRight size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className={styles.projectNote}>
                  <span className={styles.sampleBadge}>3D 연결 시제품</span>
                  <p>
                    {assetState === 'ready'
                      ? '건물은 실제 마을 자산이며 캐릭터·모션은 최종 적용 전입니다.'
                      : '건물의 형태와 캐릭터는 이동 검증용 임시 표현입니다.'}{' '}
                    기존 공간의 커뮤니티·상점·로그인 기능으로 연결됩니다.
                  </p>
                </div>
                <button
                  className={styles.primary}
                  onClick={() => {
                    const id = selected?.villageId;
                    setSelected(null);
                    if (id)
                      window.dispatchEvent(
                        new CustomEvent(VILLAGE_BUILDING_EVENT, { detail: id })
                      );
                  }}
                >
                  기존 공간 열기 <ArrowUpRight size={18} />
                </button>
              </>
            )}
            {selected && (
              <button
                className={styles.walkLink}
                onClick={() => navigate(selected)}
              >
                <Footprints size={16} /> 이곳을 목적지로 걷기
              </button>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <WorldVillageAdapter onPauseChange={setAdapterPause} />
    </main>
  );
}
