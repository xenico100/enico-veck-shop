# Village Game Integration: First Letter

Updated 2026-09-09 KST. Design rationale: `village-first-letter.md`.

## Feature Map

- Six original pixel interiors with residents, dialogue choices and inspectable objects.
- First Letter: three discoverable sentence fragments, an order puzzle, completion stamp and confirmed replay reset.
- Post office: open letter box, one-letter reading, search, replies and owner-confirmed recovery using the existing community API.
- Street records use the same letter reader. Drafts survive navigation in the current browser tab's session storage.
- General store: one-object display, category selection, actual catalog, publishing, focused detail, cart and administrator-confirmed deletion.
- Film theater: one-work display, actual studio posts, protected media, continuous playback, administrator publishing and confirmed recovery.
- Resident center: existing profile, orders, membership and administrator navigation.
- Cafe: existing matching queue and chat interface.
- Workshop: sentence restoration and access to the existing production archive.

Buildings, the map and the journal share the destination registry. Selecting a destination moves the avatar to its door before opening the scene. Closing the scene returns to the same world and avatar. Modal interaction pauses movement. Legacy account/login/matching overlays close the scene first to avoid conflicting focus locks. The homepage does not render duplicate content sections below the world. `/community` redirects into the post office, and `/?room=<id>` supports direct arrival.

## Data

The configured Supabase project was retained. Additive migrations restore the absent community, goods, studio, resident profile and realtime tables. RLS is enabled; realtime data is server-only. User-editable metadata no longer grants administrator access. Existing order data is read through a verified-email compatibility path when the legacy user_id schema is absent; existing orders were not rewritten.

The migrations and role-policy changes above came from the previous integration commit. This story release makes no schema changes. Optional scheduled-membership order lookup tolerates legacy schemas missing its metadata/user_id/status columns; this does not implement scheduling for those schemas. Narrative progress is device-local, not account access or currency. Missing product images no longer become unrelated stock photographs in game mode.

## Verification

- Production Next.js build passed.
- Fourteen Node tests passed: destinations, door coordinates, collection persistence, drawing calls, role policy, story-save validation, progression, puzzle order and replay reset.
- Signed-in Chrome through Playwright locators: post office publish/reply/recover; updated world record appears after publication; goods create/display/detail/cart/remove/recover; studio create/display/read/recover.
- Story: clicked all three clues, tested wrong-order feedback, corrected the order on mobile, reached the ending and confirmed it survived navigation/reload.
- Production build in Chrome: resident scene to account, profile and existing order read, administrator tab visibility, cafe queue join/cancel. Found and fixed the legacy-modal versus scene focus-lock conflict during this pass.
- Mobile screenshots: 390 x 844 scene and ending; production scene at 320 x 700. Measured visible action buttons inside the viewport and no horizontal document overflow.
- Anonymous community write returns 401 and does not create a record.
- Test letters/replies, goods and studio posts were recovered through their UI. Public community and goods APIs return empty arrays after cleanup. Test cart item removed; cafe request cancelled.
- Production server smoke log contains no runtime errors during the final pass.

## Limits

- No real payment, subscription purchase, paid download, or message to another person was executed.
- No real studio video was uploaded or played in this pass; only a temporary text work was published/read/recovered. The real studio catalog is empty.
- The repository still has 74 pre-existing TypeScript diagnostics outside the changed modules, primarily legacy Supabase types and unused design exports/UI dependencies. Changed story/game modules typecheck without diagnostics. The existing build configuration skips type validation; build success is not a clean repository-wide typecheck.
- The inherited hold-to-poop/cleanup mechanism remains connected but its long-hold timing was not revalidated by the browser automation in this story pass. The persistent record read/write path was verified independently.
- Local Chrome verification does not establish that a remote hosting deployment has completed.

## Mobile Audit (2026-09-09)

Found and fixed during the final mobile pass:

- Closing the old menu left a hidden `role=dialog` in the DOM, which paused the village engine indefinitely. Closed menus now unmount; focus, Escape and body-scroll cleanup are scoped to the open menu.
- The expanded journal started at y=-20.9 in an 844 x 390 landscape viewport. It now starts at y=70, remains within the screen, and scrolls internally. The map destination list is also height-bounded.
- Primary room, map, menu, chat and collection controls now have at least 44px touch targets. The 320px store header keeps its title, cart and exit in one row.
- Letter/search/chat inputs use 16px text. The letter composer uses a shorter mobile textarea and retains its existing session draft when leaving and reopening the workbench.
- Portalled rooms track the visual viewport height and offset, with a window-resize fallback and native pinch-zoom preservation. Safe-area padding was added around room content and fixed controls. The implementation follows the [VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport); real keyboard behavior still requires device testing.
- Dating and Community menu buttons now explicitly use a transparent background, fixing their inherited light-on-light rendering.

Verification coverage:

- `node test/village-mobile.browser.mjs` runs an isolated anonymous Chromium session against the local production server. It checks 320 x 700, 390 x 844 and 844 x 390: journal bounds, menu-open/close, no hidden dialog after close, actual walking into the store, all six room headers, minimum header-button sizes, horizontal overflow and uncaught browser errors. It does not publish content or perform purchases. The optional runner uses pinned `agent-browser@0.37.1` via npx.
- Signed-in Chrome/Playwright: 320px menu visibility and contrast, administrator link, menu focus wrap and Escape, map-to-store walking after menu close, store-to-cart and visible cart controls.
- Signed-in letter draft entered at 390 x 844, then resized to 390 x 390 to simulate reduced available height. Scrolling reached the enabled publish button; leaving/reopening the workbench restored title and body. The test draft was cleared without publication.
- Seventeen Node tests pass, including new viewport keyboard-height/pan, zoom and listener-cleanup cases. The production build passes. The existing 74 unrelated TypeScript diagnostics remain unchanged; no diagnostics reference the mobile changes.

These are desktop Chromium viewport tests, not physical touchscreen, iPhone Safari, on-screen keyboard, native back-swipe, or remote deployment verification. Safe-area behavior is implemented but has not been observed on a notched physical device in this pass. The other payment/media/long-hold limits above still apply.
