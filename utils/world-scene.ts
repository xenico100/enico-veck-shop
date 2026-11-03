import { worldCameraBasis } from './world-camera';
import type {
  WorldRenderFrame,
  WorldRenderInstance,
  WorldRenderLight
} from './world-asset-renderer';
import { billboardMatrix, cameraMatrix, modelMatrix } from './world-props';
import type { WorldPose } from './world-layout';
import {
  BATTERIES,
  CLUES,
  FRAGMENTS,
  NOTES,
  NPCS,
  PROPS,
  WORLD_GLOWS,
  WORLD_LAMPS,
  doorOpen,
  shadowActive,
  type GameState,
  type NpcId,
  type WorldSettings
} from './world-game';

type Point = [number, number, number];
export type SceneFx = {
  /** Seconds remaining for each transient effect. */
  flickerLamps: number;
  flickerWindows: number;
  shake: number;
  shakeAmount: number;
};

export const emptySceneFx = (): SceneFx => ({
  flickerLamps: 0,
  flickerWindows: 0,
  shake: 0,
  shakeAmount: 0
});

const EYE = 0.66;
const hash = (value: number) => {
  const x = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const CLUE_MESH: Record<string, string> = {
  'clue-stamp': 'stamp',
  'clue-tag': 'tag',
  'clue-film': 'film'
};
const NOTE_YAW: Record<string, number> = { 'note-4': Math.PI / 2 };
const NPC_LOOK: Record<NpcId, { tint: [number, number, number, number]; eyes: Point; extra?: string }> = {
  postman: { tint: [0.05, 0.06, 0.13, 1], eyes: [0.9, 0.78, 0.4], extra: 'postBag' },
  cat: { tint: [1, 1, 1, 1], eyes: [1.3, 0.95, 0.2] },
  projectionist: { tint: [0.13, 0.085, 0.05, 1], eyes: [0.95, 0.85, 0.6], extra: 'projector' }
};

export type SceneInput = {
  state: GameState;
  pose: WorldPose;
  time: number;
  settings: WorldSettings;
  fx: SceneFx;
  eyeOffset: number;
  /** Title-screen camera: hides HUD-only effects such as the flashlight beam. */
  attract?: boolean;
};

/** Danger of the nearest shadow (0..1), shared with HUD and audio. */
export function sceneDanger(state: GameState, pose: Pick<WorldPose, 'x' | 'z'>) {
  if (!shadowActive(state)) return 0;
  return clamp01(1 - Math.hypot(pose.x - state.shadow.x, pose.z - state.shadow.z) / 9);
}

export function flashlightIntensity(state: GameState, time: number) {
  const light = state.flashlight;
  if (!light.owned || !light.on || light.battery <= 0) return 0;
  if (light.battery < 15) return hash(Math.floor(time * 12)) > 0.3 ? 0.75 : 0.12;
  return 1;
}

export function buildWorldFrame(input: SceneInput): WorldRenderFrame {
  const { state, pose, time, settings, fx } = input;
  const dawn = state.chapter >= 4;
  const blackout = state.blackout > 0;
  const basis = worldCameraBasis(pose);
  const eye: Point = [pose.x, EYE + input.eyeOffset, pose.z];
  const instances: WorldRenderInstance[] = [];
  const lights: WorldRenderLight[] = [];
  const flick = (seed: number, rate: number) => hash(Math.floor(time * rate) + seed * 31.7);
  const near = (x: number, z: number, range: number) =>
    Math.hypot(x - pose.x, z - pose.z) < range;

  let sources = dawn ? 0.35 : 1;
  if (blackout) sources = state.blackout < 2.6 && flick(3, 10) > 0.45 ? 0.7 : 0.025;
  if (fx.flickerLamps > 0) sources *= flick(5, 16) > 0.45 ? 1 : 0.08;
  if (fx.flickerWindows > 0) sources *= flick(9, 12) > 0.4 ? 1.35 : 0.05;

  const rain = state.chapter >= 2 && !dawn;
  const fog: WorldRenderFrame['fog'] = dawn
    ? { color: [0.3, 0.215, 0.24], near: 9, far: 68 }
    : {
        color: blackout ? [0.0035, 0.004, 0.008] : [0.0055, 0.0075, 0.014],
        near: blackout ? 1.2 : 2.5,
        far: blackout ? 14 : rain ? 21 : 25
      };

  // Sky dome, stars and the moon follow the eye and ignore fog.
  instances.push({
    mesh: 'sky',
    model: modelMatrix(eye[0], -4, eye[2]),
    tint: [fog.color[0], fog.color[1], fog.color[2], 1],
    noFog: true,
    layer: 'sky'
  });
  if (!dawn) {
    instances.push({
      mesh: 'stars',
      model: modelMatrix(eye[0], eye[1], eye[2]),
      tint: [0.55, 0.55, 0.62, 1],
      noFog: true,
      layer: 'sky'
    });
  }
  const moonDirection: Point = dawn ? [0.5, 0.12, 0.86] : [-0.42, 0.44, -0.79];
  const moon: Point = [
    eye[0] + moonDirection[0] * 95,
    eye[1] + moonDirection[1] * 95,
    eye[2] + moonDirection[2] * 95
  ];
  instances.push({
    mesh: 'glow',
    model: billboardMatrix(moon[0], moon[1], moon[2], dawn ? 34 : 18, basis),
    tint: dawn ? [1, 0.6, 0.45, 0.45] : [0.32, 0.4, 0.62, 0.22],
    blend: 'add',
    noFog: true,
    layer: 'sky'
  });
  instances.push({
    mesh: 'moon',
    model: billboardMatrix(moon[0], moon[1], moon[2], dawn ? 6 : 4.2, basis),
    tint: dawn ? [1, 0.82, 0.62, 1] : [0.86, 0.86, 0.76, 1],
    noFog: true,
    layer: 'sky'
  });

  // Street lamps; one at the crossing never quite stays on.
  WORLD_LAMPS.forEach((lamp, index) => {
    let power = sources;
    if (!blackout && !dawn && lamp.id === 'lamp-crossing' && flick(index, 9) > 0.84) power *= 0.12;
    if (power <= 0.04) return;
    lights.push({
      x: lamp.x,
      y: lamp.y - 0.15,
      z: lamp.z,
      radius: dawn ? 4 : 7.5,
      color: [1.55 * power, 0.98 * power, 0.46 * power]
    });
    instances.push({
      mesh: 'glow',
      model: billboardMatrix(lamp.x, lamp.y + 0.04, lamp.z, 0.9, basis),
      tint: [1, 0.7, 0.36, 0.5 * Math.min(1, power)],
      blend: 'add'
    });
    if (!dawn && power > 0.5 && near(lamp.x, lamp.z, 16)) {
      for (let moth = 0; moth < 3; moth++) {
        const angle = time * (1.5 + moth * 0.6) + moth * 2.1 + lamp.x;
        const radius = 0.22 + 0.1 * Math.sin(time * 3 + moth);
        instances.push({
          mesh: 'moth',
          model: billboardMatrix(
            lamp.x + Math.cos(angle) * radius,
            lamp.y - 0.14 + Math.sin(angle * 1.7) * 0.1,
            lamp.z + Math.sin(angle) * radius,
            0.8,
            basis,
            Math.sin(time * 26 + moth) * 0.7
          ),
          tint: [1, 0.86, 0.62, 0.85],
          blend: 'add'
        });
      }
    }
  });
  for (const glow of WORLD_GLOWS) {
    const power = sources * (dawn ? 0.3 : 0.55);
    if (power > 0.04)
      lights.push({
        x: glow.x,
        y: glow.y,
        z: glow.z,
        radius: glow.radius,
        color: [glow.color[0] * power, glow.color[1] * power, glow.color[2] * power]
      });
  }

  // Dream fragments: spinning gems that light their surroundings.
  FRAGMENTS.forEach((fragment, index) => {
    if (state.collected.includes(fragment.id) || !near(fragment.x, fragment.z, 32)) return;
    const bob = Math.sin(time * 2 + index) * 0.07;
    const pulse = 0.72 + 0.28 * Math.sin(time * 3 + index * 1.3);
    const y = 0.62 + bob;
    instances.push({
      mesh: 'fragment',
      model: modelMatrix(fragment.x, y, fragment.z, time * 1.4 + index, 0.85),
      tint: [0.34 + 0.12 * pulse, 0.55 + 0.15 * pulse, 0.85 + 0.1 * pulse, 1]
    });
    instances.push({
      mesh: 'glow',
      model: billboardMatrix(fragment.x, y, fragment.z, 0.55, basis),
      tint: [0.42, 0.68, 1, 0.5 * pulse],
      blend: 'add'
    });
    lights.push({
      x: fragment.x,
      y: y + 0.2,
      z: fragment.z,
      radius: 2.6,
      color: [0.22 * pulse, 0.42 * pulse, 0.8 * pulse]
    });
  });

  const pickupGlow = (x: number, y: number, z: number, tint: [number, number, number, number]) =>
    instances.push({ mesh: 'glow', model: billboardMatrix(x, y, z, 0.42, basis), tint, blend: 'add' });

  if (!state.flashlight.owned) {
    const y = 0.2 + Math.sin(time * 2.2) * 0.04;
    instances.push({ mesh: 'flashlight', model: modelMatrix(-19.6, y, 2.55, time, 0.8) });
    pickupGlow(-19.6, y + 0.12, 2.55, [1, 0.9, 0.55, 0.45]);
    lights.push({ x: -19.6, y: 0.5, z: 2.55, radius: 1.6, color: [0.5, 0.42, 0.22] });
  }
  for (const clue of CLUES) {
    if (!state.talked.includes(clue.npc as NpcId) || state.collected.includes(clue.id)) continue;
    const y = 0.36 + Math.sin(time * 2 + clue.x) * 0.05;
    instances.push({ mesh: CLUE_MESH[clue.id], model: modelMatrix(clue.x, y, clue.z, time * 0.9, 1.1) });
    pickupGlow(clue.x, y + 0.05, clue.z, [1, 0.78, 0.4, 0.55]);
    lights.push({ x: clue.x, y: y + 0.3, z: clue.z, radius: 2.2, color: [0.6, 0.45, 0.18] });
  }
  for (const battery of BATTERIES) {
    if (state.collected.includes(battery.id) || !near(battery.x, battery.z, 26)) continue;
    const y = 0.18 + Math.sin(time * 2.4 + battery.x) * 0.04;
    instances.push({ mesh: 'battery', model: modelMatrix(battery.x, y, battery.z, time * 1.2, 1) });
    pickupGlow(battery.x, y + 0.08, battery.z, [0.55, 1, 0.55, 0.35]);
  }
  for (const note of NOTES) {
    if (!near(note.x, note.z, 20)) continue;
    instances.push({
      mesh: 'note',
      model: modelMatrix(note.x, note.y, note.z, NOTE_YAW[note.id] ?? 0, 0.6)
    });
    if (!state.collected.includes(note.id))
      pickupGlow(note.x, note.y - 0.08, note.z, [1, 1, 0.9, 0.16 + 0.06 * Math.sin(time * 2)]);
  }

  // Residents: hooded figures that turn to watch you.
  (Object.keys(NPCS) as NpcId[]).forEach((id) => {
    const npc = NPCS[id];
    if (!near(npc.x, npc.z, 30)) return;
    const look = NPC_LOOK[id];
    const watching = near(npc.x, npc.z, 5);
    const yaw = watching ? Math.atan2(pose.x - npc.x, pose.z - npc.z) : npc.yaw;
    if (id === 'cat') {
      const scale = 0.48;
      const model = modelMatrix(npc.x, 0.16, npc.z, yaw, scale);
      instances.push({ mesh: 'cat', model });
      const blink = flick(17, 1.3) > 0.92 ? 0 : 1;
      instances.push({
        mesh: 'catEyes',
        model,
        tint: [look.eyes[0] * blink, look.eyes[1] * blink, look.eyes[2] * blink, 1]
      });
      return;
    }
    const scale = 0.58;
    const sway = Math.sin(time * 0.8 + npc.x) * 0.012;
    const model = modelMatrix(npc.x + sway, 0.12, npc.z, yaw, scale);
    instances.push({ mesh: 'figure', model, tint: look.tint });
    instances.push({ mesh: 'eyes', model, tint: [look.eyes[0], look.eyes[1], look.eyes[2], 1] });
    if (look.extra) instances.push({ mesh: look.extra, model });
  });

  // The shadow.
  if (shadowActive(state)) {
    const shadow = state.shadow;
    const fleeing = shadow.state === 'flee';
    const scale = 0.6;
    const yaw = Math.atan2(pose.x - shadow.x, pose.z - shadow.z);
    const jitter = fleeing ? (hash(time * 40) - 0.5) * 0.08 : 0;
    const float = Math.sin(time * 1.6) * 0.03;
    const alpha = fleeing ? 0.35 + hash(time * 23) * 0.5 : 0.9;
    instances.push({
      mesh: 'shadow',
      model: modelMatrix(shadow.x + jitter, 0.04 + float, shadow.z, yaw, scale),
      tint: [0, 0, 0, alpha],
      blend: 'alpha'
    });
    const forward = 0.06 * scale;
    const eyeX = shadow.x + jitter + Math.sin(yaw) * forward;
    const eyeZ = shadow.z + Math.cos(yaw) * forward;
    const eyeY = 0.04 + float + 0.35 * scale;
    instances.push({
      mesh: 'shadowEyes',
      model: modelMatrix(eyeX, eyeY, eyeZ, yaw, scale),
      tint: [1.4, 0.06, 0.04, 1]
    });
    instances.push({
      mesh: 'glow',
      model: billboardMatrix(eyeX, eyeY + 1.2 * scale, eyeZ, 0.22, basis),
      tint: [1, 0.08, 0.05, 0.45 * alpha],
      blend: 'add'
    });
  }

  // Props.
  const phone = PROPS.payphone;
  instances.push({ mesh: 'payphone', model: modelMatrix(phone.x, 0.1, phone.z, phone.yaw, 0.45) });
  const ringing = state.phoneRinging && flick(21, 5) > 0.3;
  instances.push({
    mesh: 'payphoneSign',
    model: modelMatrix(phone.x, 0.1, phone.z, phone.yaw, 0.45),
    tint: ringing ? [0.35, 1.2, 0.6, 1] : [0.12 * sources + 0.03, 0.42 * sources + 0.04, 0.3 * sources + 0.03, 1]
  });
  if (ringing) lights.push({ x: phone.x, y: 1.1, z: phone.z - 0.3, radius: 2.4, color: [0.25, 0.9, 0.45] });
  const vending = PROPS.vending;
  const vendingOn = blackout ? flick(13, 6) > 0.85 : true;
  instances.push({ mesh: 'vending', model: modelMatrix(vending.x, 0.1, vending.z, vending.yaw, 0.45) });
  instances.push({
    mesh: 'vendingPanel',
    model: modelMatrix(vending.x, 0.1, vending.z, vending.yaw, 0.45),
    tint: vendingOn ? [0.6, 0.78, 0.95, 1] : [0.03, 0.03, 0.04, 1]
  });
  if (vendingOn && !dawn)
    lights.push({ x: vending.x, y: 0.5, z: vending.z + 0.5, radius: 2.3, color: [0.35, 0.48, 0.62] });
  instances.push({ mesh: 'mailbox', model: modelMatrix(PROPS.mailbox.x, 0.1, PROPS.mailbox.z, PROPS.mailbox.yaw, 0.45) });
  instances.push({ mesh: 'bench', model: modelMatrix(PROPS.bench.x, 0.1, PROPS.bench.z, PROPS.bench.yaw, 0.45) });

  if (doorOpen(state) && state.chapter < 4) {
    const door = PROPS.door;
    const breathe = 0.85 + 0.15 * Math.sin(time * 1.4);
    instances.push({ mesh: 'doorFrame', model: modelMatrix(door.x, 0, door.z, door.yaw, 0.55) });
    instances.push({
      mesh: 'doorLight',
      model: modelMatrix(door.x, 0, door.z, door.yaw, 0.55),
      tint: [1.4 * breathe, 1.35 * breathe, 1.22 * breathe, 1]
    });
    instances.push({
      mesh: 'glow',
      model: billboardMatrix(door.x - 0.1, 0.65, door.z, 2.4, basis),
      tint: [1, 0.95, 0.85, 0.32 * breathe],
      blend: 'add'
    });
    lights.push({ x: door.x - 0.6, y: 0.8, z: door.z, radius: 9, color: [1.6 * breathe, 1.5 * breathe, 1.35 * breathe] });
  }

  // Weather and air.
  if (rain)
    instances.push({
      mesh: 'rain',
      model: modelMatrix(eye[0], eye[1], eye[2]),
      particle: 1,
      blend: 'alpha',
      tint: [0.62, 0.68, 0.8, 0.6]
    });
  instances.push({
    mesh: 'dust',
    model: modelMatrix(eye[0], eye[1], eye[2]),
    particle: 2,
    blend: 'add',
    tint: dawn ? [1, 0.82, 0.55, 0.45] : [0.4, 0.5, 0.75, 0.32]
  });

  const flashlight = input.attract ? 0 : flashlightIntensity(state, time);
  if (flashlight > 0)
    instances.push({
      mesh: 'beam',
      model: cameraMatrix(eye, basis, [0.09, -0.11, 0]),
      tint: [1, 0.94, 0.78, 0.32 * flashlight],
      blend: 'add'
    });

  lights.sort(
    (a, b) =>
      Math.hypot(a.x - pose.x, a.z - pose.z) - a.radius * 0.5 -
      (Math.hypot(b.x - pose.x, b.z - pose.z) - b.radius * 0.5)
  );

  const danger = sceneDanger(state, pose);
  const warp = settings.wobble
    ? Math.min(1.6, danger * 1.3 + (1 - state.breath / 100) * 0.7 + (blackout ? 0.2 : 0))
    : 0;
  const shake = fx.shake > 0 ? fx.shakeAmount * Math.min(1, fx.shake) : 0;
  return {
    instances,
    lights: lights.slice(0, 8),
    flashlight,
    fog,
    ambient: dawn ? [0.3, 0.24, 0.27] : [0.016, 0.022, 0.038],
    moon: dawn ? [1.05, 0.74, 0.6] : [0.07, 0.09, 0.15],
    lightSources: sources,
    ambientFill: dawn ? 1.6 : 0.85,
    warp,
    eyeOffset: input.eyeOffset,
    roll: shake ? (hash(time * 37) - 0.5) * 0.05 * shake : 0,
    psx: {
      snap: settings.jitter,
      dither: settings.dither,
      affine: settings.jitter ? 0.42 : 0
    },
    screen: {
      vignette: input.attract ? 1.2 : 1.55 + danger * 1.6,
      danger: input.attract ? 0 : Math.min(1, danger * 0.9 + (1 - state.breath / 100) * 0.28),
      scanlines: settings.pixel === 'sharp' ? 0 : 0.14
    }
  };
}
