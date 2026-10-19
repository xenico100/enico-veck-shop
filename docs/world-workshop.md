# Owner workshop prototype

`GET /api/world/workshop` is an isolated, read-only endpoint for the `/world` preview. It does not change the existing community, shop, login, manager policy, database, or deployment.

## Authorization

The endpoint creates the existing cookie-aware Supabase server client and calls `auth.getUser()` on each configured request. Supabase documents that this call validates the current user with its Auth server: [getUser reference](https://supabase.com/docs/reference/javascript/auth-getuser). Cookie contents, browser state and `getSession()` are not used as authorization evidence.

Access requires both a valid `WORLD_OWNER_USER_ID` and a verified user with exactly that UUID and `is_anonymous === false`. A missing anonymity claim also denies access. This is intentionally separate from manager/admin permissions. Email, `app_metadata`, and editable `user_metadata` cannot grant access. No service-role client or database query is involved.

Only these optional server settings are added:

| Setting                    | Behavior                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WORLD_OWNER_USER_ID`      | A single existing owner's Auth UUID. Missing or malformed values disable the endpoint. Comma-separated lists and email addresses are rejected.                                                                                                           |
| `WORLD_WORKSHOP_DRIVE_URL` | Optional existing private Google Drive folder/file URL. It is read only after the owner check. Only HTTPS `drive.google.com` folder/file paths are accepted; query strings and fragments are removed. Missing or invalid values return `driveUrl: null`. |

These are **server-only** variables. Do not prefix them with `NEXT_PUBLIC_`, commit actual values, place a private manifest under `public/`, or include private original file lists in client code. Configure an existing user and existing link only when the operator is ready; this prototype does not issue credentials or expand Drive sharing. It also does not download or proxy private source files.

The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the existing server client. Missing settings fail closed. A verified owner session was not fabricated for local testing.

## Response and sample semantics

All responses include `Cache-Control: private, no-store, max-age=0`, explicit CDN no-store headers, and `Vary: Cookie`. The route is forced dynamic with revalidation disabled.

| Status | Meaning                                                                                    |
| ------ | ------------------------------------------------------------------------------------------ |
| 200    | Verified, non-anonymous owner; sample display data only.                                   |
| 401    | Missing/invalid session, anonymous account, or missing non-anonymous proof.                |
| 403    | Verified signed-in user who is not the configured owner, including managers/admins.        |
| 503    | Missing/invalid owner or Supabase configuration, Auth outage, or unavailable verification. |

Errors expose only generic code/message pairs, with no identity, configuration, source path, Drive link, or Auth diagnostics. Missing configuration is checked first and returns 503 without consulting Auth.

The success shape is the `WorldWorkshopResponse` type in `utils/world-workshop.ts`. That shared module contains types only. The response has `isSample: true`, a sample prototype version, and the current `/world` preview path. The three stage labels demonstrate “제작 중”, “백업 완료”, and “복원 검증 완료”; their `demoStatus` values are UI examples. **Every `actualStatus` remains `unknown`, and `lastVerifiedAt` is `null`.** No actual backup or restore evidence is connected. A configured Drive link is only a navigation link and does not prove a backup or verified restore.

## Verification

Run `node --test test/world-workshop.test.mjs` with a Node runtime that supports native TypeScript stripping and `module.registerHooks` (the local validation runtime is Node 26). Node's module hooks replace only the Supabase cookie client and `server-only` marker in the test process; the actual GET handler, authorization policy, response construction and URL validation execute. Tests use synthetic UUIDs/URLs and mock Auth responses. They do not contact Supabase or read local credentials, and they do not start a server.

Coverage includes anonymous sessions, absent anonymity proof, non-owner managers, forged editable owner metadata, the verified owner, missing/malformed config, Auth failures, no-store headers on success and denial, URL validation, and preservation of unknown actual backup states. A real authenticated owner request still requires operator configuration and an actual login. These unit/integration checks do not claim live owner-session verification.
