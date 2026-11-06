import {
  plazaPillars,
  proxyHome,
  seoulBridges,
  seoulLandmarks,
  seoulRoads,
  worldBuildings,
  worldRoads
} from './world-layout';
import type { WorldPose } from './world-layout';
import { worldCameraBasis } from './world-camera';

/** Procedural collision-test scenery only. No approved village or character asset is embedded. */
type RGB = [number, number, number];
type Point = [number, number, number];
export type WorldProjection = { x: number; y: number; visible: boolean };
export type WorldRenderer = {
  render(pose: WorldPose, time: number): void;
  resize(): void;
  project(point: { x: number; y: number; z: number }): WorldProjection | null;
  dispose(): void;
};

const SKY: RGB = [0.65, 0.61, 0.7];
const hex = (value: string): RGB => [
  parseInt(value.slice(1, 3), 16) / 255,
  parseInt(value.slice(3, 5), 16) / 255,
  parseInt(value.slice(5, 7), 16) / 255
];
const shade = (color: RGB, light: number): RGB =>
  color.map((value) => Math.min(1, value * light)) as RGB;

function createScene(): Float32Array {
  const vertices: number[] = [];
  const triangle = (a: Point, b: Point, c: Point, color: RGB) => {
    for (const p of [a, b, c]) vertices.push(...p, ...color);
  };
  const quad = (a: Point, b: Point, c: Point, d: Point, color: RGB) => {
    triangle(a, b, c, color);
    triangle(a, c, d, color);
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: RGB
  ) => {
    const left = x - w / 2,
      right = x + w / 2,
      near = z - d / 2,
      far = z + d / 2;
    const bottom = y,
      top = y + h;
    quad(
      [left, bottom, near],
      [right, bottom, near],
      [right, top, near],
      [left, top, near],
      shade(color, 0.9)
    );
    quad(
      [right, bottom, far],
      [left, bottom, far],
      [left, top, far],
      [right, top, far],
      shade(color, 0.96)
    );
    quad(
      [left, bottom, far],
      [left, bottom, near],
      [left, top, near],
      [left, top, far],
      shade(color, 0.72)
    );
    quad(
      [right, bottom, near],
      [right, bottom, far],
      [right, top, far],
      [right, top, near],
      shade(color, 0.8)
    );
    quad(
      [left, top, near],
      [right, top, near],
      [right, top, far],
      [left, top, far],
      shade(color, 1.12)
    );
    quad(
      [left, bottom, far],
      [right, bottom, far],
      [right, bottom, near],
      [left, bottom, near],
      shade(color, 0.6)
    );
  };
  const roof = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: RGB
  ) => {
    const l = x - w / 2,
      r = x + w / 2,
      n = z - d / 2,
      f = z + d / 2;
    quad(
      [l, y, n],
      [r, y, n],
      [r, y + h, z],
      [l, y + h, z],
      shade(color, 0.84)
    );
    quad(
      [r, y, f],
      [l, y, f],
      [l, y + h, z],
      [r, y + h, z],
      shade(color, 1.08)
    );
    triangle([l, y, f], [l, y, n], [l, y + h, z], shade(color, 0.7));
    triangle([r, y, n], [r, y, f], [r, y + h, z], shade(color, 0.88));
  };
  const cone = (
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    color: RGB,
    sides = 6
  ) => {
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2,
        b = ((i + 1) / sides) * Math.PI * 2;
      triangle(
        [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius],
        [x, y + height, z],
        [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius],
        shade(color, 0.76 + (i % 3) * 0.12)
      );
    }
  };

  box(0, -0.3, 0, 250, 0.3, 250, hex('#7b9681'));
  // Expanded Seoul roads, Han River and bridges in proxy mode.
  box(0, -0.05, 48, 192, 0.08, 13.6, hex('#244c7a'));
  for (const road of seoulRoads) {
    box(road.x, 0, road.z, road.width, 0.08, road.depth, hex('#58606e'));
  }
  for (const bridge of seoulBridges) {
    box(bridge.x, 0.04, bridge.z, bridge.width, 0.12, bridge.depth, hex('#8d95a5'));
  }
  for (const landmark of seoulLandmarks) {
    box(landmark.x, 0.2, landmark.z, landmark.width, 4.2, landmark.depth, hex(landmark.color));
  }
  // Pavement follows the source road network, but all meshes are temporary primitives.
  for (const road of worldRoads) {
    box(
      road.x,
      0,
      road.z,
      road.width + 1.4,
      0.1,
      road.depth + 1.4,
      hex('#c9c0ab')
    );
    box(road.x, 0.105, road.z, road.width, 0.018, road.depth, hex('#6c727f'));
  }
  for (let x = -28; x <= 30; x += 3.4)
    box(x, 0.13, 0, 1.15, 0.006, 0.085, hex('#d5c4a3'));
  for (let x = -16; x <= 24; x += 3.4)
    box(x, 0.13, 18.4, 1, 0.006, 0.07, hex('#d5c4a3'));
  // Crosswalks at the two junctions, away from project doors.
  for (const x of [-17.2, 26]) {
    for (let z = -1.4; z < 1.5; z += 0.55)
      box(x, 0.14, z, 1.2, 0.006, 0.22, hex('#e0d6bc'));
  }
  // Plaza apron, arch and a small garden on the north side.
  box(0.9, 0.012, -12.5, 9.5, 0.035, 4.8, hex('#b0b5a4'));
  for (let x = -3; x < 5; x += 1.2) {
    box(x, 0.05, -12.4, 0.035, 0.01, 4.4, hex('#9ba398'));
  }
  for (const pillar of plazaPillars) {
    box(
      pillar.x,
      0.05,
      pillar.z,
      pillar.width + 0.2,
      0.25,
      pillar.depth + 0.2,
      hex('#a0959b')
    );
    box(
      pillar.x,
      0.3,
      pillar.z,
      pillar.width,
      2.65,
      pillar.depth,
      hex('#e3d3b9')
    );
    box(
      pillar.x,
      2.95,
      pillar.z,
      pillar.width + 0.2,
      0.22,
      pillar.depth + 0.2,
      hex('#6d7d79')
    );
  }
  box(0.9, 2.8, -13.2, 7.5, 0.48, 0.6, hex('#586e70'));
  box(0.9, 2.93, -12.88, 2.8, 0.24, 0.055, hex('#d3b47a'));

  const building = (
    x: number,
    z: number,
    width: number,
    depth: number,
    color: RGB,
    index: number
  ) => {
    const height = [3.1, 2.9, 4.1, 3.35, 2.85, 3.1, 3.6][index] ?? 2.9;
    const towardRoad = z < 0 ? 1 : -1;
    const front = z + (towardRoad * depth) / 2;
    box(x, 0, z, width + 0.2, 0.23, depth + 0.2, hex('#a4a393'));
    box(x, 0.23, z, width, height, depth, color);
    box(x, 0.24, z, width + 0.04, 0.42, depth + 0.04, shade(color, 0.69));
    box(x, height + 0.19, z, width + 0.22, 0.16, depth + 0.22, hex('#ddcdb1'));
    roof(
      x,
      height + 0.35,
      z,
      width + 0.7,
      1.0,
      depth + 0.7,
      hex(index === 6 ? '#685c73' : '#5c6f73')
    );
    // Windows, door and shop awning are geometry; names are accessible DOM labels.
    box(x, 0.24, front + towardRoad * 0.035, 0.83, 1.75, 0.12, hex('#435461'));
    box(x, 0.36, front + towardRoad * 0.11, 0.59, 1.38, 0.05, hex('#b8a98c'));
    box(
      x + 0.2,
      1.02,
      front + towardRoad * 0.145,
      0.05,
      0.06,
      0.04,
      hex('#f0cf83')
    );
    for (const side of [-1, 1]) {
      const wx = x + side * width * 0.31;
      box(
        wx,
        1.15,
        front + towardRoad * 0.035,
        width * 0.22,
        1.1,
        0.11,
        hex('#eee0c1')
      );
      box(
        wx,
        1.25,
        front + towardRoad * 0.1,
        width * 0.22 - 0.14,
        0.88,
        0.04,
        hex('#b7c9c0')
      );
      box(
        wx,
        1.26,
        front + towardRoad * 0.13,
        0.045,
        0.86,
        0.02,
        hex('#627d7d')
      );
      box(
        wx,
        1.69,
        front + towardRoad * 0.14,
        width * 0.22 - 0.15,
        0.045,
        0.025,
        hex('#627d7d')
      );
      box(
        wx,
        1.1,
        front + towardRoad * 0.16,
        width * 0.24,
        0.13,
        0.28,
        hex('#d0bc9a')
      );
    }
    box(
      x,
      2.3,
      front + towardRoad * 0.09,
      Math.min(width * 0.66, 3),
      0.48,
      0.17,
      hex('#e6d7b6')
    );
    // Tiny pixel blocks give each sign a distinct motif without fake readable copy.
    for (let i = 0; i < (index % 4) + 2; i++) {
      box(
        x - 0.4 + i * 0.24,
        2.44,
        front + towardRoad * 0.19,
        0.12,
        0.17,
        0.035,
        shade(color, 0.65)
      );
    }
    if ([1, 4, 6].includes(index)) {
      box(
        x,
        2.03,
        front + towardRoad * 0.42,
        width * 0.82,
        0.13,
        0.83,
        shade(color, 0.74)
      );
      for (let i = 0; i < 7; i++) {
        box(
          x - width * 0.35 + i * width * 0.115,
          2.0,
          front + towardRoad * 0.42,
          width * 0.06,
          0.07,
          0.85,
          hex('#ead7b4')
        );
      }
    }
    box(x + width * 0.28, height + 0.6, z - 0.1, 0.47, 1, 0.52, hex('#9c8b84'));
    // Low step is walkable; the facade remains the actual solid footprint.
    box(x, 0.08, front + towardRoad * 0.4, 1.6, 0.12, 0.8, hex('#c1b49b'));
  };
  worldBuildings.forEach((b, i) =>
    building(b.x, b.z, b.width, b.depth, hex(b.color), i)
  );
  building(
    proxyHome.x,
    proxyHome.z,
    proxyHome.width,
    proxyHome.depth,
    hex('#b9a8a0'),
    7
  );

  // Modest planting around the edge keeps the wide road network readable.
  const tree = (x: number, z: number, size: number) => {
    box(x, 0, z, 0.25 * size, 1.55 * size, 0.25 * size, hex('#7b7069'));
    cone(x, 0.9 * size, z, 1.05 * size, 2.2 * size, hex('#47766b'));
    cone(x, 1.9 * size, z, 0.8 * size, 1.8 * size, hex('#648b77'));
  };
  for (const [x, z, size] of [
    [-23, -8, 1.2],
    [-22, 8, 1],
    [-23, 21, 1.4],
    [-13, 23, 1],
    [0, 23, 1.2],
    [12, 23, 1.3],
    [23, 23, 1],
    [35, 17, 1.2],
    [36, 5, 1.3],
    [36, -15, 1.2],
    [23, -14, 1.4],
    [15, -14.5, 1.1],
    [8, -16, 1],
    [-9, -15, 1.2],
    [-18, -14, 1]
  ])
    tree(x, z, size);

  // Lamps use pale geometry in place of expensive lights and shadows.
  for (const x of [-20, -13.7, 4, 18.5, 29]) {
    box(x, 0.1, 2.85, 0.1, 3.05, 0.1, hex('#596574'));
    box(x, 3.05, 2.85, 0.42, 0.46, 0.42, hex('#e1bc83'));
    roof(x, 3.51, 2.85, 0.62, 0.22, 0.62, hex('#515d68'));
  }
  // Girl and dog silhouettes are explicitly temporary stand-ins, not supplied characters.
  const girlX = 10.6,
    girlZ = 2.85;
  box(girlX - 0.14, 0.12, girlZ, 0.16, 0.52, 0.22, hex('#514b60'));
  box(girlX + 0.14, 0.12, girlZ, 0.16, 0.52, 0.22, hex('#514b60'));
  box(girlX, 0.6, girlZ, 0.56, 0.6, 0.32, hex('#c594a4'));
  box(girlX - 0.35, 0.66, girlZ, 0.13, 0.48, 0.17, hex('#e8c5a8'));
  box(girlX + 0.35, 0.66, girlZ, 0.13, 0.48, 0.17, hex('#e8c5a8'));
  box(girlX, 1.2, girlZ, 0.42, 0.44, 0.35, hex('#e8c5a8'));
  box(girlX, 1.57, girlZ, 0.49, 0.13, 0.41, hex('#594d60'));
  box(girlX, 1.27, girlZ + 0.16, 0.47, 0.37, 0.12, hex('#594d60'));
  const dogX = 11.6,
    dogZ = 2.7;
  box(dogX, 0.26, dogZ, 0.67, 0.35, 0.32, hex('#e4d4b7'));
  for (const dx of [-0.23, 0.23])
    for (const dz of [-0.11, 0.11]) {
      box(dogX + dx, 0.1, dogZ + dz, 0.11, 0.24, 0.11, hex('#9a8776'));
    }
  box(dogX - 0.35, 0.43, dogZ, 0.3, 0.32, 0.34, hex('#e4d4b7'));
  box(dogX - 0.35, 0.52, dogZ - 0.19, 0.18, 0.28, 0.12, hex('#947d70'));
  box(dogX - 0.35, 0.52, dogZ + 0.19, 0.18, 0.28, 0.12, hex('#947d70'));
  box(dogX + 0.38, 0.48, dogZ, 0.22, 0.12, 0.12, hex('#e4d4b7'));

  // Chunky distant hills close the horizon with a single static batch.
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    cone(
      Math.cos(angle) * 59,
      -1,
      Math.sin(angle) * 50,
      12,
      8 + (i % 4) * 1.8,
      hex('#849197'),
      5
    );
  }
  return new Float32Array(vertices);
}

const vertexSource = `
attribute vec3 aPosition;
attribute vec3 aColor;
uniform mat4 uViewProjection;
uniform vec3 uEye;
varying vec3 vColor;
varying float vDistance;
void main() {
  vColor = aColor;
  vDistance = length(aPosition - uEye);
  gl_Position = uViewProjection * vec4(aPosition, 1.0);
}`;
const fragmentSource = `
precision mediump float;
varying vec3 vColor;
varying float vDistance;
uniform vec3 uFog;
void main() {
  float fog = smoothstep(18.0, 58.0, vDistance);
  gl_FragColor = vec4(mix(vColor, uFog, fog), 1.0);
}`;

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const result = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      for (let k = 0; k < 4; k++)
        result[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
    }
  return result;
}

export function createWorldRenderer(canvas: HTMLCanvasElement): WorldRenderer {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    powerPreference: 'low-power'
  });
  if (!gl)
    throw new Error(
      '이 브라우저에서 WebGL을 사용할 수 없습니다. 지도 또는 목록 보기를 이용해 주세요.'
    );
  const geometry = createScene();
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  let matrix: Float32Array = new Float32Array(16);
  let cssWidth = 1,
    cssHeight = 1,
    lost = false,
    disposed = false;
  let uViewProjection: WebGLUniformLocation | null = null;
  let uEye: WebGLUniformLocation | null = null;
  let uFog: WebGLUniformLocation | null = null;
  const makeShader = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('3D 셰이더를 만들지 못했습니다.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`3D 셰이더 오류: ${message}`);
    }
    return shader;
  };
  const initialize = () => {
    const vertex = makeShader(gl.VERTEX_SHADER, vertexSource);
    const fragment = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      throw new Error('3D 프로그램을 만들지 못했습니다.');
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      program = null;
      throw new Error('3D 프로그램을 연결하지 못했습니다.');
    }
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('3D 메모리를 할당하지 못했습니다.');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, geometry, gl.STATIC_DRAW);
    gl.useProgram(program);
    for (const [name, offset] of [
      ['aPosition', 0],
      ['aColor', 12]
    ] as const) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 24, offset);
    }
    uViewProjection = gl.getUniformLocation(program, 'uViewProjection');
    uEye = gl.getUniformLocation(program, 'uEye');
    uFog = gl.getUniformLocation(program, 'uFog');
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(...SKY, 1);
  };
  const resize = () => {
    cssWidth = Math.max(1, canvas.clientWidth || canvas.width);
    cssHeight = Math.max(1, canvas.clientHeight || canvas.height);
    // Ignore devicePixelRatio: intentionally low resolution and bounded GPU work.
    const scale = Math.min(1, 960 / cssWidth, 720 / cssHeight);
    const width = Math.max(1, Math.round(cssWidth * scale));
    const height = Math.max(1, Math.round(cssHeight * scale));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    if (!lost) gl.viewport(0, 0, width, height);
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    lost = true;
  };
  const onRestored = () => {
    if (!disposed) {
      lost = false;
      initialize();
      resize();
    }
  };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  try {
    initialize();
    resize();
  } catch (error) {
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    throw error;
  }
  return {
    resize,
    render(pose, _time) {
      if (lost || disposed || !program) return;
      const { right, up, forward } = worldCameraBasis(pose);
      const eye: Point = [pose.x, 1.65, pose.z];
      const dot = (v: Point) => v[0] * eye[0] + v[1] * eye[1] + v[2] * eye[2];
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
        near = 0.08,
        far = 100;
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
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniformMatrix4fv(uViewProjection, false, matrix);
      gl.uniform3f(uEye, ...eye);
      gl.uniform3f(uFog, ...SKY);
      gl.drawArrays(gl.TRIANGLES, 0, geometry.length / 6);
    },
    project(point) {
      if (lost || disposed) return null;
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
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      buffer = null;
      program = null;
    }
  };
}
