import {
  createMeshBuilder,
  linearColor,
  modelMatrix,
  type Matrix4
} from './world-props';
import type {
  WorldGlbBatch,
  WorldGlbMaterial,
  WorldGlbScene
} from './world-glb';
import type { WorldRenderInstance } from './world-asset-renderer';
import type { DogState } from './world-game';
import type { WorldPose } from './world-layout';

type V3 = [number, number, number];
const material = (emissive: V3 = [0.15, 0.13, 0.16]): WorldGlbMaterial => ({
  baseColorFactor: [1, 1, 1, 1],
  emissiveFactor: emissive,
  emissiveStrength: 1,
  unlit: false,
  textureIndex: null,
  alphaMode: 'OPAQUE',
  alphaCutoff: 0.5,
  doubleSided: true
});
const mesh = (
  builder: ReturnType<typeof createMeshBuilder>
): WorldGlbBatch => ({ ...builder.build(), material: material() });

export function multiplyCharacterMatrix(a: Matrix4, b: Matrix4): Matrix4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
}
function joint(parent: Matrix4, position: V3, pitch = 0, roll = 0, yaw = 0) {
  const c = Math.cos(pitch),
    s = Math.sin(pitch),
    cr = Math.cos(roll),
    sr = Math.sin(roll);
  const rx = new Float32Array([
    1,
    0,
    0,
    0,
    0,
    c,
    s,
    0,
    0,
    -s,
    c,
    0,
    0,
    0,
    0,
    1
  ]);
  const rz = new Float32Array([
    cr,
    sr,
    0,
    0,
    -sr,
    cr,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  ]);
  return multiplyCharacterMatrix(
    parent,
    multiplyCharacterMatrix(
      modelMatrix(...position, yaw),
      multiplyCharacterMatrix(rx, rz)
    )
  );
}

/** Adult, stylized 169 cm design: approved bob/camisole/shorts, no portrait likeness. */
export function createWorldCharacterMeshes(): Record<string, WorldGlbBatch> {
  const skin = linearColor('#cba18c'),
    shade = linearColor('#986b60');
  const hair = linearColor('#171923'),
    sheen = linearColor('#303444');
  const black = linearColor('#16151d'),
    rib = linearColor('#34313b');
  const result: Record<string, WorldGlbBatch> = {};
  const body = createMeshBuilder();
  body.cylinder(0, 0.99, 0, 0.11, 0.34, 8, black, 0.145, black);
  body.box(-0.102, 1.28, 0, 0.021, 0.1, 0.12, black);
  body.box(0.102, 1.28, 0, 0.021, 0.1, 0.12, black);
  body.cylinder(0, 1.34, 0, 0.047, 0.12, 7, skin, 0.043, skin);
  body.cylinder(0, 0.8, 0, 0.125, 0.2, 8, black, 0.113, black);
  for (let x = -0.095; x <= 0.1; x += 0.024)
    body.box(x, 1.015, 0.111, 0.004, 0.255, 0.004, rib);
  // Small seams and a hem distinguish cloth from a solid black primitive.
  body.box(0, 0.986, 0, 0.23, 0.012, 0.21, rib);
  result['mongsang.torso'] = mesh(body);

  const head = createMeshBuilder();
  head.gem(0, 0.112, 0.004, 0.09, 0.125, skin, 8);
  head.box(-0.037, 0.117, 0.082, 0.027, 0.008, 0.004, hair);
  head.box(0.037, 0.117, 0.082, 0.027, 0.008, 0.004, hair);
  head.box(0, 0.052, 0.069, 0.028, 0.005, 0.004, shade);
  head.tri([-0.01, 0.09, 0.075], [0.01, 0.09, 0.075], [0, 0.105, 0.1], skin);
  // Faceted crown and jaw-length inward-curled bob, open around the face.
  head.gem(0, 0.17, -0.012, 0.104, 0.09, hair, 10);
  for (let i = 1; i < 9; i++) {
    const a = (i / 10) * Math.PI * 2,
      b = ((i + 1) / 10) * Math.PI * 2;
    const p = (angle: number, y: number, r: number): V3 => [
      Math.sin(angle) * r,
      y,
      Math.cos(angle) * r - 0.013
    ];
    head.quad(
      p(a, 0.18, 0.105),
      p(b, 0.18, 0.105),
      p(b, 0.005, 0.092),
      p(a, 0.005, 0.092),
      i % 3 === 0 ? sheen : hair
    );
  }
  for (let i = 0; i < 5; i++) {
    const x = -0.075 + i * 0.034;
    head.tri(
      [x, 0.188, 0.074],
      [x + 0.036, 0.188, 0.074],
      [x + 0.024, 0.125 + (i % 2) * 0.012, 0.088],
      hair
    );
  }
  result['mongsang.head'] = mesh(head);
  result['mongsang.upperArm'] = mesh(
    createMeshBuilder().cylinder(0, -0.25, 0, 0.032, 0.25, 6, skin, 0.041, skin)
  );
  result['mongsang.forearm'] = mesh(
    createMeshBuilder()
      .cylinder(0, -0.23, 0, 0.024, 0.23, 6, skin, 0.032, skin)
      .box(0, -0.305, 0.006, 0.045, 0.09, 0.032, skin)
  );
  result['mongsang.thigh'] = mesh(
    createMeshBuilder().cylinder(0, -0.37, 0, 0.044, 0.37, 7, skin, 0.065, skin)
  );
  result['mongsang.shin'] = mesh(
    createMeshBuilder()
      .cylinder(0, -0.38, 0, 0.026, 0.38, 7, skin, 0.045, skin)
      .box(0, -0.43, 0.035, 0.07, 0.05, 0.16, skin)
  );
  const collar = createMeshBuilder().cylinder(
    0,
    0.27,
    0,
    0.103,
    0.032,
    10,
    linearColor('#bb383b'),
    0.103
  );
  collar.box(-0.112, 0.228, 0.016, 0.018, 0.044, 0.032, linearColor('#e4c980'));
  // Low-resolution stitched lettering, on both sides of the original dog's collar.
  const letters: Record<string, string[]> = {
    E: ['111', '100', '110', '100', '111'],
    N: ['101', '111', '111', '111', '101'],
    I: ['111', '010', '010', '010', '111'],
    C: ['111', '100', '100', '100', '111'],
    O: ['111', '101', '101', '101', '111'],
    V: ['101', '101', '101', '101', '010'],
    K: ['101', '101', '110', '101', '101']
  };
  Array.from('ENICO VECK').forEach((letter, index) =>
    letters[letter]?.forEach((row, y) => {
      Array.from(row).forEach((pixel, x) => {
        if (pixel === '1')
          for (const side of [-1, 1]) {
            const px = (index * 4 + x - 19) * 0.0034,
              py = 0.293 - y * 0.0034,
              pz = side * 0.104;
            collar.quad(
              [px, py, pz],
              [px + 0.0028, py, pz],
              [px + 0.0028, py + 0.0028, pz],
              [px, py + 0.0028, pz],
              linearColor('#f0dfb9')
            );
          }
      });
    })
  );
  result['dog.collar'] = mesh(collar);
  return result;
}

export function buildMongsangnyeoInstances(
  pose: WorldPose,
  yaw: number,
  speed: number,
  gait: number,
  time: number,
  opacity = 1,
  riding = false
): WorldRenderInstance[] {
  if (opacity <= 0.02) return [];
  const moving = Math.min(1, speed / 1.5),
    running = speed > 2.6;
  const swing = Math.sin(gait * 1.8) * moving * (running ? 0.72 : 0.45);
  const rideBob = riding ? Math.abs(Math.sin(gait * 2.2 + time * 4)) * moving * 0.026 : 0;
  const root = modelMatrix(
    pose.x,
    riding ? 0.24 + rideBob : Math.abs(Math.sin(gait * 1.8)) * moving * 0.012,
    pose.z,
    yaw,
    0.415
  );
  const result: WorldRenderInstance[] = [];
  const add = (name: string, model: Matrix4) =>
    result.push({
      mesh: `mongsang.${name}`,
      model,
      surfaceLighting: true,
      tint: [1, 1, 1, opacity],
      ...(opacity < 0.98 ? { blend: 'alpha' as const } : {})
    });
  const torsoMatrix = riding ? joint(root, [0, 0, 0.04], 0.14) : root;
  add('torso', torsoMatrix);
  add(
    'head',
    joint(
      torsoMatrix,
      [0, 1.43, 0],
      Math.sin(time * 1.6) * 0.018 - (riding ? 0.1 : 0),
      Math.sin(time * 0.7) * 0.015
    )
  );
  for (const side of [-1, 1]) {
    if (riding) {
      const reinBob = Math.sin(gait * 2.2) * moving * 0.08;
      const arm = joint(
        torsoMatrix,
        [side * 0.155, 1.32, 0.02],
        -0.74 + reinBob,
        -side * 0.14
      );
      add('upperArm', arm);
      add('forearm', joint(arm, [0, -0.25, 0], -0.42));
      const leg = joint(
        root,
        [side * 0.115, 0.82, 0.04],
        -0.92 + reinBob * 0.35,
        side * 0.38
      );
      add('thigh', leg);
      add('shin', joint(leg, [0, -0.37, 0], 1.05));
    } else {
      const arm = joint(
        root,
        [side * 0.155, 1.32, 0],
        -swing * side,
        -side * 0.07
      );
      add('upperArm', arm);
      add('forearm', joint(arm, [0, -0.25, 0], -0.12 - (running ? 0.6 : 0.1)));
      const leg = joint(root, [side * 0.077, 0.8, 0], swing * side);
      add('thigh', leg);
      add('shin', joint(leg, [0, -0.37, 0], Math.max(0, -swing * side) * 0.7));
    }
  }
  return result;
}

export type DogPart =
  | 'head'
  | 'body'
  | 'tail'
  | 'frontL'
  | 'frontR'
  | 'backL'
  | 'backR';
export type DogRig = {
  meshes: Record<string, WorldGlbBatch>;
  parts: { mesh: string; part: DogPart }[];
};
const pivots: Record<DogPart, V3> = {
  body: [0, 0, 0],
  head: [-0.105, 0.26, 0],
  tail: [0.17, 0.28, 0],
  frontL: [-0.11, 0.18, 0.08],
  frontR: [-0.11, 0.18, -0.08],
  backL: [0.14, 0.18, 0.08],
  backR: [0.14, 0.18, -0.08]
};

export function classifyDogTriangle(
  center: V3,
  materialIndex: number
): DogPart {
  const [x, y, z] = center;
  // The low-hanging mouth, tongue and drool must never become a front leg.
  if (materialIndex === 5 || materialIndex === 9 || materialIndex === 10)
    return 'head';
  if (x < -0.075 && y > 0.2) return 'head';
  if (x > 0.17 && y > 0.2) return 'tail';
  if (y < 0.19)
    return x < -0.03
      ? z > 0
        ? 'frontL'
        : 'frontR'
      : z > 0
        ? 'backL'
        : 'backR';
  return 'body';
}

/** Rigid PS1 joints split the approved model without replacing or modifying its GLB. */
export function createCompanionRig(
  scene: WorldGlbScene,
  anchor: { x: number; y: number; z: number }
): DogRig {
  const rig: DogRig = { meshes: {}, parts: [] };
  scene.batches.forEach((source, materialIndex) => {
    const buckets: Partial<Record<DogPart, number[]>> = {};
    for (let i = 0; i < source.vertices.length; i += 36) {
      const v = source.vertices;
      const center: V3 = [
        (v[i] + v[i + 12] + v[i + 24]) / 3 - anchor.x,
        (v[i + 1] + v[i + 13] + v[i + 25]) / 3 - anchor.y,
        (v[i + 2] + v[i + 14] + v[i + 26]) / 3 - anchor.z
      ];
      const part = classifyDogTriangle(center, materialIndex),
        pivot = pivots[part];
      const data = buckets[part] ?? (buckets[part] = []);
      for (let j = 0; j < 3; j++) {
        const offset = i + j * 12;
        data.push(
          v[offset] - anchor.x - pivot[0],
          v[offset + 1] - anchor.y - pivot[1],
          v[offset + 2] - anchor.z - pivot[2]
        );
        for (let k = 3; k < 12; k++) data.push(v[offset + k]);
      }
    }
    (Object.keys(buckets) as DogPart[]).forEach((part) => {
      const data = buckets[part]!,
        name = `dog.${part}.${materialIndex}`;
      const factor = source.material.baseColorFactor;
      rig.meshes[name] = {
        vertices: new Float32Array(data),
        vertexCount: data.length / 12,
        material: {
          ...source.material,
          baseColorFactor:
            materialIndex === 0
              ? [
                  Math.max(factor[0], 0.055),
                  Math.max(factor[1], 0.065),
                  Math.max(factor[2], 0.085),
                  factor[3]
                ]
              : [...factor],
          emissiveFactor:
            materialIndex === 7
              ? [0.06, 0.055, 0.04]
              : materialIndex === 0
                ? [0.16, 0.18, 0.22]
                : source.material.emissiveFactor
        }
      };
      rig.parts.push({ mesh: name, part });
    });
  });
  return rig;
}

export function buildCompanionInstances(
  dog: DogState,
  rig: DogRig,
  time: number,
  speed = 0
): WorldRenderInstance[] {
  const isRiding = dog.riding === true || dog.mode === 'ride';
  const rideMoving = isRiding ? Math.min(1, Math.max(0.18, speed / 2.4)) : 0;
  const walk = isRiding
    ? Math.sin(time * 16) * 0.42 * rideMoving
    : dog.mode === 'follow'
      ? Math.sin(time * 13) * 0.28
      : 0;
  const root = modelMatrix(
    dog.x,
    dog.mode === 'sit'
      ? -0.018
      : isRiding
        ? Math.abs(walk) * 0.022
        : Math.abs(walk) * 0.012,
    dog.z,
    dog.yaw + Math.PI / 2,
    isRiding ? 1.36 : 1
  );
  const result: WorldRenderInstance[] = rig.parts.map(({ mesh, part }) => {
    let roll = 0,
      yaw = 0;
    if (part === 'head')
      roll =
        dog.mode === 'sniff'
          ? 0.13 + Math.sin(time * 7) * 0.05
          : isRiding
            ? -0.06 + Math.sin(time * 8) * 0.04 * rideMoving
            : Math.sin(time * 1.8) * 0.035;
    if (part === 'tail')
      yaw = Math.sin(time * (dog.mode === 'guard' ? 3 : isRiding ? 12 : 7)) * 0.35;
    if (isRiding) {
      if (part === 'frontL' || part === 'frontR') roll = walk;
      if (part === 'backL' || part === 'backR') roll = -walk;
    } else {
      if (part === 'frontL' || part === 'backR') roll = walk;
      if (part === 'frontR' || part === 'backL') roll = -walk;
    }
    if (dog.mode === 'sit' && part.startsWith('back')) roll = 0.6;
    return { mesh, model: joint(root, pivots[part], 0, roll, yaw), surfaceLighting: !mesh.endsWith('.7') };
  });
  result.push({ mesh: 'dog.collar', model: root, surfaceLighting: true });
  return result;
}

/** Pixel silhouette extruded into real geometry; one upload, one draw call. */
export function createWorldTitleLogo(): WorldGlbBatch | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 34;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#fff';
  ctx.font = '900 30px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  ctx.fillText('몽상인', 4, 28);
  const data = ctx.getImageData(0, 0, 100, 34).data,
    builder = createMeshBuilder();
  for (let y = 0; y < 34; y += 2)
    for (let x = 0; x < 100; x += 2)
      if (data[(y * 100 + x) * 4 + 3] > 100) {
        const color = linearColor(y < 16 ? '#f0d4a4' : '#b58ba0');
        builder.box(
          (x - 50) * 0.017,
          (17 - y) * 0.017,
          0,
          0.035,
          0.035,
          0.105,
          color
        );
      }
  return {
    ...builder.build(),
    material: { ...material([0.12, 0.08, 0.09]), unlit: false }
  };
}
