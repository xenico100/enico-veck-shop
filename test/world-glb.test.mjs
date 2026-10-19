import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { loadWorldGlb, parseWorldGlb } from '../utils/world-glb.ts';

const near = (actual, expected, tolerance = 1e-6) => {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`);
};

function fixture() {
  const binary = new Uint8Array(116);
  binary.set(
    new Uint8Array(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer),
    0
  );
  binary.set(
    new Uint8Array(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]).buffer),
    36
  );
  binary.set(new Uint8Array(new Float32Array([0, 0, 1, 0, 0, 1]).buffer), 72);
  binary.set([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255], 96);
  binary.set(new Uint8Array(new Uint16Array([0, 1, 2]).buffer), 108);
  const document = {
    asset: { version: '2.0' },
    buffers: [{ byteLength: binary.byteLength }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 36 },
      { buffer: 0, byteOffset: 72, byteLength: 24 },
      { buffer: 0, byteOffset: 96, byteLength: 12 },
      { buffer: 0, byteOffset: 108, byteLength: 6 }
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: 3, type: 'VEC2' },
      {
        bufferView: 3,
        componentType: 5121,
        normalized: true,
        count: 3,
        type: 'VEC4'
      },
      { bufferView: 4, componentType: 5123, count: 3, type: 'SCALAR' }
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2, COLOR_0: 3 },
            indices: 4,
            material: 0
          }
        ]
      }
    ],
    materials: [
      {
        pbrMetallicRoughness: { baseColorFactor: [1, 0.5, 0.25, 1] },
        emissiveFactor: [0.1, 0.2, 0.3],
        extensions: {
          KHR_materials_emissive_strength: { emissiveStrength: 2.2 },
          KHR_materials_unlit: {}
        }
      }
    ],
    nodes: [
      { translation: [2, 0, 0], children: [1, 2] },
      { translation: [0, 3, 0], scale: [2, 1, 1], mesh: 0 },
      { translation: [-4, 0, 0], mesh: 0 }
    ],
    scenes: [{ nodes: [0] }],
    scene: 0
  };
  return { document, binary };
}

function encode(document, binary) {
  const json = new TextEncoder().encode(JSON.stringify(document));
  const jsonLength = Math.ceil(json.byteLength / 4) * 4;
  const binaryLength = Math.ceil(binary.byteLength / 4) * 4;
  const buffer = new ArrayBuffer(12 + 8 + jsonLength + 8 + binaryLength);
  const view = new DataView(buffer),
    bytes = new Uint8Array(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(32, 20, 20 + jsonLength);
  bytes.set(json, 20);
  view.setUint32(20 + jsonLength, binaryLength, true);
  view.setUint32(24 + jsonLength, 0x004e4942, true);
  bytes.set(binary, 28 + jsonLength);
  return buffer;
}

function imageFixture() {
  const { document, binary } = fixture();
  const imageBinary = new Uint8Array(140);
  imageBinary.set(binary);
  const header = new DataView(imageBinary.buffer, 116, 24);
  header.setUint32(0, 0x89504e47);
  header.setUint32(4, 0x0d0a1a0a);
  header.setUint32(16, 2);
  header.setUint32(20, 2);
  document.buffers[0].byteLength = imageBinary.byteLength;
  document.bufferViews.push({ buffer: 0, byteOffset: 116, byteLength: 24 });
  document.images = [{ bufferView: 5, mimeType: 'image/png' }];
  document.textures = [{ source: 0 }, { source: 0 }];
  document.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };
  return { document, binary: imageBinary };
}

// Node has no real image decoder. This inspects each embedded PNG header only;
// successful image decoding and GPU upload remain browser verification tasks.
async function withBitmapHeaderStub(run, onDecode) {
  const previous = globalThis.createImageBitmap;
  const images = [];
  globalThis.createImageBitmap = async (blob, options) => {
    assert.equal(blob.type, 'image/png');
    assert.equal(options.imageOrientation, 'none');
    const header = new DataView(await blob.arrayBuffer());
    assert.equal(header.getUint32(0), 0x89504e47);
    assert.equal(header.getUint32(4), 0x0d0a1a0a);
    const image = {
      width: header.getUint32(16),
      height: header.getUint32(20),
      closeCount: 0,
      close() {
        this.closeCount++;
      }
    };
    images.push(image);
    onDecode?.(image);
    return image;
  };
  try {
    return await run(images);
  } finally {
    if (previous === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = previous;
  }
}

test('fixture: indexed triangles apply parent TRS and merge equal materials', async () => {
  const { document, binary } = fixture();
  const scene = await parseWorldGlb(encode(document, binary));
  assert.equal(scene.triangleCount, 2);
  assert.equal(scene.batches.length, 1);
  assert.equal(scene.batches[0].vertexCount, 6);
  assert.deepEqual(scene.bounds, { min: [-2, 0, 0], max: [4, 4, 0] });
  assert.deepEqual(scene.stats, {
    nodeCount: 3,
    meshInstances: 2,
    primitiveCount: 2,
    materialCount: 1,
    textureCount: 0
  });
  assert.deepEqual([...scene.batches[0].vertices.slice(0, 3)], [2, 3, 0]);
  assert.deepEqual([...scene.batches[0].vertices.slice(8, 12)], [1, 0, 0, 1]);
  near(scene.batches[0].vertices[18], 1);
  near(scene.batches[0].vertices[19], 0);
  assert.deepEqual(
    scene.batches[0].material.baseColorFactor,
    [1, 0.5, 0.25, 1]
  );
  assert.deepEqual(scene.batches[0].material.emissiveFactor, [0.1, 0.2, 0.3]);
  assert.equal(scene.batches[0].material.emissiveStrength, 2.2);
  assert.equal(scene.batches[0].material.unlit, true);
  scene.dispose();
});

test('fixture: normals use inverse transpose for nonuniform scale', async () => {
  const { document, binary } = fixture();
  binary.set(
    new Uint8Array(
      new Float32Array(
        Array.from({ length: 3 }, () => [Math.SQRT1_2, Math.SQRT1_2, 0]).flat()
      ).buffer
    ),
    36
  );
  document.nodes = [{ mesh: 0, scale: [2, 1, 1] }];
  const scene = await parseWorldGlb(encode(document, binary));
  near(scene.batches[0].vertices[3], 1 / Math.sqrt(5));
  near(scene.batches[0].vertices[4], 2 / Math.sqrt(5));
  near(scene.batches[0].vertices[5], 0);
  scene.dispose();
});

test('fixture: quaternion and matrix nodes preserve glTF column-major transforms', async () => {
  for (const node of [
    {
      mesh: 0,
      rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2],
      translation: [2, 0, 0]
    },
    { mesh: 0, matrix: [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1] }
  ]) {
    const { document, binary } = fixture();
    document.nodes = [node];
    const scene = await parseWorldGlb(encode(document, binary));
    near(scene.batches[0].vertices[12], 2);
    near(scene.batches[0].vertices[13], 1);
    near(scene.batches[0].vertices[14], 0);
    scene.dispose();
  }
});

test('fixture: mirrored transforms fix triangle winding and preserve authored or generated normals', async () => {
  for (const omitNormal of [false, true]) {
    const { document, binary } = fixture();
    document.nodes = [{ mesh: 0, scale: [-1, 1, 1] }];
    if (omitNormal) delete document.meshes[0].primitives[0].attributes.NORMAL;
    const scene = await parseWorldGlb(encode(document, binary));
    assert.deepEqual([...scene.batches[0].vertices.slice(12, 15)], [0, 1, 0]);
    near(scene.batches[0].vertices[5], 1);
    scene.dispose();
  }
});

test('fixture: interleaved bufferViews respect byteStride and accessor byteOffset', async () => {
  const { document } = fixture();
  const binary = new Uint8Array(
    new Float32Array([99, 0, 0, 0, 0, 0, 99, 1, 0, 0, 1, 0, 99, 0, 1, 0, 0, 1])
      .buffer
  );
  document.buffers = [{ byteLength: binary.byteLength }];
  document.bufferViews = [
    { buffer: 0, byteLength: binary.byteLength, byteStride: 24 }
  ];
  document.accessors = [
    {
      bufferView: 0,
      byteOffset: 4,
      componentType: 5126,
      count: 3,
      type: 'VEC3'
    },
    {
      bufferView: 0,
      byteOffset: 16,
      componentType: 5126,
      count: 3,
      type: 'VEC2'
    }
  ];
  document.meshes = [
    { primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 } }] }
  ];
  document.nodes = [{ mesh: 0 }];
  const scene = await parseWorldGlb(encode(document, binary));
  assert.equal(scene.triangleCount, 1);
  near(scene.batches[0].vertices[12], 1);
  near(scene.batches[0].vertices[18], 1);
  near(scene.batches[0].vertices[31], 1);
  scene.dispose();
});

test('fixture: malformed ranges, unsupported extensions, cycles and external resources reject', async () => {
  const edits = [
    [
      (d) => {
        d.buffers[0].uri = 'external.bin';
      },
      /내장 BIN/
    ],
    [
      (d) => {
        d.nodes[0].children.push(0);
      },
      /순환/
    ],
    [
      (d) => {
        d.bufferViews[0].byteLength = 10_000;
      },
      /bufferView 범위/
    ],
    [
      (d) => {
        d.accessors[0].byteOffset = 100;
      },
      /accessor 범위/
    ],
    [
      (d) => {
        d.accessors[0].sparse = {};
      },
      /희소/
    ],
    [
      (d) => {
        d.extensionsRequired = ['KHR_draco_mesh_compression'];
      },
      /확장/
    ],
    [
      (d) => {
        d.meshes[0].primitives[0].mode = 1;
      },
      /삼각형/
    ],
    [
      (d) => {
        d.animations = [{}];
      },
      /정적 메시/
    ]
  ];
  for (const [edit, expected] of edits) {
    const { document, binary } = fixture();
    edit(document);
    await assert.rejects(parseWorldGlb(encode(document, binary)), expected);
  }
  const { document, binary } = imageFixture();
  document.images[0].uri = 'external.png';
  await assert.rejects(parseWorldGlb(encode(document, binary)), /내장 PNG/);
});

test('fixture: PNGs deduplicate and all image resources close exactly once', async () => {
  const { document, binary } = imageFixture();
  await withBitmapHeaderStub(async (images) => {
    const scene = await parseWorldGlb(encode(document, binary));
    assert.equal(images.length, 1);
    assert.equal(scene.textures.length, 2);
    assert.equal(scene.textures[0].image, scene.textures[1].image);
    assert.equal(scene.textures[0].magFilter, 9728);
    assert.equal(scene.textures[0].wrapS, 10497);
    assert.equal(scene.textures[0].wrapT, 10497);
    scene.dispose();
    scene.dispose();
    assert.equal(images[0].closeCount, 1);
  });
});

test('fixture: abort before parse and during PNG handling rejects and cleans decoded resources', async () => {
  const { document, binary } = imageFixture();
  const before = new AbortController();
  before.abort();
  await assert.rejects(
    parseWorldGlb(encode(document, binary), { signal: before.signal }),
    { name: 'AbortError' }
  );
  const during = new AbortController();
  await withBitmapHeaderStub(
    async (images) => {
      await assert.rejects(
        parseWorldGlb(encode(document, binary), { signal: during.signal }),
        { name: 'AbortError' }
      );
      assert.equal(images.length, 1);
      assert.equal(images[0].closeCount, 1);
    },
    () => during.abort()
  );
});

test('fixture: texture count, per-image dimensions and aggregate decode limits reject before excess work', async () => {
  const many = imageFixture();
  many.document.textures = Array.from({ length: 129 }, () => ({ source: 0 }));
  await assert.rejects(
    parseWorldGlb(encode(many.document, many.binary)),
    /텍스처 개수 제한/
  );

  const oversized = imageFixture();
  new DataView(oversized.binary.buffer).setUint32(132, 4097);
  await assert.rejects(
    parseWorldGlb(encode(oversized.document, oversized.binary)),
    /PNG 크기/
  );

  const aggregate = imageFixture();
  const header = new DataView(aggregate.binary.buffer);
  header.setUint32(132, 4096);
  header.setUint32(136, 4096);
  aggregate.document.images = Array.from({ length: 3 }, () => ({
    bufferView: 5,
    mimeType: 'image/png'
  }));
  aggregate.document.textures = [{ source: 0 }, { source: 1 }, { source: 2 }];
  await withBitmapHeaderStub(async (images) => {
    await assert.rejects(
      parseWorldGlb(encode(aggregate.document, aggregate.binary)),
      /전체 텍스처 픽셀 제한/
    );
    assert.equal(images.length, 2);
    assert.ok(images.every((image) => image.closeCount === 1));
  });
});

test('fixture: fetch adapter forwards abort and credentials and rejects HTTP or oversized responses', async () => {
  const previous = globalThis.fetch;
  const controller = new AbortController();
  const { document, binary } = fixture();
  let calls = 0;
  try {
    globalThis.fetch = async (url, options) => {
      calls++;
      assert.equal(url, '/test-world.glb');
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.signal, controller.signal);
      return new Response(encode(document, binary));
    };
    const scene = await loadWorldGlb('/test-world.glb', {
      signal: controller.signal
    });
    assert.equal(scene.triangleCount, 2);
    scene.dispose();
    assert.equal(calls, 1);
    controller.abort();
    await assert.rejects(
      loadWorldGlb('/test-world.glb', { signal: controller.signal }),
      { name: 'AbortError' }
    );
    assert.equal(calls, 1);
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(loadWorldGlb('/test-world.glb'), /404/);
    globalThis.fetch = async () => ({
      ok: true,
      headers: new Headers({ 'Content-Length': String(64 * 1024 * 1024 + 1) }),
      arrayBuffer() {
        assert.fail(
          'oversized response must reject before downloading its body'
        );
      }
    });
    await assert.rejects(loadWorldGlb('/test-world.glb'), /파일 크기 제한/);
  } finally {
    globalThis.fetch = previous;
  }
});

for (const asset of [
  {
    name: 'village',
    triangles: 14_203,
    nodes: 39,
    materials: 39,
    textures: 20
  },
  {
    name: 'companion',
    triangles: 72_928,
    nodes: 12,
    materials: 11,
    textures: 0
  }
]) {
  test(`export: ${asset.name}.glb parses actual geometry and embedded PNG headers`, async () => {
    // Deliberately no skip: missing exports must fail the final verification run.
    const bytes = await readFile(
      new URL(`../public/world-assets/${asset.name}.glb`, import.meta.url)
    );
    const buffer = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength
    );
    await withBitmapHeaderStub(async (images) => {
      const scene = await parseWorldGlb(buffer);
      try {
        assert.equal(scene.triangleCount, asset.triangles);
        assert.equal(scene.batches.length, asset.materials);
        assert.equal(scene.stats.materialCount, scene.batches.length);
        assert.equal(
          scene.triangleCount * 3,
          scene.batches.reduce((sum, batch) => sum + batch.vertexCount, 0)
        );
        assert.equal(scene.stats.nodeCount, asset.nodes);
        assert.equal(scene.stats.meshInstances, asset.materials);
        assert.equal(scene.textures.length, asset.textures);
        assert.equal(images.length, asset.textures);
        for (const image of images)
          assert.ok(
            image.width > 0 &&
              image.height > 0 &&
              image.width <= 4096 &&
              image.height <= 4096
          );
        for (let axis = 0; axis < 3; axis++) {
          assert.ok(
            Number.isFinite(scene.bounds.min[axis]) &&
              Number.isFinite(scene.bounds.max[axis])
          );
          assert.ok(scene.bounds.max[axis] > scene.bounds.min[axis]);
        }
        let varyingUv = false;
        for (const batch of scene.batches) {
          assert.equal(batch.vertices.length, batch.vertexCount * 12);
          assert.ok(
            [
              ...batch.material.baseColorFactor,
              ...batch.material.emissiveFactor,
              batch.material.emissiveStrength
            ].every(Number.isFinite)
          );
          for (let offset = 0; offset < batch.vertices.length; offset += 12) {
            for (let c = 0; c < 12; c++)
              assert.ok(Number.isFinite(batch.vertices[offset + c]));
            near(
              Math.hypot(
                batch.vertices[offset + 3],
                batch.vertices[offset + 4],
                batch.vertices[offset + 5]
              ),
              1,
              1e-4
            );
            if (
              batch.vertices[offset + 6] !== batch.vertices[6] ||
              batch.vertices[offset + 7] !== batch.vertices[7]
            )
              varyingUv = true;
          }
        }
        if (asset.textures > 0)
          assert.ok(
            varyingUv,
            'textured geometry must contain useful UV coordinates'
          );
      } finally {
        scene.dispose();
      }
      assert.ok(images.every((image) => image.closeCount === 1));
    });
  });
}
