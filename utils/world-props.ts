import type { WorldGlbBatch, WorldGlbMaterial } from './world-glb';
import type { WorldCameraBasis } from './world-camera';

/**
 * Procedural low-poly props in the village vertex layout
 * (position, normal, uv, linear RGBA = 12 floats). Flat-shaded on purpose.
 */
type V3 = [number, number, number];
type Color = [number, number, number, number];

const srgb = (value: number) =>
  value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
/** '#rrggbb' (sRGB) to linear RGBA. */
export function linearColor(hex: string, alpha = 1): Color {
  return [
    srgb(parseInt(hex.slice(1, 3), 16) / 255),
    srgb(parseInt(hex.slice(3, 5), 16) / 255),
    srgb(parseInt(hex.slice(5, 7), 16) / 255),
    alpha
  ];
}

function sub(a: V3, b: V3): V3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(a: V3): V3 {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

export function createMeshBuilder() {
  const data: number[] = [];
  const vertex = (p: V3, n: V3, uv: [number, number], c: Color) =>
    data.push(p[0], p[1], p[2], n[0], n[1], n[2], uv[0], uv[1], c[0], c[1], c[2], c[3]);
  const builder = {
    tri(a: V3, b: V3, c: V3, color: Color, colors?: [Color, Color, Color]) {
      const n = normalize(cross(sub(b, a), sub(c, a)));
      vertex(a, n, [0, 0], colors?.[0] ?? color);
      vertex(b, n, [1, 0], colors?.[1] ?? color);
      vertex(c, n, [1, 1], colors?.[2] ?? color);
      return builder;
    },
    quad(a: V3, b: V3, c: V3, d: V3, color: Color) {
      builder.tri(a, b, c, color);
      builder.tri(a, c, d, color);
      return builder;
    },
    box(x: number, y: number, z: number, w: number, h: number, d: number, color: Color, top?: Color) {
      const l = x - w / 2,
        r = x + w / 2,
        n = z - d / 2,
        f = z + d / 2,
        b = y,
        t = y + h;
      const side = (scale: number): Color => [color[0] * scale, color[1] * scale, color[2] * scale, color[3]];
      builder.quad([l, b, f], [r, b, f], [r, t, f], [l, t, f], side(1));
      builder.quad([r, b, n], [l, b, n], [l, t, n], [r, t, n], side(0.82));
      builder.quad([l, b, n], [l, b, f], [l, t, f], [l, t, n], side(0.7));
      builder.quad([r, b, f], [r, b, n], [r, t, n], [r, t, f], side(0.88));
      builder.quad([l, t, f], [r, t, f], [r, t, n], [l, t, n], top ?? side(1.1));
      builder.quad([l, b, n], [r, b, n], [r, b, f], [l, b, f], side(0.5));
      return builder;
    },
    /** Upright prism; `top` radius lets it become a cone or frustum. */
    cylinder(x: number, y: number, z: number, radius: number, height: number, sides: number, color: Color, top = radius, cap?: Color) {
      for (let i = 0; i < sides; i++) {
        const a0 = (i / sides) * Math.PI * 2;
        const a1 = ((i + 1) / sides) * Math.PI * 2;
        const p0: V3 = [x + Math.sin(a0) * radius, y, z + Math.cos(a0) * radius];
        const p1: V3 = [x + Math.sin(a1) * radius, y, z + Math.cos(a1) * radius];
        const q0: V3 = [x + Math.sin(a0) * top, y + height, z + Math.cos(a0) * top];
        const q1: V3 = [x + Math.sin(a1) * top, y + height, z + Math.cos(a1) * top];
        const shade = 0.72 + 0.28 * Math.cos(a0 - 0.6);
        const c: Color = [color[0] * shade, color[1] * shade, color[2] * shade, color[3]];
        if (top > 0.0001) builder.quad(p0, p1, q1, q0, c);
        else builder.tri(p0, p1, q0, c);
        if (cap && top > 0.0001) builder.tri([x, y + height, z], q0, q1, cap);
      }
      return builder;
    },
    /** Octahedron, the shape of a dream fragment or a head. */
    gem(x: number, y: number, z: number, radius: number, height: number, color: Color, sides = 4) {
      for (let i = 0; i < sides; i++) {
        const a0 = (i / sides) * Math.PI * 2;
        const a1 = ((i + 1) / sides) * Math.PI * 2;
        const p0: V3 = [x + Math.sin(a0) * radius, y, z + Math.cos(a0) * radius];
        const p1: V3 = [x + Math.sin(a1) * radius, y, z + Math.cos(a1) * radius];
        const shade = 0.75 + 0.25 * Math.cos(a0);
        const c: Color = [color[0] * shade, color[1] * shade, color[2] * shade, color[3]];
        builder.tri(p0, p1, [x, y + height, z], c);
        builder.tri(p1, p0, [x, y - height, z], [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7, c[3]]);
      }
      return builder;
    },
    /** Camera-facing disc in the XY plane; alpha fades from center to rim. */
    disc(radius: number, segments: number, center: Color, rim: Color) {
      for (let i = 0; i < segments; i++) {
        const a0 = (i / segments) * Math.PI * 2;
        const a1 = ((i + 1) / segments) * Math.PI * 2;
        builder.tri(
          [0, 0, 0],
          [Math.cos(a0) * radius, Math.sin(a0) * radius, 0],
          [Math.cos(a1) * radius, Math.sin(a1) * radius, 0],
          center,
          [center, rim, rim]
        );
      }
      return builder;
    },
    raw(values: number[]) {
      data.push(...values);
      return builder;
    },
    build(): { vertices: Float32Array; vertexCount: number } {
      return { vertices: new Float32Array(data), vertexCount: data.length / 12 };
    }
  };
  return builder;
}

const material = (overrides: Partial<WorldGlbMaterial> = {}): WorldGlbMaterial => ({
  baseColorFactor: [1, 1, 1, 1],
  emissiveFactor: [0, 0, 0],
  emissiveStrength: 1,
  unlit: false,
  textureIndex: null,
  alphaMode: 'OPAQUE',
  alphaCutoff: 0.5,
  doubleSided: true,
  ...overrides
});

const batch = (
  mesh: { vertices: Float32Array; vertexCount: number },
  overrides: Partial<WorldGlbMaterial> = {}
): WorldGlbBatch => ({ ...mesh, material: material(overrides) });

/** Seeded PRNG so particle fields are identical every visit. */
function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export const PARTICLE_BOX = 22;

/**
 * Particle vertices store their anchor in position and the corner offset in
 * the normal slot; the vertex shader wraps anchors around the camera.
 */
function particles(
  count: number,
  seed: number,
  height: number,
  corner: (index: number) => V3[],
  color: Color
) {
  const rand = random(seed);
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    const anchor: V3 = [rand() * PARTICLE_BOX, rand() * height, rand() * PARTICLE_BOX];
    const corners = corner(i);
    for (const offset of corners)
      data.push(anchor[0], anchor[1], anchor[2], offset[0], offset[1], offset[2], 0, 0, ...color);
  }
  return { vertices: new Float32Array(data), vertexCount: data.length / 12 };
}

function hemisphere(radius: number, rings: number, segments: number) {
  const builder = createMeshBuilder();
  const ringColor = (ring: number): Color => {
    const t = ring / rings;
    const value = 1 - t * 0.72;
    return [value, value, value, 1];
  };
  for (let ring = 0; ring < rings; ring++) {
    const e0 = (ring / rings) * (Math.PI / 2) - 0.08;
    const e1 = ((ring + 1) / rings) * (Math.PI / 2);
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const point = (e: number, a: number): V3 => [
        Math.cos(e) * Math.sin(a) * radius,
        Math.sin(e) * radius,
        Math.cos(e) * Math.cos(a) * radius
      ];
      const c0 = ringColor(ring);
      const c1 = ringColor(ring + 1);
      builder.tri(point(e0, a0), point(e1, a0), point(e1, a1), c0, [c0, c1, c1]);
      builder.tri(point(e0, a0), point(e1, a1), point(e0, a1), c0, [c0, c1, c0]);
    }
  }
  return builder.build();
}

function stars(count: number, radius: number) {
  const rand = random(77);
  const builder = createMeshBuilder();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const e = 0.12 + Math.pow(rand(), 0.7) * 1.35;
    const center: V3 = [Math.cos(e) * Math.sin(a) * radius, Math.sin(e) * radius, Math.cos(e) * Math.cos(a) * radius];
    const size = 0.12 + rand() * 0.22;
    const normal = normalize(center);
    const tangent = normalize(cross(normal, [0, 1, 0.001]));
    const bitangent = cross(tangent, normal);
    const corner = (u: number, v: number): V3 => [
      center[0] + (tangent[0] * u + bitangent[0] * v) * size,
      center[1] + (tangent[1] * u + bitangent[1] * v) * size,
      center[2] + (tangent[2] * u + bitangent[2] * v) * size
    ];
    const bright = 0.35 + rand() * 0.65;
    const color: Color = [0.75 * bright, 0.8 * bright, bright, 1];
    builder.quad(corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1), color);
  }
  return builder.build();
}

/** All dynamic meshes, keyed for WorldRenderInstance.mesh. */
export function createWorldProps(): Record<string, WorldGlbBatch> {
  const black = linearColor('#07070a');
  const meshes: Record<string, WorldGlbBatch> = {};

  meshes.sky = batch(hemisphere(135, 6, 16), { unlit: true });
  meshes.stars = batch(stars(280, 125), { unlit: true });
  meshes.moon = batch(createMeshBuilder().disc(1, 18, [1, 1, 1, 1], [0.86, 0.88, 0.82, 1]).build(), {
    unlit: true
  });
  meshes.glow = batch(createMeshBuilder().disc(1, 14, [1, 1, 1, 1], [1, 1, 1, 0]).build(), {
    unlit: true,
    alphaMode: 'BLEND'
  });

  meshes.fragment = batch(
    createMeshBuilder()
      .gem(0, 0, 0, 0.13, 0.22, [1, 1, 1, 1])
      .gem(0, 0, 0, 0.06, 0.1, [1.6, 1.6, 1.6, 1])
      .build(),
    { unlit: true }
  );

  const figure = createMeshBuilder()
    .cylinder(0, 0, 0, 0.3, 1.08, 7, [1, 1, 1, 1], 0.1)
    .gem(0, 1.22, 0, 0.17, 0.2, [0.9, 0.9, 0.9, 1], 6)
    .cylinder(0, 0.98, 0, 0.2, 0.36, 7, [0.85, 0.85, 0.85, 1], 0.04)
    .build();
  meshes.figure = batch(figure);
  meshes.eyes = batch(
    createMeshBuilder()
      .box(-0.06, 1.2, 0.17, 0.045, 0.028, 0.02, [1, 1, 1, 1])
      .box(0.06, 1.2, 0.17, 0.045, 0.028, 0.02, [1, 1, 1, 1])
      .build(),
    { unlit: true }
  );
  meshes.shadowEyes = batch(
    createMeshBuilder()
      .box(-0.075, 1.2, 0.2, 0.075, 0.035, 0.03, [1, 1, 1, 1])
      .box(0.075, 1.2, 0.2, 0.075, 0.035, 0.03, [1, 1, 1, 1])
      .build(),
    { unlit: true }
  );
  meshes.postBag = batch(
    createMeshBuilder()
      .box(0.24, 0.5, 0.02, 0.12, 0.3, 0.32, linearColor('#7a2e2a'))
      .box(-0.02, 1.37, 0, 0.42, 0.04, 0.42, linearColor('#20263a'))
      .build()
  );
  meshes.projector = batch(
    createMeshBuilder()
      .box(0, 0.62, 0.26, 0.26, 0.18, 0.18, linearColor('#3b3530'))
      .cylinder(-0.06, 0.8, 0.26, 0.07, 0.03, 8, linearColor('#2a2522'))
      .cylinder(0.08, 0.8, 0.26, 0.07, 0.03, 8, linearColor('#2a2522'))
      .build()
  );

  const fur = linearColor('#101012');
  const cat = createMeshBuilder()
    .box(0, 0.1, 0, 0.16, 0.14, 0.34, fur)
    .box(0, 0.2, 0.2, 0.15, 0.13, 0.13, fur)
    .tri([-0.07, 0.33, 0.2], [-0.02, 0.33, 0.2], [-0.05, 0.4, 0.2], fur)
    .tri([0.02, 0.33, 0.2], [0.07, 0.33, 0.2], [0.05, 0.4, 0.2], fur)
    .box(0, 0.16, -0.24, 0.035, 0.035, 0.18, fur)
    .box(0, 0.16, -0.33, 0.035, 0.2, 0.035, fur)
    .box(-0.06, 0, 0.12, 0.04, 0.1, 0.04, fur)
    .box(0.06, 0, 0.12, 0.04, 0.1, 0.04, fur)
    .box(-0.06, 0, -0.12, 0.04, 0.1, 0.04, fur)
    .box(0.06, 0, -0.12, 0.04, 0.1, 0.04, fur)
    .build();
  meshes.cat = batch(cat);
  meshes.catEyes = batch(
    createMeshBuilder()
      .box(-0.04, 0.24, 0.266, 0.045, 0.034, 0.012, [1, 1, 1, 1])
      .box(0.04, 0.24, 0.266, 0.045, 0.034, 0.012, [1, 1, 1, 1])
      .build(),
    { unlit: true }
  );

  meshes.shadow = batch(
    createMeshBuilder()
      .cylinder(0, 0, 0, 0.38, 1.5, 6, black, 0.06)
      .gem(0, 1.55, 0, 0.2, 0.26, black, 5)
      .cylinder(0, 0.3, 0, 0.46, 0.5, 6, black, 0.3)
      .build(),
    { alphaMode: 'BLEND' }
  );

  meshes.flashlight = batch(
    createMeshBuilder()
      .cylinder(0, 0, 0, 0.035, 0.22, 8, linearColor('#3d4a4f'))
      .cylinder(0, 0.22, 0, 0.05, 0.06, 8, linearColor('#59666b'), 0.055, linearColor('#fff6c8'))
      .build()
  );
  meshes.battery = batch(
    createMeshBuilder()
      .cylinder(0, 0, 0, 0.04, 0.14, 8, linearColor('#c7a234'), 0.04, linearColor('#d9d4c8'))
      .cylinder(0, 0.14, 0, 0.015, 0.02, 6, linearColor('#d9d4c8'))
      .build()
  );
  meshes.stamp = batch(
    createMeshBuilder()
      .box(0, 0, 0, 0.2, 0.012, 0.24, linearColor('#f0e7d2'))
      .box(0, 0.006, 0, 0.15, 0.012, 0.19, linearColor('#b83a3a'))
      .build()
  );
  meshes.tag = batch(
    createMeshBuilder()
      .box(0, 0, 0, 0.16, 0.01, 0.26, linearColor('#e8e2d6'))
      .box(0, 0.006, 0.09, 0.03, 0.012, 0.03, linearColor('#55504a'))
      .box(0, 0.003, 0.18, 0.006, 0.006, 0.16, linearColor('#c9c0b0'))
      .build()
  );
  meshes.film = batch(
    createMeshBuilder()
      .cylinder(0, 0, 0, 0.17, 0.05, 12, linearColor('#24221f'), 0.17, linearColor('#6d675f'))
      .cylinder(0, 0.05, 0, 0.05, 0.012, 8, linearColor('#a19a8e'))
      .build()
  );
  meshes.note = batch(
    createMeshBuilder().box(0, -0.13, 0, 0.2, 0.26, 0.012, linearColor('#e9e0c9')).build()
  );

  meshes.payphone = batch(
    createMeshBuilder()
      .box(0, 0, 0, 0.5, 2.1, 0.5, linearColor('#2f4a46'))
      .box(0, 0.75, -0.26, 0.38, 0.6, 0.04, linearColor('#1d2b2b'))
      .box(0.1, 1.05, -0.3, 0.08, 0.22, 0.06, linearColor('#0d0d0f'))
      .box(-0.08, 0.95, -0.29, 0.14, 0.18, 0.03, linearColor('#c7c3b4'))
      .build()
  );
  meshes.payphoneSign = batch(
    createMeshBuilder().box(0, 2.1, 0, 0.52, 0.16, 0.52, [1, 1, 1, 1]).build(),
    { unlit: true }
  );
  meshes.vending = batch(
    createMeshBuilder()
      .box(0, 0, 0, 0.6, 1.7, 0.42, linearColor('#8d2e2b'))
      .box(0, 0.12, 0.215, 0.44, 0.22, 0.02, linearColor('#141414'))
      .build()
  );
  meshes.vendingPanel = batch(
    createMeshBuilder()
      .box(0, 0.62, 0.215, 0.48, 0.92, 0.02, [1, 1, 1, 1])
      .build(),
    { unlit: true }
  );
  meshes.mailbox = batch(
    createMeshBuilder()
      .box(0, 0, 0, 0.08, 0.5, 0.08, linearColor('#2a2a2a'))
      .box(0, 0.5, 0, 0.34, 0.5, 0.34, linearColor('#b3261e'), linearColor('#c9342a'))
      .box(0, 0.86, 0.17, 0.2, 0.03, 0.02, linearColor('#1a1a1a'))
      .build()
  );
  const wood = linearColor('#5c4630');
  meshes.bench = batch(
    createMeshBuilder()
      .box(0, 0.38, 0, 1.2, 0.05, 0.36, wood)
      .box(0, 0.6, -0.16, 1.2, 0.24, 0.04, wood)
      .box(-0.52, 0, 0, 0.06, 0.38, 0.32, linearColor('#2b2b2b'))
      .box(0.52, 0, 0, 0.06, 0.38, 0.32, linearColor('#2b2b2b'))
      .build()
  );
  meshes.doorFrame = batch(
    createMeshBuilder()
      .box(-0.62, 0, 0, 0.14, 2.3, 0.14, linearColor('#d9d4c4'))
      .box(0.62, 0, 0, 0.14, 2.3, 0.14, linearColor('#d9d4c4'))
      .box(0, 2.3, 0, 1.38, 0.14, 0.14, linearColor('#d9d4c4'))
      .build(),
    { emissiveFactor: [0.4, 0.38, 0.34], emissiveStrength: 1 }
  );
  meshes.doorLight = batch(
    createMeshBuilder().box(0, 0, 0, 1.1, 2.3, 0.02, [1, 1, 1, 1]).build(),
    { unlit: true }
  );
  meshes.moth = batch(
    createMeshBuilder()
      .tri([0, 0, 0], [-0.05, 0.03, 0], [-0.05, -0.03, 0], [1, 1, 1, 1])
      .tri([0, 0, 0], [0.05, -0.03, 0], [0.05, 0.03, 0], [1, 1, 1, 1])
      .build(),
    { unlit: true }
  );

  // Two crossed quads per streak so rain reads from every direction.
  meshes.rain = batch(
    particles(
      520,
      11,
      9,
      () => {
        const w = 0.008,
          h = 0.42;
        return [
          [-w, 0, 0], [w, 0, 0], [w, h, 0], [-w, 0, 0], [w, h, 0], [-w, h, 0],
          [0, 0, -w], [0, 0, w], [0, h, w], [0, 0, -w], [0, h, w], [0, h, -w]
        ];
      },
      [0.55, 0.62, 0.72, 0.32]
    ),
    { unlit: true, alphaMode: 'BLEND' }
  );
  meshes.dust = batch(
    particles(
      140,
      23,
      3.2,
      () => {
        const s = 0.018;
        return [[-s, -s, 0], [s, -s, 0], [s, s, 0], [-s, -s, 0], [s, s, 0], [-s, s, 0]];
      },
      [0.75, 0.85, 1, 0.55]
    ),
    { unlit: true, alphaMode: 'BLEND' }
  );

  // Flashlight volume: a faint cone in camera space pointing down -Z.
  const beam = createMeshBuilder();
  const sides = 12;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2;
    const a1 = ((i + 1) / sides) * Math.PI * 2;
    const rim = (a: number): V3 => [Math.cos(a) * 1.5, Math.sin(a) * 1.5, -6];
    beam.tri([0, 0, 0], rim(a0), rim(a1), [1, 1, 1, 0.16], [
      [1, 1, 1, 0.16],
      [1, 1, 1, 0],
      [1, 1, 1, 0]
    ]);
  }
  meshes.beam = batch(beam.build(), { unlit: true, alphaMode: 'BLEND' });

  // --- Seoul City Map Expansion Procedural Meshes ---
  // Extended ground plane & Seoul road network
  const seoulGround = createMeshBuilder()
    .box(0, -0.18, 0, 210, 0.14, 190, linearColor('#14171f'), linearColor('#181c26'))
    // Gwanghwamun / Sejong-daero avenue (north)
    .box(1.2, -0.03, -46, 7.6, 0.04, 52, linearColor('#242934'), linearColor('#2a303d'))
    .box(1.2, -0.025, -68, 32, 0.045, 14, linearColor('#323742'), linearColor('#3b414e'))
    // Gangseo-ro / Magok Botanic Park road (west)
    .box(-62, -0.03, 0, 64, 0.04, 4.6, linearColor('#242934'), linearColor('#2a303d'))
    .box(-68, -0.03, -2, 4.4, 0.04, 52, linearColor('#27332e'), linearColor('#2e3d36'))
    // Hongdae Eoulmadang-ro (southwest)
    .box(-46, -0.03, 24, 48, 0.04, 4.4, linearColor('#2c2433'), linearColor('#352b3d'))
    // Namsan Sowol-ro (southeast)
    .box(42, -0.03, 24, 28, 0.04, 4.2, linearColor('#262d29'), linearColor('#2e3732'))
    // Seongsu Yeonmujang-gil (east)
    .box(64, -0.03, 0, 62, 0.04, 4.6, linearColor('#2d2524'), linearColor('#362c2a'))
    .box(68, -0.03, -8, 4.4, 0.04, 48, linearColor('#2d2524'), linearColor('#362c2a'))
    // Yeouido Hangang Park promenade
    .box(0, -0.03, 36, 176, 0.04, 4.4, linearColor('#232b36'), linearColor('#2a3442'))
    // Gangnam Teheran-ro & N-S connectors
    .box(0, -0.03, 66, 172, 0.04, 5.8, linearColor('#222632'), linearColor('#292e3d'))
    .box(-56, -0.025, 48, 6.4, 0.05, 44, linearColor('#2a303c'), linearColor('#323947'))
    .box(-17.2, -0.025, 46, 6.8, 0.05, 52, linearColor('#2a303c'), linearColor('#323947'))
    .box(26, -0.025, 46, 6.8, 0.05, 52, linearColor('#2a303c'), linearColor('#323947'))
    .box(68, -0.025, 46, 6.4, 0.05, 52, linearColor('#2a303c'), linearColor('#323947'));
  meshes['seoul.ground'] = batch(seoulGround.build());

  // Han River water surface & 4 Bridge Arches
  const hangang = createMeshBuilder()
    .box(0, -0.08, 48, 192, 0.06, 13.6, linearColor('#0b1d33'), linearColor('#102a49'));
  for (const bx of [-56, -17.2, 26, 68]) {
    // Bridge deck & side arch trusses
    hangang.box(bx, 0.01, 48, 6.8, 0.08, 15.8, linearColor('#3b4250'), linearColor('#485060'));
    for (const side of [-3.2, 3.2]) {
      hangang.box(bx + side, 0.09, 48, 0.22, 0.55, 15.6, linearColor('#707b8f'));
      hangang.box(bx + side, 0.64, 48, 0.18, 1.4, 0.4, linearColor('#c94a38'));
      hangang.box(bx + side, 0.64, 43.5, 0.18, 0.9, 0.35, linearColor('#c94a38'));
      hangang.box(bx + side, 0.64, 52.5, 0.18, 0.9, 0.35, linearColor('#c94a38'));
    }
  }
  meshes['seoul.hangang'] = batch(hangang.build(), {
    emissiveFactor: [0.04, 0.09, 0.16],
    emissiveStrength: 1
  });

  // 1. Gwanghwamun Gate & King Sejong Statue (Jongno-gu)
  const gwanghwamun = createMeshBuilder()
    // Stone fortress wall base (Seokchuk)
    .box(0, 0, 0, 10.6, 2.1, 4.2, linearColor('#6e6a63'), linearColor('#827d75'))
    // Three dark arched gate openings
    .box(0, 0, 0, 2.1, 1.45, 4.3, linearColor('#121318'))
    .box(-3.1, 0, 0, 1.6, 1.25, 4.3, linearColor('#121318'))
    .box(3.1, 0, 0, 1.6, 1.25, 4.3, linearColor('#121318'))
    // First-tier wooden pavilion & Dancheong trim
    .box(0, 2.1, 0, 9.2, 1.35, 3.4, linearColor('#7a2f28'), linearColor('#3c5e52'))
    .box(0, 3.45, 0, 11.4, 0.35, 4.8, linearColor('#283038'), linearColor('#353f4a'))
    // Second-tier pavilion & hipped roof
    .box(0, 3.8, 0, 7.4, 1.15, 2.7, linearColor('#7a2f28'), linearColor('#3c5e52'))
    .box(0, 4.95, 0, 9.8, 0.45, 4.1, linearColor('#242b33'), linearColor('#323b45'))
    // King Sejong & Yi Sun-sin pedestals on the plaza in front (+Z)
    .box(0, 0, 6.2, 1.8, 0.9, 1.8, linearColor('#57534d'))
    .cylinder(0, 0.9, 6.2, 0.55, 1.35, 8, linearColor('#b89448'), 0.42, linearColor('#d6b265'))
    .box(0, 0, 12.4, 1.5, 1.4, 1.5, linearColor('#57534d'))
    .cylinder(0, 1.4, 12.4, 0.38, 1.55, 8, linearColor('#4b6358'), 0.25, linearColor('#688779'));
  meshes['seoul.gwanghwamun'] = batch(gwanghwamun.build(), {
    emissiveFactor: [0.14, 0.1, 0.06],
    emissiveStrength: 1
  });

  // 2. Seoul Botanic Park Glass Dome & Lake Walk (Gangseo-gu Magok / Hwagok)
  const botanicMesh = createMeshBuilder()
    .cylinder(0, 0, 0, 4.5, 0.45, 12, linearColor('#3d5249'), 4.3, linearColor('#4d6b5d'))
    .cylinder(0, 0.45, 0, 4.1, 1.8, 12, linearColor('#4d9485'), 3.1, linearColor('#6ebfb0'))
    .cylinder(0, 2.25, 0, 3.1, 1.25, 12, linearColor('#6ebfb0'), 1.1, linearColor('#9ee3d5'))
    .box(0, 0.02, 7.2, 6.4, 0.08, 4.2, linearColor('#183a4a'), linearColor('#214f63'));
  meshes['seoul.botanicDome'] = batch(botanicMesh.build(), {
    emissiveFactor: [0.12, 0.28, 0.22],
    emissiveStrength: 1
  });

  // 3. Hongdae Eoulmadang-ro Busking Stage & Neon Gate (Mapo-gu)
  const hongdae = createMeshBuilder()
    .box(0, 0, 0, 6.0, 0.35, 3.8, linearColor('#2b1e38'), linearColor('#3e2952'))
    .box(-2.2, 0.35, -1.2, 0.9, 1.6, 0.8, linearColor('#18151c'))
    .box(2.2, 0.35, -1.2, 0.9, 1.6, 0.8, linearColor('#18151c'))
    .box(0, 2.6, -1.2, 5.4, 0.75, 0.25, linearColor('#e83c78'), linearColor('#ff6ca3'))
    .box(-2.5, 0.35, -1.2, 0.18, 2.3, 0.18, linearColor('#4cc9f0'))
    .box(2.5, 0.35, -1.2, 0.18, 2.3, 0.18, linearColor('#4cc9f0'));
  meshes['seoul.hongdaeStage'] = batch(hongdae.build(), {
    emissiveFactor: [0.35, 0.1, 0.28],
    emissiveStrength: 1
  });

  // 4. Namsan Park Hill & N Seoul Tower (Yongsan-gu)
  const namsan = createMeshBuilder()
    .cylinder(0, 0, 0, 3.2, 1.8, 10, linearColor('#25382c'), 2.1, linearColor('#314a3b'))
    .box(0, 1.8, 0, 2.4, 0.9, 2.4, linearColor('#4a5260'), linearColor('#5c6678'))
    .cylinder(0, 2.7, 0, 0.42, 4.6, 10, linearColor('#c9ced8'), 0.34, linearColor('#dce0e8'))
    .cylinder(0, 7.3, 0, 1.15, 0.85, 12, linearColor('#3868b8'), 1.05, linearColor('#5288e0'))
    .cylinder(0, 8.15, 0, 0.75, 0.55, 10, linearColor('#d94854'), 0.65, linearColor('#f06570'))
    .cylinder(0, 8.7, 0, 0.12, 2.4, 6, linearColor('#f2d58a'), 0.02, linearColor('#ffffff'));
  meshes['seoul.namsanTower'] = batch(namsan.build(), {
    emissiveFactor: [0.16, 0.24, 0.42],
    emissiveStrength: 1
  });

  // 5. Seongsu-dong Yeonmujang-gil Red Brick Atelier (Seongdong-gu)
  const seongsu = createMeshBuilder()
    .box(0, 0, 0, 7.2, 3.4, 5.0, linearColor('#8c3b30'), linearColor('#6b2c23'))
    .box(0, 3.4, 0, 7.5, 0.25, 5.3, linearColor('#28262b'))
    .box(-1.8, 0.9, 2.52, 1.8, 1.8, 0.08, linearColor('#f2c879'))
    .box(1.8, 0.9, 2.52, 1.8, 1.8, 0.08, linearColor('#f2c879'))
    .box(0, 0, 2.52, 1.1, 2.1, 0.12, linearColor('#1c1e24'));
  meshes['seoul.seongsuBrick'] = batch(seongsu.build(), {
    emissiveFactor: [0.22, 0.12, 0.07],
    emissiveStrength: 1
  });

  // 6. Yeouido Hangang Park & Seoul-Dal Moon Balloon (Yeongdeungpo-gu)
  const yeouido = createMeshBuilder()
    .cylinder(0, 0, 0, 2.0, 0.25, 10, linearColor('#3b4659'), 1.8, linearColor('#4f5d75'))
    .cylinder(0, 0.25, 0, 0.06, 6.2, 6, linearColor('#8c96a8'))
    .gem(0, 7.6, 0, 1.85, 1.85, linearColor('#ffe699'), 12);
  meshes['seoul.seoulDal'] = batch(yeouido.build(), {
    emissiveFactor: [0.45, 0.36, 0.15],
    emissiveStrength: 1
  });

  // 7. Gangnam Station / Teheran-ro High-rise Towers (Gangnam-gu)
  const gangnam = createMeshBuilder()
    .box(-2.4, 0, 0, 3.0, 8.6, 3.2, linearColor('#28466e'), linearColor('#3a6296'))
    .box(2.2, 0, 0.4, 3.2, 10.4, 3.2, linearColor('#1f3657'), linearColor('#2f5282'))
    .box(0, 0, -1.6, 2.4, 6.4, 2.4, linearColor('#325885'), linearColor('#4678b2'))
    // Media poles along Gangnam boulevard
    .box(-3.6, 0, 3.4, 0.28, 3.2, 0.28, linearColor('#4ce0d2'))
    .box(3.6, 0, 3.4, 0.28, 3.2, 0.28, linearColor('#e04ca8'));
  meshes['seoul.gangnamTowers'] = batch(gangnam.build(), {
    emissiveFactor: [0.12, 0.22, 0.38],
    emissiveStrength: 1
  });

  // 8. Jamsil Supertall Skyline Tower (Songpa-gu)
  const jamsil = createMeshBuilder()
    .cylinder(0, 0, 0, 2.8, 5.5, 10, linearColor('#3a4f78'), 2.1, linearColor('#4c6699'))
    .cylinder(0, 5.5, 0, 2.1, 5.5, 10, linearColor('#4c6699'), 1.3, linearColor('#6887c2'))
    .cylinder(0, 11.0, 0, 1.3, 4.8, 10, linearColor('#6887c2'), 0.55, linearColor('#96b2eb'))
    .gem(0, 16.2, 0, 0.65, 0.9, linearColor('#fff2b2'), 8);
  meshes['seoul.lotteTower'] = batch(jamsil.build(), {
    emissiveFactor: [0.18, 0.24, 0.42],
    emissiveStrength: 1
  });

  return meshes;
}

export type Matrix4 = Float32Array;

/** Column-major translate · rotateY · uniform scale. */
export function modelMatrix(x: number, y: number, z: number, yaw = 0, scale = 1): Matrix4 {
  const c = Math.cos(yaw) * scale;
  const s = Math.sin(yaw) * scale;
  return new Float32Array([c, 0, -s, 0, 0, scale, 0, 0, s, 0, c, 0, x, y, z, 1]);
}

/** Faces the camera: XY plane spans camera right/up. */
export function billboardMatrix(
  x: number,
  y: number,
  z: number,
  scale: number,
  basis: WorldCameraBasis,
  roll = 0
): Matrix4 {
  const { right, up, forward } = basis;
  const cr = Math.cos(roll),
    sr = Math.sin(roll);
  const rx: V3 = [right[0] * cr + up[0] * sr, right[1] * cr + up[1] * sr, right[2] * cr + up[2] * sr];
  const ux: V3 = [up[0] * cr - right[0] * sr, up[1] * cr - right[1] * sr, up[2] * cr - right[2] * sr];
  // Right-handed: right × up = -forward (the disc's +Z faces the camera).
  return new Float32Array([
    rx[0] * scale, rx[1] * scale, rx[2] * scale, 0,
    ux[0] * scale, ux[1] * scale, ux[2] * scale, 0,
    -forward[0] * scale, -forward[1] * scale, -forward[2] * scale, 0,
    x, y, z, 1
  ]);
}

/** Camera-space attachment (x right, y up, -z forward) at the eye. */
export function cameraMatrix(
  eye: V3,
  basis: WorldCameraBasis,
  offset: V3 = [0, 0, 0]
): Matrix4 {
  const { right, up, forward } = basis;
  const back: V3 = [-forward[0], -forward[1], -forward[2]];
  const position: V3 = [
    eye[0] + right[0] * offset[0] + up[0] * offset[1] + back[0] * offset[2],
    eye[1] + right[1] * offset[0] + up[1] * offset[1] + back[1] * offset[2],
    eye[2] + right[2] * offset[0] + up[2] * offset[1] + back[2] * offset[2]
  ];
  return new Float32Array([
    right[0], right[1], right[2], 0,
    up[0], up[1], up[2], 0,
    back[0], back[1], back[2], 0,
    position[0], position[1], position[2], 1
  ]);
}
