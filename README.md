# madrileno-mobile

The reference mobile app for the [madrileno](../madrileno) backend template: a
React Native / Expo app built against the backend's **generated oRPC
contract** (baklava's `orpc` output), so the Scala routes are the single
source of truth and drift is a compile error.

Stack: Expo Router + React 19 + TypeScript (strict) + TanStack Query + oRPC
(`@orpc/openapi-client` + `@orpc/tanstack-query`) + zod + react-hook-form +
Temporal + NativeWind (react-native-reusables). Tests: jest-expo + React
Native Testing Library + MSW, plus Maestro e2e flows.

## The contract loop (the whole point)

```
Scala router specs ──sbt test──▶ target/baklava/orpc/src/*.ts
                                        │  pnpm run sync-contracts
                                        ▼
                              src/contracts/ (vendored, committed)
                                        │  typed clients + hooks
                                        ▼
                         pnpm run typecheck  ← fails on contract drift
```

Rename a field in a backend DTO, run `sbt test` + `pnpm run sync-contracts`,
and `pnpm run typecheck` fails at the exact mobile call site. The contract is
committed, so CI and fresh clones need no backend checkout.

## Quick start

You need Node 22, pnpm, and an Android emulator (Android Studio's AVD
Manager) — no Mac needed for Android dev.

```bash
pnpm install
```

Start the backend ([backend README](../madrileno)) with dev auth enabled —
it's on by default (`DEV_AUTH_ENABLED=true` in the backend's `.env.sample`):

```bash
(cd ../madrileno && sbt)   # in the sbt shell: ~reStart
```

Then run the app on the Android emulator:

```bash
pnpm run android
```

The default `EXPO_PUBLIC_API_BASE_URL` is `http://10.0.2.2:9000` —
`10.0.2.2` is the Android emulator's alias for the host machine, so the app
reaches the backend on your machine's `localhost:9000` with no network
config. A physical device needs your LAN IP instead; see `.env.sample` for
this and every other env var the app reads.

Log in with any email (the backend's dev auth), then browse, bid, and watch
the typed error envelope when a bid is too low.

## Auth

Dev login only (`POST /v1/auth/dev`), parity with the web: `LoginScreen`
posts an email address through `client.v1.auth.dev.post` and stores the
returned JWT + refresh token.

Tokens live in `expo-secure-store` (`src/features/auth/tokenStore.ts`). Reads
are async, so the store hydrates a synchronous in-memory mirror once at
startup, awaited behind the splash screen in `app/_layout.tsx`. **The mirror
is authoritative after hydration and is never re-read from disk** — a mobile
app is a single process, so nothing else writes the keychain entry, and an
async re-read racing a logout or refresh could restore a spent single-use
refresh token. Writes are serialized through a promise chain so two rapid
token rotations can't land out of order.

Logout (`useAuth().logout`) is **local-only**: it clears the token store. The
contract's `DELETE /v1/auth/sessions` is keyed by a `user-agent` query the
app can't know reliably, so it isn't called — same tradeoff as the web. A
deliberate logout also forgets any pending deep-link return target, so the
next login lands on the auction list rather than back on the screen you
logged out from.

**Adding Google or Apple sign-in**: the backend already exposes
`POST /v1/auth/oidc/{provider}`. Complete the Authorization Code + PKCE flow
client-side with `expo-auth-session`, then POST the resulting `id_token` to
that endpoint the same way `dev.post` is called today. For Apple, add
`expo-apple-authentication` for the native Sign in with Apple sheet before
the same OIDC exchange — Apple requires its own "Sign in with Apple" button
next to any other social login, not just Google's.

## EAS: builds and OTA updates

`eas.json` has three profiles: `development` (dev client, internal
distribution), `preview` (internal APK, channel `preview`), `production`
(channel `production`, auto-incrementing). `runtimeVersion` is pinned to
`{ policy: "appVersion" }`, so an OTA update only applies to a build whose
`version` (`package.json`) matches.

The template ships with no EAS project bound to it. Run `eas init` once,
then set `EAS_OWNER` and `EAS_PROJECT_ID` in the environment (build-time
only, not `EXPO_PUBLIC_*` — no secret) so `app.config.ts` picks them up.

```bash
pnpm run build:preview      # eas build --profile preview
pnpm run build:production   # eas build --profile production
```

OTA updates (`src/updates/useOtaUpdates.ts`) check on launch and on
foreground (throttled to once per 5 minutes) and toast when one is
available. **Consent gates the download, not the reload**: expo-updates
launches whatever is already on disk at the next cold start, so fetching an
update first and prompting afterward would apply it behind the user's back
the next time the app opens. The order is check, then prompt, then call
`fetchUpdateAsync` and `reloadAsync` — only on a tap of **Update**; declining
downloads nothing. Disabled in dev and in Expo Go.

```bash
pnpm run update:preview      # eas update --channel preview
pnpm run update:production   # eas update --channel production
```

## Deep links

`madrileno://auctions/<id>` works out of the box — Expo Router's file-based
routes give every screen a deep link for free, scheme derived from the
package name (`app.config.ts`).

```bash
adb shell am start -a android.intent.action.VIEW -d "madrileno://settings"
```

A cold-start deep link into an authed route lands on `/login` first (the
auth gate hasn't hydrated yet) and continues to the original target after
login — the target is captured in memory only, never persisted.

Universal / App Links (`https://` links that open the app instead of a
browser) are prepared behind `EXPO_PUBLIC_ASSOCIATED_DOMAIN`: set it and
`app.config.ts` adds the iOS associated domain and the Android `autoVerify`
intent filter. Not verifiable in this repo (no domain, no Mac) — see
[`docs/deep-links.md`](docs/deep-links.md) for the `assetlinks.json` /
`apple-app-site-association` templates and how to test them.

## Observability (opt-in)

RUM via OpenObserve's React Native SDK (`@openobserve/mobile-react-native`,
beta, pinned exactly — the mobile counterpart of the web's
`@openobserve/browser-rum`). Set the `EXPO_PUBLIC_OPENOBSERVE_RUM_*`
variables (see `.env.sample`) and it captures screens (via
`@openobserve/mobile-react-navigation`), fetch/XHR resources, unhandled JS
errors, and native crashes, next to the backend's own traces. Unset = the
SDK never initializes.

- `EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN` — a RUM client token
  (OpenObserve → Ingestion → RUM), write-only for RUM data and designed to
  ship inside client apps; **public by construction**. Scope it to
  ingest-only and rotate it like any other public key.
- `EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT` — the instance base URL; the app
  appends `/rum/v1/<org>` itself.
- `EXPO_PUBLIC_OPENOBSERVE_RUM_ORG` (default `default`),
  `EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID`,
  `EXPO_PUBLIC_OPENOBSERVE_RUM_ENV`.

Distributed tracing: the API host is listed in `firstPartyHosts` with the
`tracecontext` propagator, so requests to the backend carry a W3C
`traceparent` and land in the same trace as the backend's own spans (verified
against a live instance). Expo SDK 57 installs its own native `fetch` that
bypasses `XMLHttpRequest`, which is what the SDK instruments — so enabling
RUM, and only then, swaps `globalThis.fetch` back to React Native's
XHR-backed fetch.

Automatic tap tracking is **off**: the SDK's interaction auto-instrumentation
patches React's element creation and crashes against NativeWind's JSX
runtime. Record taps manually with `O2Rum.addAction` where you need them.

Needs a development or EAS build — the SDK wraps native modules, so it
doesn't run in Expo Go. There's no trace upload: the SDK's trace endpoint
targets an API OpenObserve doesn't ingest, so only RUM/logs are configured;
forwarding traces through the backend instead is a possible follow-up for
anyone who needs it.

Beta risk: `@openobserve/mobile-react-native` is `0.1.2` and pinned exactly
(no `^`). If it blocks an Expo/RN upgrade, Sentry is the named swap for
native crash symbolication.

## Testing

Unit tests: jest-expo + React Native Testing Library + MSW (`pnpm test`).
Handlers are typed against the generated contract, same convention as the
web. RNTL 14's `render`/`fireEvent` are async — every test awaits them.

Maestro e2e flows in `.maestro/`:

- `smoke.yml` — launches the app and asserts the login screen; backend-free,
  survives `init-project`.
- `auctions.yml` — logs in with dev auth, opens the list, opens a detail,
  places a bid; needs the live backend, local only
  (`pnpm run e2e` against a running emulator).

CI (`.github/workflows/ci.yml`) runs two jobs, both against a GitHub-hosted
Android emulator: `verify` (typecheck, lint, format:check, test, an
asset-freshness check, an `expo prebuild` config gate for both platforms, a
release APK build signed with the debug keystore, then Maestro `smoke.yml`
against it) and `init-project-shell` (the same gate run after
`scripts/init-project.mjs`, to prove the stripped-down shell still builds
and passes the smoke flow).

**iOS has no Mac in the loop**: it's gated by the `expo prebuild` config check
above and `typecheck` only — not an actual build or run.
[EAS Workflows](https://docs.expo.dev/eas/workflows/) (`type: maestro` jobs)
is the documented alternative once GitHub-hosted emulator minutes get
painful.

Manual: run on the Android emulator (`pnpm run android`) and check every
screen in light and dark before calling a change done.

## Security

Deliberate tradeoffs — accept or change them before shipping:

- **Tokens in `expo-secure-store`** (Android Keystore / iOS Keychain-backed),
  not `AsyncStorage`.
- **No CSP equivalent**: native apps have no script-injection surface the way
  a browser page does, so there's nothing analogous to configure.
- **Dev auth** (`POST /v1/auth/dev`) is backend-gated by `DEV_AUTH_ENABLED`
  (keep it off in production, same as the web).
- **Telemetry token scope**: `EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN` is
  the only credential in any `EXPO_PUBLIC_*` variable — ingest-only, public
  by construction; rotate it if it ever turns out to be scoped beyond RUM
  ingestion.
- **`usesNonExemptEncryption: false`** (`app.config.ts`) tells the App Store
  the app doesn't use non-exempt encryption, so a build skips the manual
  export-compliance questionnaire. Change it if you add encryption that
  doesn't qualify for the standard exemptions.
- **Reporting**: disclose vulnerabilities privately to the maintainer.

## Conventions

- **Types from the contract**: `Awaited<ReturnType<ApiClient['<key>']['get']>>`
  — never hand-written DTOs.
- **Errors are typed by code**: expected failures arrive as `ORPCError`s
  carrying the backend's Problem envelope in `error.data`; dispatch on
  `problemTag(problem)`, never on display text.
- **Temporal, not Date**: ESLint bans the `Date` global everywhere except
  `src/api/datetime.ts` (the wire boundary) and `src/updates/useOtaUpdates.ts`
  (expo-updates' own throttle clock).
- **Feature folders**: `src/features/<name>/` holds vertical slices — `auth`
  and `settings` survive `init-project`, `auctions` is the deletable demo.
- **`app/` is wiring only**: every route file re-exports a screen from
  `src/features/<name>/screens/`; no logic lives in `app/`.
- **Tokens, not colors**: style with `bg-card`, `text-primary`, etc. from
  `global.css`, never hard-coded colors, so dark mode and the palette apply
  for free.

## Starting a real project

```bash
node scripts/init-project.mjs my-project
```

Deletes the auction demo (`src/features/auctions/`, `app/(app)/auctions/`,
`test/features/auctions/`, `.maestro/auctions.yml`), strips every
`mobile:auction-block-*` marker block, removes the `auction` i18n namespace,
writes a minimal home screen, renames `package.json` (which drives the app
name, slug, scheme and the Maestro `appId`), and removes `LICENSE` and this
README's License section.

```bash
pnpm run native:prebuild
```

Run this after renaming: the bundle id (`dev.<scheme>.mobile`) follows the
package name, and the native `android/`/`ios/` directories aren't committed.
After the backend's own `init-project.scala` and `sbt test`, resync the
contract:

```bash
pnpm run sync-contracts
```

## Out of scope, and how to add each

- **Push notifications** — `expo-notifications` for the client permission and
  token flow, plus a device-token registration endpoint in the backend to
  store and target tokens.
- **Offline persistence** — TanStack Query only caches in memory today;
  `@tanstack/query-persist-client-core` with an MMKV storage adapter would
  persist the cache across restarts.
- **iOS device verification** — this template is verified on Android only (no
  Mac in the loop). A Mac, or EAS's cloud builds plus TestFlight, would let
  you build, install and verify on a real device or simulator.

## Scripts

| Script                                                                   | What                                                                                                                                                                                               |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start`                                                                  | Expo dev server                                                                                                                                                                                    |
| `android` / `ios`                                                        | Build and run on the emulator / simulator                                                                                                                                                          |
| `routes:types`                                                           | `expo customize tsconfig.json` — the only non-dev-server path that generates `.expo/types/router.d.ts`; run it before `typecheck` on a fresh clone or in CI, since those route types are untracked |
| `typecheck` / `lint` / `format` / `format:check` / `test` / `test:watch` | the gate                                                                                                                                                                                           |
| `e2e`                                                                    | `maestro test .maestro` against a running emulator                                                                                                                                                 |
| `native:prebuild`                                                        | `expo prebuild --clean` (not named `prebuild`: npm/pnpm would run it automatically as `build`'s pre-hook)                                                                                          |
| `generate-assets`                                                        | rasterize `assets/icon.svg` / `assets/splash.svg` into the committed PNGs under `assets/generated/`                                                                                                |
| `build:preview` / `build:production`                                     | `eas build` with the profile                                                                                                                                                                       |
| `update:preview` / `update:production`                                   | `eas update --channel …`                                                                                                                                                                           |
| `sync-contracts`                                                         | vendor the backend-generated contract                                                                                                                                                              |
| `init-project`                                                           | strip the demo                                                                                                                                                                                     |

## License

The template is licensed under [Apache-2.0](LICENSE), but projects generated from it are unencumbered: you may relicense the code created via `scripts/init-project.mjs` under any terms, with no attribution required. The init script removes the LICENSE file (and this section) so you can add a license of your own choosing.
