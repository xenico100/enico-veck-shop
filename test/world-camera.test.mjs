import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test, { after } from 'node:test';
import { worldCameraBasis } from '../utils/world-camera.ts';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      ['./world-camera', './world-layout', './village-buildings'].includes(
        specifier
      )
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});
after(() => hooks.deregister());
const { createWorldRenderer } = await import('../utils/world-renderer.ts');
const { createAssetWorldRenderer } =
  await import('../utils/world-asset-renderer.ts');

const near = (actual, expected, epsilon = 1e-6) =>
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`);
const dot = (a, b) =>
  a.reduce((sum, value, index) => sum + value * b[index], 0);
const determinant = ([a, b, c]) =>
  a[0] * (b[1] * c[2] - b[2] * c[1]) -
  a[1] * (b[0] * c[2] - b[2] * c[0]) +
  a[2] * (b[0] * c[1] - b[1] * c[0]);

test('camera rotation stays orthonormal and has determinant +1 across yaw and pitch', () => {
  for (const yaw of [
    -Math.PI,
    -Math.PI / 2,
    0,
    0.7,
    Math.PI / 2,
    Math.PI + 0.1
  ]) {
    for (const pitch of [-0.65, -0.07, 0, 0.5]) {
      const { right, up, forward } = worldCameraBasis({ yaw, pitch });
      for (const vector of [right, up, forward]) near(dot(vector, vector), 1);
      near(dot(right, up), 0);
      near(dot(right, forward), 0);
      near(dot(up, forward), 0);
      // A view rotation looks down local -Z. A -1 determinant reflects models.
      near(determinant([right, up, forward.map((value) => -value)]), 1);
    }
  }
});

function mockCanvas() {
  // No GPU/context or shader compiler runs: exercise each renderer's real view,
  // projection and project() code, while replacing WebGL resource operations.
  const constants = {
    MAX_TEXTURE_SIZE: 3379,
    NEAREST: 9728,
    LINEAR: 9729,
    NEAREST_MIPMAP_NEAREST: 9984,
    LINEAR_MIPMAP_LINEAR: 9987,
    REPEAT: 10497,
    MIRRORED_REPEAT: 33648,
    CLAMP_TO_EDGE: 33071
  };
  const gl = new Proxy(constants, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'getParameter') return () => 4096;
      if (key === 'getShaderParameter' || key === 'getProgramParameter')
        return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation' || String(key).startsWith('create'))
        return () => ({});
      // Enum values are immaterial to CPU projection; keep clear-mask bitwise ops valid.
      if (String(key).toUpperCase() === key) return 0;
      return () => {};
    }
  });
  class Canvas extends EventTarget {
    width = 640;
    height = 480;
    clientWidth = 640;
    clientHeight = 480;
    getContext() {
      return gl;
    }
  }
  return new Canvas();
}

for (const [name, create, eyeHeight] of [
  ['proxy', (canvas) => createWorldRenderer(canvas), 1.65],
  [
    'asset',
    (canvas) =>
      createAssetWorldRenderer(canvas, {
        batches: [],
        textures: [],
        dispose() {}
      }),
    0.66
  ]
]) {
  test(`${name} projection puts physical camera-right on screen-right at all cardinal headings`, () => {
    const renderer = create(mockCanvas());
    try {
      const headings = [
        { yaw: 0, center: [0, 5], right: [-1, 5] },
        { yaw: Math.PI / 2, center: [5, 0], right: [5, 1] },
        { yaw: Math.PI, center: [0, -5], right: [1, -5] },
        { yaw: -Math.PI / 2, center: [-5, 0], right: [-5, -1] }
      ];
      for (const { yaw, center, right } of headings) {
        renderer.render({ x: 0, z: 0, yaw, pitch: 0 }, 0);
        const middle = renderer.project({
          x: center[0],
          y: eyeHeight,
          z: center[1]
        });
        const side = renderer.project({
          x: right[0],
          y: eyeHeight,
          z: right[1]
        });
        const above = renderer.project({
          x: center[0],
          y: eyeHeight + 1,
          z: center[1]
        });
        assert.ok(middle.visible && side.visible && above.visible);
        near(middle.x, 320, 1e-4);
        near(middle.y, 240, 1e-4);
        assert.ok(
          side.x > middle.x,
          `physical right must project right at yaw ${yaw}`
        );
        assert.ok(above.y < middle.y);
      }
    } finally {
      renderer.dispose();
    }
  });

  test(`${name} preserves left-to-right lettering on a sign facing the +Z camera`, () => {
    const renderer = create(mockCanvas());
    try {
      renderer.render({ x: 0, z: 0, yaw: 0, pitch: 0 }, 0);
      // A readable sign facing -Z has its reader's left edge at world +X.
      // The former reflected view matrix reversed this N ... N sequence.
      const text = [...'NIGHT INN'].map((letter, index, letters) => ({
        letter,
        point: renderer.project({
          x: 1 - (index * 2) / (letters.length - 1),
          y: eyeHeight,
          z: 5
        })
      }));
      for (let index = 1; index < text.length; index++) {
        assert.ok(
          text[index - 1].point.x < text[index].point.x,
          `sign order reflected between character ${index - 1} and ${index}`
        );
      }
      assert.equal(text.map((item) => item.letter).join(''), 'NIGHT INN');
    } finally {
      renderer.dispose();
    }
  });
}
