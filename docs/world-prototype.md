# `/world` retro exploration prototype

The prototype is additive. The existing homepage, community, shop, login, resident center, café, and Studio are preserved. This branch is for local review and has not been pushed or deployed.

- Branch: `codex/retro-world-prototype-20261019`
- Base: `origin/main` at `c2775e9`
- Route: `/world`
- Mode: single-player exploration; no 3D multiplayer/presence writes
- Local preview: `http://127.0.0.1:3214/world`

No `AGENTS.md` was found in the repository or checked parent directories. The original working checkout has existing authentication/security work in progress; this prototype is in a separate clone and does not include or modify those uncommitted changes. Integrating that work requires a later review. The dependency lockfile is unchanged (Next 14.2.35, React 18.3.1).

## What works

- Native WebGL first-person view with WASD/arrow movement, mouse pointer lock or drag camera, and touch stick/drag camera.
- Circle-versus-box collision, sliding along walls, bounds, normalized diagonal input, and capped time steps after backgrounding.
- Nearby building information, E interaction, map, list, destination markers, pause/resume, and an accessible list when WebGL is unavailable.
- Existing six building destinations come from `village-buildings.ts`. `WorldVillageAdapter` validates existing building events and opens the original interiors and login/cart/profile/café modals without mounting the 2D scene.
- Modals and backgrounding clear held movement. The adapter directly reports pause state as well as preserving the village events.
- `dot` uses a separate owner-only server endpoint. It does not reuse the broad manager policy.

## Temporary assets and animation boundary

The visible town is **a temporary collision test scene**, not the approved Blender village. Its main street, southern loop, and outer access road approximate the supplied street network at reduced scale. The geometry, signs, girl, and dog are procedural stand-ins. No approved character rig, Mixamo clip, or final walking animation is loaded.

`world-animation.ts` exposes `idle`, `starting`, `walking`, `stopping`, and `turning`, plus collision-resolved speed and signed turn rate. `WorldExplorer` publishes significant state/rate changes as `world:locomotion` and exposes `data-locomotion` / `data-animation-source` on the canvas. Every sample has `source: 'controller-only'`. A later approved rig/clip adapter can consume these signals; these signals are not a claim that character animation has been validated. Current start/stop timing is only controller scaffolding.

The private source download was inspected outside this repository. No source files, private file manifest, original download link, or backup folder link is included here. Web GLB export remains unfinished: the source materials need a web-compatible UV/atlas or shader conversion, mesh/material batching, exported collider proxies, and visual comparison. Source texture sizes alone do not solve that conversion. Do not label the procedural scene as the finished village.

## Owner workshop

See [world-workshop.md](./world-workshop.md).

Set `WORLD_OWNER_USER_ID` only on the server to the one verified existing Supabase owner UUID. `WORLD_WORKSHOP_DRIVE_URL` is optional and server-only. Blank/invalid config disables the endpoint; it never grants public sample access. Existing Supabase `auth.getUser()` verifies each request; the returned user must match that ID and explicitly be non-anonymous. Roles, metadata, request headers, email, and client state cannot grant access.

The endpoint returns clearly labeled sample stage data only after authorization. All actual production, backup, and restore-verification states remain `unknown`, and `lastVerifiedAt` remains null. A Drive link is not proof of a backup. Responses use private/no-store cache headers, and client data is invalidated on session identity changes. No service-role key is used by the workshop.

The local review environment uses the repository's loopback Supabase example and a synthetic owner UUID. It is not connected to a production database or a real owner account. The existing project-mismatch warning in the original working checkout was respected; its environment file was not copied.

## Sound

Epidemic Sound's connected search was used to shortlist `M — Lofive`, `Waltz of the Ancients — Guustavv`, grass footsteps, and a short UI selection effect. No music/effect was downloaded, embedded, or automatically played. The connector did not establish current account rights for website/game redistribution; the prototype therefore stays silent. A later audio adapter must use verified files and an explicit user gesture to start audio.

## Verification

Run unit/regression tests with the available Node runtime (Node 26 was used; the tests use TypeScript stripping and `node:module` registerHooks):

```sh
node --test test/world-movement.test.mjs test/world-animation.test.mjs test/world-workshop.test.mjs test/village-buildings.test.mjs test/village-exploration.test.mjs test/village-viewport.test.mjs
./node_modules/.bin/tsc --noEmit -p test/tsconfig.world.json
./node_modules/.bin/tsc --noEmit --incremental false
```

- 34 unit/regression tests passed, including 10 collision/movement, 8 animation-signal, and 8 workshop tests.
- Strict scoped utility type check passed. Full repository type check reports 74 pre-existing diagnostics. A clean archive of the base commit using the same dependencies produces the identical 74 file/position/code/message diagnostics; no new diagnostics were added.
- Explicit ESLint check with installed `eslint-config-next/core-web-vitals` passed for new TypeScript/TSX files. The repository has no ESLint configuration, so `next lint` alone prompts for setup; no global lint config was changed.
- Production build uses `CIRCLE_NODE_TOTAL=2` (one Next worker), a 2GB Node heap limit, and loopback/demo service placeholders. The first attempt compiled but page-data collection stopped because an existing webhook module requires a service-role env at import time; an obvious local-only placeholder allowed the full build. No real credential was minted or copied. Build success does not substitute for the separate type checks.

Browser test (an existing local server is required; no server is started by the test):

```sh
WORLD_TEST_URL=http://127.0.0.1:3214 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
PLAYWRIGHT_EXECUTABLE_PATH=/absolute/path/to/installed/chromium \
node test/world.browser.mjs
```

It runs one headless browser with sequential desktop/mobile contexts, saves screenshots outside the repository by default, and is limited to localhost origins. It covers desktop input/camera, modal pause and resume, original shop interior integration, live anonymous and forged-owner denial, touch movement and release/camera at 390×844, 844×390 and 320×700, map dimensions, and WebGL fallback. Browser touch uses Chromium's touch event protocol; this is not a physical iPhone/Safari test. Authenticated manager/owner paths are covered with mocked Auth in unit tests; a real owner login is not yet verified.

No operations were performed against deployment APIs, production data, sharing settings, paid services, or credential issuance. Before production work, reconcile the existing auth changes, verify a real owner session, finish the approved GLB/character conversion, and agree on scope in the parent conversation.
