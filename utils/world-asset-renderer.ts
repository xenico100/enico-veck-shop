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

export type AssetWorldRenderer = {
  resize(): void;
  render(pose: WorldPose, time: number): void;
  project(point: { x: number; y: number; z: number }): WorldProjection | null;
  addScene(scene: WorldGlbScene): void;
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

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
attribute vec4 aColor;
uniform mat4 uViewProjection;
varying vec3 vNormal;
varying vec2 vUv;
varying vec4 vColor;
varying vec3 vWorldPosition;
void main() {
  vNormal = aNormal;
  vUv = aUv;
  vColor = aColor;
  vWorldPosition = aPosition;
  gl_Position = uViewProjection * vec4(aPosition, 1.0);
}`;

const fragmentSource = `
precision mediump float;
uniform sampler2D uTexture;
uniform float uHasTexture;
uniform vec4 uBaseColor;
uniform vec3 uEmissive;
uniform float uEmissiveStrength;
uniform float uUnlit;
uniform float uDoubleSided;
uniform float uAlphaMode;
uniform float uAlphaCutoff;
uniform vec3 uFog;
uniform vec3 uEye;
varying vec3 vNormal;
varying vec2 vUv;
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
void main() {
  vec4 texel = vec4(1.0);
  if (uHasTexture > 0.5) {
    texel = texture2D(uTexture, vUv);
    texel.rgb = srgbToLinear(texel.rgb);
  }
  // glTF factors and COLOR_0 are linear; only the bitmap RGB is sRGB encoded.
  vec4 base = texel * uBaseColor * vColor;
  if (uAlphaMode > 0.5 && uAlphaMode < 1.5 && base.a < uAlphaCutoff) discard;
  vec3 normal = normalize(vNormal);
  if (uDoubleSided > 0.5 && !gl_FrontFacing) normal = -normal;
  vec3 hemisphere = vec3(0.055, 0.07975, 0.11275) *
    (0.5 + 0.5 * clamp(normal.y * 0.5 + 0.5, 0.0, 1.0));
  // Source Sun Euler (28, -20, -32 degrees), converted from Blender Z-up.
  float sunlight = max(dot(normal, normalize(vec3(-0.505, 0.830, 0.238))), 0.0);
  vec3 lighting = hemisphere + vec3(0.63, 0.74, 0.85) * sunlight * 1.3;
  vec3 color = base.rgb * mix(lighting, vec3(1.0), uUnlit);
  color += uEmissive * uEmissiveStrength;
  // Original fog distance 15..160 at the exported 0.4 world scale.
  float distanceToEye = length(vWorldPosition - uEye);
  color = mix(color, uFog, smoothstep(6.0, 64.0, distanceToEye) * 0.78);
  float alpha = uAlphaMode > 1.5 ? clamp(base.a, 0.0, 1.0) : 1.0;
  gl_FragColor = vec4(clamp(linearToSrgb(color), 0.0, 1.0), alpha);
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
  let matrix: Float32Array = new Float32Array(16);
  let matrixValid = false;
  let fallbackTexture: WebGLTexture | null = null;
  let lastPose: WorldPose | null = null;
  let lastTime = 0;
  let renderLastFrame: (() => void) | null = null;
  let attributes: { location: number; size: number; offset: number }[] = [];
  let uniforms: Record<string, WebGLUniformLocation | null> = {};

  function destroyGpu() {
    for (const batch of batches) gl.deleteBuffer(batch.buffer);
    for (const texture of textures) gl.deleteTexture(texture);
    if (program) gl.deleteProgram(program);
    batches.length = 0;
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
        powerOfTwo ? gl.NEAREST : gl.LINEAR
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        powerOfTwo
          ? mipmaps
            ? gl.NEAREST_MIPMAP_NEAREST
            : gl.NEAREST
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
          center: batchCenter(source)
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
        'uEye',
        'uTexture',
        'uHasTexture',
        'uBaseColor',
        'uEmissive',
        'uEmissiveStrength',
        'uUnlit',
        'uDoubleSided',
        'uAlphaMode',
        'uAlphaCutoff',
        'uFog'
      ]) {
        uniforms[name] = gl.getUniformLocation(program, name);
      }
      for (const scene of scenes) uploadScene(scene);
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
    const scale = Math.min(1, 960 / cssWidth, 720 / cssHeight);
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

  function draw(batch: DrawBatch) {
    const material: Material = batch.source.material;
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
    gl.bindTexture(gl.TEXTURE_2D, batch.texture ?? fallbackTexture);
    gl.uniform1f(uniforms.uHasTexture, batch.texture ? 1 : 0);
    gl.uniform4f(uniforms.uBaseColor, ...material.baseColorFactor);
    const emissive = material.emissiveFactor ?? [0, 0, 0];
    gl.uniform3f(uniforms.uEmissive, emissive[0], emissive[1], emissive[2]);
    gl.uniform1f(uniforms.uEmissiveStrength, material.emissiveStrength ?? 1);
    gl.uniform1f(uniforms.uUnlit, material.unlit ? 1 : 0);
    gl.uniform1f(uniforms.uDoubleSided, material.doubleSided ? 1 : 0);
    gl.uniform1f(
      uniforms.uAlphaMode,
      material.alphaMode === 'BLEND' ? 2 : material.alphaMode === 'MASK' ? 1 : 0
    );
    gl.uniform1f(uniforms.uAlphaCutoff, material.alphaCutoff);
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
      stats.scenes = scenes.length;
    },
    render(pose, _time) {
      lastPose = { ...pose };
      lastTime = _time;
      if (lost || disposed || !program) return;
      const { right, up, forward } = worldCameraBasis(pose);
      const eye: Point = [pose.x, EYE_HEIGHT, pose.z];
      const dot = (point: Point) =>
        point[0] * eye[0] + point[1] * eye[1] + point[2] * eye[2];
      const view = new Float32Array([
        right[0],
        up[0],
        -forward[0],
        0,
        right[1],
        up[1],
        -forward[1],
        0,
        right[2],
        up[2],
        -forward[2],
        0,
        -dot(right),
        -dot(up),
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
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uniforms.uViewProjection, false, matrix);
      gl.uniform3f(uniforms.uEye, ...eye);
      gl.uniform3f(uniforms.uFog, ...FOG_LINEAR);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(uniforms.uTexture, 0);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      for (const batch of batches)
        if (batch.source.material.alphaMode !== 'BLEND') draw(batch);
      const transparent = batches.filter(
        (batch) => batch.source.material.alphaMode === 'BLEND'
      );
      if (transparent.length) {
        const depth = (batch: DrawBatch) =>
          (batch.center[0] - eye[0]) * forward[0] +
          (batch.center[1] - eye[1]) * forward[1] +
          (batch.center[2] - eye[2]) * forward[2];
        transparent.sort((a, b) => depth(b) - depth(a));
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        for (const batch of transparent) draw(batch);
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
      scenes.length = 0;
      stats.scenes = 0;
      lastPose = null;
      renderLastFrame = null;
    }
  };
  // A paused caller may not render another frame after restoration. Redraw the
  // retained pose once without introducing a second animation loop.
  renderLastFrame = () => {
    if (lastPose) renderer.render(lastPose, lastTime);
  };
  return renderer;
}
