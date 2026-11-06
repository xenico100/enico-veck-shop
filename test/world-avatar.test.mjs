import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';

const hooks = registerHooks({
  resolve(s, context, next) {
    return next(/^\.\/world-|^\.\/village-buildings$/.test(s) && !s.endsWith('.ts') ? s + '.ts' : s, context);
  }
});
after(() => hooks.deregister());
const { parseAvatarManifest, createOriginalAvatar, originalAvatarInstances, loadOriginalAvatar } = await import('../utils/world-avatar.ts');
const { createAssetWorldRenderer } = await import('../utils/world-asset-renderer.ts');
const { buildWorldFrame, emptySceneFx } = await import('../utils/world-scene.ts');
const { createGameState, defaultWorldSettings } = await import('../utils/world-game.ts');

function fixture() {
  const m = {
    version: 1, binary: ['part-1.bin', 'part-2.bin'], byteLength: 432,
    frames: [{ name: 'idle' }, { name: 'walk.0' }, { name: 'walk.1' }, { name: 'ride' }],
    walk: { startFrame: 1, frameCount: 2, duration: 1 }, idleFrame: 0, rideFrame: 3, textures: [],
    batches: [{
      name: 'body', vertexCount: 3, baseByteOffset: 0, frameByteOffsets: [144, 216, 288, 360],
      material: { baseColorFactor: [1,1,1,1], emissiveFactor: [0,0,0], emissiveStrength: 0,
        textureIndex: null, alphaMode: 'OPAQUE', alphaCutoff: .5, doubleSided: true, unlit: false }
    }]
  };
  const bytes = new ArrayBuffer(m.byteLength);
  for (let v = 0; v < 3; v++) new Float32Array(bytes, 0, 36).set([v*.1,0,0,0,1,0,v*.3,.5,1,1,1,1], v*12);
  for (let f = 0; f < 4; f++) for (let v = 0; v < 3; v++)
    new Float32Array(bytes, 144 + f*72, 18).set([v*.1,f*.1,0,0,1,0], v*6);
  return { m, bytes };
}
const pose = { x: 3, z: 4, yaw: 0, pitch: 0 };
const frame = (extra = {}) => buildWorldFrame({
  state: createGameState(), pose, time: 0, settings: defaultWorldSettings, fx: emptySceneFx(), eyeOffset: 0,
  player: { pose, yaw: 0, speed: 0, gait: 0, opacity: 1 }, ...extra
});

test('manifest accepts single/multipart assets and rejects unsafe paths, overlap and unbounded offsets', () => {
  const { m } = fixture();
  assert.equal(parseAvatarManifest(m), m);
  assert.equal(parseAvatarManifest({ ...m, binary: 'avatar.bin' }).binary, 'avatar.bin');
  for (const binary of [[], Array(5).fill('part.bin'), ['../bad.bin'], ['https://bad.test/a.bin'], ['part.png'], null])
    assert.throws(() => parseAvatarManifest({ ...m, binary }));
  for (const changes of [
    { byteLength: 100_000_000 }, { rideFrame: 4 }, { walk: { ...m.walk, frameCount: 5 } },
    { batches: [{ ...m.batches[0], baseByteOffset: 2 }] },
    { batches: [{ ...m.batches[0], frameByteOffsets: [144,144,288,360] }] },
    { batches: [{ ...m.batches[0], frameByteOffsets: [144,216,288,432] }] },
    { batches: [{ ...m.batches[0], material: { ...m.batches[0].material, textureIndex: 0 } }] }
  ]) assert.throws(() => parseAvatarManifest({ ...m, ...changes }));
});

test('interpolation preserves UV/color, unit normals, idle settling and distinct riding pose', () => {
  const { m, bytes } = fixture();
  const avatar = createOriginalAvatar(m, bytes), out = avatar.scene.batches[0].vertices;
  avatar.sample(.25, 1.9, false, 1/30);
  assert.ok(Math.abs(out[1] - .15) < 1e-6);
  assert.deepEqual(Array.from(out.slice(6,12)), [0,.5,1,1,1,1]);
  for (let i = 0; i < 100; i++) avatar.sample(0, 0, false, 1/30);
  assert.equal(avatar.sample(0, 0, false, 1/30), false);
  assert.ok(out[1] < .0001);
  for (let i = 0; i < 100; i++) avatar.sample(0, 2, true, 1/30);
  assert.ok(Math.abs(out[1] - .3) < .0001);
  assert.equal(avatar.sample(0, 2, true, 1/30), false);
  assert.equal(Math.hypot(...out.slice(3,6)), 1);
  assert.throws(() => createOriginalAvatar(m, bytes.slice(4)));
  const bad = bytes.slice(0); new Float32Array(bad)[36] = NaN;
  assert.throws(() => createOriginalAvatar(m, bad));
});

test('shipped multipart data has complete original body, mask, garment and bounded motion', () => {
  const base = new URL('../public/world-assets/mongsangnyeo/', import.meta.url);
  const m = parseAvatarManifest(JSON.parse(readFileSync(new URL('avatar.json', base), 'utf8')));
  assert.equal(m.binary.length, 2);
  const data = Buffer.concat(m.binary.map(p => readFileSync(new URL(p, base))));
  assert.equal(data.byteLength, m.byteLength);
  const avatar = createOriginalAvatar(m, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  assert.equal(avatar.scene.triangleCount, 11968);
  assert.equal(avatar.scene.batches.reduce((sum,b) => sum + b.vertexCount, 0), 35904);
  for (const name of ['Body', 'CatMask', 'Romper']) assert.ok(m.batches.some(b => b.name.includes(name)));
  for (const texture of m.textures) assert.ok(readFileSync(new URL(texture.file, base)).byteLength > 0);
  for (const [seconds,speed,riding] of [[0,0,false],[.3,1.9,false],[.8,1.9,false],[0,0,true]]) {
    assert.equal(avatar.sample(seconds,speed,riding,.1), true);
    for (const b of avatar.scene.batches) assert.ok(b.vertices.every(Number.isFinite));
  }
});

test('original instances replace fallback and retain fade, hidden and riding transforms', () => {
  const { m, bytes } = fixture(), avatar = createOriginalAvatar(m, bytes);
  const instances = originalAvatarInstances(avatar, pose, 0, .4, true);
  assert.equal(instances[0].blend, 'alpha');
  assert.ok(instances[0].smooth && instances[0].surfaceLighting);
  assert.ok(Math.abs(instances[0].model[13] - .24) < 1e-6);
  assert.equal(instances[0].model[12], pose.x);
  assert.deepEqual(originalAvatarInstances(avatar, pose, 0, 0, false), []);
  assert.deepEqual(frame({ avatarInstances: instances }).instances.filter(x => x.mesh.startsWith('mongsang.')), instances);
  assert.equal(frame({ avatarInstances: [] }).instances.filter(x => x.mesh.startsWith('mongsang.')).length, 0);
  assert.ok(frame().instances.some(x => x.mesh.startsWith('mongsang.')));
});

function mockCanvas() {
  // Based on world-camera.test.mjs. This tests CPU lifecycle, not actual GPU rendering.
  const calls = [], constants = { MAX_TEXTURE_SIZE:3379, NEAREST:9728, LINEAR:9729,
    NEAREST_MIPMAP_NEAREST:9984, LINEAR_MIPMAP_LINEAR:9987, REPEAT:10497,
    MIRRORED_REPEAT:33648, CLAMP_TO_EDGE:33071 };
  let id = 0;
  const gl = new Proxy(constants, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'getParameter') return () => 4096;
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation') return (_p, name) => name;
      if (String(key).startsWith('create')) return (...args) => { const result = { id: ++id }; calls.push({ key,args,result }); return result; };
      if (String(key).toUpperCase() === key) return 0;
      return (...args) => { calls.push({ key,args }); };
    }
  });
  class Canvas extends EventTarget {
    width = 640; height = 480; clientWidth = 640; clientHeight = 480;
    getContext() { return gl; }
  }
  return { canvas: new Canvas(), calls, count: key => calls.filter(c => c.key === key).length };
}

test('named textured meshes reuse buffers, restore from retained data and close bitmaps only on disposal', () => {
  const { m, bytes } = fixture(), avatar = createOriginalAvatar(m, bytes);
  let closed = 0;
  avatar.scene.batches[0].material.textureIndex = 0;
  avatar.scene.textures.push({ image: { width:2,height:2,close(){closed++;} }, wrapS:33071,wrapT:33071,minFilter:9729,magFilter:9729 });
  const { canvas, calls, count } = mockCanvas();
  const renderer = createAssetWorldRenderer(canvas, { batches:[],textures:[],dispose(){} });
  renderer.registerNamedScene('mongsang.original', avatar.scene);
  const bufferCount = count('createBuffer'), uploadCount = count('bufferData');
  avatar.sample(.2,1,false,.1);
  renderer.updateMesh(avatar.meshNames[0]);
  assert.equal(count('createBuffer'), bufferCount);
  assert.equal(count('bufferData'), uploadCount);
  assert.equal(count('bufferSubData'), 1);
  assert.equal(calls.find(c => c.key === 'bufferSubData').args[2], avatar.scene.batches[0].vertices);
  renderer.render(pose,0,frame({ avatarInstances: originalAvatarInstances(avatar,pose,0,1,false) }));
  assert.ok(calls.some(c => c.key === 'uniform1f' && c.args[0] === 'uHasTexture' && c.args[1] === 1));
  const loss = new Event('webglcontextlost',{cancelable:true});
  canvas.dispatchEvent(loss);
  assert.ok(loss.defaultPrevented && renderer.stats.contextLost);
  assert.equal(closed,0);
  renderer.updateMesh(avatar.meshNames[0]);
  assert.equal(count('bufferSubData'),1);
  canvas.dispatchEvent(new Event('webglcontextrestored'));
  assert.equal(renderer.stats.contextLost,false);
  assert.equal(renderer.stats.restoreFailed,false);
  assert.equal(count('createBuffer'),bufferCount+1);
  assert.equal(renderer.stats.geometryBytes,144);
  assert.equal(closed,0);
  renderer.updateMesh(avatar.meshNames[0]);
  assert.equal(count('bufferSubData'),2);
  renderer.dispose(); renderer.dispose();
  assert.equal(closed,1);
});

// Each test restores global functions even if an assertion fails.
async function withAssets(m, bytes, action, bitmap = async () => ({width:2,height:2,close(){}}), truncate = 0) {
  const oldFetch = globalThis.fetch, oldBitmap = globalThis.createImageBitmap, requested = [];
  globalThis.fetch = async (url, options) => {
    requested.push(String(url));
    if (options.signal.aborted) throw new DOMException('Cancelled','AbortError');
    const path = String(url).split('/').at(-1);
    const data = path === 'avatar.json' ? new TextEncoder().encode(JSON.stringify(m)) :
      path === 'part-1.bin' ? bytes.slice(0,200) :
      path === 'part-2.bin' ? bytes.slice(200,bytes.byteLength-truncate) : new Uint8Array([1,2,3]);
    return new Response(data);
  };
  globalThis.createImageBitmap = bitmap;
  try { await action(requested); }
  finally { globalThis.fetch = oldFetch; if (oldBitmap) globalThis.createImageBitmap = oldBitmap; else delete globalThis.createImageBitmap; }
}

test('multipart loader concatenates in order and rejects truncated payloads before decoding textures', async () => {
  const {m,bytes} = fixture();
  await withAssets(m,bytes,async requested => {
    const avatar = await loadOriginalAvatar(new AbortController().signal);
    assert.deepEqual(requested.map(p => p.split('/').at(-1)),['avatar.json','part-1.bin','part-2.bin']);
    assert.equal(avatar.scene.batches[0].vertices[1],0);
    avatar.scene.dispose();
  });
  await withAssets(m,bytes,async () => {
    await assert.rejects(loadOriginalAvatar(new AbortController().signal));
  },undefined,4);
});

test('failed later texture decode closes earlier bitmaps and permits a clean fresh retry', async () => {
  const {m,bytes} = fixture(); m.textures = [{file:'body.png'},{file:'mask.png'}];
  let decoded = 0, closed = 0;
  await withAssets(m,bytes,async () => {
    await assert.rejects(loadOriginalAvatar(new AbortController().signal),/decode failed/);
    assert.equal(closed,1);
  },async () => {
    if (++decoded === 2) throw new Error('decode failed');
    return {width:2,height:2,close(){closed++;}};
  });
  await withAssets(m,bytes,async () => {
    const avatar = await loadOriginalAvatar(new AbortController().signal);
    assert.equal(avatar.scene.textures.length,2);
    avatar.scene.dispose();
  });
});

test('cancellation while bitmap decoding closes current and already-decoded images', async () => {
  const {m,bytes} = fixture(); m.textures = [{file:'body.png'},{file:'mask.png'}];
  const controller = new AbortController(); let decoded = 0, closed = 0;
  await withAssets(m,bytes,async () => {
    await assert.rejects(loadOriginalAvatar(controller.signal));
    assert.equal(closed,2);
  },async () => {
    if (++decoded === 2) controller.abort();
    return {width:2,height:2,close(){closed++;}};
  });
});

