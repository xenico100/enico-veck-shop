# `/world` retro exploration prototype

> **Update:** `/world` is now the game *몽상인 — 잠들지 않는 마을* (story, night systems, PS1 renderer, procedural audio). See [world-game.md](./world-game.md). The notes below describe the original prototype layer it builds on.

The additive `/world` prototype preserves the existing homepage, community, shop, login, resident center, café, and Studio. It is for local review, with no remote push or deployment.

- Branch: `codex/retro-world-prototype-20261019`
- Base: `origin/main` at `c2775e9`
- Route: `/world`; local preview `http://127.0.0.1:3214/world`
- Version: 0.2, approved static village assets integrated
- Mode: single-player exploration; no 3D multiplayer/presence writes

No `AGENTS.md` was found in the repository or checked parent directories. The original working checkout's ongoing authentication/security changes remain untouched and are not included here. They require a later integration review. The dependency lockfile is unchanged (Next 14.2.35, React 18.3.1); no 3D dependency was added.

## Exploration and compatibility

WASD/arrows, mouse pointer lock or drag, touch stick/drag camera, circular collision and wall sliding, capped background time steps, nearby project information, E interaction, map/list, destination markers, and pause/resume are implemented. Lists remain usable when WebGL or asset loading fails. UI focus and held input are cleared across modal/background transitions.

Existing destinations come from `village-buildings.ts`. `WorldVillageAdapter` validates original building events and mounts original interiors and login/cart/profile/café modals without the 2D scene. It directly reports pause state while preserving existing village events. Interior UI is loaded only when a building is opened; links back to the original homepage do not automatically prefetch its 2D scene. The source's building visuals are adapted to these existing service destinations.

## Actual assets and animation

See [world-assets.md](./world-assets.md) for output sizes, hashes, validation, coordinate scale, rendering budget, and limits. The approved town is now the normal scene. Loading/error fallback retains a clear temporary-scene label. The UI labels the actual scene as a web conversion under verification and states that the mong-sang-nyeo/final motion are pending.

The separate original dog GLB is a deferred static placement. No final playable character rig or walking clip is loaded; corrected ACCAD public motion is being prepared in a separate task. `world-animation.ts` exposes controller-only `idle`, `starting`, `walking`, `stopping`, and `turning` signals, collision-resolved speed and signed turn rate. Significant changes are published as `world:locomotion`; the canvas exposes `data-locomotion` and `data-animation-source`. An approved rig/clip adapter can consume these without replacing the movement controller.

## Owner workshop

See [world-workshop.md](./world-workshop.md).

A server-only single verified Supabase UUID (`WORLD_OWNER_USER_ID`) and explicit non-anonymous `auth.getUser()` result are required. Manager/admin roles, metadata, request headers and client state do not grant access. `WORLD_WORKSHOP_DRIVE_URL` is optional and read only after authorization. All responses are private/no-store; client identity changes invalidate cached data.

The returned prototype version/stages are clearly samples. Actual production, backup, and restore verification remain `unknown`, with `lastVerifiedAt: null`. No real backup evidence is connected, and a configured Drive navigation link does not prove a backup. There is no workshop service-role client or database mutation.

The local environment uses the repository's loopback example and a synthetic owner UUID, with no real owner session. The original checkout's Supabase project-mismatch warning was respected and its environment was not copied. A live owner success request remains unverified; no new account, credential, session or permission was created to bypass this limit.

## Sound

Connected Epidemic Sound searches produced background candidates `M — Lofive` and `Waltz of the Ancients — Guustavv`, plus grass footsteps and a short UI selection effect. No download, purchase, embedding, or automatic playback occurred because current account website/game redistribution rights were not established. The prototype remains silent.

## Verification

Node 26 was used; tests require native TypeScript stripping and `node:module` registerHooks.

```sh
node --test test/world-movement.test.mjs test/world-animation.test.mjs test/world-workshop.test.mjs test/village-buildings.test.mjs test/village-exploration.test.mjs test/village-viewport.test.mjs test/world-glb.test.mjs test/world-collisions.test.mjs test/world-camera.test.mjs
./node_modules/.bin/tsc --noEmit -p test/tsconfig.world.json
./node_modules/.bin/tsc --noEmit --incremental false
```

The original 34 tests remain, with 20 additional GLB/collider/camera tests (54 total). The scoped utility check is strict. Full repository type diagnostics are compared with a clean archive of the base commit using identical dependencies; 74 pre-existing diagnostics remain, with no additions. New TypeScript/TSX files are checked explicitly using installed `eslint-config-next/core-web-vitals`. The repository has no ESLint config, so plain `next lint` prompts for setup; no global config was changed.

Builds use one Next worker (`CIRCLE_NODE_TOTAL=2`), a 2GB Node heap and loopback/demo service placeholders. Existing webhook imports require a service-role env at build time; an obvious local-only placeholder satisfies import configuration, without issuing or copying credentials. Build success is not substituted for the separate type checks.

Browser verification requires an existing local server and an existing Playwright/Chromium installation:

```sh
WORLD_TEST_URL=http://127.0.0.1:3214 \
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
PLAYWRIGHT_EXECUTABLE_PATH=/absolute/path/to/installed/chromium \
node test/world.browser.mjs
```

One browser uses sequential PC/390×844/844×390/320×700 contexts. Checks cover movement/camera, pause/focus, original shop interior, actual asset readiness, deferred dog loading, explicit failed-asset proxy fallback, WebGL fallback, no horizontal overflow, and live anonymous/forged-owner 401 denial. Browser touch uses Chromium's touch protocol, not a physical iPhone/Safari. Authenticated manager 403 and owner 200 use mocked Auth through the real GET handler; they are not live owner-session verification.

Run the short performance probe against the production preview separately:

```sh
node test/world-performance.browser.mjs
WORLD_PERF_CHARACTER=1 node test/world-performance.browser.mjs
```

Use the same Playwright environment variables as above. It records actual-scene timing, resources, draws, frame intervals, and buffer/texture estimates outside the repository by default. Its forced software rendering is not native GPU performance evidence.

No deployment APIs, production data, sharing settings, paid services or credential issuance were changed. Parent-conversation scope review is still required before production work.
