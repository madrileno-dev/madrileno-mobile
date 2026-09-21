# madrileno-mobile: React Native starter — design

Date: 2026-09-18
Status: approved in brainstorming, awaiting spec review

## Goal

A third sibling template next to `madrileno` (Scala backend) and
`madrileno-frontend` (React web): a polished React Native starter built against
the backend's **generated oRPC contract**, so a renamed DTO field is a compile
error at the mobile call site. Same demo (auctions, bids, dev login), same
`init-project` strip, same "own your code" bias. Polish means it feels native on
day one — safe areas, keyboard handling, haptics, skeletons, OTA updates, deep
links — not that it has many features.

The backend stays unaware of it. The only coupling is the contract it already
generates.

## Decisions (from brainstorming)

| Topic | Decision | Why |
| --- | --- | --- |
| Relationship to web | Standalone repo, copies `src/api`, `src/contracts`, `src/i18n`, auth logic | Matches the existing sibling-repo pattern; drift tolerated like backend/frontend today |
| Scaffold / navigation | Expo SDK 57 managed, Expo Router, no native dirs committed | File-based routes give deep links for free; EAS-native; fewest version conflicts |
| Auth | Dev login only (`POST /v1/auth/dev`) | Parity with web; Apple/Google need accounts we don't have |
| UI | react-native-reusables on NativeWind 4 | shadcn's approach and token palette on mobile; vendored primitives |
| Native extras | EAS build profiles + EAS Update (OTA), deep links (scheme; https links prepared) | The mobile counterparts of the PWA update prompt and routing |
| Observability | OpenTelemetry (JS web SDK) → OpenObserve, opt-in | Traces continue into the backend's own OTel traces; same store as web |
| E2E / CI | Maestro smoke on a GitHub-hosted Android emulator | Mirrors the web's Playwright smoke |
| Unit tests | jest-expo + React Native Testing Library + MSW | Vitest is a poor fit for RN |
| Package manager | pnpm (hoisted `nodeLinker`) | Same as web; Expo's default for pnpm |
| Verification | Android emulator locally; iOS via `expo prebuild` + typecheck only | No Mac, no Apple account |

Out of scope, each with a README "how to add" paragraph: Google / Apple
sign-in, push notifications, offline query persistence, verified https
universal links, iOS device verification.

## Repository layout

```
madrileno-mobile/
  app/                          Expo Router routes — thin, re-export screens
    _layout.tsx                 providers: QueryClient, IntlProvider, theme, PortalHost, updates prompt
    (auth)/login.tsx
    (app)/_layout.tsx           auth gate: no session → <Redirect href="/login" />
    (app)/index.tsx             auction list           ← demo (stripped)
    (app)/auctions/[id].tsx     auction detail + bids  ← demo (stripped)
    (app)/settings.tsx          theme toggle, logout, app version
    +not-found.tsx
  src/
    api/                        orpc.ts, authFetch.ts, problem.ts, datetime.ts — copied from web, unchanged
    contracts/                  GENERATED, vendored via scripts/sync-contracts.mjs
    features/auth/              tokenStore.ts, useAuth.ts, LoginScreen.tsx
    features/auctions/          screens/, queries.ts, format.ts, status.ts   ← demo (stripped)
    components/ui/              react-native-reusables primitives (vendored)
    components/                 Field composition, Screen (safe-area wrapper), ErrorState, EmptyState, Skeleton
    i18n/                       messages/en.json, LocaleProvider, use-intl.d.ts
    theme/                      useColorScheme (system + MMKV override), tokens
    observability/              otel.ts (opt-in)
    updates/                    useOtaUpdates.ts (check + reload toast)
  assets/                       icon.svg (source), splash.svg, generated PNGs not committed
  test/                         setup.ts, mswServer.ts, api/, features/
  .maestro/                     smoke.yml, auctions.yml (auctions stripped)
  scripts/                      sync-contracts.mjs, init-project.mjs, generate-assets.mjs
  app.config.ts, eas.json, metro.config.js, tailwind.config.js, global.css, babel.config.js
  jest.config.js, eslint.config.js, .prettierrc, tsconfig.json
  CLAUDE.md, README.md, LICENSE, .github/workflows/ci.yml
```

Rules: `app/` files contain no logic beyond `export { AuctionListScreen as default }`
and route options. Everything testable lives under `src/`. Feature folders are
vertical slices as on the web.

## Core port

Copied verbatim from `madrileno-frontend` and kept diffable against it:

- `src/api/orpc.ts` — `OpenAPILink` with the RFC 9457 Problem decoder,
  `JsonifiedClient` types, `@orpc/tanstack-query` utils. Base URL from
  `EXPO_PUBLIC_API_BASE_URL` (default `http://10.0.2.2:9000` for the Android
  emulator, documented).
- `src/api/authFetch.ts` — bearer injection, single-flight refresh on 401,
  request cloning. Unchanged.
- `src/api/problem.ts`, `src/api/datetime.ts` — unchanged. ESLint keeps the
  `Date` ban outside `datetime.ts`.
- `src/contracts/` — vendored; `sync-contracts.mjs` reads
  `../madrileno/target/baklava/orpc/src` like the web script.
- `src/i18n/` — same namespaces (`common`, `login`, `auction`, …), same typed
  `useTranslations`. `auction` namespace stripped by init-project.

Changed for mobile:

- **`tokenStore.ts`**: same public surface (`get`, `set`, `subscribe`,
  `registerAuthTokenProvider`) so `useAuth` and `authFetch` are untouched.
  Backing store is `expo-secure-store`. Reads are async, so the store keeps a
  synchronous in-memory mirror hydrated once at startup (`hydrate(): Promise<void>`,
  awaited in the root layout behind the splash screen), and writes go to the
  mirror first, then the secure store.
  **The mirror is authoritative after hydration and is never re-read from
  disk.** The web's cross-tab `storage` listener exists because several tabs
  share one origin; a mobile app is a single process and nothing else writes
  the keychain entry, so there is nothing to sync back. Re-reading on an
  `AppState` "active" transition was considered and rejected: an async read
  started before a logout or a token rotation can land after it and restore a
  spent single-use refresh token, which would invalidate a good session or
  silently undo a logout. Writes are serialized through a promise chain so
  two rapid rotations cannot land out of order.
- **`useAuth`** additionally exposes `isHydrated` so the auth gate does not
  redirect to login before the token has been read.

Spike (first plan task): confirm `temporal-polyfill` works on Hermes with
`Intl` present, and that `@orpc/openapi-client` runs on RN's fetch without
polyfills. Both are expected to pass; if either fails the fallback is noted
in the plan before UI work starts.

## UI and theming

- **NativeWind 4 + react-native-reusables.** Tailwind v3 syntax,
  `global.css` with HSL variables under `:root` / `.dark:root`, `inlineRem: 16`
  in Metro config. Tokens mirror the web's names (`background`, `card`,
  `primary`, `muted`, `destructive`, `border`, `ring`, `radius`) with the same
  values converted from oklch to HSL once. Primary is the burgundy the web uses
  (`oklch(0.4 0.11 12)`, dark `oklch(0.72 0.09 12)`); the brand pack's crimson
  stays in the org profile, not the template.
- **Vendored primitives** via `npx @react-native-reusables/cli add`: `text`,
  `button`, `input`, `card`, `badge`, `separator`, `skeleton`, `dialog` (for the
  bid sheet), `toast` host via sonner-native. Edited freely; lint relaxed in
  `src/components/ui/` as on the web.
- **Field composition**: `Field` + `FieldLabel` + `FieldError` in
  `src/components/Field.tsx`, same props shape as the web's so forms read the
  same in code. React Native has no `invalid` accessibility state, so the
  error reaches assistive tech the supported way: `FieldInput` sets it as the
  control's `accessibilityHint` and `FieldError` renders it as an `alert`
  live region.
- **Theme**: `useColorScheme` from NativeWind seeded by the system scheme, with
  a light / dark / system override persisted in MMKV. Status bar style and the
  Android navigation bar follow the theme.
- **Typography**: system fonts (SF / Roboto). No bundled webfont; the web's
  Geist is a web choice.
- **Icons**: `lucide-react-native`, same icon set as the web.

## Screens (demo)

| Screen | Route | Behaviour |
| --- | --- | --- |
| Login | `/login` | Email field, react-hook-form + zod, `client.v1.auth.dev.post`, Problem-coded errors inline, keyboard-avoiding, submit on return key |
| Auction list | `/` | FlashList, pull-to-refresh, skeleton on first load, `EmptyState` / `ErrorState` (retry), status badge, ends-in relative time via Temporal |
| Auction detail | `/auctions/[id]` | Header, bids list, "Place bid" button opening a dialog with an amount field; `bid-too-low` typed error shown inline; success = haptic + toast + query invalidation |
| Settings | `/settings` | Theme toggle, logged-in email, logout (local: clears the token store, like the web — the contract's `DELETE /v1/auth/sessions` is keyed by a `user-agent` query the app cannot know reliably), app + OTA version |
| Not found | `+not-found` | Link home |

Native-feel checklist applied to every screen: `SafeAreaView` via the `Screen`
wrapper, `KeyboardAvoidingView` on forms, Android hardware back handled by the
router, `headerLargeTitle` on iOS stacks, haptics on primary actions, 44pt
minimum tap targets, `accessibilityLabel` on icon-only buttons.

## Navigation and deep links

- Expo Router with **typed routes** enabled (`experiments.typedRoutes`), so
  `router.push` and `<Link href>` are type-checked.
- Auth gate in `(app)/_layout.tsx`: waits for `isHydrated`, then redirects to
  `/login` when there is no session. `/login` redirects to `/` when there is.
- **Scheme** derived from the package name in `app.config.ts`
  (`madrileno://`), so `madrileno://auctions/123` opens the detail screen. A
  cold-start deep link into an authed route lands on login and, after login,
  continues to the original href (stored in memory, not persisted).
- **Universal / App Links** prepared behind `EXPO_PUBLIC_ASSOCIATED_DOMAIN`:
  when set, `app.config.ts` adds `ios.associatedDomains` and the Android
  `intentFilters` with `autoVerify`. The `assetlinks.json` and
  `apple-app-site-association` templates live in `docs/` and the README
  explains where to serve them. Not verifiable here; documented as such.

## EAS and OTA updates

- `eas.json` profiles: `development` (dev client, internal distribution),
  `preview` (APK / ad-hoc, internal, `channel: preview`), `production`
  (`channel: production`, auto-increment). `runtimeVersion: { policy: "appVersion" }`.
- `app.config.ts` reads `name`, `slug`, `scheme`, `version` from
  `package.json`, so `init-project` renaming the package re-brands the app,
  like the web manifest. `owner` and `projectId` are read from env so the
  template ships without an EAS project bound to it.
- `src/updates/useOtaUpdates.ts`: `checkAutomatically: "NEVER"` in config,
  then an explicit `checkForUpdateAsync` on launch and on foreground
  (throttled to once per 5 minutes). **Consent gates the download, not the
  reload.** expo-updates launches any update that is already on disk at the
  next cold start, so fetching first and prompting afterwards would apply the
  update behind the user's back the next time they opened the app. The order
  is therefore: check, show a sonner-native toast if an update exists, and
  call `fetchUpdateAsync` followed by `reloadAsync` only when the user taps
  **Update**. Declining downloads nothing, so the running and the next
  session both stay on the current build. This is what makes it the real
  counterpart of the web's `registerType: 'prompt'`. Disabled in dev and in
  Expo Go.
- Assets: `assets/icon.svg` and `assets/splash.svg` are the sources;
  `scripts/generate-assets.mjs` (sharp) rasterizes the app icon, adaptive icon
  foreground/background, and splash PNGs into `assets/generated/`. **The PNGs
  are committed.** EAS Build's only usable hook, `eas-build-post-install`,
  runs *after* `expo prebuild` on Android, so no hook can generate prebuild
  inputs in time on a clean remote build. CI guards freshness instead: it
  re-runs `generate-assets` and fails on a diff under `assets/generated/`.
  The local prebuild script is named `native:prebuild`, not `prebuild`: npm
  and pnpm treat a script called `prebuild` as the automatic pre-hook for
  `build`, so the obvious name would fire at the wrong times.

## Observability (opt-in)

`src/observability/otel.ts` is imported lazily from the root layout only when
`EXPO_PUBLIC_OTEL_ENDPOINT` is set (plus `EXPO_PUBLIC_OTEL_SERVICE_NAME`,
default the package name).

**No credential ever goes in an `EXPO_PUBLIC_*` variable.** Expo inlines those
into the JS bundle at build time, and a shipped `.apk` or `.ipa` is a
downloadable archive, so anything in one is public and cannot be revoked per
user. That rules out an OpenObserve Basic-auth header, which is an account
credential with read access — a strictly worse exposure than the web's
`VITE_OPENOBSERVE_RUM_CLIENT_TOKEN`, which is a purpose-built write-only RUM
ingestion token meant to sit in a browser bundle. Two supported endpoints,
neither of which embeds a secret:

- **Default — ingest-only token.** `EXPO_PUBLIC_OTEL_INGEST_TOKEN` holds an
  OpenObserve token scoped to write into one stream, with no read and no admin
  rights, exactly the class of credential the web already ships. The README
  states plainly that it is public, that it must not be an account password,
  and how to rotate it. The blast radius of a leak is junk telemetry in one
  stream.
- **Hardened — backend forward.** Point `EXPO_PUBLIC_OTEL_ENDPOINT` at the
  backend and let it forward to OpenObserve with server-side credentials,
  reusing the bearer token the app already sends. The app needs no telemetry
  credential at all and unauthenticated spam is rejected. This needs a
  collector route in the Scala repo, so it is documented here and listed as a
  backend follow-up, not built in this one.

- `WebTracerProvider` from `@opentelemetry/sdk-trace-web`, resource with
  service name / version, OS name+version, device model
  (`expo-device`), and a `session.id` attribute added by a span processor
  (UUID per app launch).
- `FetchInstrumentation` with the two RN workarounds from the OTel demo:
  `propagateTraceHeaderCorsUrls: /.*/`, `clearTimingResources: false`; and
  `XMLHttpRequestInstrumentation` ignoring the API base URL so spans are not
  duplicated by the fetch polyfill.
- `W3CTraceContextPropagator` + `W3CBaggagePropagator`, so a tap continues
  into the backend's trace in OpenObserve.
- `BatchSpanProcessor` → `OTLPTraceExporter` (HTTP/JSON). Flushed on
  `AppState` background.
- **JS errors**: `ErrorUtils.setGlobalHandler` wraps the default handler and
  emits a log record (`severity: ERROR`, stack, `session.id`) through
  `OTLPLogExporter` (`@opentelemetry/sdk-logs`). Unhandled promise rejections
  are hooked the same way. No native crash capture; README names Sentry as
  the alternative.
- Versions of the OTel packages are pinned exactly (no caret) because the JS
  SDK is not officially supported on RN; README calls this out.

## Error handling

- Expected failures arrive as `ORPCError` with the Problem envelope in
  `error.data`; UI dispatches on `problemTag`, never on text. Each screen shows
  the specific message for the codes it declares and a generic `ErrorState`
  otherwise.
- Network / offline: no NetInfo dependency. TanStack Query `retry` stays at
  its default; `ErrorState` shows a generic message with a retry button. When
  a refetch fails but cached data exists (`isError && data`), the list keeps
  the data and shows a banner instead.
- **Session expiry**: `authFetch` is copied unchanged, so the behaviour is
  the web's and the spec must describe it exactly. A 401 triggers one
  single-flight refresh. If the *refresh call* is rejected (401/403), the
  provider is invalidated, the store is cleared, the auth gate redirects to
  login, and a toast explains the session expired. If the refresh succeeds but
  the *retried original request* still returns 401, the session is deliberately
  **not** dropped: a fresh JWT rejected by one route is a per-resource
  authorization failure, not an expired session, and it surfaces as a normal
  Problem to the screen. Invalidating there would log users out on a single
  unlucky endpoint. A test covers both branches.
- Root `ErrorBoundary` in `app/_layout.tsx` (Expo Router's `ErrorBoundary`
  export) with a Reload action.

## Testing

- **Unit** (`jest-expo`, RNTL, `msw/node`): `authFetch` refresh race (ported
  test) plus both expiry branches (refresh rejected → invalidated; retry 401 → session kept), `tokenStore` hydration, write serialization, and that no disk read follows hydration, `LoginScreen` (validation,
  Problem display, navigation), `AuctionListScreen` and `AuctionDetailScreen`
  against typed MSW handlers (list, empty, error, bid too low), `useOtaUpdates`
  (prompts before fetching, downloads nothing when declined, throttles), `otel` init is a no-op without
  the env var. Handlers typed against the contract as on the web.
- **Maestro**: `.maestro/smoke.yml` launches the app and asserts the login
  screen (backend-free, survives init-project). `.maestro/auctions.yml` logs
  in with dev auth, opens the list, opens a detail, places a bid — needs the
  live backend, local only.
- **Manual**: Android emulator locally; screenshots attached in the PR for
  each screen in light and dark.

## CI (`.github/workflows/ci.yml`)

Job `verify`: pnpm install (frozen), `typecheck`, `lint`, `format:check`,
`test`, `generate-assets` + `git diff --exit-code assets/generated` (freshness), `expo prebuild --platform all --no-install` (config gate for both
platforms), then a release APK via `./gradlew assembleRelease` signed with
the debug keystore so the JS bundle is embedded and no Metro server is needed,
then Maestro `smoke.yml` against it on a GitHub-hosted emulator
(`reactivecircus/android-emulator-runner`, API 34, x86_64, KVM). Expected
10–12 minutes; the emulator step has a `timeout-minutes` and is retried once.

Job `init-project-shell`: run `scripts/init-project.mjs ci-shell`, assert
LICENSE and README license section removed, then `typecheck`, `lint`, `test`,
prebuild, APK, Maestro smoke.

README documents EAS Workflows (`type: maestro` jobs) as the alternative when
GitHub emulator time becomes painful, and states that iOS is gated by
prebuild + typecheck only without a macOS runner.

## init-project

`scripts/init-project.mjs <name>` mirrors the web script:

- deletes `src/features/auctions/`, `app/(app)/index.tsx`,
  `app/(app)/auctions/`, `test/features/auctions/`, `.maestro/auctions.yml`;
- writes a minimal `app/(app)/index.tsx` home screen (greeting + settings
  link) so the shell runs;
- strips `// mobile:auction-block-start` / `-end` blocks (MSW handlers, i18n
  `auction` namespace via JSON key removal, prefetch registrations);
- renames `package.json` `name` (which drives app name, slug, scheme);
- removes `LICENSE` and the README license section.

CI proves the post-init shell builds and passes the smoke.

## Scripts

| Script | What |
| --- | --- |
| `start` / `android` / `ios` | Expo dev server / run on emulator or simulator |
| `typecheck` / `lint` / `format` / `test` | the gate |
| `e2e` | `maestro test .maestro` against a running emulator |
| `native:prebuild` | `expo prebuild --clean` (not named `prebuild`: npm would run it before `build`) |
| `build:preview` / `build:production` | `eas build` with the profile |
| `update:preview` / `update:production` | `eas update --channel …` |
| `sync-contracts` | vendor the backend-generated contract |
| `generate-assets` | rasterize icon + splash PNGs |
| `init-project` | strip the demo |

## Documentation

`README.md` follows the web README's structure, with no hero image: the
contract loop, quick start (Android emulator, `10.0.2.2`), the auth story, EAS profiles and OTA,
deep links, observability, security notes (secure store, dev auth gated by
`DEV_AUTH_ENABLED`, no CSP equivalent, pinned OTel packages), conventions,
starting a real project, scripts table, license. Out-of-scope items each get a
"how to add" paragraph.

`CLAUDE.md` in the house style — a persona line, `# Ground rules`,
`# Structure`, `# Modes` — see Appendix A.

Follow-up outside this repo (not part of this spec): a `docs/mobile.md` in
the backend describing the pairing, like `docs/frontend.md`.

## Risks

| Risk | Mitigation |
| --- | --- |
| Temporal / oRPC on Hermes | Spike first; fallback documented before UI work |
| NativeWind / Reanimated / Expo pin drift | Exact pins for the fragile trio; `expo install --fix` documented in the update section |
| OTel JS SDK unsupported on RN | Exact pins; feature is opt-in and isolated in one module; Sentry named as swap |
| GitHub emulator flakiness | Single short smoke flow, the Maestro step retried once, EAS Workflows documented |
| iOS unverified | Stated in README; prebuild + typecheck gate config errors |
| Telemetry token is public by construction | Ingest-only scope, rotation documented, backend-forward option for anyone who needs secrecy |
| Committed PNGs drift from their SVG sources | CI re-generates and fails on a diff |

## Appendix A — CLAUDE.md draft

```
You are an expert mobile engineer. This is the reference React Native app for
the madrileno backend template (sibling repo `../madrileno`); the web sibling
is `../madrileno-frontend`.

# Ground rules

- The API contract in `src/contracts/` is GENERATED — never edit it. Refresh it
  with `pnpm run sync-contracts` after the backend's `sbt test`. If typecheck
  breaks after a sync, fix the call sites: the backend routes are the source of
  truth.
- ALWAYS run `pnpm run typecheck`, `pnpm run lint`, and `pnpm run test` before
  committing; format with `pnpm run format`. Run the app on the Android
  emulator (`pnpm run android`) before claiming a screen works.
- NEVER use the JS `Date` global outside `src/api/datetime.ts` (ESLint enforces
  this). Use `Temporal` from `temporal-polyfill`; convert wire values at the
  boundary with `toInstant` / `formatInstant`.
- User-facing text goes through use-intl: add the key to
  `src/i18n/messages/en.json`, then render `t('key', { param })` from
  `useTranslations('namespace')` — never hardcode display strings. English only
  (matches the backend). Demo keys live under the `auction` namespace so
  `init-project` can prune them.
- Strict TypeScript is on (`strict`, `noUncheckedIndexedAccess`). Don't cast
  your way around it; model the type properly.
- Expected API failures surface as `ORPCError`s carrying the backend's Problem
  envelope in `error.data`. Dispatch on the Problem `type` tag (`problemTag`),
  never on human-readable text.
- No browser globals: `window`, `document`, `localStorage` do not exist here.
  Tokens live in `src/features/auth/tokenStore.ts` (expo-secure-store);
  preferences in MMKV.

# Structure

- `app/` — Expo Router routes only; each file re-exports a screen from
  `src/features/<name>/screens/`. Put logic in `src/`, never in `app/`.
  `(auth)` holds login, `(app)` is the authenticated group with the gate in
  its `_layout.tsx`.
- `src/features/<name>/` — one folder per vertical slice (queries, screens,
  formatting); `auth` survives `init-project`, `auctions` is the deletable demo.
  `src/api/` — oRPC client over an auth-aware fetch (bearer + 401-refresh),
  datetime boundary; copied from the web repo, keep it diffable.
- New API calls: use the tanstack utils `orpc` from `src/api/orpc.ts`
  (`useQuery(orpc['<generated-key>'].get.queryOptions({ input }))`); plain
  one-shot calls go through `client`. Infer types from `ApiClient`
  (`Awaited<ReturnType<ApiClient['<key>']['get']>>`).
- Tests: jest-expo + React Native Testing Library + MSW. Register handlers per
  test with `server.use(...)`; type fixtures against contract-inferred types.
  Maestro flows in `.maestro/`.
- Blocks bracketed by `// mobile:auction-block-start` / `-end` are demo wiring
  that `scripts/init-project.mjs` strips — keep the markers accurate.
- UI: this is **react-native-reusables** (shadcn for React Native) on
  NativeWind. Compose the primitives in `src/components/ui/` (`Button`,
  `Input`, `Card`, `Badge`, `Text`) and the `Field` composition in
  `src/components/` — don't hand-write raw `View`/`TextInput` styling in feature
  code. Add more with `npx @react-native-reusables/cli add <name>`; those files
  are vendored (edit freely). Style with tokens (`bg-card`, `text-primary`, …),
  never hard-coded colors, so dark mode and the palette (`global.css`) apply.
  Wrap screens in `Screen` (safe areas) and forms in the keyboard-avoiding
  variant; lists use FlashList.
- Navigation: typed routes are on — `router.push('/auctions/[id]')` style hrefs
  are checked. New screens need a file in `app/`; deep links follow from it.

# Modes

- `pnpm run start` — Expo dev server; `pnpm run android` builds and runs on the
  emulator (the API defaults to `http://10.0.2.2:9000`, the emulator's alias
  for the host's backend). iOS builds go through `eas build`; there is no Mac
  in the loop, so state clearly when something is unverified on iOS.
- OTA updates and OTel are opt-in via env and inert in dev; don't add code
  paths that assume they're on.
```
