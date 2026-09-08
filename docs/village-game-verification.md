# Village Game Integration

## Feature Map

- Post office: existing community API, publishing, comments, owner-confirmed deletion.
- General store: existing goods catalog, categories, publishing, detail, cart, administrator-confirmed deletion.
- Film theater: existing studio list, protected media, shorts, administrator publishing form.
- Resident center: existing profile, orders, membership and administrator navigation.
- Cafe: existing matching queue and chat interface.
- Workshop: existing production archive.

Buildings and the map use the same destination registry. Selecting a destination moves the avatar to its door before opening the feature. Closing the feature returns to the same world and avatar. Modal interaction pauses movement. The homepage no longer renders duplicate content sections below the world.

## Data

The configured Supabase project was retained. Additive migrations restore the absent community, goods, studio, resident profile and realtime tables. RLS is enabled; realtime data is server-only. User-editable metadata no longer grants administrator access. Existing order data is read through a verified-email compatibility path when the legacy user_id schema is absent; existing orders were not rewritten.

## Verification

- Production Next.js build passed.
- Nine Node tests passed (building destinations and doors, collection persistence, ground drawing, role policy).
- Chrome: building travel and return, post office create/comment/delete, world record synchronization, goods create/detail/add-to-cart/remove/delete, resident profile and order read, cafe queue join/cancel, workshop and theater entry.
- Mobile 390 x 844: map navigation, building interior scrolling, theater contrast, publishing form keyboard access, exit and viewport restoration.
- Anonymous community writes return 401; anonymous administrator access redirects with 307.
- Database verification: realtime player rows are persisted and test community/goods records were removed.

## Limits

- No real payment, subscription purchase, paid download, or message to another person was executed.
- No real studio video was uploaded or played in this pass; the current studio catalog is empty.
- The repository still has pre-existing TypeScript errors; the existing build configuration skips type validation. Build success is not a clean repository-wide typecheck.
- Local Chrome verification does not establish that a remote hosting deployment has completed.
