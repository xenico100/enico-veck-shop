// Local-only, single-browser performance snapshot. Uses an ALREADY RUNNING server.
// WORLD_TEST_URL=http://127.0.0.1:3214 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs
// PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium node test/world-performance.browser.mjs
// Optional renderer markers (no filenames/URLs):
// canvas.dataset.worldScene = 'approved-village' | 'placeholder'
// canvas.dataset.worldAssetState = 'loading' | 'ready' | 'error'
// performance.mark('world:asset-ready' | 'world:first-frame' | 'world:interactive')
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = process.env.WORLD_TEST_URL || 'http://127.0.0.1:3214';
assert.ok(
  /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin),
  'performance measurements are limited to a local preview'
);
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
);
const output = resolve(
  process.env.WORLD_TEST_OUTPUT || '../world-verification'
);
const viewport = { width: 1440, height: 900 };
const walkDurationMs = 3000;
const includeCharacter = process.env.WORLD_PERF_CHARACTER === '1';
const requireRealAsset = process.env.WORLD_PERF_ALLOW_PROXY !== '1';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  chromiumSandbox: false,
  args: [
    '--enable-webgl',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]
});

try {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  // Install before application code, so initial geometry/texture allocations count.
  await context.addInitScript(() => {
    performance.setResourceTimingBufferSize(1000);
    const contexts = [];
    const seen = new WeakSet();
    const probe = {
      sampling: false,
      hookErrors: 0,
      frames: [],
      pending: { draws: 0, submittedVertices: 0, firstDrawAt: null },
      request: 0,
      startedAt: null,
      endedAt: null,
      target: null
    };
    const sum = (values) =>
      [...values].reduce((total, value) => total + value, 0);
    const sizeOf = (data) => data?.byteLength || 0;
    const getContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (kind, ...options) {
      const gl = getContext.call(this, kind, ...options);
      if (!gl || !/^webgl2?$/.test(kind) || seen.has(gl)) return gl;
      seen.add(gl);
      const buffers = new Map();
      const boundBuffers = new Map();
      const textures = new Map();
      const boundTextures = new Map();
      let activeUnit = gl.TEXTURE0;
      const state = {
        canvas: this,
        gl,
        buffers,
        textures,
        unknownTextureAllocations: 0
      };
      contexts.push(state);
      const hook = (name, observe, object = gl) => {
        if (typeof object[name] !== 'function') return;
        const original = object[name];
        try {
          object[name] = function (...args) {
            const result = original.apply(this, args);
            try {
              observe(args, result);
            } catch {
              probe.hookErrors++;
            }
            return result;
          };
        } catch {
          probe.hookErrors++;
        }
      };
      const draw = (count, instances = 1) => {
        if (!probe.sampling || state.canvas !== probe.target) return;
        probe.pending.draws++;
        probe.pending.submittedVertices += count * instances;
        probe.pending.firstDrawAt ??= performance.now();
      };
      hook('drawArrays', (args) => draw(args[2]));
      hook('drawElements', (args) => draw(args[1]));
      hook('drawArraysInstanced', (args) => draw(args[2], args[3]));
      hook('drawElementsInstanced', (args) => draw(args[1], args[4]));
      const extensions = new WeakSet();
      hook('getExtension', ([name], extension) => {
        if (
          name !== 'ANGLE_instanced_arrays' ||
          !extension ||
          extensions.has(extension)
        )
          return;
        extensions.add(extension);
        hook(
          'drawArraysInstancedANGLE',
          (args) => draw(args[2], args[3]),
          extension
        );
        hook(
          'drawElementsInstancedANGLE',
          (args) => draw(args[1], args[4]),
          extension
        );
      });
      hook('bindBuffer', ([target, buffer]) =>
        boundBuffers.set(target, buffer)
      );
      hook('bufferData', ([target, data, , srcOffset = 0, length]) => {
        const buffer = boundBuffers.get(target);
        if (!buffer) return;
        const elementBytes = data?.BYTES_PER_ELEMENT || 1;
        const bytes =
          typeof data === 'number'
            ? data
            : length !== undefined && length > 0
              ? length * elementBytes
              : Math.max(0, sizeOf(data) - srcOffset * elementBytes);
        buffers.set(buffer, bytes);
      });
      hook('deleteBuffer', ([buffer]) => buffers.delete(buffer));
      hook('activeTexture', ([unit]) => {
        activeUnit = unit;
      });
      hook('bindTexture', ([target, texture]) =>
        boundTextures.set(`${activeUnit}:${target}`, texture)
      );
      const textureFor = (target) => {
        const binding =
          target >= gl.TEXTURE_CUBE_MAP_POSITIVE_X &&
          target <= gl.TEXTURE_CUBE_MAP_NEGATIVE_Z
            ? gl.TEXTURE_CUBE_MAP
            : target;
        return boundTextures.get(`${activeUnit}:${binding}`);
      };
      // Approximate live allocation. Includes mip levels, excludes driver padding,
      // framebuffer/MSAA/renderbuffers, staging copies and decoded CPU images.
      const bytesPerPixel = (format, type, internal) => {
        const sized = new Map([
          [0x8058, 4],
          [0x8051, 3],
          [0x8229, 1],
          [0x822b, 2],
          [0x8c43, 4],
          [0x8c41, 3],
          [0x881a, 8],
          [0x8814, 16],
          [0x822d, 2],
          [0x822e, 4],
          [0x822f, 4],
          [0x8230, 8],
          [0x81a5, 2],
          [0x81a6, 3],
          [0x81a7, 4],
          [0x88f0, 4]
        ]);
        if (sized.has(internal)) return sized.get(internal);
        if ([0x8033, 0x8034, 0x8363].includes(type)) return 2;
        if ([0x8368, 0x8c3b, 0x8c3e, 0x84fa].includes(type)) return 4;
        const components =
          format === gl.RGBA
            ? 4
            : format === gl.RGB
              ? 3
              : [gl.LUMINANCE_ALPHA, 0x8227].includes(format)
                ? 2
                : 1;
        const bytes = [gl.FLOAT, gl.INT, gl.UNSIGNED_INT].includes(type)
          ? 4
          : [gl.SHORT, gl.UNSIGNED_SHORT, 0x140b, 0x8d61].includes(type)
            ? 2
            : 1;
        return components * bytes;
      };
      const allocateTexture = (
        target,
        level,
        width,
        height,
        bytesPerTexel,
        depth = 1,
        compressedBytes
      ) => {
        const texture = textureFor(target);
        if (!texture || !Number.isFinite(width * height * depth)) {
          state.unknownTextureAllocations++;
          return;
        }
        let levels = textures.get(texture);
        if (!levels) textures.set(texture, (levels = new Map()));
        levels.set(`${target}:${level}`, {
          width,
          height,
          depth,
          bytesPerTexel,
          bytes: compressedBytes ?? width * height * depth * bytesPerTexel
        });
      };
      hook('texImage2D', (args) => {
        if (args.length >= 9) {
          const [target, level, internal, width, height, , format, type] = args;
          allocateTexture(
            target,
            level,
            width,
            height,
            bytesPerPixel(format, type, internal)
          );
        } else {
          const [target, level, internal, format, type, source] = args;
          allocateTexture(
            target,
            level,
            source?.videoWidth || source?.naturalWidth || source?.width,
            source?.videoHeight || source?.naturalHeight || source?.height,
            bytesPerPixel(format, type, internal)
          );
        }
      });
      hook(
        'texImage3D',
        ([target, level, internal, width, height, depth, , format, type]) => {
          allocateTexture(
            target,
            level,
            width,
            height,
            bytesPerPixel(format, type, internal),
            depth
          );
        }
      );
      hook(
        'compressedTexImage2D',
        ([target, level, , width, height, , data]) => {
          if (!sizeOf(data)) state.unknownTextureAllocations++;
          else
            allocateTexture(target, level, width, height, 0, 1, sizeOf(data));
        }
      );
      hook('texStorage2D', ([target, levels, internal, width, height]) => {
        const targets =
          target === gl.TEXTURE_CUBE_MAP
            ? Array.from(
                { length: 6 },
                (_, face) => gl.TEXTURE_CUBE_MAP_POSITIVE_X + face
              )
            : [target];
        for (let level = 0; level < levels; level++) {
          for (const face of targets)
            allocateTexture(
              face,
              level,
              Math.max(1, width >> level),
              Math.max(1, height >> level),
              bytesPerPixel(gl.RGBA, gl.UNSIGNED_BYTE, internal)
            );
        }
      });
      hook('generateMipmap', ([target]) => {
        const levels = textures.get(textureFor(target));
        if (!levels) return;
        for (const [key, base] of [...levels]) {
          if (!key.endsWith(':0') || !base.bytesPerTexel) continue;
          const face = Number(key.split(':')[0]);
          const count =
            Math.floor(Math.log2(Math.max(base.width, base.height))) + 1;
          for (let level = 1; level < count; level++)
            allocateTexture(
              face,
              level,
              Math.max(1, base.width >> level),
              Math.max(1, base.height >> level),
              base.bytesPerTexel
            );
        }
      });
      hook('deleteTexture', ([texture]) => textures.delete(texture));
      return gl;
    };

    const record = (timestamp) => {
      probe.frames.push({ at: timestamp, ...probe.pending });
      probe.pending = { draws: 0, submittedVertices: 0, firstDrawAt: null };
    };
    const tick = (timestamp) => {
      if (!probe.sampling) return;
      record(timestamp);
      probe.request = requestAnimationFrame(tick);
    };
    window.__worldPerfProbe = {
      start() {
        probe.target =
          document.querySelector('main canvas') ||
          document.querySelector('canvas');
        probe.frames = [];
        probe.pending = { draws: 0, submittedVertices: 0, firstDrawAt: null };
        probe.startedAt = performance.now();
        probe.endedAt = null;
        probe.sampling = true;
        probe.request = requestAnimationFrame(tick);
      },
      stop() {
        probe.sampling = false;
        cancelAnimationFrame(probe.request);
        probe.endedAt = performance.now();
        if (probe.pending.draws) record(probe.endedAt);
      },
      snapshot() {
        const allocations = contexts.filter(
          (entry) => entry.canvas === probe.target
        );
        const selected = allocations[0];
        let renderer = null;
        let vendor = null;
        if (selected) {
          const extension = selected.gl.getExtension(
            'WEBGL_debug_renderer_info'
          );
          renderer = selected.gl.getParameter(
            extension?.UNMASKED_RENDERER_WEBGL || selected.gl.RENDERER
          );
          vendor = selected.gl.getParameter(
            extension?.UNMASKED_VENDOR_WEBGL || selected.gl.VENDOR
          );
        }
        return {
          startedAt: probe.startedAt,
          endedAt: probe.endedAt,
          frames: probe.frames,
          contextCount: allocations.length,
          renderer,
          vendor,
          hookErrors: probe.hookErrors,
          liveBufferBytes: sum(
            allocations.flatMap((entry) => [...entry.buffers.values()])
          ),
          liveTextureBytesEstimate: sum(
            allocations.flatMap((entry) =>
              [...entry.textures.values()].map((levels) =>
                sum([...levels.values()].map((level) => level.bytes))
              )
            )
          ),
          unknownTextureAllocations: sum(
            allocations.map((entry) => entry.unknownTextureAllocations)
          )
        };
      }
    };
  });

  const page = await context.newPage();
  let uncaughtErrors = 0;
  page.on('pageerror', () => {
    uncaughtErrors++;
  });
  await page.goto(`${origin}/world`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  assert.equal(
    new URL(page.url()).origin,
    origin,
    'the preview must remain on the local origin'
  );
  await page.waitForFunction(
    () => document.querySelector('canvas')?.width > 300
  );
  const start = page.getByRole('button', { name: '산책 시작', exact: true });
  await start.waitFor({ state: 'visible' });
  const controlsObservedAt = await page.evaluate(() => performance.now());
  let assetReadinessTimedOut = false;
  try {
    // A missing marker remains "unmarked", never inferred as a loaded real asset.
    await page.waitForFunction(
      () =>
        document.querySelector('canvas')?.dataset.worldAssetState !== 'loading',
      undefined,
      { timeout: 60000 }
    );
  } catch {
    assetReadinessTimedOut = true;
  }
  const assetReadinessObservedAt = await page.evaluate(() => performance.now());
  await start.click();
  const inputActivatedAt = await page.evaluate(() => performance.now());
  if (includeCharacter) {
    await page.keyboard.down('a');
    await page.waitForTimeout(2750);
    await page.keyboard.up('a');
    await page.keyboard.down('w');
    await page.waitForTimeout(1200);
    await page.keyboard.up('w');
    await page.waitForFunction(
      () =>
        document.querySelector('canvas')?.dataset.worldCharacterState ===
        'ready'
    );
  }
  const positionBefore = await page
    .getByLabel('현재 위치', { exact: true })
    .innerText();
  await page.evaluate(() => window.__worldPerfProbe.start());
  await page.keyboard.down('w');
  try {
    await page.waitForTimeout(walkDurationMs);
  } finally {
    await page.keyboard.up('w');
    await page.evaluate(() => window.__worldPerfProbe.stop());
  }
  const positionAfter = await page
    .getByLabel('현재 위치', { exact: true })
    .innerText();
  const captured = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const nav = performance.getEntriesByType('navigation')[0];
    const marks = Object.fromEntries(
      ['world:asset-ready', 'world:first-frame', 'world:interactive'].map(
        (name) => [
          name,
          performance.getEntriesByName(name, 'mark')[0]?.startTime ?? null
        ]
      )
    );
    const resources = performance.getEntriesByType('resource');
    const local = resources.filter(
      (entry) => new URL(entry.name).origin === location.origin
    );
    return {
      probe: window.__worldPerfProbe.snapshot(),
      canvas: {
        width: canvas?.width,
        height: canvas?.height,
        cssWidth: canvas?.clientWidth,
        cssHeight: canvas?.clientHeight,
        scene: ['approved-village', 'placeholder'].includes(
          canvas?.dataset.worldScene
        )
          ? canvas.dataset.worldScene
          : 'unmarked',
        assetState: ['loading', 'ready', 'error'].includes(
          canvas?.dataset.worldAssetState
        )
          ? canvas.dataset.worldAssetState
          : 'unmarked',
        animationSource: [
          'placeholder',
          'controller-only',
          'approved-motion'
        ].includes(canvas?.dataset.animationSource)
          ? canvas.dataset.animationSource
          : 'unmarked'
      },
      marks,
      navigation: nav
        ? {
            ttfbMs: nav.responseStart - nav.requestStart,
            responseEndMs: nav.responseEnd,
            domContentLoadedMs: nav.domContentLoadedEventEnd,
            transferBytes: nav.transferSize,
            encodedBodyBytes: nav.encodedBodySize,
            decodedBodyBytes: nav.decodedBodySize
          }
        : null,
      externalResourceCount: resources.length - local.length,
      // No URLs, query strings, server paths, private names or response bodies leave
      // the browser. "decoded" below means HTTP decompression, NOT image/GPU decode.
      resources: local.map((entry, index) => {
        const path = new URL(entry.name).pathname.toLowerCase();
        const category = /\.(glb|gltf|bin)$/.test(path)
          ? 'model'
          : /\.(png|jpe?g|webp|avif|ktx2?)$/.test(path)
            ? 'image-or-texture'
            : /\.(woff2?|ttf|otf)$/.test(path)
              ? 'font'
              : entry.initiatorType === 'script' || /\.js$/.test(path)
                ? 'script'
                : /\.css$/.test(path)
                  ? 'stylesheet'
                  : 'other';
        return {
          id: index + 1,
          category,
          startMs: entry.startTime,
          durationMs: entry.duration,
          ttfbMs:
            entry.requestStart > 0
              ? Math.max(0, entry.responseStart - entry.requestStart)
              : null,
          responseEndMs: entry.responseEnd,
          transferBytes: entry.transferSize,
          encodedBodyBytes: entry.encodedBodySize,
          decodedBodyBytes: entry.decodedBodySize,
          protocol: entry.nextHopProtocol || 'unavailable'
        };
      })
    };
  });

  const round = (value) =>
    Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  const stats = (values) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return {
      samples: sorted.length,
      median: sorted.length
        ? round(sorted[Math.floor((sorted.length - 1) * 0.5)])
        : null,
      p95: sorted.length
        ? round(sorted[Math.ceil((sorted.length - 1) * 0.95)])
        : null,
      max: sorted.length ? round(sorted[sorted.length - 1]) : null
    };
  };
  const intervals = (values) =>
    values.slice(1).map((value, index) => value - values[index]);
  const frames = captured.probe.frames;
  const rendered = frames.filter((frame) => frame.draws > 0);
  const sumField = (entries, key) =>
    entries.reduce((total, entry) => total + entry[key], 0);
  const byCategory = Object.fromEntries(
    [...new Set(captured.resources.map((entry) => entry.category))].map(
      (category) => {
        const entries = captured.resources.filter(
          (entry) => entry.category === category
        );
        return [
          category,
          {
            resources: entries.length,
            transferBytes: sumField(entries, 'transferBytes'),
            encodedBodyBytes: sumField(entries, 'encodedBodyBytes'),
            decodedBodyBytes: sumField(entries, 'decodedBodyBytes'),
            lastResponseEndMs: round(
              Math.max(...entries.map((entry) => entry.responseEndMs))
            )
          }
        ];
      }
    )
  );
  const boundsPass =
    captured.canvas.width <= 960 && captured.canvas.height <= 720;
  const report = {
    scenario: includeCharacter
      ? 'village-plus-static-companion'
      : 'village-arrival',
    environment: {
      browser: await browser.version(),
      platform: process.platform,
      architecture: process.arch,
      viewport,
      deviceScaleFactor: 1,
      localOriginOnly: true,
      headless: true,
      swiftShaderRequested: true,
      renderer: captured.probe.renderer,
      vendor: captured.probe.vendor,
      cache:
        'fresh unauthenticated browser context; server/OS caches are not controlled',
      caveat:
        'SwiftShader software rendering and instrumentation affect timings. This bounded desktop snapshot is not native GPU or mobile performance and has no FPS pass threshold.'
    },
    readiness: {
      ...captured.canvas,
      controlsObservedAtMs: round(controlsObservedAt),
      assetReadinessObservedAtMs: round(assetReadinessObservedAt),
      assetReadinessTimedOut,
      inputActivatedAtMs: round(inputActivatedAt),
      applicationMarksMs: captured.marks,
      note: 'Application marks are authoritative when present. Observation/click times include browser automation delay; visible controls alone do not prove asset readiness.'
    },
    network: {
      navigation: captured.navigation,
      byCategory,
      sameOriginResourceCount: captured.resources.length,
      externalResourceCount: captured.externalResourceCount,
      resources: captured.resources.map((entry) =>
        Object.fromEntries(
          Object.entries(entry).map(([key, value]) => [
            key,
            typeof value === 'number' ? round(value) : value
          ])
        )
      ),
      note: 'ResourceTiming byte counts describe HTTP transfer and decompression, not mesh/image/GPU memory. Zero transfer bytes may mean browser cache. Images include UI images as well as textures; paths are intentionally omitted.'
    },
    boundedWalk: {
      requestedDurationMs: walkDurationMs,
      observedDurationMs: round(
        captured.probe.endedAt - captured.probe.startedAt
      ),
      movementObserved: positionBefore !== positionAfter,
      animationFrameIntervalMs: stats(
        intervals(frames.map((frame) => frame.at))
      ),
      renderedFrameIntervalMs: stats(
        intervals(rendered.map((frame) => frame.firstDrawAt))
      ),
      renderedFrames: rendered.length,
      drawCallsTotal: sumField(frames, 'draws'),
      drawCallsPerRenderedFrame: stats(rendered.map((frame) => frame.draws)),
      submittedVerticesPerRenderedFrame: stats(
        rendered.map((frame) => frame.submittedVertices)
      ),
      note: 'rAF intervals measure callback cadence; rendered intervals count frames that submit WebGL draws. The application intentionally caps rendering at 30 FPS. Submitted vertices include indexed/instanced submissions and are not unique vertices.'
    },
    gpuAllocationEstimate: {
      liveBufferBytes: captured.probe.liveBufferBytes,
      liveTextureBytesEstimate: captured.probe.liveTextureBytesEstimate,
      combinedBytesEstimate:
        captured.probe.liveBufferBytes +
        captured.probe.liveTextureBytesEstimate,
      unknownTextureAllocations: captured.probe.unknownTextureAllocations,
      instrumentedWorldContexts: captured.probe.contextCount,
      hookErrors: captured.probe.hookErrors,
      caveat:
        'Instrumented live buffer/texture allocations are an estimate, not measured GPU memory. Excludes framebuffers/MSAA, renderbuffers, driver alignment, CPU images, staging copies and extension multi-draw calls.'
    },
    checks: {
      canvasWithin960x720: boundsPass,
      uncaughtBrowserErrors: uncaughtErrors,
      renderedFramesObserved: rendered.length > 0,
      realAssetVerified:
        captured.canvas.scene === 'approved-village' &&
        captured.canvas.assetState === 'ready'
    }
  };
  await mkdir(output, { recursive: true });
  await writeFile(
    resolve(output, 'world-performance.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(JSON.stringify(report, null, 2));
  if (
    !boundsPass ||
    uncaughtErrors ||
    !rendered.length ||
    captured.probe.hookErrors ||
    assetReadinessTimedOut ||
    captured.canvas.assetState === 'error'
  ) {
    process.exitCode = 1;
  }
  await context.close();
} finally {
  await browser.close();
}
