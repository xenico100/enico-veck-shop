import type {
  WorldGlbBatch,
  WorldGlbScene,
  WorldGlbTexture
} from './world-glb';
import type { WorldPose } from './world-layout';
import type { WorldProjection } from './world-renderer';
import { worldCameraBasis } from './world-camera';

type Point = [number, number, number];
type Material = WorldGlbBatch['material'] & {
  emissiveFactor?: Point;
  emissiveStrength?: number;
  unlit?: boolean;
};
type DrawBatch = {
  buffer: WebGLBuffer;
  source: WorldGlbBatch;
  texture: WebGLTexture | null;
  center: Point;
  /** Emissive surfaces bright enough to be light sources (lamps, windows, neon). */
  lightSource: boolean;
};

export type AssetWorldRendererStats = {
  drawCalls: number;
  triangles: number;
  geometryBytes: number;
  textureBytes: number;
  scenes: number;
  contextLost: boolean;
  restoreFailed: boolean;
};

export type WorldRenderLight = {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: Point;
};

export type WorldRenderInstance = {
  mesh: string;
  /** Column-major model matrix. */
  model: Float32Array;
  tint?: [number, number, number, number];
  /** Linear emissive color; replaces the mesh material emission. */
  emissive?: Point;
  /** Soft emission follows vertex/material color, preserving dark character clothing and fur. */
  surfaceLighting?: boolean;
  /** Preserve original avatar detail independently of the PS1 world. */
  smooth?: boolean;
  blend?: 'opaque' | 'alpha' | 'add';
  noFog?: boolean;
  /** Sky layer draws first, without depth writes. */
  layer?: 'sky' | 'world';
  /** 1 rain, 2 drifting dust: anchors wrap around the camera. */
  particle?: 0 | 1 | 2;
};

export type WorldRenderFrame = {
  instances: WorldRenderInstance[];
  lights: WorldRenderLight[];
  /** 0 = off. The beam follows the camera. */
  flashlight: number;
  fog: { color: Point; near: number; far: number };
  ambient: Point;
  moon: Point;
  /** Multiplies lamp/window/neon emission; drops during the blackout. */
  lightSources: number;
  /** Fill emission baked into the export, multiplied by base color. */
  ambientFill: number;
  /** Dream wobble applied to every vertex. */
  warp: number;
  eyeOffset: number;
  /** Absolute rendering eye and independent player-held flashlight. */
  eyeY?: number;
  flashOrigin?: Point;
  flashDirection?: Point;
  roll?: number;
  psx: { snap: boolean; dither: boolean; affine: number };
  /** Screen-space treatment done in-shader instead of stacked DOM layers. */
  screen?: { vignette: number; danger: number; scanlines: number };
};

export type AssetWorldRenderer = {
  resize(): void;
  render(pose: WorldPose, time: number, frame?: WorldRenderFrame): void;
  project(point: { x: number; y: number; z: number }): WorldProjection | null;
  addScene(scene: WorldGlbScene): void;
  /** Uploads procedural meshes once; retained for context restoration. */
  registerMeshes(meshes: Record<string, WorldGlbBatch>): void;
  registerNamedScene(prefix: string, scene: WorldGlbScene): void;
  updateMesh(name: string): void;
  /** Internal pixel budget for the shorter side; CSS upscales with nearest filtering. */
  setResolution(height: number): void;
  dispose(): void;
  readonly stats: AssetWorldRendererStats;
};

// Blender world RGB (0.10, 0.145, 0.205) at strength 0.55, in linear space.
const SKY_LINEAR: Point = [0.055, 0.07975, 0.11275];
const FOG_LINEAR: Point = [0.075, 0.13, 0.175];
const linearChannelToSrgb = (value: number) =>
  value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
const SKY = SKY_LINEAR.map(linearChannelToSrgb) as Point;
const EYE_HEIGHT = 0.66;
const STRIDE_BYTES = 48;
const MAX_LIGHTS = 8;
const PARTICLE_BOX = 22;

/** The original look, used when no game frame is supplied. */
const DEFAULT_FRAME: WorldRenderFrame = {
  instances: [],
  lights: [],
  flashlight: 0,
  fog: { color: FOG_LINEAR, near: 6, far: 64 },
  ambient: [0.055, 0.07975, 0.11275],
  moon: [0.82, 0.96, 1.1],
  lightSources: 1,
  ambientFill: -1,
  warp: 0,
  eyeOffset: 0,
  psx: { snap: false, dither: false, affine: 0 }
};

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
attribute vec4 aColor;
uniform mat4 uViewProjection;
uniform mat4 uModel;
uniform vec2 uSnapResolution;
uniform float uSnap;
uniform float uWarp;
uniform float uClock;
uniform float uParticle;
uniform vec3 uParticleEye;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vAffineUv;
varying vec4 vColor;
varying vec3 vWorldPosition;
void main() {
  vec4 world;
  vec3 normal = aNormal;
  if (uParticle > 0.5) {
    // Anchor wraps in a box around the camera; the normal slot holds the corner.
    vec3 anchor = aPosition;
    anchor.xz = mod(anchor.xz - uParticleEye.xz, ${PARTICLE_BOX.toFixed(1)}) -
      ${(PARTICLE_BOX / 2).toFixed(1)} + uParticleEye.xz;
    if (uParticle < 1.5) {
      anchor.y = mod(anchor.y - uClock * 7.5, 9.0) - 1.0;
      anchor.x += anchor.y * 0.05;
    } else {
      anchor.y = mod(anchor.y + uClock * 0.12, 3.2) + 0.1;
      anchor.x += sin(uClock * 0.4 + anchor.z * 3.0) * 0.25;
      anchor.z += cos(uClock * 0.3 + anchor.x * 2.0) * 0.2;
    }
    world = vec4(anchor + aNormal, 1.0);
    normal = vec3(0.0, 1.0, 0.0);
  } else {
    world = uModel * vec4(aPosition, 1.0);
    normal = (uModel * vec4(aNormal, 0.0)).xyz;
  }
  if (uWarp > 0.0) {
    world.x += sin(world.z * 1.7 + uClock * 1.3) * uWarp * 0.09;
    world.y += sin(world.x * 2.1 + uClock * 1.9) * uWarp * 0.05;
    world.z += cos(world.y * 1.3 + uClock * 1.1) * uWarp * 0.07;
  }
  vec4 clip = uViewProjection * world;
  // PlayStation-style vertex snapping to the low-resolution pixel grid.
  if (uSnap > 0.5 && clip.w > 0.0) {
    vec2 ndc = clip.xy / clip.w;
    ndc = floor(ndc * uSnapResolution + 0.5) / uSnapResolution;
    clip.xy = ndc * clip.w;
  }
  vNormal = normal;
  vUv = aUv;
  vAffineUv = vec3(aUv * clip.w, clip.w);
  vColor = aColor;
  vWorldPosition = world.xyz;
  gl_Position = clip;
}`;

const fragmentSource = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uHasTexture;
uniform vec4 uBaseColor;
uniform vec4 uTint;
uniform vec3 uEmissive;
uniform float uEmissiveStrength;
uniform float uEmissiveMode;
uniform float uLightSources;
uniform float uAmbientFill;
uniform float uUnlit;
uniform float uDoubleSided;
uniform float uAlphaMode;
uniform float uAlphaCutoff;
uniform float uAffine;
uniform float uNoFog;
uniform float uDither;
uniform vec3 uFog;
uniform vec2 uFogRange;
uniform vec3 uEye;
uniform vec3 uAmbient;
uniform vec3 uMoon;
uniform vec4 uLights[${MAX_LIGHTS}];
uniform vec3 uLightColors[${MAX_LIGHTS}];
uniform float uLightCount;
uniform vec3 uFlashDirection;
uniform vec3 uFlashOrigin;
uniform float uFlash;
uniform vec2 uResolution;
uniform vec3 uScreen;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vAffineUv;
varying vec4 vColor;
varying vec3 vWorldPosition;
vec3 srgbToLinear(vec3 value) {
  return mix(value / 12.92, pow((value + 0.055) / 1.055, vec3(2.4)),
    step(vec3(0.04045), value));
}
vec3 linearToSrgb(vec3 value) {
  value = max(value, vec3(0.0));
  return mix(value * 12.92, 1.055 * pow(value, vec3(1.0 / 2.4)) - 0.055,
    step(vec3(0.0031308), value));
}
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x / 2.0 + a.y * a.y * 0.75);
}
float bayer4(vec2 a) {
  return bayer2(0.5 * a) * 0.25 + bayer2(a);
}
void main() {
  vec4 texel = vec4(1.0);
  if (uHasTexture > 0.5) {
    // Partially affine texture mapping: the PS1 had no perspective correction.
    vec2 uv = mix(vUv, vAffineUv.xy / vAffineUv.z, uAffine);
    texel = texture2D(uTexture, uv);
    texel.rgb = srgbToLinear(texel.rgb);
  }
  // glTF factors and COLOR_0 are linear; only the bitmap RGB is sRGB encoded.
  vec4 base = texel * uBaseColor * vColor * uTint;
  if (uAlphaMode > 0.5 && uAlphaMode < 1.5 && base.a < uAlphaCutoff) discard;
  vec3 normal = normalize(vNormal);
  if (uDoubleSided > 0.5 && !gl_FrontFacing) normal = -normal;
  vec3 hemisphere = uAmbient * (0.5 + 0.5 * clamp(normal.y * 0.5 + 0.5, 0.0, 1.0));
  // Source Sun Euler (28, -20, -32 degrees), converted from Blender Z-up.
  float sunlight = max(dot(normal, normalize(vec3(-0.505, 0.830, 0.238))), 0.0);
  vec3 lighting = hemisphere + uMoon * sunlight;
  // Constant trip count so drivers unroll it; unused slots carry zero color.
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    vec3 toLight = uLights[i].xyz - vWorldPosition;
    float distanceToLight = length(toLight);
    float falloff = clamp(1.0 - distanceToLight / uLights[i].w, 0.0, 1.0);
    float wrap = max(dot(normal, toLight / max(distanceToLight, 0.001)), 0.0) * 0.7 + 0.3;
    lighting += uLightColors[i] * falloff * falloff * wrap;
  }
  if (uFlash > 0.0) {
    vec3 toSurface = vWorldPosition - uFlashOrigin;
    float reach = length(toSurface);
    vec3 direction = toSurface / max(reach, 0.001);
    float cone = smoothstep(0.86, 0.965, dot(direction, uFlashDirection));
    float spill = smoothstep(0.55, 0.9, dot(direction, uFlashDirection)) * 0.12;
    float attenuation = (cone + spill) * smoothstep(15.0, 1.5, reach) / (1.0 + reach * reach * 0.05);
    float facing = max(dot(normal, -direction), 0.0) * 0.6 + 0.4;
    lighting += vec3(1.0, 0.93, 0.78) * min(attenuation * facing, 0.75) * uFlash * 1.9;
  }
  vec3 color = base.rgb * mix(lighting, vec3(1.0), uUnlit);
  vec3 emission = uEmissive * uEmissiveStrength;
  if (uEmissiveMode > 0.5) {
    color += (uHasTexture > 0.5 ? texel.rgb * emission * 1.35 : emission) * uLightSources;
  } else if (uAmbientFill >= 0.0) {
    color += base.rgb * emission * uAmbientFill;
  } else {
    color += emission;
  }
  float distanceToEye = length(vWorldPosition - uEye);
  float fog = smoothstep(uFogRange.x, uFogRange.y, distanceToEye) * (1.0 - uNoFog);
  color = mix(color, uFog, fog);
  float alpha = uAlphaMode > 1.5 ? clamp(base.a, 0.0, 1.0) : 1.0;
  // Vignette, danger bleed and CRT rows; x = vignette, y = danger, z = scanlines.
  vec2 screen = gl_FragCoord.xy / uResolution - 0.5;
  float edge = dot(screen, screen);
  color *= clamp(1.0 - edge * uScreen.x, 0.0, 1.0);
  color = mix(color, color * vec3(1.7, 0.22, 0.18) + vec3(0.02, 0.0, 0.0),
    uScreen.y * smoothstep(0.04, 0.3, edge));
  color *= 1.0 - uScreen.z * step(1.0, mod(gl_FragCoord.y, 2.0));
  vec3 encoded = linearToSrgb(color);
  if (uDither > 0.5) {
    // 15-bit color with an ordered 4x4 dither, as on the original hardware.
    encoded += (bayer4(gl_FragCoord.xy) - 0.5) / 31.0;
    encoded = floor(encoded * 31.0 + 0.5) / 31.0;
  }
  gl_FragColor = vec4(clamp(encoded, 0.0, 1.0), alpha);
}`;

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) {
        result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
      }
    }
  }
  return result;
}

const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const WHITE: [number, number, number, number] = [1, 1, 1, 1];

function batchCenter(batch: WorldGlbBatch): Point {
  const min: Point = [Infinity, Infinity, Infinity];
  const max: Point = [-Infinity, -Infinity, -Infinity];
  for (let vertex = 0; vertex < batch.vertexCount; vertex++) {
    for (let axis = 0; axis < 3; axis++) {
      const value = batch.vertices[vertex * 12 + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  return min.map((value, axis) => (value + max[axis]) / 2) as Point;
}

function isLightSource(material: Material): boolean {
  const emissive = material.emissiveFactor ?? [0, 0, 0];
  return (
    (material.emissiveStrength ?? 1) > 1.01 ||
    Math.max(emissive[0], emissive[1], emissive[2]) >= 0.3
  );
}

/** Owns supplied scenes, including failed uploads; restore reuses their bitmaps. */
export function createAssetWorldRenderer(
  canvas: HTMLCanvasElement,
  initialScene: WorldGlbScene
): AssetWorldRenderer {
  const context = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    powerPreference: 'low-power'
  });
  if (!context) {
    initialScene.dispose();
    throw new Error('이 브라우저에서는 WebGL 마을을 표시할 수 없습니다.');
  }
  const gl = context;
  const scenes: WorldGlbScene[] = [initialScene];
  const batches: DrawBatch[] = [];
  const textures: WebGLTexture[] = [];
  const meshSources: Record<string, WorldGlbBatch> = {};
  const meshes = new Map<string, DrawBatch>();
  const namedScenes: { prefix: string; scene: WorldGlbScene }[] = [];
  const stats: AssetWorldRendererStats = {
    drawCalls: 0,
    triangles: 0,
    geometryBytes: 0,
    textureBytes: 0,
    scenes: 1,
    contextLost: false,
    restoreFailed: false
  };
  let program: WebGLProgram | null = null;
  let disposed = false;
  let lost = false;
  let cssWidth = 1;
  let cssHeight = 1;
  let targetHeight = 720;
  let matrix: Float32Array = new Float32Array(16);
  let matrixValid = false;
  let fallbackTexture: WebGLTexture | null = null;
  let lastPose: WorldPose | null = null;
  let lastTime = 0;
  let lastFrame: WorldRenderFrame | undefined;
  let renderLastFrame: (() => void) | null = null;
  let attributes: { location: number; size: number; offset: number }[] = [];
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  const lightData = new Float32Array(MAX_LIGHTS * 4);
  const lightColorData = new Float32Array(MAX_LIGHTS * 3);

  function destroyGpu() {
    for (const batch of batches) gl.deleteBuffer(batch.buffer);
    meshes.forEach((batch) => gl.deleteBuffer(batch.buffer));
    for (const texture of textures) gl.deleteTexture(texture);
    if (program) gl.deleteProgram(program);
    batches.length = 0;
    meshes.clear();
    textures.length = 0;
    fallbackTexture = null;
    program = null;
    stats.drawCalls = 0;
    stats.triangles = 0;
    stats.geometryBytes = 0;
    stats.textureBytes = 0;
    matrixValid = false;
  }

  function makeShader(type: number, source: string): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('마을 셰이더 메모리를 할당하지 못했습니다.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      throw new Error('마을 셰이더를 컴파일하지 못했습니다.');
    }
    return shader;
  }

  function makeProgram(): WebGLProgram {
    const vertex = makeShader(gl.VERTEX_SHADER, vertexSource);
    let fragment: WebGLShader | null = null;
    let result: WebGLProgram | null = null;
    try {
      fragment = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
      result = gl.createProgram();
      if (!result)
        throw new Error('마을 프로그램 메모리를 할당하지 못했습니다.');
      gl.attachShader(result, vertex);
      gl.attachShader(result, fragment);
      gl.linkProgram(result);
      if (!gl.getProgramParameter(result, gl.LINK_STATUS)) {
        throw new Error('마을 셰이더를 연결하지 못했습니다.');
      }
      return result;
    } catch (error) {
      if (result) gl.deleteProgram(result);
      throw error;
    } finally {
      gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
    }
  }

  function uploadTexture(source: WorldGlbTexture): {
    texture: WebGLTexture;
    bytes: number;
  } {
    const { width, height } = source.image;
    const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (!width || !height || width > maxSize || height > maxSize) {
      throw new Error('이 기기의 텍스처 크기 제한을 넘었습니다.');
    }
    const texture = gl.createTexture();
    if (!texture) throw new Error('마을 텍스처 메모리를 할당하지 못했습니다.');
    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 0);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source.image
      );
      const powerOfTwo =
        (width & (width - 1)) === 0 && (height & (height - 1)) === 0;
      const wrap = (value: number) =>
        value === gl.REPEAT || value === gl.MIRRORED_REPEAT
          ? value
          : gl.CLAMP_TO_EDGE;
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_S,
        powerOfTwo ? wrap(source.wrapS) : gl.CLAMP_TO_EDGE
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_T,
        powerOfTwo ? wrap(source.wrapT) : gl.CLAMP_TO_EDGE
      );
      // Point filtering preserves the source pixel art. WebGL 1 NPOT textures
      // need clamp/no mipmaps; linear is the explicit compatibility fallback.
      const mipmaps =
        powerOfTwo &&
        source.minFilter >= gl.NEAREST_MIPMAP_NEAREST &&
        source.minFilter <= gl.LINEAR_MIPMAP_LINEAR;
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        powerOfTwo && source.magFilter !== gl.LINEAR ? gl.NEAREST : gl.LINEAR
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        powerOfTwo
          ? mipmaps
            ? gl.NEAREST_MIPMAP_NEAREST
            : source.minFilter === gl.LINEAR ? gl.LINEAR : gl.NEAREST
          : gl.LINEAR
      );
      if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
      return {
        texture,
        bytes: Math.ceil(width * height * 4 * (mipmaps ? 4 / 3 : 1))
      };
    } catch (error) {
      gl.deleteTexture(texture);
      throw error;
    }
  }

  function uploadScene(scene: WorldGlbScene) {
    const uploadedTextures: WebGLTexture[] = [];
    const uploadedBatches: DrawBatch[] = [];
    let textureBytes = 0;
    try {
      for (const source of scene.textures) {
        const uploaded = uploadTexture(source);
        uploadedTextures.push(uploaded.texture);
        textureBytes += uploaded.bytes;
      }
      for (const source of scene.batches) {
        if (!source.vertexCount) continue;
        if (source.vertices.byteLength !== source.vertexCount * STRIDE_BYTES) {
          throw new Error('마을 정점 버퍼 크기를 확인해 주세요.');
        }
        const index = source.material.textureIndex;
        if (index !== null && !uploadedTextures[index]) {
          throw new Error('마을 텍스처 참조를 확인해 주세요.');
        }
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('마을 정점 메모리를 할당하지 못했습니다.');
        // Register immediately so any subsequent upload failure releases it.
        uploadedBatches.push({
          buffer,
          source,
          texture: index === null ? null : uploadedTextures[index],
          center: batchCenter(source),
          lightSource: isLightSource(source.material)
        });
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, source.vertices, gl.STATIC_DRAW);
      }
    } catch (error) {
      for (const batch of uploadedBatches) gl.deleteBuffer(batch.buffer);
      for (const texture of uploadedTextures) gl.deleteTexture(texture);
      throw error;
    }
    textures.push(...uploadedTextures);
    batches.push(...uploadedBatches);
    stats.textureBytes += textureBytes;
    for (const batch of uploadedBatches) {
      stats.geometryBytes += batch.source.vertices.byteLength;
      stats.triangles += batch.source.vertexCount / 3;
    }
  }

  function uploadMesh(name: string, source: WorldGlbBatch, texture: WebGLTexture | null = null) {
    if (!source.vertexCount) return;
    if (source.vertices.byteLength !== source.vertexCount * STRIDE_BYTES)
      throw new Error('소품 정점 버퍼 크기를 확인해 주세요.');
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('소품 정점 메모리를 할당하지 못했습니다.');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, source.vertices, gl.STATIC_DRAW);
    const previous = meshes.get(name);
    if (previous) { gl.deleteBuffer(previous.buffer); stats.geometryBytes -= previous.source.vertices.byteLength; }
    meshes.set(name, {
      buffer,
      source,
      texture,
      center: [0, 0, 0],
      lightSource: false
    });
    stats.geometryBytes += source.vertices.byteLength;
  }

  function uploadNamedScene(prefix: string, scene: WorldGlbScene) {
    const uploaded: WebGLTexture[] = [];
    const names: string[] = [];
    let textureBytes = 0;
    try {
      for (const source of scene.textures) {
        const result = uploadTexture(source);
        uploaded.push(result.texture);
        textureBytes += result.bytes;
      }
      scene.batches.forEach((source, index) => {
        const textureIndex = source.material.textureIndex;
        if (textureIndex !== null && !uploaded[textureIndex])
          throw new Error('아바타 텍스처 참조를 확인해 주세요.');
        const name = `${prefix}.${index}`;
        uploadMesh(name, source, textureIndex === null ? null : uploaded[textureIndex]);
        names.push(name);
      });
    } catch (error) {
      for (const name of names) {
        const batch = meshes.get(name)!;
        gl.deleteBuffer(batch.buffer);
        stats.geometryBytes -= batch.source.vertices.byteLength;
        meshes.delete(name);
      }
      for (const texture of uploaded) gl.deleteTexture(texture);
      throw error;
    }
    textures.push(...uploaded);
    stats.textureBytes += textureBytes;
  }

  function initialize() {
    try {
      program = makeProgram();
      fallbackTexture = gl.createTexture();
      if (!fallbackTexture)
        throw new Error('마을 기본 텍스처를 만들지 못했습니다.');
      textures.push(fallbackTexture);
      gl.bindTexture(gl.TEXTURE_2D, fallbackTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255])
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      stats.textureBytes += 4;
      attributes = [
        { name: 'aPosition', size: 3, offset: 0 },
        { name: 'aNormal', size: 3, offset: 12 },
        { name: 'aUv', size: 2, offset: 24 },
        { name: 'aColor', size: 4, offset: 32 }
      ].map(({ name, ...attribute }) => ({
        ...attribute,
        location: gl.getAttribLocation(program!, name)
      }));
      uniforms = {};
      for (const name of [
        'uViewProjection',
        'uModel',
        'uSnapResolution',
        'uSnap',
        'uWarp',
        'uClock',
        'uParticle',
        'uParticleEye',
        'uEye',
        'uFlashOrigin',
        'uTexture',
        'uHasTexture',
        'uBaseColor',
        'uTint',
        'uEmissive',
        'uEmissiveStrength',
        'uEmissiveMode',
        'uLightSources',
        'uAmbientFill',
        'uUnlit',
        'uDoubleSided',
        'uAlphaMode',
        'uAlphaCutoff',
        'uAffine',
        'uNoFog',
        'uDither',
        'uFog',
        'uFogRange',
        'uAmbient',
        'uMoon',
        'uLights',
        'uLightColors',
        'uLightCount',
        'uFlashDirection',
        'uFlash',
        'uResolution',
        'uScreen'
      ]) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      for (const scene of scenes) uploadScene(scene);
      for (const [name, source] of Object.entries(meshSources))
        uploadMesh(name, source);
      for (const { prefix, scene } of namedScenes) uploadNamedScene(prefix, scene);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      // The imported scene includes ground planes. Keep those visible from
      // both sides; double-sided materials also flip their back-face normals.
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.clearColor(...SKY, 1);
    } catch (error) {
      destroyGpu();
      throw error;
    }
  }

  function resize() {
    if (disposed) return;
    cssWidth = Math.max(1, canvas.clientWidth || canvas.width);
    cssHeight = Math.max(1, canvas.clientHeight || canvas.height);
    // The pixel budget applies to the shorter side, so portrait phones keep
    // the same chunky-but-readable grid as a landscape 240p screen.
    const scale = Math.min(
      1,
      960 / cssWidth,
      720 / cssHeight,
      targetHeight / Math.min(cssWidth, cssHeight)
    );
    const width = Math.max(1, Math.round(cssWidth * scale));
    const height = Math.max(1, Math.round(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (!lost) gl.viewport(0, 0, width, height);
  }

  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    stats.contextLost = true;
    destroyGpu();
  };
  const onRestored = () => {
    if (disposed) return;
    try {
      initialize();
      lost = false;
      stats.contextLost = false;
      stats.restoreFailed = false;
      resize();
      renderLastFrame?.();
    } catch {
      lost = true;
      stats.restoreFailed = true;
    }
  };

  try {
    initialize();
    resize();
  } catch (error) {
    destroyGpu();
    initialScene.dispose();
    throw error;
  }
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  function bindBatch(batch: DrawBatch) {
    gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer);
    for (const attribute of attributes) {
      if (attribute.location < 0) continue;
      gl.enableVertexAttribArray(attribute.location);
      gl.vertexAttribPointer(
        attribute.location,
        attribute.size,
        gl.FLOAT,
        false,
        STRIDE_BYTES,
        attribute.offset
      );
    }
  }

  function draw(
    batch: DrawBatch,
    frame: WorldRenderFrame,
    instance?: WorldRenderInstance
  ) {
    const material: Material = batch.source.material;
    gl.uniform1f(uniforms.uSnap, !instance?.smooth && frame.psx.snap ? 1 : 0);
    gl.uniform1f(uniforms.uAffine, instance?.smooth ? 0 : frame.psx.affine);
    gl.uniform1f(uniforms.uDither, !instance?.smooth && frame.psx.dither ? 1 : 0);
    bindBatch(batch);
    gl.bindTexture(gl.TEXTURE_2D, batch.texture ?? fallbackTexture);
    gl.uniform1f(uniforms.uHasTexture, batch.texture ? 1 : 0);
    gl.uniform4f(uniforms.uBaseColor, ...material.baseColorFactor);
    gl.uniform4f(uniforms.uTint, ...(instance?.tint ?? WHITE));
    gl.uniformMatrix4fv(uniforms.uModel, false, instance?.model ?? IDENTITY);
    const emissive = instance?.emissive ?? material.emissiveFactor ?? [0, 0, 0];
    gl.uniform3f(uniforms.uEmissive, emissive[0], emissive[1], emissive[2]);
    gl.uniform1f(
      uniforms.uEmissiveStrength,
      instance?.emissive ? 1 : (material.emissiveStrength ?? 1)
    );
    const glowing = instance?.surfaceLighting ? false : instance ? true : batch.lightSource;
    gl.uniform1f(uniforms.uEmissiveMode, glowing ? 1 : 0);
    gl.uniform1f(uniforms.uLightSources, instance ? 1 : frame.lightSources);
    gl.uniform1f(uniforms.uUnlit, material.unlit ? 1 : 0);
    gl.uniform1f(uniforms.uDoubleSided, material.doubleSided ? 1 : 0);
    const blend = instance?.blend;
    gl.uniform1f(
      uniforms.uAlphaMode,
      blend === 'alpha' || blend === 'add' || material.alphaMode === 'BLEND'
        ? 2
        : material.alphaMode === 'MASK'
          ? 1
          : 0
    );
    gl.uniform1f(uniforms.uAlphaCutoff, material.alphaCutoff);
    gl.uniform1f(uniforms.uNoFog, instance?.noFog ? 1 : 0);
    gl.uniform1f(uniforms.uParticle, instance?.particle ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, batch.source.vertexCount);
    stats.drawCalls += 1;
  }

  const renderer: AssetWorldRenderer = {
    stats,
    resize,
    addScene(scene) {
      if (disposed)
        throw new Error('종료된 마을 렌더러에는 장면을 추가할 수 없습니다.');
      if (scenes.includes(scene)) return;
      // Retain CPU data during context loss so restore uploads it without I/O.
      try {
        if (!lost) uploadScene(scene);
      } catch (error) {
        scene.dispose();
        throw error;
      }
      scenes.push(scene);
      stats.scenes = scenes.length + namedScenes.length;
    },
    registerMeshes(sources) {
      if (disposed) return;
      for (const [name, source] of Object.entries(sources)) {
        meshSources[name] = source;
        if (!lost && program) uploadMesh(name, source);
      }
    },
    registerNamedScene(prefix, scene) {
      if (disposed) { scene.dispose(); return; }
      if (!/^[a-z][a-z0-9.-]*$/i.test(prefix) || namedScenes.some((entry) => entry.prefix === prefix)) {
        scene.dispose();
        throw new Error('중복된 아바타 메시 이름입니다.');
      }
      try { if (!lost) uploadNamedScene(prefix, scene); }
      catch (error) { scene.dispose(); throw error; }
      namedScenes.push({ prefix, scene });
      stats.scenes = scenes.length + namedScenes.length;
    },
    updateMesh(name) {
      if (disposed || lost) return;
      const batch = meshes.get(name);
      if (!batch) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, batch.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.source.vertices);
    },
    setResolution(height) {
      const next = Math.max(120, Math.min(720, Math.round(height)));
      if (next === targetHeight) return;
      targetHeight = next;
      resize();
    },
    render(pose, _time, frameInput) {
      lastPose = { ...pose };
      lastTime = _time;
      lastFrame = frameInput;
      if (lost || disposed || !program) return;
      const frame = frameInput ?? DEFAULT_FRAME;
      const { right, up, forward } = worldCameraBasis(pose);
      let viewRight = right;
      let viewUp = up;
      if (frame.roll) {
        const c = Math.cos(frame.roll),
          s = Math.sin(frame.roll);
        viewRight = [
          right[0] * c + up[0] * s,
          right[1] * c + up[1] * s,
          right[2] * c + up[2] * s
        ];
        viewUp = [
          up[0] * c - right[0] * s,
          up[1] * c - right[1] * s,
          up[2] * c - right[2] * s
        ];
      }
      const eye: Point = [pose.x, frame.eyeY ?? EYE_HEIGHT + frame.eyeOffset, pose.z];
      const dot = (point: Point) =>
        point[0] * eye[0] + point[1] * eye[1] + point[2] * eye[2];
      const view = new Float32Array([
        viewRight[0],
        viewUp[0],
        -forward[0],
        0,
        viewRight[1],
        viewUp[1],
        -forward[1],
        0,
        viewRight[2],
        viewUp[2],
        -forward[2],
        0,
        -dot(viewRight),
        -dot(viewUp),
        dot(forward),
        1
      ]);
      const f = 1 / Math.tan((65 * Math.PI) / 360),
        near = 0.03,
        far = 140;
      const perspective = new Float32Array([
        f / (canvas.width / canvas.height),
        0,
        0,
        0,
        0,
        f,
        0,
        0,
        0,
        0,
        (far + near) / (near - far),
        -1,
        0,
        0,
        (2 * far * near) / (near - far),
        0
      ]);
      matrix = multiply(perspective, view);
      matrixValid = true;
      stats.drawCalls = 0;
      const fog = frame.fog;
      gl.clearColor(
        linearChannelToSrgb(fog.color[0]),
        linearChannelToSrgb(fog.color[1]),
        linearChannelToSrgb(fog.color[2]),
        1
      );
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.uViewProjection, false, matrix);
      gl.uniform3f(uniforms.uEye, ...eye);
      gl.uniform3f(uniforms.uParticleEye, ...eye);
      gl.uniform3f(uniforms.uFog, ...fog.color);
      gl.uniform2f(uniforms.uFogRange, fog.near, fog.far);
      gl.uniform3f(uniforms.uAmbient, ...frame.ambient);
      gl.uniform3f(uniforms.uMoon, ...frame.moon);
      gl.uniform1f(uniforms.uAmbientFill, frame.ambientFill);
      gl.uniform1f(uniforms.uWarp, frame.warp);
      gl.uniform1f(uniforms.uClock, _time % 3600);
      gl.uniform1f(uniforms.uSnap, frame.psx.snap ? 1 : 0);
      gl.uniform2f(
        uniforms.uSnapResolution,
        canvas.width / 2,
        canvas.height / 2
      );
      gl.uniform1f(uniforms.uAffine, frame.psx.affine);
      gl.uniform1f(uniforms.uDither, frame.psx.dither ? 1 : 0);
      const lights = frame.lights.slice(0, MAX_LIGHTS);
      lightData.fill(0);
      lightColorData.fill(0);
      lights.forEach((light, index) => {
        lightData.set([light.x, light.y, light.z, Math.max(0.01, light.radius)], index * 4);
        lightColorData.set(light.color, index * 3);
      });
      gl.uniform4fv(uniforms.uLights, lightData);
      gl.uniform3fv(uniforms.uLightColors, lightColorData);
      gl.uniform1f(uniforms.uLightCount, lights.length);
      gl.uniform3f(uniforms.uFlashOrigin, ...(frame.flashOrigin ?? eye));
      gl.uniform3f(uniforms.uFlashDirection, ...(frame.flashDirection ?? forward));
      gl.uniform1f(uniforms.uFlash, frame.flashlight);
      gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
      const screenFx = frame.screen ?? { vignette: 0, danger: 0, scanlines: 0 };
      gl.uniform3f(uniforms.uScreen, screenFx.vignette, screenFx.danger, screenFx.scanlines);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(uniforms.uTexture, 0);
      gl.disable(gl.BLEND);

      const instances = frame.instances.filter((instance) =>
        meshes.has(instance.mesh)
      );
      const sky = instances.filter((instance) => instance.layer === 'sky');
      if (sky.length) {
        gl.depthMask(false);
        for (const instance of sky) {
          if (instance.blend === 'add') {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          } else gl.disable(gl.BLEND);
          draw(meshes.get(instance.mesh)!, frame, instance);
        }
        gl.disable(gl.BLEND);
      }
      gl.depthMask(true);
      for (const batch of batches)
        if (batch.source.material.alphaMode !== 'BLEND') draw(batch, frame);
      const world = instances.filter((instance) => instance.layer !== 'sky');
      for (const instance of world)
        if (!instance.blend || instance.blend === 'opaque')
          draw(meshes.get(instance.mesh)!, frame, instance);

      const depth = (center: Point) =>
        (center[0] - eye[0]) * forward[0] +
        (center[1] - eye[1]) * forward[1] +
        (center[2] - eye[2]) * forward[2];
      const transparent: { center: Point; run: () => void; add: boolean }[] = [];
      for (const batch of batches)
        if (batch.source.material.alphaMode === 'BLEND')
          transparent.push({
            center: batch.center,
            run: () => draw(batch, frame),
            add: false
          });
      for (const instance of world)
        if (instance.blend === 'alpha' || instance.blend === 'add')
          transparent.push({
            center: [instance.model[12], instance.model[13], instance.model[14]],
            run: () => draw(meshes.get(instance.mesh)!, frame, instance),
            add: instance.blend === 'add'
          });
      if (transparent.length) {
        transparent.sort((a, b) => depth(b.center) - depth(a.center));
        gl.enable(gl.BLEND);
        gl.depthMask(false);
        for (const item of transparent) {
          if (item.add) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
          else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          item.run();
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
    },
    project(point) {
      if (lost || disposed || !matrixValid) return null;
      const { x, y, z } = point;
      const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
      if (w <= 0) return { x: 0, y: 0, visible: false };
      const nx =
        (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w;
      const ny =
        (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w;
      const nz =
        (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w;
      return {
        x: ((nx + 1) * cssWidth) / 2,
        y: ((1 - ny) * cssHeight) / 2,
        visible:
          Math.abs(nx) <= 1.05 && Math.abs(ny) <= 1.05 && nz >= -1 && nz <= 1
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      destroyGpu();
      for (const scene of scenes) scene.dispose();
      for (const { scene } of namedScenes) scene.dispose();
      namedScenes.length = 0;
      scenes.length = 0;
      stats.scenes = 0;
      lastPose = null;
      lastFrame = undefined;
      renderLastFrame = null;
    }
  };
  // A paused caller may not render another frame after restoration. Redraw the
  // retained pose once without introducing a second animation loop.
  renderLastFrame = () => {
    if (lastPose) renderer.render(lastPose, lastTime, lastFrame);
  };
  return renderer;
}
