# Approved static village web assets

The `/world` preview now loads the approved village's actual static mesh and packed image data. The procedural collision-test scene remains a clearly labeled fallback while the asset is loading or if loading fails. No private Blender file, ZIP, regeneration script, original file manifest, Drive URL, or backup information is under `public/`.

| Public derived asset          |     Bytes |       Triangles | Material batches | Embedded PNGs |
| ----------------------------- | --------: | --------------: | ---------------: | ------------: |
| `world-assets/village.glb`    | 1,108,360 |          14,203 |               39 |            20 |
| `world-assets/companion.glb`  | 1,628,068 |          72,928 |               11 |             0 |
| `world-assets/colliders.json` |         — | 23 simple boxes |                — |             — |

915 visible environment mesh objects were batched by material. The original dog has 136 mesh objects, combined into 11 material meshes with an additional common anchor node. All 20 original packed PNGs (73,601 bytes in total) are byte-identical to the source; they are already small pixel textures, so no unnecessary upscaling or lossy re-encoding was applied. The runtime uses nearest filtering and repeat for these power-of-two images.

## Conversion and independent verification

The Drive metadata and existing local source checksums were checked again. They matched; another download was unnecessary. No usable Blender executable or Python bpy was found in the checked application, Homebrew, user, temporary, and project reference locations. **Blender was not run and no Blender render/export is claimed.**

A separate private conversion script reads the original SDNA mesh positions, polygon/corner indices, transforms, smooth flags, materials, image pointers, and UV data from a source copy. It does not execute the embedded project scripts or reconstruct the town from proxy boxes. Convex nontriangle faces are checked and triangulated. Original position-driven BOX projection is converted to face-dominant UVs; explicit sign UVs are preserved. Fog is reimplemented at runtime rather than baked into a texture. The dog retains its smooth surface semantics through angle-weighted normals and remains in the source's static placement.

Independent checks covered GLB headers/chunks, accessor/index/reference bounds, finite floats, unit normals, PNG CRC/IDAT decoding, missing/unused vertices, source image hash equality, and absence of source paths/Drive metadata in exported JSON. Root-level web loader and browser tests then consume the final public copies.

Final SHA-256:

```text
village.glb    e1442686278e9a4c8f97ed66004ddb33ea654162d3e4554676c32c9a3a152b87
companion.glb  34f1d34533a9bcbb96468b3a36a8b078736d1e07f219a6040d69fb32033fbf4d
colliders.json ec610692be3ea566c9f50fe1f8ca396d4e1b286e4347052ae0152ef8f4b807ab
```

## Runtime boundary

- glTF Y-up coordinates are `[0.4 * sourceX, 0.4 * sourceZ, -0.4 * sourceY]`. The static dog keeps a common translation anchor to reduce float32 precision loss.
- Human camera height is 0.66 world units, collision radius 0.144, and walking speed 1.92 units/sec, consistent with the 0.4 scale. The camera, movement, and mouse use the same right-handed basis; readable-sign and screen-right regression tests prevent reflection.
- Village and collider loading complete together before the scene is marked ready. Failure aborts outstanding loads and retains the explicitly labeled proxy. There are no secondary network resources inside the GLBs.
- The dog is a separate, deferred download triggered within six world units of its source placement. It is not a final playable avatar or walking clip. Its indoor source placement can be occluded by the house from exterior viewpoints; it was not moved to manufacture a different approved scene.
- Render work is capped at 30 FPS and 960×720 without device-pixel-ratio multiplication. Static data is batched by material. The village uses 39 draws, and the loaded dog adds 11. Context restoration reuses retained bitmaps; cancellation/unmount/failure disposes buffers, textures, and bitmaps.
- The lightweight shader preserves base textures/colors/alpha/emission and uses source sky/sun/fog parameters with per-fragment distance. It approximates lighting rather than reproducing Blender's full PBR, shadows, reflections, or color-management pipeline. Transparent surfaces are sorted by material-batch center.

## Remaining limits

One original beveled leash curve is not a mesh and is omitted; no replacement geometry was invented. Extremely small original dog faces retain their indices, but ten become zero-area after centered float32 storage. No source triangles were deliberately deleted or decimated, and this precision limit is documented rather than hidden.

The mong-sang-nyeo model was not identified in the provided village package. The separate character task is preparing corrected ACCAD public walking motion and must supply the approved model and clips. `world-animation.ts` continues to expose controller-only idle/start/walk/stop/turn signals; no final walking animation is claimed.

The collider map contains eight building bodies, ten viaduct pillars, a stair block, two outer fence lines, and two parked vehicle bodies. It supports ground-level navigation, not physical upstairs traversal or vehicle driving. Existing interiors are accessed through the original modal adapter.

Performance is measured by `test/world-performance.browser.mjs` against an already running local production server, with actual-scene readiness marks, HTTP resource sizes, draw counts, frame intervals, and live buffer/texture estimates. `WORLD_PERF_CHARACTER=1` also measures the deferred dog. The default test requires actual asset readiness; `WORLD_PERF_ALLOW_PROXY=1` is only for an explicitly labeled proxy baseline. The headless runs force SwiftShader and do not establish native Mac GPU or physical mobile performance.

## Bounded local measurement

The final production build was sampled with one fresh unauthenticated Chromium context per scenario, 1440×900 CSS pixels / 960×600 drawing buffer, forced SwiftShader and three seconds of movement. These are single observations with uncontrolled OS/server caches, not native Mac GPU or physical-phone benchmarks.

| Observation                     | Village only | Village + static dog |
| ------------------------------- | -----------: | -------------------: |
| Model HTTP encoded body         |    232,119 B |    1,192,047 B total |
| Draws per rendered frame        |           39 |                   50 |
| Live buffer + texture estimate  |  2,766,132 B |         13,267,764 B |
| Median rendered-frame interval  |      44.7 ms |              70.3 ms |
| Actual-scene readiness verified |          yes |                  yes |

The allocation estimate excludes CPU decoded images, framebuffers, driver alignment and staging copies. Both probes observed actual assets, movement, bounded canvas dimensions, and zero uncaught browser/instrumentation errors. An initial-loading revision deferred original interiors and homepage prefetch; observed initial script encoded bytes changed from 252,330 to 207,191 and same-origin requests from 52 to 47. Timing differences between single runs are not a performance guarantee.
