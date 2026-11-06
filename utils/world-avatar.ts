import type { WorldGlbBatch, WorldGlbMaterial, WorldGlbScene } from './world-glb';
import type { WorldRenderInstance } from './world-asset-renderer';
import type { WorldPose } from './world-layout';
import { modelMatrix } from './world-props';

/** Original Blender surface baked in model space; no remote URLs or executable source. */
export type AvatarManifest = {
  version: 1;
  binary: string | string[];
  byteLength: number;
  frames: { name: string }[];
  walk: { startFrame: number; frameCount: number; duration: number };
  idleFrame: number;
  rideFrame: number;
  textures: { file: string }[];
  batches: { name: string; vertexCount: number; baseByteOffset: number; frameByteOffsets: number[]; material: WorldGlbMaterial }[];
};
const MAX_BYTES = 48 * 1024 * 1024;
const MAX_VERTICES = 180_000;
const PREFIX = 'mongsang.original';
const BASE = '/world-assets/mongsangnyeo/';
const invalid = (): never => { throw new Error('몽상녀 원본 자산의 형식을 확인해 주세요.'); };
const integer = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
const filename = (s: unknown): s is string => typeof s === 'string' && /^[a-zA-Z0-9_-]+\.(bin|png|jpg|jpeg|webp)$/.test(s);
const numbers = (v: unknown, count: number, min: number, max: number) => Array.isArray(v) && v.length === count && v.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max);
export function parseAvatarManifest(value: unknown): AvatarManifest {
  if (!value || typeof value !== 'object') return invalid();
  const m = value as AvatarManifest;
  const parts = Array.isArray(m.binary) ? m.binary : [m.binary];
  if (m.version !== 1 || !parts.length || parts.length > 4 || !parts.every((p) => filename(p) && p.endsWith('.bin')) ||
      !integer(m.byteLength, 1, MAX_BYTES) || !Array.isArray(m.frames) || m.frames.length < 3 || m.frames.length > 32 ||
      !m.frames.every((f) => f && typeof f.name === 'string') || !integer(m.idleFrame, 0, m.frames.length - 1) ||
      !integer(m.rideFrame, 0, m.frames.length - 1) || !m.walk || !integer(m.walk.startFrame, 0, m.frames.length - 1) ||
      !integer(m.walk.frameCount, 2, m.frames.length - m.walk.startFrame) || !Number.isFinite(m.walk.duration) || m.walk.duration <= 0 || m.walk.duration > 20 ||
      !Array.isArray(m.textures) || m.textures.length > 8 || !m.textures.every((t) => t && filename(t.file) && !t.file.endsWith('.bin')) ||
      !Array.isArray(m.batches) || !m.batches.length || m.batches.length > 16) return invalid();
  let total = 0;
  const ranges: [number, number][] = [];
  for (const b of m.batches) {
    if (!b || typeof b.name !== 'string' || !integer(b.vertexCount, 3, MAX_VERTICES) || b.vertexCount % 3 ||
        !integer(b.baseByteOffset, 0, m.byteLength) || b.baseByteOffset % 4 || !Array.isArray(b.frameByteOffsets) || b.frameByteOffsets.length !== m.frames.length) return invalid();
    const end = b.baseByteOffset + b.vertexCount * 48;
    if (end > m.byteLength) return invalid();
    ranges.push([b.baseByteOffset, end]);
    for (const offset of b.frameByteOffsets) {
      if (!integer(offset, 0, m.byteLength) || offset % 4 || offset + b.vertexCount * 24 > m.byteLength) return invalid();
      ranges.push([offset, offset + b.vertexCount * 24]);
    }
    const a = b.material;
    if (!a || !numbers(a.baseColorFactor, 4, 0, 1) || !numbers(a.emissiveFactor, 3, 0, 4) || !Number.isFinite(a.emissiveStrength) || a.emissiveStrength < 0 || a.emissiveStrength > 10 ||
        (a.textureIndex !== null && !integer(a.textureIndex, 0, m.textures.length - 1)) || !['OPAQUE', 'MASK', 'BLEND'].includes(a.alphaMode) || !Number.isFinite(a.alphaCutoff) ||
        a.alphaCutoff < 0 || a.alphaCutoff > 1 || typeof a.doubleSided !== 'boolean' || typeof a.unlit !== 'boolean') return invalid();
    total += b.vertexCount;
  }
  if (total > MAX_VERTICES) return invalid();
  ranges.sort((a, b) => a[0] - b[0]);
  if (ranges.some((r, i) => i > 0 && r[0] < ranges[i - 1][1])) return invalid();
  return m;
}
export type OriginalAvatar = {
  scene: WorldGlbScene;
  meshNames: string[];
  sample(seconds: number, speed: number, riding: boolean, dt: number): boolean;
};
export function createOriginalAvatar(manifest: AvatarManifest, bytes: ArrayBuffer): OriginalAvatar {
  const m = parseAvatarManifest(manifest);
  if (bytes.byteLength !== m.byteLength) return invalid();
  const frames = m.batches.map((b) => b.frameByteOffsets.map((offset) => new Float32Array(bytes, offset, b.vertexCount * 6)));
  const batches: WorldGlbBatch[] = m.batches.map((b) => ({ vertexCount: b.vertexCount, vertices: new Float32Array(bytes, b.baseByteOffset, b.vertexCount * 12).slice(), material: { ...b.material } }));
  const min: [number, number, number] = [Infinity, Infinity, Infinity], max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let b = 0; b < batches.length; b++) {
    if (!batches[b].vertices.every(Number.isFinite)) return invalid();
    for (const f of frames[b]) for (let n = 0; n < f.length; n += 6) {
      if (![f[n], f[n + 1], f[n + 2], f[n + 3], f[n + 4], f[n + 5]].every(Number.isFinite) ||
          Math.max(Math.abs(f[n]), Math.abs(f[n + 1]), Math.abs(f[n + 2])) > 5 || Math.abs(Math.hypot(f[n + 3], f[n + 4], f[n + 5]) - 1) > 0.05) return invalid();
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], f[n + k]); max[k] = Math.max(max[k], f[n + k]); }
    }
  }
  const scene: WorldGlbScene = {
    batches, textures: [], bounds: { min, max }, triangleCount: batches.reduce((n, b) => n + b.vertexCount / 3, 0),
    stats: { nodeCount: batches.length, meshInstances: batches.length, primitiveCount: batches.length, materialCount: batches.length, textureCount: m.textures.length },
    dispose() { for (const t of scene.textures) t.image.close(); scene.textures.length = 0; }
  };
  let settled = false, lastMode = '', first = true;
  return { scene, meshNames: batches.map((_, i) => `${PREFIX}.${i}`), sample(seconds, speed, riding, dt) {
    const walking = !riding && speed > 0.08, mode = riding ? 'ride' : walking ? 'walk' : 'idle';
    if (!walking && mode === lastMode && settled) return false;
    if (mode !== lastMode) settled = false;
    lastMode = mode;
    const phase = ((seconds / m.walk.duration) % 1 + 1) % 1 * m.walk.frameCount;
    const a = riding ? m.rideFrame : walking ? m.walk.startFrame + Math.floor(phase) : m.idleFrame;
    const b = walking ? m.walk.startFrame + (Math.floor(phase) + 1) % m.walk.frameCount : a;
    const blend = walking ? phase % 1 : 0, ease = first ? 1 : 1 - Math.exp(-Math.max(0, Math.min(dt, 0.1)) * 24);
    first = false;
    let error = 0;
    batches.forEach((batch, i) => {
      const fa = frames[i][a], fb = frames[i][b], out = batch.vertices;
      for (let v = 0; v < batch.vertexCount; v++) {
        const src = v * 6, dest = v * 12;
        for (let k = 0; k < 6; k++) {
          const target = fa[src + k] + (fb[src + k] - fa[src + k]) * blend, delta = target - out[dest + k];
          error = Math.max(error, Math.abs(delta)); out[dest + k] += delta * ease;
        }
        const len = Math.hypot(out[dest + 3], out[dest + 4], out[dest + 5]) || 1;
        for (let k = 3; k < 6; k++) out[dest + k] /= len;
      }
    });
    settled = error < 0.0001;
    return true;
  } };
}
async function fetchAsset(path: string, signal: AbortSignal, max: number) {
  const response = await fetch(BASE + path, { signal });
  if (!response.ok) throw new Error('몽상녀 원본을 불러오지 못했습니다.');
  if (Number(response.headers.get('content-length') || 0) > max) return invalid();
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > max) return invalid();
  return bytes;
}
export async function loadOriginalAvatar(signal: AbortSignal): Promise<OriginalAvatar> {
  const raw = await fetchAsset('avatar.json', signal, 64 * 1024);
  const m = parseAvatarManifest(JSON.parse(new TextDecoder().decode(raw)));
  const paths = Array.isArray(m.binary) ? m.binary : [m.binary];
  const combined = new Uint8Array(m.byteLength);
  let offset = 0;
  for (const path of paths) { const part = await fetchAsset(path, signal, m.byteLength - offset); combined.set(new Uint8Array(part), offset); offset += part.byteLength; }
  if (offset !== m.byteLength) return invalid();
  const avatar = createOriginalAvatar(m, combined.buffer);
  try {
    for (const t of m.textures) {
      const data = await fetchAsset(t.file, signal, 5 * 1024 * 1024);
      const image = await createImageBitmap(new Blob([data]), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
      if (signal.aborted || image.width > 2048 || image.height > 2048) { image.close(); return invalid(); }
      avatar.scene.textures.push({ image, wrapS: 33071, wrapT: 33071, minFilter: 9729, magFilter: 9729 });
    }
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    avatar.sample(0, 0, false, 0);
    return avatar;
  } catch (error) { avatar.scene.dispose(); throw error; }
}
export function originalAvatarInstances(avatar: OriginalAvatar, pose: WorldPose, yaw: number, opacity: number, riding: boolean): WorldRenderInstance[] {
  if (opacity <= 0.02) return [];
  const model = modelMatrix(pose.x, riding ? 0.24 : 0, pose.z, yaw, 0.415);
  return avatar.meshNames.map((mesh) => ({ mesh, model, smooth: true, surfaceLighting: true, tint: [1, 1, 1, opacity], ...(opacity < 0.98 ? { blend: 'alpha' as const } : {}) }));
}
