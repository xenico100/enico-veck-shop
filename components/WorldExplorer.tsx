'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Compass,
  Flashlight,
  Footprints,
  Hand,
  List,
  LockKeyhole,
  Map,
  Mouse,
  Pause,
  Play,
  RotateCcw,
  Settings,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import {
  findNearbyBuilding,
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
import {
  createAssetWorldRenderer,
  type AssetWorldRenderer
} from '@/utils/world-asset-renderer';
import { loadWorldGlb, type WorldGlbScene } from '@/utils/world-glb';
import { parseWorldCollisionMap } from '@/utils/world-collisions';
import {
  initialWorldAnimation,
  stepWorldAnimation
} from '@/utils/world-animation';
import { createWorldProps } from '@/utils/world-props';
import {
  CLUES,
  FRAGMENTS,
  GAME_COLLIDERS,
  GAME_SAVE_KEY,
  GAME_SETTINGS_KEY,
  NPCS,
  PIXEL_HEIGHT,
  PROPS,
  START_POSE,
  WORLD_LAMPS,
  clueCount,
  createGameState,
  defaultWorldSettings,
  doorOpen,
  findInteractable,
  fragmentCount,
  interact,
  nearestLampDistance,
  objective,
  parseGameSave,
  parseWorldSettings,
  serializeGame,
  stepGame,
  toggleFlashlight,
  wakePose,
  CHAPTERS,
  type GameEvent,
  type GameState,
  type Interactable,
  type NpcId,
  type WorldSettings
} from '@/utils/world-game';
import {
  buildWorldFrame,
  emptySceneFx,
  sceneDanger,
  type SceneFx
} from '@/utils/world-scene';
import { createWorldAudio, type WorldAudio } from '@/utils/world-audio';
import {
  VILLAGE_BUILDING_EVENT,
  VILLAGE_PAUSE_EVENT,
  VILLAGE_TRAVEL_EVENT
} from '@/utils/village-buildings';
import type { WorldWorkshopData } from '@/utils/world-workshop';
import { useAuth } from '@/app/context/AuthContext';
import {
  DialogueBox,
  EndingOverlay,
  Hud,
  JournalPanel,
  NoteCard,
  SettingsPanel,
  TitleScreen,
  Toasts,
  formatPlayTime,
  type DialogueState,
  type HudSnapshot
} from './WorldGameUI';
import styles from './WorldExplorer.module.css';

const WorldVillageAdapter = dynamic(() => import('./WorldVillageAdapter'), {
  ssr: false
});
type View = 'map' | 'list' | 'journal' | 'settings' | null;
type Phase = 'title' | 'playing';
type WorkshopState = {
  loading: boolean;
  identity?: string | null;
  data?: WorldWorkshopData;
  message?: string;
  status?: number;
};
type Toast = { id: number; text: string; tone?: string };
const publicDescriptions: Record<string, string> = {
  community: '마을에 남겨진 이야기를 읽고, 새로운 편지를 보내는 공간입니다.',
  goods: 'ENICO VECK의 의류와 디지털 굿즈를 만나는 작은 상점입니다.',
  studio: '영상과 작업의 기록이 쌓이는 마을의 작은 극장입니다.',
  profile: '내 정보, 주문과 멤버십을 확인하는 주민 센터입니다.',
  dating: '마을 사람들과 만나고 대화를 이어가는 공간입니다.',
  about: '코딩, 미디어, 패션 프로젝트의 제작 기록을 살펴봅니다.',
  dot: '소유자가 최신 미리보기와 제작·백업·복원 검증 상태를 확인하는 개인 작업실입니다.'
};
const MOVE_KEYS = [
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight'
];
const HOUSES = GAME_COLLIDERS.slice(0, 6);

const readStorage = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStorage = (key: string, value: string | null) => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

function hudFrom(
  state: GameState,
  pose: WorldPose,
  prompt: Interactable | null,
  building: WorldBuilding | undefined
): HudSnapshot {
  return {
    chapter: state.chapter,
    objective: objective(state),
    breath: state.breath,
    battery: state.flashlight.battery,
    flashlightOwned: state.flashlight.owned,
    flashlightOn: state.flashlight.on && state.flashlight.battery > 0,
    fragments: fragmentCount(state),
    clues: clueCount(state),
    danger: sceneDanger(state, pose),
    prompt: prompt
      ? { label: prompt.label, verb: prompt.verb }
      : building
        ? { label: building.name, verb: building.id === 'dot' ? '문 두드리기' : '들어가기' }
        : null,
    blackout: state.blackout > 0,
    dawn: state.chapter >= 4
  };
}

export default function WorldExplorer() {
  const { user } = useAuth();
  const identity = user?.id ?? null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<WorldPose>({ ...START_POSE });
  const animationRef = useRef({ ...initialWorldAnimation });
  const movementOptions = useRef<WorldMovementOptions>({});
  const gameRef = useRef<GameState>(createGameState());
  const fxRef = useRef<SceneFx>(emptySceneFx());
  const audioRef = useRef<WorldAudio | null>(null);
  const promptRef = useRef<Interactable | null>(null);
  const keys = useRef(new Set<string>());
  const stick = useRef({ forward: 0, right: 0 });
  const runToggle = useRef(false);
  const cameraDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const joystickDrag = useRef<{ id: number; x: number; y: number } | null>(null);
  const lastSaveRef = useRef(0);
  const [assetState, setAssetState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [phase, setPhase] = useState<Phase>('title');
  const [pose, setPose] = useState<WorldPose>({ ...START_POSE });
  const [hud, setHud] = useState<HudSnapshot>(() =>
    hudFrom(gameRef.current, START_POSE, null, undefined)
  );
  const [labels, setLabels] = useState<{ id: string; name: string; x: number; y: number }[]>([]);
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
  const [settings, setSettings] = useState<WorldSettings>(defaultWorldSettings);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [muted, setMuted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [chapterCard, setChapterCard] = useState<{ title: string; subtitle: string; key: number } | null>(null);
  const [whisper, setWhisper] = useState<{ text: string; key: number } | null>(null);
  const [dialogue, setDialogue] = useState<DialogueState | null>(null);
  const [note, setNote] = useState<{ title: string; text: string } | null>(null);
  const [wake, setWake] = useState<{ text: string; key: number } | null>(null);
  const [ending, setEnding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveLabel, setSaveLabel] = useState<string | null>(null);
  const [endingSeen, setEndingSeen] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [journalTick, setJournalTick] = useState(0);
  const started = phase === 'playing';
  const near = findNearbyBuilding(pose, assetState === 'ready' ? 1.5 : 3.4);
  const paused =
    !started ||
    manualPause ||
    adapterPause ||
    hidden ||
    Boolean(view || selected || dialogue || note || ending || wake);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const nearRef = useRef(near);
  nearRef.current = near;

  const refreshSaveLabel = useCallback(() => {
    const saved = parseGameSave(readStorage(GAME_SAVE_KEY));
    setSaveLabel(
      saved
        ? `${CHAPTERS[saved.state.chapter].title.split(' · ')[0]} · ${formatPlayTime(saved.state.playTime)}`
        : null
    );
    setEndingSeen(Boolean(saved?.state.flags.endingSeen));
  }, []);

  useEffect(() => {
    setSettings(parseWorldSettings(readStorage(GAME_SETTINGS_KEY)));
    refreshSaveLabel();
  }, [refreshSaveLabel]);

  useEffect(() => {
    audioRef.current?.setVolume(muted ? 0 : settings.volume);
  }, [settings.volume, muted]);

  const updateSettings = (next: WorldSettings) => {
    setSettings(next);
    writeStorage(GAME_SETTINGS_KEY, JSON.stringify(next));
  };

  const saveGame = useCallback((force = false) => {
    const now = performance.now();
    if (!force && now - lastSaveRef.current < 1500) return;
    lastSaveRef.current = now;
    if (writeStorage(GAME_SAVE_KEY, serializeGame(gameRef.current, poseRef.current))) {
      setSaving(true);
      window.setTimeout(() => setSaving(false), 1400);
    }
  }, []);

  const pushToast = useCallback((text: string, tone?: string) => {
    const id = performance.now() + Math.random();
    setToasts((list) => [...list.slice(-3), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 3600);
  }, []);

  const releaseInput = useCallback(() => {
    keys.current.clear();
    stick.current = { forward: 0, right: 0 };
    setThumb({ x: 0, y: 0 });
    document.exitPointerLock?.();
  }, []);

  const handleEvents = useCallback(
    (events: GameEvent[]) => {
      for (const event of events) {
        switch (event.type) {
          case 'toast':
            pushToast(event.text, event.tone);
            break;
          case 'chapter':
            setChapterCard({ title: event.title, subtitle: event.subtitle, key: performance.now() });
            break;
          case 'whisper':
            setWhisper({ text: event.text, key: performance.now() });
            break;
          case 'dialogue':
            releaseInput();
            setDialogue({ lines: event.lines, index: 0, shown: 0 });
            break;
          case 'note':
            releaseInput();
            setNote({ title: event.title, text: event.text });
            break;
          case 'sound':
            audioRef.current?.cue(event.cue);
            break;
          case 'shake':
            fxRef.current.shake = event.duration;
            fxRef.current.shakeAmount = event.amount;
            break;
          case 'flicker':
            if (event.target === 'lamps') fxRef.current.flickerLamps = event.duration;
            else fxRef.current.flickerWindows = event.duration;
            break;
          case 'wake':
            releaseInput();
            poseRef.current = wakePose(gameRef.current);
            setWake({ text: event.text, key: performance.now() });
            break;
          case 'ending':
            releaseInput();
            setEnding(true);
            break;
          case 'save':
            saveGame();
            break;
        }
      }
      setJournalTick((value) => value + 1);
    },
    [pushToast, releaseInput, saveGame]
  );
  const handleEventsRef = useRef(handleEvents);
  handleEventsRef.current = handleEvents;
  const saveGameRef = useRef(() => saveGame());
  saveGameRef.current = () => saveGame();

  const openBuilding = useCallback(
    (building: WorldBuilding) => {
      releaseInput();
      setSelected(building);
    },
    [releaseInput]
  );

  const act = useCallback(() => {
    if (pausedRef.current) return;
    const target = promptRef.current;
    if (target) {
      handleEventsRef.current(interact(gameRef.current, target.id));
      return;
    }
    if (nearRef.current) openBuilding(nearRef.current);
  }, [openBuilding]);

  const toggleLight = useCallback(() => {
    if (pausedRef.current) return;
    handleEventsRef.current(toggleFlashlight(gameRef.current));
  }, []);

  const ensureAudio = () => {
    if (!audioRef.current) audioRef.current = createWorldAudio();
    audioRef.current?.resume();
    audioRef.current?.setVolume(muted ? 0 : settingsRef.current.volume);
  };

  const beginPlay = (state: GameState, start: WorldPose, fresh: boolean) => {
    gameRef.current = state;
    poseRef.current = { ...start };
    fxRef.current = emptySceneFx();
    setPose({ ...start });
    setEnding(false);
    setWake(null);
    setDialogue(null);
    setNote(null);
    setConfirmNew(false);
    setView(null);
    setManualPause(false);
    setPhase('playing');
    ensureAudio();
    performance.mark('world:interactive');
    canvasRef.current?.focus();
    const chapter = CHAPTERS[state.chapter];
    setChapterCard({ title: chapter.title, subtitle: chapter.subtitle, key: performance.now() });
    if (fresh) {
      setWhisper({
        text: '…어디선가 첫 문장을 잃어버렸다. 가로등 쪽으로 걸어가 보자.',
        key: performance.now() + 1
      });
      saveGame(true);
    }
    setHud(hudFrom(state, start, null, undefined));
  };

  const startNew = () => beginPlay(createGameState(), START_POSE, true);
  const continueGame = () => {
    const saved = parseGameSave(readStorage(GAME_SAVE_KEY));
    if (!saved) {
      startNew();
      return;
    }
    beginPlay(saved.state, saved.pose, false);
  };
  const toTitle = () => {
    saveGame(true);
    releaseInput();
    setEnding(false);
    setManualPause(false);
    setView(null);
    setPhase('title');
    refreshSaveLabel();
  };

  useEffect(() => {
    if (!paused) return;
    keys.current.clear();
    stick.current = { forward: 0, right: 0 };
    setThumb({ x: 0, y: 0 });
    document.exitPointerLock?.();
  }, [paused]);

  // Typewriter for dialogue lines.
  useEffect(() => {
    if (!dialogue) return;
    const line = dialogue.lines[dialogue.index];
    if (!line || dialogue.shown >= line.text.length) return;
    const timer = window.setTimeout(
      () => setDialogue((current) => (current ? { ...current, shown: current.shown + 1 } : current)),
      26
    );
    return () => window.clearTimeout(timer);
  }, [dialogue]);

  const advanceDialogue = useCallback(() => {
    setDialogue((current) => {
      if (!current) return current;
      const line = current.lines[current.index];
      if (line && current.shown < line.text.length) return { ...current, shown: line.text.length };
      if (current.index + 1 < current.lines.length)
        return { ...current, index: current.index + 1, shown: 0 };
      window.setTimeout(() => canvasRef.current?.focus(), 0);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!chapterCard) return;
    const timer = window.setTimeout(() => setChapterCard(null), 4600);
    return () => window.clearTimeout(timer);
  }, [chapterCard]);
  useEffect(() => {
    if (!whisper) return;
    const timer = window.setTimeout(() => setWhisper(null), 5600);
    return () => window.clearTimeout(timer);
  }, [whisper]);
  useEffect(() => {
    if (!wake) return;
    const timer = window.setTimeout(() => setWake(null), 2600);
    return () => window.clearTimeout(timer);
  }, [wake]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: WorldRenderer | AssetWorldRenderer;
    let assetRenderer: AssetWorldRenderer | null = null;
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
    let lastAutosave = 0;
    let bob = 0;
    let previousPose = { ...poseRef.current };
    let actualFirstFrame = false;
    const attractState = createGameState();
    Promise.all([
      loadWorldGlb('/world-assets/village.glb', { signal: controller.signal }).then((scene) => {
        if (disposed || controller.signal.aborted) {
          scene.dispose();
          throw new DOMException('Cancelled', 'AbortError');
        }
        loadedScene = scene;
        return scene;
      }),
      fetch('/world-assets/colliders.json', { signal: controller.signal }).then(async (response) => {
        if (!response.ok) throw new Error('충돌 지도를 불러오지 못했습니다.');
        return parseWorldCollisionMap(await response.json());
      })
    ])
      .then(([scene, collisionMap]) => {
        if (disposed) {
          scene.dispose();
          return;
        }
        renderer.dispose();
        try {
          assetRenderer = createAssetWorldRenderer(canvas, scene);
          assetRenderer.registerMeshes(createWorldProps());
          renderer = assetRenderer;
        } catch (error) {
          renderer = createWorldRenderer(canvas);
          throw error;
        }
        movementOptions.current = {
          colliders: [...collisionMap.colliders, ...GAME_COLLIDERS],
          radius: 0.144,
          speedScale: 0.4
        };
        characterAnchor = collisionMap.characterAnchor;
        canvas.dataset.worldScene = 'approved-village';
        canvas.dataset.worldAssetState = 'ready';
        performance.mark('world:asset-ready');
        setAssetState('ready');
      })
      .catch((error: unknown) => {
        if (process.env.NODE_ENV === 'development' && !controller.signal.aborted)
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
        Math.hypot(poseRef.current.x - characterAnchor.x, poseRef.current.z - characterAnchor.z) > 6
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
        })
        .catch(() => {
          if (!disposed) canvas.dataset.worldCharacterState = 'error';
        });
    };
    const resize = () => renderer.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (time - last < 1000 / 30) return;
      const dt = last ? Math.min(0.1, (time - last) / 1000) : 0;
      last = time;
      if (document.hidden) return;
      const playing = phaseRef.current === 'playing';
      const state = playing ? gameRef.current : attractState;
      const settings = settingsRef.current;
      const fx = fxRef.current;
      fx.shake = Math.max(0, fx.shake - dt);
      fx.flickerLamps = Math.max(0, fx.flickerLamps - dt);
      fx.flickerWindows = Math.max(0, fx.flickerWindows - dt);

      let speed = 0;
      if (playing && !pausedRef.current) {
        const forward =
          Number(keys.current.has('KeyW') || keys.current.has('ArrowUp')) -
          Number(keys.current.has('KeyS') || keys.current.has('ArrowDown')) +
          stick.current.forward;
        const right =
          Number(keys.current.has('KeyD') || keys.current.has('ArrowRight')) -
          Number(keys.current.has('KeyA') || keys.current.has('ArrowLeft')) +
          stick.current.right;
        const running =
          keys.current.has('ShiftLeft') || keys.current.has('ShiftRight') || runToggle.current;
        const before = poseRef.current;
        const options = {
          ...movementOptions.current,
          speedScale: (movementOptions.current.speedScale ?? 1) * (running ? 1.75 : 1)
        };
        // Substeps keep walking speed on slow devices (each step clamps at 50 ms).
        let moved = before;
        for (let remaining = dt; remaining > 0.0001; remaining -= 0.05)
          moved = stepWorldMovement(moved, { forward, right }, Math.min(0.05, remaining), options);
        poseRef.current = moved;
        speed = dt > 0 ? Math.hypot(poseRef.current.x - before.x, poseRef.current.z - before.z) / dt : 0;
        handleEventsRef.current(stepGame(state, { pose: poseRef.current, dt }));
        promptRef.current = findInteractable(state, poseRef.current);
        if (time - lastAutosave > 25000) {
          lastAutosave = time;
          saveGameRef.current();
        }
      }
      bob = speed > 0.1 ? bob + speed * dt * 5.2 : bob * 0.9;
      const eyeOffset = speed > 0.1 ? Math.sin(bob) * (speed > 2.6 ? 0.03 : 0.018) : 0;
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
        window.dispatchEvent(new CustomEvent('world:locomotion', { detail: nextAnimation }));
      }

      const seconds = time / 1000;
      const viewPose: WorldPose = playing
        ? { ...poseRef.current }
        : {
            x: -12 + Math.sin(seconds * 0.045) * 6,
            z: 0.2,
            yaw: Math.PI / 2 + Math.sin(seconds * 0.06) * 0.55,
            pitch: 0.04
          };
      if (fx.shake > 0) {
        const amount = fx.shakeAmount * Math.min(1, fx.shake);
        viewPose.yaw += (Math.sin(seconds * 53) + Math.sin(seconds * 31)) * 0.006 * amount;
        viewPose.pitch += Math.sin(seconds * 47) * 0.008 * amount;
      }
      const danger = playing ? sceneDanger(state, poseRef.current) : 0;
      if (assetRenderer) {
        assetRenderer.setResolution(PIXEL_HEIGHT[settings.pixel]);
        assetRenderer.render(
          viewPose,
          seconds,
          buildWorldFrame({
            state,
            pose: viewPose,
            time: seconds,
            settings,
            fx,
            eyeOffset,
            attract: !playing
          })
        );
      } else renderer.render(viewPose, seconds);
      if (assetRenderer && !actualFirstFrame) {
        performance.mark('world:first-frame');
        actualFirstFrame = true;
      }
      audioRef.current?.update({
        dt,
        speed,
        rain: state.chapter >= 2 && state.chapter < 4 && playing ? 1 : 0,
        danger,
        nearLamp:
          playing && state.blackout <= 0
            ? Math.max(0, 1 - nearestLampDistance(poseRef.current.x, poseRef.current.z) / 3.5)
            : 0,
        ringing: playing && state.phoneRinging
          ? Math.max(0.15, 1 - Math.hypot(poseRef.current.x - PROPS.payphone.x, poseRef.current.z - PROPS.payphone.z) / 30)
          : 0,
        blackout: playing && state.blackout > 0,
        dawn: playing && state.chapter >= 4,
        paused: pausedRef.current
      });

      if (time - lastUi > 120) {
        lastUi = time;
        if (playing) {
          setPose({ ...poseRef.current });
          setHud(
            hudFrom(
              state,
              poseRef.current,
              promptRef.current,
              findNearbyBuilding(poseRef.current, assetRenderer ? 1.5 : 3.4)
            )
          );
        }
        setLabels(
          playing
            ? worldBuildings.flatMap((building) => {
                const point = renderer.project({
                  x: building.x,
                  y: assetRenderer ? 2.6 : 4.8,
                  z: building.z
                });
                return point?.visible &&
                  Math.hypot(building.x - viewPose.x, building.z - viewPose.z) < 15
                  ? [{ id: building.id, name: building.name, x: point.x, y: point.y }]
                  : [];
              })
            : []
        );
      }
    };
    resize();
    frame = requestAnimationFrame(render);
    const lost = (event: Event) => {
      event.preventDefault();
      setGraphicsError('3D 연결이 중단되었습니다. 지도로 계속 둘러보거나 화면을 새로고침해 주세요.');
    };
    const restored = () =>
      requestAnimationFrame(() => {
        if (disposed) return;
        setGraphicsError(
          assetRenderer?.stats.restoreFailed
            ? '3D 화면을 복구하지 못했습니다. 지도로 계속 둘러보거나 새로고침해 주세요.'
            : ''
        );
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
  useEffect(() => () => audioRef.current?.dispose(), []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      const inRadixDialog =
        event.target instanceof HTMLElement && event.target.closest('[role="dialog"][data-state]');
      if (dialogue) {
        if (['KeyE', 'Space', 'Enter'].includes(event.code)) {
          event.preventDefault();
          if (!event.repeat) advanceDialogue();
        }
        return;
      }
      if (note) {
        if (['KeyE', 'Escape', 'Enter', 'Space'].includes(event.code) && !event.repeat) {
          event.preventDefault();
          setNote(null);
          canvasRef.current?.focus();
        }
        return;
      }
      if (event.code === 'Escape' && document.pointerLockElement) document.exitPointerLock?.();
      if (inRadixDialog) return;
      if (MOVE_KEYS.includes(event.code) || event.code.startsWith('Shift')) {
        if (!pausedRef.current) {
          if (MOVE_KEYS.includes(event.code)) event.preventDefault();
          keys.current.add(event.code);
        }
      }
      if (event.repeat) return;
      if (!started) return;
      if (event.code === 'KeyE') act();
      if (event.code === 'KeyF') toggleLight();
      if (event.code === 'KeyM' && !adapterPause && !selected && !ending)
        setView((current) => (current === 'map' ? null : 'map'));
      if (event.code === 'KeyL' && !adapterPause && !selected && !ending)
        setView((current) => (current === 'list' ? null : 'list'));
      if (event.code === 'KeyJ' && !adapterPause && !selected && !ending)
        setView((current) => (current === 'journal' ? null : 'journal'));
      if (event.code === 'KeyP' && !adapterPause && !view && !selected && !ending && !wake)
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
      if (phaseRef.current === 'playing') setManualPause(true);
    };
    const visibility = () => {
      setHidden(document.hidden);
      if (document.hidden) clear();
    };
    const mouse = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvasRef.current || pausedRef.current) return;
      const sensitivity = settingsRef.current.sensitivity;
      const invert = settingsRef.current.invertY ? -1 : 1;
      poseRef.current.yaw -= event.movementX * 0.003 * sensitivity;
      poseRef.current.pitch = Math.max(
        -0.65,
        Math.min(0.5, poseRef.current.pitch - event.movementY * 0.003 * sensitivity * invert)
      );
    };
    const lockChange = () => {
      const isLocked = document.pointerLockElement === canvasRef.current;
      setLocked(isLocked);
      if (!isLocked) clear();
    };
    const pause = (event: Event) => setAdapterPause((event as CustomEvent).detail === true);
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
  }, [act, toggleLight, advanceDialogue, adapterPause, selected, started, view, dialogue, note, ending, wake]);

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
                message: body.message || '소유자 인증 후에 열 수 있는 작업실입니다.',
                status: response.status
              }
        );
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setWorkshop({
            loading: false,
            message: '작업실을 확인하지 못했습니다. 실제 제작·백업 상태는 미확인입니다.'
          });
      });
    return () => controller.abort();
  }, [selected, identity]);

  const navigate = (building: WorldBuilding) => {
    setDestination(building.id);
    setView(null);
    setSelected(null);
    if (!started) continueGame();
    setManualPause(false);
  };
  const target = worldBuildings.find((item) => item.id === destination);
  const targetDistance = target ? Math.round(Math.hypot(target.x - pose.x, target.z - pose.z)) : 0;
  const releaseStick = () => {
    joystickDrag.current = null;
    stick.current = { forward: 0, right: 0 };
    setThumb({ x: 0, y: 0 });
  };
  const game = gameRef.current;
  const placeName =
    near?.name ??
    (Math.abs(pose.z) < 2.4 ? '몽상로' : pose.z > 8 ? '남쪽 골목' : pose.z < -10 ? '북쪽 주택가' : '몽상로 뒷길');
  void journalTick;

  return (
    <main
      className={styles.world}
      data-scene={assetState === 'ready' ? 'approved' : 'proxy'}
      data-phase={phase}
      data-blackout={hud.blackout && started}
      data-dawn={hud.dawn && started}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        data-pixel={settings.pixel}
        aria-label={
          assetState === 'ready'
            ? '몽상인 마을 3D 화면 · 잠들지 않는 마을'
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
          cameraDrag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = cameraDrag.current;
          if (!drag || drag.id !== event.pointerId || paused) return;
          const sensitivity = settings.sensitivity;
          const invert = settings.invertY ? -1 : 1;
          poseRef.current.yaw -= (event.clientX - drag.x) * 0.006 * sensitivity;
          poseRef.current.pitch = Math.max(
            -0.65,
            Math.min(0.5, poseRef.current.pitch - (event.clientY - drag.y) * 0.004 * sensitivity * invert)
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
      {!started && <div className={styles.vignette} aria-hidden="true" />}
      {started && (
        <div className={styles.sceneLabels} aria-hidden="true">
          {labels.map((label) => (
            <span key={label.id} style={{ left: label.x, top: label.y }}>
              {label.id === 'dot' && <LockKeyhole size={9} />}
              {label.name}
            </span>
          ))}
        </div>
      )}
      {started && (
        <header className={styles.header}>
          <Link href="/" prefetch={false} className={styles.brand} aria-label="기존 몽상인 마을로">
            <span className={styles.brandMark}>夢</span>
            <span>
              MONGSANGIN<small>잠들지 않는 마을</small>
            </span>
          </Link>
          <nav aria-label="탐색 도구" className={styles.tools}>
            <button onClick={() => setView('map')} aria-label="지도 열기">
              <Map size={17} />
              <span>지도</span>
            </button>
            <button onClick={() => setView('journal')} aria-label="일지 열기">
              <BookOpen size={17} />
              <span>일지</span>
            </button>
            <button onClick={() => setView('list')} aria-label="목록 열기">
              <List size={17} />
              <span>목록</span>
            </button>
            <button
              onClick={() => setMuted((current) => !current)}
              aria-label={muted ? '소리 켜기' : '소리 끄기'}
              aria-pressed={muted}
            >
              {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
            <button
              onClick={() => setManualPause((current) => !current)}
              aria-label={manualPause ? '산책 계속' : '일시정지'}
            >
              {manualPause ? <Play size={17} /> : <Pause size={17} />}
            </button>
          </nav>
        </header>
      )}
      {(assetState !== 'ready' || !started) && (
        <aside className={styles.sceneNotice} data-hidden={!started && assetState === 'ready'}>
          <span className={styles.noticeDot} />
          {assetState === 'ready'
            ? '실제 마을 자산'
            : assetState === 'loading'
              ? '임시 충돌 장면 · 실제 자산 로딩 중'
              : '임시 충돌 장면 · 실제 자산 로딩 실패'}
        </aside>
      )}
      <aside className={styles.location} aria-label="현재 위치" data-hidden={!started}>
        <Compass size={18} style={{ transform: `rotate(${-pose.yaw}rad)` }} />
        <span>
          {placeName}
          <small>
            {pose.x.toFixed(1)} / {pose.z.toFixed(1)}
          </small>
        </span>
      </aside>
      {started && target && (
        <button className={styles.destination} onClick={() => openBuilding(target)}>
          <span>목적지</span> {target.name} <b>{targetDistance}m</b>
          <ArrowUpRight size={15} />
        </button>
      )}
      {started && !paused && (
        <div className={styles.reticle} aria-hidden="true" data-active={Boolean(hud.prompt)}>
          +
        </div>
      )}
      {started && <Hud hud={paused ? { ...hud, prompt: null } : hud} />}
      {started && <Toasts toasts={toasts} />}
      {saving && started && (
        <p className={styles.memoryCard} role="status">
          <span aria-hidden="true">▣</span> MEMORY CARD · 저장 중
        </p>
      )}
      {chapterCard && started && (
        <section className={styles.chapterCard} key={chapterCard.key} aria-live="polite">
          <span>{chapterCard.title.split(' · ')[0]}</span>
          <h2>{chapterCard.title.split(' · ')[1] ?? chapterCard.title}</h2>
          <p>{chapterCard.subtitle}</p>
        </section>
      )}
      {whisper && started && (
        <p className={styles.whisper} key={whisper.key} aria-live="polite">
          {whisper.text}
        </p>
      )}
      {graphicsError && (
        <p role="alert" className={styles.graphicsError}>
          {graphicsError}
          <button onClick={() => setView('list')}>공간 목록 열기</button>
        </p>
      )}
      {!started ? (
        <TitleScreen
          loading={assetState === 'loading'}
          failed={assetState === 'error'}
          saveLabel={saveLabel}
          endingSeen={endingSeen}
          confirmNew={confirmNew}
          onNew={() => (saveLabel ? setConfirmNew(true) : startNew())}
          onConfirmNew={startNew}
          onCancelNew={() => setConfirmNew(false)}
          onContinue={continueGame}
          onSettings={() => setView('settings')}
          onList={() => setView('list')}
        />
      ) : manualPause && !view && !selected && !adapterPause && !ending ? (
        <section className={styles.pauseCard} role="group" aria-label="일시정지 메뉴">
          <span className={styles.eyebrow}>PAUSE</span>
          <h2>잠시 멈춤</h2>
          <p className={styles.pauseObjective}>{hud.objective.title}</p>
          <button
            className={styles.primary}
            onClick={() => {
              setManualPause(false);
              canvasRef.current?.focus();
            }}
          >
            <Play size={16} /> 산책 계속
          </button>
          <button onClick={() => setView('journal')}>
            <BookOpen size={16} /> 일지
          </button>
          <button onClick={() => setView('settings')}>
            <Settings size={16} /> 설정
          </button>
          <button
            onClick={() => {
              poseRef.current = wakePose(game);
              setPose({ ...poseRef.current });
              setManualPause(false);
            }}
          >
            <RotateCcw size={16} /> 마지막 가로등으로
          </button>
          <button onClick={toTitle}>저장하고 타이틀로</button>
          <Link href="/" prefetch={false} className={styles.pauseLink}>
            <ArrowLeft size={14} /> 기존 2D 마을로 나가기
          </Link>
        </section>
      ) : null}
      {dialogue && <DialogueBox dialogue={dialogue} onAdvance={advanceDialogue} />}
      {note && (
        <NoteCard
          note={note}
          onClose={() => {
            setNote(null);
            canvasRef.current?.focus();
          }}
        />
      )}
      {wake && (
        <div className={styles.wake} key={wake.key} role="status">
          <p>{wake.text}</p>
        </div>
      )}
      {ending && (
        <EndingOverlay
          state={game}
          onDawn={() => {
            setEnding(false);
            saveGame(true);
            canvasRef.current?.focus();
          }}
          onTitle={toTitle}
        />
      )}
      <footer className={styles.footer} data-hidden={!started}>
        <span className={styles.desktopHelp}>
          <kbd>WASD</kbd> 이동 <kbd>Shift</kbd> 달리기 <Mouse size={12} />{' '}
          {locked ? '마우스 시점 · Esc 해제' : '클릭/드래그로 시점'} <kbd>E</kbd> 행동 <kbd>F</kbd> 손전등{' '}
          <kbd>J</kbd> 일지
        </span>
        <Link href="/" prefetch={false}>
          <ArrowLeft size={12} /> 기존 마을
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
              joystickDrag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
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
            <span style={{ transform: `translate(${thumb.x}px,${thumb.y}px)` }} />
            <small>이동</small>
          </div>
          <div className={styles.touchActions}>
            <button onClick={act} aria-label="행동" data-ready={Boolean(hud.prompt)}>
              <Hand size={20} />
            </button>
            {hud.flashlightOwned && (
              <button onClick={toggleLight} aria-label="손전등" data-on={hud.flashlightOn}>
                <Flashlight size={20} />
              </button>
            )}
            <button
              onClick={() => {
                runToggle.current = !runToggle.current;
                setJournalTick((value) => value + 1);
              }}
              aria-label="달리기"
              aria-pressed={runToggle.current}
            >
              <Footprints size={20} />
            </button>
          </div>
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
                  {view === 'journal'
                    ? 'DREAM JOURNAL'
                    : view === 'settings'
                      ? 'OPTIONS'
                      : 'A SMALL GUIDE TO THE VILLAGE'}
                </span>
                <Dialog.Title>
                  {view === 'map'
                    ? '마을 지도'
                    : view === 'list'
                      ? '공간 목록'
                      : view === 'journal'
                        ? '꿈 일지'
                        : '설정'}
                </Dialog.Title>
              </div>
              <Dialog.Close className={styles.close} aria-label="닫기">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className={styles.description}>
              {view === 'journal'
                ? '주운 조각과 단서, 읽은 쪽지가 이곳에 기록됩니다.'
                : view === 'settings'
                  ? '설정은 이 기기에만 저장됩니다.'
                  : view === 'map'
                    ? '노란 점은 가로등, 하늘색 마름모는 주운 꿈 조각입니다.'
                    : '공간을 고르면 정보를 보거나 산책의 목적지로 지정할 수 있습니다.'}
            </Dialog.Description>
            {view === 'map' && (
              <svg
                className={styles.map}
                viewBox={`${WORLD_BOUNDS.minX - 2} ${WORLD_BOUNDS.minZ - 2} ${WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 4} ${WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 4}`}
                role="img"
                aria-label="마을 지도와 현재 위치"
              >
                <rect
                  x={WORLD_BOUNDS.minX - 2}
                  y={WORLD_BOUNDS.minZ - 2}
                  width={WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX + 4}
                  height={WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ + 4}
                  fill="#0b0d12"
                />
                {worldRoads.map((road, index) => (
                  <rect
                    key={index}
                    x={road.x - road.width / 2}
                    y={road.z - road.depth / 2}
                    width={road.width}
                    height={road.depth}
                    fill="#22262e"
                  />
                ))}
                <rect x={16.8} y={-26.4} width={4.6} height={40} fill="#1a1d24" stroke="#2c313b" strokeWidth=".2" />
                {HOUSES.map((house, index) => (
                  <rect
                    key={index}
                    x={house.x - house.width / 2}
                    y={house.z - house.depth / 2}
                    width={house.width}
                    height={house.depth}
                    fill="#2a2a30"
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
                      opacity=".55"
                      stroke={destination === building.id ? '#f2d58a' : '#0b0d12'}
                      strokeWidth=".4"
                    />
                    <text
                      x={building.x}
                      y={building.z + 0.7}
                      textAnchor="middle"
                      fontSize="2"
                      fill="#e8e3d5"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </text>
                  </g>
                ))}
                {WORLD_LAMPS.map((lamp) => (
                  <circle key={lamp.id} cx={lamp.x} cy={lamp.z} r=".55" fill={hud.blackout ? '#3a3528' : '#f2c66d'} />
                ))}
                {FRAGMENTS.map((fragment) =>
                  game.collected.includes(fragment.id) ? (
                    <path
                      key={fragment.id}
                      d="M0 -1 .7 0 0 1 -.7 0Z"
                      transform={`translate(${fragment.x} ${fragment.z})`}
                      fill="#8cc8ff"
                    />
                  ) : game.chapter >= 3 ? (
                    <text key={fragment.id} x={fragment.x} y={fragment.z + 0.6} fontSize="1.8" textAnchor="middle" fill="#8cc8ff" opacity=".45">
                      ?
                    </text>
                  ) : null
                )}
                {CLUES.filter((clue) => game.talked.includes(clue.npc as NpcId) && !game.collected.includes(clue.id)).map((clue) => (
                  <path key={clue.id} d="M0 -1.1 .8 0 0 1.1 -.8 0Z" transform={`translate(${clue.x} ${clue.z})`} fill="#f2c66d" stroke="#0b0d12" strokeWidth=".2" />
                ))}
                {(Object.keys(NPCS) as NpcId[]).map((id) => (
                  <circle key={id} cx={NPCS[id].x} cy={NPCS[id].z} r=".5" fill="#c9c3b5" stroke="#0b0d12" strokeWidth=".2" />
                ))}
                <rect
                  x={PROPS.payphone.x - 0.5}
                  y={PROPS.payphone.z - 0.5}
                  width="1"
                  height="1"
                  fill={game.phoneRinging ? '#6fe3a0' : '#3d5c52'}
                />
                {doorOpen(game) && game.chapter < 4 && (
                  <rect x={PROPS.door.x - 0.4} y={PROPS.door.z - 1} width=".8" height="2" fill="#fffbe8" />
                )}
                <circle cx={pose.x} cy={pose.z} r="1" fill="#e85b36" stroke="#fff" strokeWidth=".35" />
                <path
                  d="M0 -3 1 -1 -1 -1Z"
                  fill="#e85b36"
                  transform={`translate(${pose.x} ${pose.z}) rotate(${(-pose.yaw * 180) / Math.PI + 180})`}
                />
              </svg>
            )}
            {view === 'journal' && <JournalPanel state={game} />}
            {view === 'settings' && (
              <SettingsPanel
                settings={settings}
                onChange={updateSettings}
                hasSave={Boolean(saveLabel) || started}
                onClearSave={() => {
                  writeStorage(GAME_SAVE_KEY, null);
                  refreshSaveLabel();
                  if (started) toTitle();
                  pushToast('메모리 카드 기록을 지웠습니다.');
                }}
              />
            )}
            {(view === 'map' || view === 'list') && (
              <div className={styles.buildingList}>
                {worldBuildings.map((building, index) => (
                  <div className={styles.buildingRow} key={building.id}>
                    <span className={styles.buildingNumber} style={{ color: building.color }}>
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
                      <Compass size={15} /> 길 찾기
                    </button>
                  </div>
                ))}
              </div>
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
                  {selected?.id === 'dot' ? 'PRIVATE / OWNER ONLY' : 'VILLAGE SPACE'}
                </span>
                <Dialog.Title>{selected?.name}</Dialog.Title>
              </div>
              <Dialog.Close className={styles.close} aria-label="공간 정보 닫기">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className={styles.detailDescription}>
              {selected && publicDescriptions[selected.id]}
            </Dialog.Description>
            {selected?.id === 'dot' ? (
              <div className={styles.workshop}>
                {workshop.loading ? (
                  <p role="status">서버에서 소유자 접근 권한을 확인하고 있습니다…</p>
                ) : workshop.data && workshop.identity === identity ? (
                  <>
                    <span className={styles.sampleBadge}>샘플 데이터 · 실제 상태 미확인</span>
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
                            예시: {stage.demoStatus === 'complete' ? '완료' : '진행 중'}
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
                    <p role="status">{workshop.message || '소유자 인증 후에 확인할 수 있습니다.'}</p>
                    <small>제작·백업·복원 검증 실제 상태: 미확인</small>
                    {workshop.status === 401 && (
                      <button
                        className={styles.primary}
                        onClick={() => {
                          setSelected(null);
                          window.dispatchEvent(
                            new CustomEvent('auth:open-modal', { detail: { mode: 'login' } })
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
                  <span className={styles.sampleBadge}>마을의 실제 공간</span>
                  <p>
                    밤의 산책은 잠시 멈춥니다. 커뮤니티·상점·로그인 같은 기존 마을의 기능으로 바로
                    연결됩니다.
                  </p>
                </div>
                <button
                  className={styles.primary}
                  onClick={() => {
                    const id = selected?.villageId;
                    setSelected(null);
                    if (id) window.dispatchEvent(new CustomEvent(VILLAGE_BUILDING_EVENT, { detail: id }));
                  }}
                >
                  기존 공간 열기 <ArrowUpRight size={18} />
                </button>
              </>
            )}
            {selected && (
              <button className={styles.walkLink} onClick={() => navigate(selected)}>
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
