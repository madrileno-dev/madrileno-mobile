# React Native Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `madrileno-mobile`, an Expo / React Native starter that consumes the madrileno backend's generated oRPC contract, with the auction demo, dev login, OTA updates, deep links, opt-in OpenTelemetry, unit tests, Maestro smoke, CI, and an `init-project` strip script.

**Architecture:** Expo SDK 57 managed workflow with Expo Router (file routes in `app/`, all logic in `src/`). The API, contract, Problem and datetime layers are copied verbatim from `../madrileno-frontend`; only the token store changes (expo-secure-store with an in-memory mirror). UI is react-native-reusables on NativeWind 4 with the web's token palette translated to HSL.

**Tech Stack:** Expo 57, React Native 0.87, Expo Router 57, TypeScript strict, pnpm, NativeWind 4.2 + Tailwind 3.4, react-native-reusables 0.7, TanStack Query 5, @orpc/openapi-client 1.15, zod 4, react-hook-form 7 + @hookform/resolvers, use-intl 4, temporal-polyfill 1, expo-secure-store, react-native-mmkv 4, @shopify/flash-list 2, sonner-native, lucide-react-native, expo-updates, expo-haptics, OpenTelemetry JS (sdk-trace-web 2.11, exporters 0.222), jest-expo 57 + @testing-library/react-native 14 + msw 2, Maestro, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-18-react-native-starter-design.md`

## Global Constraints

- Node 22, pnpm 10. Expo SDK `57.x`; install Expo packages with `pnpm expo install <pkg>` so versions match the SDK.
- TypeScript `strict` + `noUncheckedIndexedAccess` + `noImplicitReturns` + `noImplicitOverride` + `noUnusedLocals` + `noUnusedParameters` + `noFallthroughCasesInSwitch`. Never cast around it.
- `src/contracts/` is GENERATED. Never hand-edit; only `scripts/sync-contracts.mjs` writes there.
- The JS `Date` global is banned everywhere except `src/api/datetime.ts` and `src/updates/useOtaUpdates.ts` (ESLint `no-restricted-globals`).
- All user-facing strings go through use-intl (`src/i18n/messages/en.json`), English only. Demo strings live under the `auction` namespace.
- Expected API failures are `ORPCError`s with the Problem envelope in `error.data`; dispatch on `problemTag(problem)`, never on text.
- Files under `app/` contain only route wiring (a default export re-exporting a screen, optional `Stack.Screen` options). No logic in `app/`.
- No browser globals (`window`, `document`, `localStorage`). Tokens live in `src/features/auth/tokenStore.ts`; preferences in MMKV.
- No credential in any `EXPO_PUBLIC_*` variable. The only telemetry credential is `EXPO_PUBLIC_OTEL_INGEST_TOKEN`, an ingest-only token that is public by construction.
- The OpenTelemetry packages, `nativewind`, `react-native-css-interop` and `react-native-reanimated` are pinned exactly (no `^`).
- Demo wiring that `init-project` strips is bracketed with `// mobile:auction-block-start` / `// mobile:auction-block-end` (or `{/* mobile:auction-block-start */}` in JSX) and must stay accurate.
- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100` (same as the web).
- Commit messages: imperative, no attribution trailers (repo convention). Never push; the user grants push permission per action.
- The Android emulator reaches the host's backend at `http://10.0.2.2:9000`; that is the default `EXPO_PUBLIC_API_BASE_URL`.
- Two spec deviations, decided here with reasons: (1) generated icon/splash PNGs **are committed** because EAS runs `eas-build-post-install` *after* `expo prebuild` on Android, so no hook can generate prebuild inputs in time; CI instead checks they are up to date. (2) Logout is local-only (clear the token store), like the web: the contract's `DELETE /v1/auth/sessions` is keyed by a `user-agent` query the app cannot know reliably.

---

### Task 1: Scaffold, toolchain, and the two spikes

**Files:**
- Create: `package.json`, `app.json` (temporary), `tsconfig.json`, `babel.config.js`, `metro.config.js`, `jest.config.js`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.env.sample`, `app/_layout.tsx`, `app/index.tsx`, `test/setup.ts`, `test/mswServer.ts`, `test/spike/msw.test.ts`, `src/spike/TemporalProbe.tsx` (deleted at the end of the task)

**Interfaces:**
- Produces: the repo skeleton every later task builds on; `test/mswServer.ts` exports `server` (an MSW `SetupServer`); `test/setup.ts` starts it with `onUnhandledRequest: 'error'`.

- [ ] **Step 1: Scaffold Expo into the existing repo**

The repo already has `.git` and `docs/`; create-expo-app wants an empty directory, so scaffold beside it and move the files in.

```bash
cd /home/luksow/iterators/madrileno
pnpm create expo-app@latest madrileno-mobile-scaffold --template blank-typescript --no-install
rsync -a --exclude .git madrileno-mobile-scaffold/ madrileno-mobile/
rm -rf madrileno-mobile-scaffold
cd madrileno-mobile
rm App.tsx index.ts
sed -i 's/"name": "madrileno-mobile-scaffold"/"name": "madrileno-mobile"/' package.json
grep '"name"' package.json
git status --short | head
```

Expected: `"name": "madrileno-mobile"` (Task 9 derives the app name, slug, scheme and bundle id from it, so the scaffold's name must not leak through), and `package.json`, `app.json`, `tsconfig.json`, `assets/`, `.gitignore` appear untracked.

- [ ] **Step 2: Install the base dependency set**

```bash
pnpm expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-splash-screen expo-system-ui
pnpm add @tanstack/react-query @orpc/client @orpc/contract @orpc/openapi-client @orpc/tanstack-query zod temporal-polyfill use-intl react-hook-form @hookform/resolvers
pnpm add -D typescript @types/react jest jest-expo @types/jest @testing-library/react-native @testing-library/jest-native msw prettier eslint eslint-config-expo eslint-config-prettier typescript-eslint
```

Set `"main": "expo-router/entry"` in `package.json`.

- [ ] **Step 3: Write the config files**

`package.json` `scripts` (replace the scaffold's):

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest",
    "test:watch": "jest --watch",
    "e2e": "maestro test .maestro",
    "native:prebuild": "expo prebuild --clean",
    "generate-assets": "node scripts/generate-assets.mjs",
    "build:preview": "eas build --profile preview",
    "build:production": "eas build --profile production",
    "update:preview": "eas update --channel preview",
    "update:production": "eas update --channel production",
    "sync-contracts": "node scripts/sync-contracts.mjs",
    "init-project": "node scripts/init-project.mjs"
  }
}
```

`app.json` (temporary; Task 9 replaces it with `app.config.ts`):

```json
{
  "expo": {
    "name": "madrileno",
    "slug": "madrileno-mobile",
    "scheme": "madrileno",
    "version": "0.0.1",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "experiments": { "typedRoutes": true },
    "plugins": ["expo-router"],
    "android": { "package": "dev.madrileno.mobile" },
    "ios": { "bundleIdentifier": "dev.madrileno.mobile" }
  }
}
```

`tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "types": ["jest", "@testing-library/jest-native"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"],
  "exclude": ["node_modules", "android", "ios", "dist"]
}
```

`babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true)
  return { presets: ['babel-preset-expo'] }
}
```

`metro.config.js` (NativeWind is added in Task 4):

```js
const { getDefaultConfig } = require('expo/metro-config')

module.exports = getDefaultConfig(__dirname)
```

`jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@rn-primitives/.*|nativewind|react-native-css-interop|sonner-native|@shopify/flash-list|lucide-react-native|react-native-reanimated|react-native-mmkv|react-native-nitro-modules)',
  ],
}
```

`eslint.config.js`:

```js
const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const prettier = require('eslint-config-prettier')
const tseslint = require('typescript-eslint')

module.exports = defineConfig([
  {
    ignores: ['node_modules', 'android', 'ios', '.expo', 'dist', 'src/contracts', 'assets/generated'],
  },
  expoConfig,
  prettier,
  {
    // Typed rules only where type information exists. Applied globally they
    // abort on babel.config.js and friends with a parserOptions.project error.
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message:
            'Use Temporal (temporal-polyfill). JS Date is allowed only in src/api/datetime.ts, the wire boundary.',
        },
      ],
    },
  },
  {
    files: ['src/api/datetime.ts', 'src/updates/useOtaUpdates.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  { files: ['src/components/ui/**/*.tsx'], rules: { 'react/display-name': 'off' } },
  { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked, prettier] },
])
```

`.prettierrc`:

```json
{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

`.prettierignore`:

```
node_modules
android
ios
.expo
src/contracts
assets/generated
pnpm-lock.yaml
```

`.env.sample`:

```
# Base URL of the backend as seen from the device. 10.0.2.2 is the Android
# emulator's alias for the host machine; use your LAN IP for a physical device.
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:9000

# OpenTelemetry → OpenObserve (optional — leave unset and the SDK never loads).
# The token is an INGEST-ONLY token, public by construction (it ships in the
# app binary). Never put an account password or a token with read access here.
# EXPO_PUBLIC_OTEL_ENDPOINT=http://10.0.2.2:5080/api/default
# EXPO_PUBLIC_OTEL_INGEST_TOKEN=
# EXPO_PUBLIC_OTEL_SERVICE_NAME=madrileno-mobile

# Universal / App Links (optional). When set, app.config.ts adds the iOS
# associated domain and the Android autoVerify intent filter for this host.
# EXPO_PUBLIC_ASSOCIATED_DOMAIN=app.example.com
```

Append to the scaffold's `.gitignore`:

```
.env
.env.local
```

- [ ] **Step 4: Minimal root layout, index route, Temporal probe**

`app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router'

export default function RootLayout() {
  return <Stack />
}
```

`app/index.tsx`:

```tsx
import { Text, View } from 'react-native'
import { TemporalProbe } from '@/spike/TemporalProbe'

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>madrileno-mobile</Text>
      <TemporalProbe />
    </View>
  )
}
```

`src/spike/TemporalProbe.tsx` (throwaway):

```tsx
import { Text } from 'react-native'
import { Temporal } from 'temporal-polyfill'

export function TemporalProbe() {
  const local = Temporal.Now.instant().toZonedDateTimeISO(Temporal.Now.timeZoneId())
  return (
    <Text testID="temporal-probe">
      {local.toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
    </Text>
  )
}
```

- [ ] **Step 5: Spike A — Temporal on Hermes**

Boot an Android emulator (Android Studio → Device Manager), then:

```bash
pnpm run android
```

Expected: the app installs and shows the app name and a localized timestamp like `Sep 21, 2026, 3:04 PM`. Hermes ships Intl on SDK 57, so a throw or an ISO-looking string means the polyfill misbehaves on this runtime. In that case stop, report the exact error, and do not start Task 2: the fallback is to implement `formatInstant` in `src/api/datetime.ts` with `new Intl.DateTimeFormat(locale, { dateStyle, timeStyle }).format(new Date(instant.epochMilliseconds))` (allowed there) and keep Temporal for arithmetic only.

- [ ] **Step 6: Spike B — MSW intercepts fetch under jest-expo**

`test/mswServer.ts`:

```ts
import { setupServer } from 'msw/node'

export const server = setupServer()
```

`test/setup.ts`:

```ts
import '@testing-library/jest-native/extend-expect'
import { server } from './mswServer'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
```

`test/spike/msw.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { server } from '../mswServer'

describe('msw under jest-expo', () => {
  it('intercepts globalThis.fetch', async () => {
    server.use(http.get('http://api.test/ping', () => HttpResponse.json({ ok: true })))
    const res = await fetch('http://api.test/ping')
    expect(await res.json()).toEqual({ ok: true })
  })
})
```

Run: `pnpm test`
Expected: PASS. The RN jest environment extends `jest-environment-node`, which exposes Node's `fetch`. If it fails with `fetch is not defined` or an unhandled request, run `pnpm add -D undici`, add this to the top of `test/setup.ts`, and re-run:

```ts
import { fetch as undiciFetch, Headers, Request, Response } from 'undici'
Object.assign(globalThis, { fetch: undiciFetch, Headers, Request, Response })
```

- [ ] **Step 7: Generate typed routes, then typecheck, lint, format**

Typed routes live in `.expo/types/router.d.ts`, written by the bundler:

```bash
pnpm exec expo export --platform android --output-dir /tmp/claude-1000/-home-luksow-iterators-madrileno/6920e7af-2dbf-4a38-9541-0c0eaa0ba98a/scratchpad/export-check
pnpm run typecheck && pnpm run lint && pnpm run format
```

Expected: all green.

- [ ] **Step 8: Remove the probe, commit**

Delete `src/spike/` and reduce `app/index.tsx` to:

```tsx
import { Text, View } from 'react-native'

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>madrileno-mobile</Text>
    </View>
  )
}
```

Keep `test/spike/msw.test.ts` as a regression guard for the harness.

```bash
git add -A -- . ':!docs'
git commit -m "Scaffold Expo app with strict TypeScript, ESLint Date ban, jest-expo and MSW"
```

---

### Task 2: Vendored contract and the API core

**Files:**
- Create: `scripts/sync-contracts.mjs`, `src/contracts/**` (generated), `src/env.ts`, `src/api/orpc.ts`, `src/api/authFetch.ts`, `src/api/problem.ts`, `src/api/datetime.ts`
- Test: `test/api/authFetch.test.ts`

**Interfaces:**
- Consumes: `server` from `test/mswServer.ts`.
- Produces: `env.apiBaseUrl: string`, `env.otel: OtelConfig | null`; `makeApiClient(baseUrl?: string): ApiClient`; `client: ApiClient`; `orpc` (TanStack utils); `setTokenProvider(p: TokenProvider)` where `TokenProvider = { jwt(): string | undefined; refreshToken(): string | undefined; rotated(jwt: string, refreshToken: string): void; invalidated(): void }`; `problemFrom(error: unknown): Problem | null`; `problemTag(p: Problem): string`; `toInstant(v: Date | string): Temporal.Instant`; `formatInstant(v, opts?): string`; `useInstantFormatter(): (v: Date | string) => string`.

- [ ] **Step 1: Copy the sync script and vendor the contract**

```bash
cp ../madrileno-frontend/scripts/sync-contracts.mjs scripts/sync-contracts.mjs
ls ../madrileno/target/baklava/orpc/src/contracts.ts || (cd ../madrileno && sbt test)
pnpm run sync-contracts
ls src/contracts
```

Expected: `admin client.ts contracts.ts GENERATED.md schemas.ts security.ts v1`.

- [ ] **Step 2: Write `src/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().optional().default('http://10.0.2.2:9000'),
  EXPO_PUBLIC_OTEL_ENDPOINT: z.string().optional(),
  EXPO_PUBLIC_OTEL_INGEST_TOKEN: z.string().optional(),
  EXPO_PUBLIC_OTEL_SERVICE_NAME: z.string().optional(),
})

// Expo inlines EXPO_PUBLIC_* at build time; read them once, here, so a typo is
// one place to fix and the rest of the app sees a typed object.
const raw = schema.parse({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_OTEL_ENDPOINT: process.env.EXPO_PUBLIC_OTEL_ENDPOINT,
  EXPO_PUBLIC_OTEL_INGEST_TOKEN: process.env.EXPO_PUBLIC_OTEL_INGEST_TOKEN,
  EXPO_PUBLIC_OTEL_SERVICE_NAME: process.env.EXPO_PUBLIC_OTEL_SERVICE_NAME,
})

export interface OtelConfig {
  endpoint: string
  ingestToken: string | undefined
  serviceName: string
}

export const env: { apiBaseUrl: string; otel: OtelConfig | null } = {
  apiBaseUrl: raw.EXPO_PUBLIC_API_BASE_URL,
  otel:
    raw.EXPO_PUBLIC_OTEL_ENDPOINT !== undefined
      ? {
          endpoint: raw.EXPO_PUBLIC_OTEL_ENDPOINT,
          ingestToken: raw.EXPO_PUBLIC_OTEL_INGEST_TOKEN,
          serviceName: raw.EXPO_PUBLIC_OTEL_SERVICE_NAME ?? 'madrileno-mobile',
        }
      : null,
}
```

- [ ] **Step 3: Copy the API layer, then apply the two mobile edits**

```bash
cp ../madrileno-frontend/src/api/authFetch.ts src/api/authFetch.ts
cp ../madrileno-frontend/src/api/problem.ts src/api/problem.ts
```

`src/api/orpc.ts` (the web version reads `window.location.origin` and has an SSR utils factory; mobile needs neither):

```ts
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { createContractsClient, type ContractsClient } from '@/contracts/client'
import { env } from '@/env'
import { makeAuthorizedFetch } from './authFetch'

export type ApiClient = ContractsClient

export function makeApiClient(baseUrl: string = env.apiBaseUrl): ApiClient {
  return createContractsClient(baseUrl, { fetch: makeAuthorizedFetch(baseUrl) })
}

export const client: ApiClient = makeApiClient()

export const orpc = createTanstackQueryUtils(client)

export type OrpcUtils = typeof orpc
```

`src/api/datetime.ts` (the web version defers the timezone until hydration; there is no SSR here):

```ts
// The only module allowed to touch Date (ESLint bans it elsewhere): wire values in, Temporal out.
import { Temporal } from 'temporal-polyfill'
import { useLocale } from 'use-intl'

export function toInstant(value: Date | string): Temporal.Instant {
  return typeof value === 'string'
    ? Temporal.Instant.from(value)
    : Temporal.Instant.fromEpochMilliseconds(value.getTime())
}

export interface FormatInstantOptions {
  timeZone?: string
  locale?: string
}

export function formatInstant(value: Date | string, options?: FormatInstantOptions): string {
  return toInstant(value)
    .toZonedDateTimeISO(options?.timeZone ?? Temporal.Now.timeZoneId())
    .toLocaleString(options?.locale, { dateStyle: 'medium', timeStyle: 'short' })
}

export function useInstantFormatter(): (value: Date | string) => string {
  const locale = useLocale()
  return (value) => formatInstant(value, { locale })
}
```

- [ ] **Step 4: Write the auth-fetch tests**

The web suite plus the two expiry branches the spec calls for. Until Task 3 lands, the test registers an in-memory provider itself.

`test/api/authFetch.test.ts`:

```ts
import { http, HttpResponse } from 'msw'
import { setTokenProvider } from '@/api/authFetch'
import { makeApiClient } from '@/api/orpc'
import { server } from '../mswServer'

const BASE = 'http://api.test'
const USER = { id: '019ed9bb-0000-7000-8000-000000000042', emailVerified: true }
const REFRESHED = {
  jwt: 'fresh-jwt',
  refreshToken: '22222222-2222-4222-8222-222222222222',
  userCreated: false,
}

interface Tokens {
  jwt: string
  refreshToken: string
}
let tokens: Tokens | null = null

beforeAll(() => {
  setTokenProvider({
    jwt: () => tokens?.jwt,
    refreshToken: () => tokens?.refreshToken,
    rotated: (jwt, refreshToken) => {
      tokens = { jwt, refreshToken }
    },
    invalidated: () => {
      tokens = null
    },
  })
})

beforeEach(() => {
  tokens = null
})

function loggedIn() {
  tokens = { jwt: 'stale-jwt', refreshToken: '11111111-1111-4111-8111-111111111111' }
}

const reject401 = () =>
  HttpResponse.json(
    { type: 'rejection:authentication-failed', status: 401, title: 'Could not authorize' },
    { status: 401 },
  )

function usersMe401Until(fresh: string) {
  return http.get(`${BASE}/v1/users/me`, ({ request }) => {
    if (request.headers.get('authorization') === `Bearer ${fresh}`) {
      return HttpResponse.json(USER)
    }
    return reject401()
  })
}

describe('the authorized fetch behind the oRPC client', () => {
  it('injects the bearer token, refreshes once on 401, and retries', async () => {
    loggedIn()
    let refreshCalls = 0
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, () => {
        refreshCalls += 1
        return HttpResponse.json(REFRESHED)
      }),
    )

    const user = await makeApiClient(BASE).v1.users.me.get()

    expect(user.id).toBe(USER.id)
    expect(refreshCalls).toBe(1)
    expect(tokens?.jwt).toBe('fresh-jwt')
    expect(tokens?.refreshToken).toBe(REFRESHED.refreshToken)
  })

  it('deduplicates concurrent 401s into a single refresh (token rotation safety)', async () => {
    loggedIn()
    let refreshCalls = 0
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, async () => {
        refreshCalls += 1
        await new Promise((r) => setTimeout(r, 25))
        return HttpResponse.json(REFRESHED)
      }),
    )

    const client = makeApiClient(BASE)
    const [a, b] = await Promise.all([client.v1.users.me.get(), client.v1.users.me.get()])

    expect(refreshCalls).toBe(1)
    expect(a.id).toBe(USER.id)
    expect(b.id).toBe(USER.id)
    expect(tokens?.jwt).toBe('fresh-jwt')
  })

  it('keeps the session when the refresh endpoint fails transiently (5xx)', async () => {
    loggedIn()
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, () =>
        HttpResponse.json(
          { type: 'about:blank', status: 502, title: 'Upstream unavailable' },
          { status: 502 },
        ),
      ),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    expect(tokens?.refreshToken).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('keeps the session when the refresh request fails at the network level', async () => {
    loggedIn()
    server.use(
      usersMe401Until('fresh-jwt'),
      http.post(`${BASE}/v1/auth/refresh-token`, () => HttpResponse.error()),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    expect(tokens?.refreshToken).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('logs out when the refresh call itself is rejected', async () => {
    loggedIn()
    server.use(
      http.get(`${BASE}/v1/users/me`, reject401),
      http.post(`${BASE}/v1/auth/refresh-token`, reject401),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    expect(tokens).toBeNull()
  })

  it('keeps the session when the refresh succeeds but the retried request is still 401', async () => {
    loggedIn()
    server.use(
      http.get(`${BASE}/v1/users/me`, reject401),
      http.post(`${BASE}/v1/auth/refresh-token`, () => HttpResponse.json(REFRESHED)),
    )

    await expect(makeApiClient(BASE).v1.users.me.get()).rejects.toThrow()
    // A fresh JWT refused by one route is a per-resource failure, not an expired session.
    expect(tokens?.jwt).toBe('fresh-jwt')
    expect(tokens?.refreshToken).toBe(REFRESHED.refreshToken)
  })

  it('sends no bearer header when logged out', async () => {
    let sawAuthHeader: string | null = 'unset'
    server.use(
      http.get(`${BASE}/v1/users/me`, ({ request }) => {
        sawAuthHeader = request.headers.get('authorization')
        return HttpResponse.json(USER)
      }),
    )

    const user = await makeApiClient(BASE).v1.users.me.get()

    expect(user.id).toBe(USER.id)
    expect(sawAuthHeader).toBeNull()
  })
})
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test -- test/api`
Expected: PASS, 7 tests. The implementation is copied, so they pass on first run; their job is to prove the copy behaves identically on this runtime.

- [ ] **Step 6: Typecheck, lint, commit**

```bash
pnpm run typecheck && pnpm run lint && pnpm run format
git add scripts src/contracts src/env.ts src/api test/api
git commit -m "Vendor the backend oRPC contract and port the API core"
```

---

### Task 3: Token store on expo-secure-store, useAuth

**Files:**
- Create: `src/features/auth/tokenStore.ts`, `src/features/auth/useAuth.ts`
- Modify: `test/setup.ts` (secure-store mock, reset), `test/api/authFetch.test.ts` (use the real store)
- Test: `test/features/auth/tokenStore.test.ts`

**Interfaces:**
- Consumes: `setTokenProvider` from `src/api/authFetch.ts`.
- Produces: `tokenStore = { get(): Tokens | null; set(t: Tokens | null): void; subscribe(l: () => void): () => void; hydrate(): Promise<void>; isHydrated(): boolean; flush(): Promise<void> }`; `type Tokens = { jwt: string; refreshToken: string; email: string }`; `registerAuthTokenProvider(): void`; `useAuth(): { tokens: Tokens | null; isHydrated: boolean; logout: () => void }`; test helper `secureStoreMock: Map<string, string>`.

- [ ] **Step 1: Install and mock expo-secure-store**

```bash
pnpm expo install expo-secure-store
```

Add to `test/setup.ts` above the MSW hooks:

```ts
// In-memory stand-in for the keychain. The state lives INSIDE the factory:
// jest hoists jest.mock() above the imports, so a module-level Map referenced
// from the factory would still be in its temporal dead zone when the first
// import (tokenStore → expo-secure-store) evaluates the mock. Only `mock`-prefixed
// variables may be captured, and even those must be initialised lazily.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>()
  return {
    __store: store,
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
  }
})
export const secureStoreMock = (
  jest.requireMock('expo-secure-store') as { __store: Map<string, string> }
).__store
```

and in `afterEach`, after `server.resetHandlers()`: `secureStoreMock.clear()`.

- [ ] **Step 2: Write the failing tests**

`test/features/auth/tokenStore.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store'
import { tokenStore, type Tokens } from '@/features/auth/tokenStore'
import { secureStoreMock } from '../../setup'

const KEY = 'madrileno.tokens'
const tokens: Tokens = { jwt: 'jwt-1', refreshToken: 'rt-1', email: 'a@example.com' }

describe('tokenStore', () => {
  beforeEach(async () => {
    tokenStore.set(null)
    await tokenStore.flush()
    jest.mocked(SecureStore.getItemAsync).mockClear()
    jest.mocked(SecureStore.setItemAsync).mockClear()
  })

  it('hydrates once from the secure store', async () => {
    secureStoreMock.set(KEY, JSON.stringify(tokens))
    await tokenStore.hydrate()
    expect(tokenStore.get()).toEqual(tokens)
    expect(tokenStore.isHydrated()).toBe(true)
  })

  it('treats a persisted value with the wrong shape as logged out', async () => {
    secureStoreMock.set(KEY, JSON.stringify({ token: 'legacy' }))
    await tokenStore.hydrate()
    expect(tokenStore.get()).toBeNull()
    secureStoreMock.set(KEY, 'not even json')
    await tokenStore.hydrate()
    expect(tokenStore.get()).toBeNull()
  })

  it('writes through to the secure store and clears it on logout', async () => {
    tokenStore.set(tokens)
    await tokenStore.flush()
    expect(secureStoreMock.get(KEY)).toBe(JSON.stringify(tokens))
    tokenStore.set(null)
    await tokenStore.flush()
    expect(secureStoreMock.has(KEY)).toBe(false)
  })

  it('serializes writes so a fast rotation followed by logout lands in order', async () => {
    const calls: string[] = []
    const slowSet = async (_k: string, v: string) => {
      await new Promise((r) => setTimeout(r, 10))
      calls.push(`set:${v}`)
    }
    // One-shot implementations: a persistent override would leak into later tests.
    jest.mocked(SecureStore.setItemAsync).mockImplementationOnce(slowSet).mockImplementationOnce(slowSet)
    jest.mocked(SecureStore.deleteItemAsync).mockImplementationOnce(async () => {
      calls.push('delete')
    })
    tokenStore.set(tokens)
    tokenStore.set({ ...tokens, jwt: 'jwt-2' })
    tokenStore.set(null)
    await tokenStore.flush()
    expect(calls).toEqual([
      `set:${JSON.stringify(tokens)}`,
      `set:${JSON.stringify({ ...tokens, jwt: 'jwt-2' })}`,
      'delete',
    ])
  })

  it('never reads the secure store again after hydration', async () => {
    secureStoreMock.set(KEY, JSON.stringify(tokens))
    await tokenStore.hydrate()
    const readsAfterHydrate = jest.mocked(SecureStore.getItemAsync).mock.calls.length
    tokenStore.set({ ...tokens, jwt: 'jwt-2' })
    await tokenStore.flush()
    tokenStore.get()
    expect(jest.mocked(SecureStore.getItemAsync).mock.calls.length).toBe(readsAfterHydrate)
  })

  it('treats a failed keychain read as logged out and still reports hydrated', async () => {
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('keychain locked'))
    await tokenStore.hydrate()
    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.isHydrated()).toBe(true)
  })

  it('notifies subscribers on every change', () => {
    const seen: (string | null)[] = []
    const unsubscribe = tokenStore.subscribe(() => seen.push(tokenStore.get()?.jwt ?? null))
    tokenStore.set(tokens)
    tokenStore.set(null)
    unsubscribe()
    tokenStore.set(tokens)
    expect(seen).toEqual(['jwt-1', null])
  })
})
```

- [ ] **Step 3: Run to verify they fail**

Run: `pnpm test -- test/features/auth`
Expected: FAIL, `Cannot find module '@/features/auth/tokenStore'`.

- [ ] **Step 4: Implement**

`src/features/auth/tokenStore.ts`:

```ts
import * as SecureStore from 'expo-secure-store'
import { z } from 'zod'
import { setTokenProvider } from '@/api/authFetch'

const STORAGE_KEY = 'madrileno.tokens'

// Validate what comes back out of the keychain: an older format must read as
// logged-out, not as a session with undefined fields.
const tokensSchema = z.object({
  jwt: z.string(),
  refreshToken: z.string(),
  email: z.string(),
})

export type Tokens = z.infer<typeof tokensSchema>

type Listener = () => void

// The in-memory mirror is authoritative once hydrated. This is a single
// process and nothing else writes the keychain entry, so it is never re-read:
// an async read racing a rotation could restore a spent single-use refresh
// token (see the spec, "tokenStore").
let current: Tokens | null = null
let hydrated = false
let pending: Promise<void> = Promise.resolve()
const listeners = new Set<Listener>()

function parse(raw: string | null): Tokens | null {
  if (raw === null) return null
  try {
    const parsed = tokensSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

function persist(tokens: Tokens | null): Promise<void> {
  return tokens !== null
    ? SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(tokens))
    : SecureStore.deleteItemAsync(STORAGE_KEY)
}

// Arrow properties: useSyncExternalStore calls them detached from the object.
export const tokenStore = {
  get: (): Tokens | null => current,
  isHydrated: (): boolean => hydrated,
  hydrate: async (): Promise<void> => {
    try {
      current = parse(await SecureStore.getItemAsync(STORAGE_KEY))
    } catch {
      // A locked or corrupt keychain must not strand the app behind a null
      // layout: start logged out and let the user log in again.
      current = null
    }
    hydrated = true
    listeners.forEach((listener) => listener())
  },
  set: (tokens: Tokens | null): void => {
    current = tokens
    // Chain writes so two rapid rotations cannot land out of order.
    pending = pending.then(() => persist(tokens)).catch(() => undefined)
    listeners.forEach((listener) => listener())
  },
  flush: (): Promise<void> => pending,
  subscribe: (listener: Listener): (() => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function registerAuthTokenProvider(): void {
  setTokenProvider({
    jwt: () => tokenStore.get()?.jwt,
    refreshToken: () => tokenStore.get()?.refreshToken,
    rotated: (jwt, refreshToken) => {
      const tokens = tokenStore.get()
      if (tokens !== null) tokenStore.set({ ...tokens, jwt, refreshToken })
    },
    invalidated: () => {
      tokenStore.set(null)
    },
  })
}
```

`src/features/auth/useAuth.ts`:

```ts
import { useCallback, useSyncExternalStore } from 'react'
import { tokenStore, type Tokens } from './tokenStore'

export function useAuth(): { tokens: Tokens | null; isHydrated: boolean; logout: () => void } {
  const tokens = useSyncExternalStore(tokenStore.subscribe, tokenStore.get)
  const isHydrated = useSyncExternalStore(tokenStore.subscribe, tokenStore.isHydrated)
  const logout = useCallback(() => {
    tokenStore.set(null)
  }, [])
  return { tokens, isHydrated, logout }
}
```

- [ ] **Step 5: Run the tests**

Run: `pnpm test -- test/features/auth`
Expected: PASS, 7 tests.

- [ ] **Step 6: Switch the auth-fetch test to the real store**

In `test/api/authFetch.test.ts`: delete the `Tokens` interface, the `tokens` variable, the `beforeAll` and `beforeEach` blocks; add

```ts
import { registerAuthTokenProvider, tokenStore } from '@/features/auth/tokenStore'

beforeAll(() => {
  registerAuthTokenProvider()
})

function loggedIn() {
  tokenStore.set({
    jwt: 'stale-jwt',
    refreshToken: '11111111-1111-4111-8111-111111111111',
    email: 'test@example.com',
  })
}
```

Replace every `tokens?.` with `tokenStore.get()?.` and `expect(tokens).toBeNull()` with `expect(tokenStore.get()).toBeNull()`. Remove the now-unused `setTokenProvider` import. Add `tokenStore.set(null)` to `afterEach` in `test/setup.ts` (import from `@/features/auth/tokenStore`).

Run: `pnpm test`
Expected: PASS, all suites.

- [ ] **Step 7: Commit**

```bash
pnpm run typecheck && pnpm run lint && pnpm run format
git add src/features/auth test
git commit -m "Token store on expo-secure-store with an authoritative in-memory mirror"
```

---

### Task 4: NativeWind, react-native-reusables, theme, shell components

**Files:**
- Create: `global.css`, `tailwind.config.js`, `nativewind-env.d.ts`, `components.json`, `src/lib/utils.ts`, `src/components/ui/*.tsx` (vendored), `src/components/Screen.tsx`, `src/components/Field.tsx`, `src/components/EmptyState.tsx`, `src/components/ErrorState.tsx`, `src/theme/preferences.ts`, `src/theme/useThemePreference.ts`, `src/theme/ThemeProvider.tsx`
- Modify: `metro.config.js`, `babel.config.js`, `app/_layout.tsx`, `app/index.tsx`, `package.json`
- Test: `test/theme/preferences.test.ts`, `test/components/Field.test.tsx`

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`; `Screen({ children, scroll?, form?, className? })`; `Field({ invalid?, className?, children })` (provides validity through context), `FieldLabel({ children })`, `FieldError({ children })`, `FieldInput(props of Input)` (an `Input` that reads the Field's validity and sets `accessibilityState.invalid`), `useFieldInvalid(): boolean`; `EmptyState({ title, body? })` (testID `empty-state`); `ErrorState({ message, onRetry? })` (testID `error-state`, uses `error.retry`); `type ThemePreference = 'light' | 'dark' | 'system'`; `readThemePreference(): ThemePreference`; `writeThemePreference(p): void`; `useThemePreference(): { preference, setPreference, resolved: 'light' | 'dark' }`; `ThemeProvider({ children })`.

- [ ] **Step 1: Install NativeWind and reusables**

```bash
pnpm add nativewind@4.2.7 tailwindcss@3.4.19 tailwindcss-animate class-variance-authority clsx tailwind-merge @rn-primitives/portal @rn-primitives/slot @rn-primitives/dialog @rn-primitives/label lucide-react-native react-native-mmkv react-native-nitro-modules
pnpm expo install react-native-reanimated react-native-gesture-handler react-native-worklets react-native-svg
pnpm exec expo install --fix
pnpm ls react-native-css-interop
```

Pin `nativewind`, `react-native-reanimated` and `react-native-css-interop` (add it explicitly at the version `pnpm ls` printed) exactly in `package.json`: no `^`.

- [ ] **Step 2: Wire NativeWind into Babel and Metro**

`babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-worklets/plugin'],
  }
}
```

`metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 })
```

`nativewind-env.d.ts` (repo root):

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 3: Tokens — the web palette in HSL**

The web's `--primary: oklch(0.4 0.11 12)` is burgundy `#772938` → `hsl(349 49% 31%)`; its dark counterpart `oklch(0.72 0.09 12)` → `hsl(350 42% 70%)`. Neutrals are shadcn's defaults.

`global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 349 49% 31%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 349 49% 31%;
    --radius: 0.625rem;
  }

  .dark:root {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 9%;
    --popover-foreground: 0 0% 98%;
    --primary: 350 42% 70%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 70.9% 59.4%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 350 42% 70%;
  }
}
```

`tailwind.config.js`:

```js
const { hairlineWidth } = require('nativewind/theme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: { DEFAULT: 'hsl(var(--destructive))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      borderWidth: { hairline: hairlineWidth() },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

`src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Vendor the primitives**

`components.json` (tells the CLI where to write):

```json
{
  "$schema": "https://reactnativereusables.com/schema.json",
  "platforms": ["native"],
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "utils": "@/lib/utils"
  },
  "tsx": true
}
```

```bash
pnpm dlx @react-native-reusables/cli@0.7.1 add text button input card badge separator skeleton dialog icon label --yes --styling-library nativewind
ls src/components/ui
```

Expected: `badge.tsx button.tsx card.tsx dialog.tsx icon.tsx input.tsx label.tsx native-only-animated-view.tsx separator.tsx skeleton.tsx text.tsx`. If the CLI writes to `components/ui` at the repo root, move the folder to `src/components/ui` and fix the imports inside to `@/components/ui/...` and `@/lib/utils`. Accept any dependency installs the CLI proposes, then `pnpm exec expo install --fix` again.

- [ ] **Step 5: Theme preference store — failing test first**

`test/theme/preferences.test.ts`:

```ts
import { readThemePreference, writeThemePreference } from '@/theme/preferences'

describe('theme preference', () => {
  it('defaults to system', () => {
    expect(readThemePreference()).toBe('system')
  })

  it('round-trips a written preference', () => {
    writeThemePreference('dark')
    expect(readThemePreference()).toBe('dark')
    writeThemePreference('system')
    expect(readThemePreference()).toBe('system')
  })
})
```

Run: `pnpm test -- test/theme` → FAIL, module not found.

`src/theme/preferences.ts`:

```ts
import { createMMKV } from 'react-native-mmkv'
import { z } from 'zod'

const storage = createMMKV({ id: 'madrileno.preferences' })
const KEY = 'theme'

const preferenceSchema = z.enum(['light', 'dark', 'system'])
export type ThemePreference = z.infer<typeof preferenceSchema>

export function readThemePreference(): ThemePreference {
  const parsed = preferenceSchema.safeParse(storage.getString(KEY))
  return parsed.success ? parsed.data : 'system'
}

export function writeThemePreference(preference: ThemePreference): void {
  storage.set(KEY, preference)
}
```

Run: `pnpm test -- test/theme` → PASS (react-native-mmkv 4 ships an automatic Jest mock). If `createMMKV` throws under Jest, add to `test/setup.ts`:

```ts
jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>()
  return {
    createMMKV: () => ({
      getString: (k: string) => store.get(k),
      set: (k: string, v: string) => store.set(k, v),
      remove: (k: string) => store.delete(k),
    }),
  }
})
```

- [ ] **Step 6: Theme hook and provider**

`src/theme/useThemePreference.ts`:

```ts
import { useColorScheme } from 'nativewind'
import { useCallback, useEffect, useState } from 'react'
import { Appearance } from 'react-native'
import { readThemePreference, writeThemePreference, type ThemePreference } from './preferences'

export function useThemePreference(): {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
  resolved: 'light' | 'dark'
} {
  const { colorScheme, setColorScheme } = useColorScheme()
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference)

  useEffect(() => {
    setColorScheme(preference)
  }, [preference, setColorScheme])

  const setPreference = useCallback((p: ThemePreference) => {
    writeThemePreference(p)
    setPreferenceState(p)
  }, [])

  const resolved: 'light' | 'dark' =
    colorScheme ?? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light')
  return { preference, setPreference, resolved }
}
```

`src/theme/ThemeProvider.tsx`:

```tsx
import { StatusBar } from 'expo-status-bar'
import type { ReactNode } from 'react'
import { View } from 'react-native'
import { useThemePreference } from './useThemePreference'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { resolved } = useThemePreference()
  return (
    <View className="flex-1 bg-background">
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  )
}
```

- [ ] **Step 7: Shell components — failing Field test first**

The `Screen` wrapper reads safe-area insets and the hook throws without a provider, so mock the library in `test/setup.ts` with the mock it ships:

```ts
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock'),
)
```

`test/components/Field.test.tsx` — tests the real composition (a react-hook-form `Controller` between `Field` and the input), because that is how every form in the app uses it:

```tsx
import { render, screen } from '@testing-library/react-native'
import { Controller, useForm } from 'react-hook-form'
import { Field, FieldError, FieldInput, FieldLabel } from '@/components/Field'

function EmailField({ invalid }: { invalid: boolean }) {
  const { control } = useForm<{ email: string }>({ defaultValues: { email: '' } })
  return (
    <Field invalid={invalid}>
      <FieldLabel>Email</FieldLabel>
      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <FieldInput testID="email" value={field.value} onChangeText={field.onChange} />
        )}
      />
      {invalid && <FieldError>Required</FieldError>}
    </Field>
  )
}

describe('Field', () => {
  it('marks the control invalid through the Controller and shows the error', async () => {
    await render(<EmailField invalid />)
    expect(screen.getByText('Email')).toBeTruthy()
    expect(screen.getByText('Required')).toBeTruthy()
    expect(screen.getByTestId('email').props.accessibilityState).toEqual({ invalid: true })
  })

  it('marks the control valid and renders no error slot', async () => {
    await render(<EmailField invalid={false} />)
    expect(screen.getByTestId('email').props.accessibilityState).toEqual({ invalid: false })
    expect(screen.queryByTestId('field-error')).toBeNull()
  })
})
```

(RNTL 14: `render` and every `fireEvent` call return promises and must be awaited. Every test in this plan does so.)

Run: `pnpm test -- test/components` → FAIL, module not found.

`src/components/Field.tsx` — validity travels by context, not by cloning: the immediate child is usually a `Controller`, which would swallow a cloned prop instead of forwarding it to the input.

```tsx
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import { View } from 'react-native'
import { Input } from '@/components/ui/input'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

const FieldContext = createContext<{ invalid: boolean }>({ invalid: false })

interface FieldProps {
  invalid?: boolean
  className?: string
  children: ReactNode
}

export function Field({ invalid = false, className, children }: FieldProps) {
  return (
    <FieldContext.Provider value={{ invalid }}>
      <View className={cn('gap-1.5', className)}>{children}</View>
    </FieldContext.Provider>
  )
}

export function useFieldInvalid(): boolean {
  return useContext(FieldContext).invalid
}

export function FieldInput(props: ComponentProps<typeof Input>) {
  const invalid = useFieldInvalid()
  return <Input {...props} accessibilityState={{ ...props.accessibilityState, invalid }} />
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text variant="small">{children}</Text>
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <Text testID="field-error" className="text-destructive text-sm">
      {children}
    </Text>
  )
}
```

`src/components/Screen.tsx`:

```tsx
import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { cn } from '@/lib/utils'

interface ScreenProps {
  children: ReactNode
  scroll?: boolean
  form?: boolean
  className?: string
}

// Safe-area aware screen body. The Stack header owns the top inset; this pads
// bottom and sides. `form` adds keyboard avoidance for screens with inputs.
export function Screen({ children, scroll = false, form = false, className }: ScreenProps) {
  const insets = useSafeAreaInsets()
  const padding = {
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  }
  const body = scroll ? (
    <ScrollView
      contentContainerClassName={cn('p-4 gap-4', className)}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1 p-4 gap-4', className)}>{children}</View>
  )
  const inner = form ? (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  )
  return (
    <View className="flex-1 bg-background" style={padding}>
      {inner}
    </View>
  )
}
```

`src/components/EmptyState.tsx`:

```tsx
import { View } from 'react-native'
import { Text } from '@/components/ui/text'

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="items-center gap-2 py-16" testID="empty-state">
      <Text variant="large">{title}</Text>
      {body !== undefined && (
        <Text variant="muted" className="text-center">
          {body}
        </Text>
      )}
    </View>
  )
}
```

`src/components/ErrorState.tsx` (`error.retry` lands in `en.json` in Task 5; nothing renders this until then):

```tsx
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useTranslations('error')
  return (
    <View className="items-center gap-3 py-16" testID="error-state">
      <Text className="text-destructive text-center">{message}</Text>
      {onRetry !== undefined && (
        <Button variant="outline" onPress={onRetry}>
          <Text>{t('retry')}</Text>
        </Button>
      )}
    </View>
  )
}
```

Run: `pnpm test -- test/components` → PASS.

- [ ] **Step 8: Root layout with providers**

`app/_layout.tsx`:

```tsx
import '../global.css'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ThemeProvider } from '@/theme/ThemeProvider'

const queryClient = new QueryClient()

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Stack screenOptions={{ headerLargeTitle: true }} />
          <PortalHost />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
```

`app/index.tsx`:

```tsx
import { Screen } from '@/components/Screen'
import { Text } from '@/components/ui/text'

export default function Index() {
  return (
    <Screen className="items-center justify-center">
      <Text variant="h3">madrileno-mobile</Text>
    </Screen>
  )
}
```

- [ ] **Step 9: Run on the emulator, commit**

```bash
pnpm run android
adb exec-out screencap -p > /tmp/claude-1000/-home-luksow-iterators-madrileno/6920e7af-2dbf-4a38-9541-0c0eaa0ba98a/scratchpad/theme-light.png
```

Expected: the heading renders in the foreground color on white; switching the emulator to dark mode (Settings → Display → Dark theme) flips both. Look at the screenshot.

```bash
pnpm run typecheck && pnpm run lint && pnpm run format && pnpm test
git add -A -- . ':!docs'
git commit -m "NativeWind, react-native-reusables primitives, theme tokens and shell components"
```

---

### Task 5: i18n, login screen, auth gate, route groups

**Files:**
- Create: `src/i18n/messages/en.json`, `src/i18n/config.ts`, `src/i18n/use-intl.d.ts`, `src/i18n/LocaleProvider.tsx`, `src/features/auth/returnTo.ts`, `src/features/auth/screens/LoginScreen.tsx`, `src/features/home/screens/HomeScreen.tsx`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(app)/_layout.tsx`, `app/(app)/index.tsx`, `app/+not-found.tsx`, `test/renderApp.tsx`
- Modify: `app/_layout.tsx`, `test/setup.ts`; delete `app/index.tsx`
- Test: `test/features/auth/returnTo.test.ts`, `test/features/auth/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: `tokenStore`, `useAuth`, `registerAuthTokenProvider`, `client`, `problemFrom`, `Field`/`FieldLabel`/`FieldError`, `Screen`.
- Produces: `messages` (typed `en.json`); `LocaleProvider`; `setReturnTo(href: string): void`, `consumeReturnTo(): string | null`; `LoginScreen` (testIDs `login-email`, `login-submit`); `HomeScreen`; test helpers `renderWithProviders(ui: ReactElement)` and `mockRouter = { push, replace, back }`.

- [ ] **Step 1: Messages and provider**

`src/i18n/messages/en.json`:

```json
{
  "nav": {
    "logOut": "Log out",
    "logIn": "Log in",
    "settings": "Settings",
    "home": "Home"
  },
  "theme": {
    "heading": "Appearance",
    "light": "Light",
    "dark": "Dark",
    "system": "System"
  },
  "login": {
    "heading": "Log in",
    "hint": "Dev login: any email works when the backend runs with DEV_AUTH_ENABLED=true.",
    "emailLabel": "Email",
    "emailInvalid": "Enter a valid email address",
    "submit": "Log in",
    "submitting": "Logging in…",
    "failed": "Login failed — is the backend up?"
  },
  "home": {
    "heading": "It works",
    "body": "This is the post-init shell: typed API client, auth, routing, tests, OTA updates. Add your first feature under src/features/ and route it from app/(app)/."
  },
  "settings": {
    "signedInAs": "Signed in as {email}",
    "version": "Version {version} · update {updateId}",
    "noUpdate": "embedded"
  },
  "notFound": {
    "title": "Not found",
    "heading": "Screen not found",
    "link": "Back to the start"
  },
  "error": {
    "heading": "Something went wrong",
    "retry": "Try again",
    "sessionExpired": "Your session expired — log in again."
  },
  "updates": {
    "available": "A new version is available.",
    "update": "Update",
    "failed": "Couldn’t download the update.",
    "retry": "Try again"
  },
  "auction": {
    "listTitle": "Auctions",
    "errorList": "Couldn’t load auctions — is the backend up?",
    "staleBanner": "Showing cached auctions — couldn’t refresh.",
    "empty": "No auctions yet",
    "emptyBody": "Log in and create one via the API.",
    "ends": "ends {when}",
    "statusOpen": "Open",
    "statusClosed": "Closed",
    "statusCancelled": "Cancelled",
    "startedAt": "started at {price}",
    "detailError": "Couldn’t load this auction — does it exist?",
    "bidAmountLabel": "Your bid ({currency})",
    "bidAmountPositive": "Bid must be a positive amount",
    "bidOpen": "Place bid",
    "bidDialogTitle": "Place a bid",
    "bidDialogBody": "Current price {price}. Enter a higher amount.",
    "bidPlace": "Place bid",
    "bidPlacing": "Placing…",
    "bidCancel": "Cancel",
    "bidPlaced": "Bid placed.",
    "bidFailed": "Couldn’t place the bid — try again.",
    "bidHistory": "Bid history",
    "bidNone": "No bids yet — be the first.",
    "bidError": "Couldn’t load the bid history.",
    "bidLoadMore": "Load more bids",
    "bidLoadingMore": "Loading…",
    "bidBy": "by {bidder} · {when}",
    "rejectBidTooLow": "Bid too low — someone got there first. The current price has moved.",
    "rejectAlreadyHighest": "You already hold the highest bid.",
    "rejectOwnAuction": "You can’t bid on your own auction.",
    "rejectNotOpen": "This auction is no longer open for bids.",
    "rejectAuthExpired": "Your session expired — log in again to bid."
  }
}
```

```bash
cp ../madrileno-frontend/src/i18n/config.ts src/i18n/config.ts
cp ../madrileno-frontend/src/i18n/use-intl.d.ts src/i18n/use-intl.d.ts
```

`src/i18n/LocaleProvider.tsx` (the web passes `timeZone="UTC"` for SSR; the device timezone is right here):

```tsx
import { type ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { messages } from './config'

export function LocaleProvider({ children }: { children: ReactNode }) {
  return (
    <IntlProvider locale="en" messages={messages}>
      {children}
    </IntlProvider>
  )
}
```

- [ ] **Step 2: Test helpers**

`test/renderApp.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react-native'
import type { ReactElement } from 'react'
import { LocaleProvider } from '@/i18n/LocaleProvider'

export function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>{ui}</LocaleProvider>
    </QueryClientProvider>,
  )
}
```

Add an `expo-router` mock to `test/setup.ts` so screens can call `useRouter` without a navigator. The variable is `mock`-prefixed because jest's hoisting plugin only lets a factory capture variables with that prefix:

```ts
export const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() }
jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react')
  return {
    useRouter: () => mockRouter,
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    Link: ({ children }: { children: React.ReactNode }) => children,
    Redirect: () => null,
    Stack: Object.assign(() => null, { Screen: () => null }),
  }
})
```

and in `afterEach`: `mockRouter.push.mockClear(); mockRouter.replace.mockClear(); mockRouter.back.mockClear()`.

- [ ] **Step 3: returnTo — failing test first**

`test/features/auth/returnTo.test.ts`:

```ts
import { consumeReturnTo, setReturnTo } from '@/features/auth/returnTo'

describe('returnTo', () => {
  it('hands back the stored href exactly once', () => {
    setReturnTo('/auctions/abc')
    expect(consumeReturnTo()).toBe('/auctions/abc')
    expect(consumeReturnTo()).toBeNull()
  })

  it('never stores the login route itself', () => {
    setReturnTo('/login')
    expect(consumeReturnTo()).toBeNull()
  })
})
```

Run: `pnpm test -- returnTo` → FAIL, module not found.

`src/features/auth/returnTo.ts`:

```ts
// Where to go after login when a deep link hit an authed route cold. Kept in
// memory only: it must not survive a restart.
let href: string | null = null

export function setReturnTo(next: string): void {
  if (next === '/login' || next.startsWith('/login?')) return
  href = next
}

export function consumeReturnTo(): string | null {
  const next = href
  href = null
  return next
}
```

Run: `pnpm test -- returnTo` → PASS.

- [ ] **Step 4: Login screen — failing test first**

`test/features/auth/LoginScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import { setReturnTo } from '@/features/auth/returnTo'
import { LoginScreen } from '@/features/auth/screens/LoginScreen'
import { tokenStore } from '@/features/auth/tokenStore'
import { server } from '../../mswServer'
import { renderWithProviders } from '../../renderApp'
import { mockRouter } from '../../setup'

const BASE = 'http://10.0.2.2:9000'

async function submit(email: string) {
  await fireEvent.changeText(screen.getByTestId('login-email'), email)
  await fireEvent.press(screen.getByTestId('login-submit'))
}

describe('LoginScreen', () => {
  it('validates the email before calling the API', async () => {
    await renderWithProviders(<LoginScreen />)
    await submit('nope')
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy()
  })

  it('stores tokens and replaces the route on success', async () => {
    server.use(
      http.post(`${BASE}/v1/auth/dev`, () =>
        HttpResponse.json({ jwt: 'j', refreshToken: 'r', userCreated: true }),
      ),
    )
    await renderWithProviders(<LoginScreen />)
    await submit('a@example.com')
    await waitFor(() => expect(tokenStore.get()?.jwt).toBe('j'))
    expect(tokenStore.get()?.email).toBe('a@example.com')
    expect(mockRouter.replace).toHaveBeenCalledWith('/')
  })

  it('continues to the deep-linked screen after login', async () => {
    setReturnTo('/auctions/abc')
    server.use(
      http.post(`${BASE}/v1/auth/dev`, () =>
        HttpResponse.json({ jwt: 'j', refreshToken: 'r', userCreated: false }),
      ),
    )
    await renderWithProviders(<LoginScreen />)
    await submit('a@example.com')
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/auctions/abc'))
  })

  it('shows the Problem title when the backend rejects', async () => {
    server.use(
      http.post(`${BASE}/v1/auth/dev`, () =>
        HttpResponse.json(
          { type: 'rejection:dev-auth-disabled', status: 403, title: 'Dev auth is off' },
          { status: 403 },
        ),
      ),
    )
    await renderWithProviders(<LoginScreen />)
    await submit('a@example.com')
    expect(await screen.findByText('Dev auth is off')).toBeTruthy()
    expect(tokenStore.get()).toBeNull()
  })
})
```

Run: `pnpm test -- LoginScreen` → FAIL, module not found.

`src/features/auth/screens/LoginScreen.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { z } from 'zod'
import { client } from '@/api/orpc'
import { problemFrom, type Problem } from '@/api/problem'
import { Field, FieldError, FieldInput, FieldLabel } from '@/components/Field'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { consumeReturnTo } from '@/features/auth/returnTo'
import { tokenStore } from '@/features/auth/tokenStore'

interface LoginForm {
  email: string
}

export function LoginScreen() {
  const t = useTranslations('login')
  const router = useRouter()
  const [problem, setProblem] = useState<Problem | null>(null)
  const loginSchema = z.object({ email: z.string().email(t('emailInvalid')) })
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '' } })

  const onSubmit = handleSubmit(async ({ email }) => {
    setProblem(null)
    try {
      const res = await client.v1.auth.dev.post({ body: { email } })
      tokenStore.set({ jwt: res.jwt, refreshToken: res.refreshToken, email })
      router.replace(consumeReturnTo() ?? '/')
    } catch (error) {
      setProblem(problemFrom(error) ?? { type: 'unknown', status: 0, title: t('failed') })
    }
  })

  return (
    <Screen form className="justify-center">
      <View className="gap-2">
        <Text variant="h3">{t('heading')}</Text>
        <Text variant="muted">{t('hint')}</Text>
      </View>
      <Field invalid={errors.email !== undefined}>
        <FieldLabel>{t('emailLabel')}</FieldLabel>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <FieldInput
              testID="login-email"
              accessibilityLabel={t('emailLabel')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={() => void onSubmit()}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.email && <FieldError>{errors.email.message}</FieldError>}
      </Field>
      {problem !== null && <Text className="text-destructive">{problem.title}</Text>}
      <Button testID="login-submit" onPress={() => void onSubmit()} disabled={isSubmitting}>
        <Text>{isSubmitting ? t('submitting') : t('submit')}</Text>
      </Button>
    </Screen>
  )
}
```

Run: `pnpm test -- LoginScreen` → PASS, 4 tests.

- [ ] **Step 5: Home screen and route groups**

`src/features/home/screens/HomeScreen.tsx`:

```tsx
import { Link } from 'expo-router'
import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/ui/text'

export function HomeScreen() {
  const t = useTranslations('home')
  const tNav = useTranslations('nav')
  return (
    <Screen scroll>
      <Text variant="h3">{t('heading')}</Text>
      <Text variant="muted">{t('body')}</Text>
      <Link href="/settings" className="text-primary">
        {tNav('settings')}
      </Link>
    </Screen>
  )
}
```

`app/(auth)/_layout.tsx`:

```tsx
import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@/features/auth/useAuth'

export default function AuthLayout() {
  const { tokens, isHydrated } = useAuth()
  if (isHydrated && tokens !== null) return <Redirect href="/" />
  return <Stack screenOptions={{ headerShown: false }} />
}
```

`app/(auth)/login.tsx`:

```tsx
export { LoginScreen as default } from '@/features/auth/screens/LoginScreen'
```

`app/(app)/_layout.tsx` (this exact shape is what Task 6 extends and `init-project` rewrites; keep the line `const tNav = useTranslations('nav')` on its own):

```tsx
import { Redirect, Stack, usePathname } from 'expo-router'
import { useTranslations } from 'use-intl'
import { setReturnTo } from '@/features/auth/returnTo'
import { useAuth } from '@/features/auth/useAuth'

export default function AppLayout() {
  const { tokens, isHydrated } = useAuth()
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  const indexTitle = tNav('home')
  if (!isHydrated) return null
  if (tokens === null) {
    setReturnTo(pathname)
    return <Redirect href="/login" />
  }
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: indexTitle }} />
      <Stack.Screen name="settings" options={{ title: tNav('settings') }} />
    </Stack>
  )
}
```

`app/(app)/index.tsx` (Task 6 swaps in the demo; `init-project` restores this):

```tsx
export { HomeScreen as default } from '@/features/home/screens/HomeScreen'
```

`app/+not-found.tsx`:

```tsx
import { Link, Stack } from 'expo-router'
import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Text } from '@/components/ui/text'

export default function NotFound() {
  const t = useTranslations('notFound')
  return (
    <>
      <Stack.Screen options={{ title: t('title') }} />
      <Screen className="items-center justify-center">
        <Text variant="h3">{t('heading')}</Text>
        <Link href="/" className="text-primary">
          {t('link')}
        </Link>
      </Screen>
    </>
  )
}
```

Delete `app/index.tsx`.

- [ ] **Step 6: Root layout — hydration behind the splash, token provider, locale**

`app/_layout.tsx`:

```tsx
import '../global.css'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { registerAuthTokenProvider, tokenStore } from '@/features/auth/tokenStore'
import { LocaleProvider } from '@/i18n/LocaleProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'

void SplashScreen.preventAutoHideAsync()
registerAuthTokenProvider()

const queryClient = new QueryClient()

export default function RootLayout() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void tokenStore.hydrate().finally(() => {
      setReady(true)
      void SplashScreen.hideAsync()
    })
  }, [])

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <ThemeProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(app)" />
              <Stack.Screen name="(auth)" />
            </Stack>
            <PortalHost />
          </ThemeProvider>
        </LocaleProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
```

- [ ] **Step 7: Run on the emulator**

Backend: `cd ../madrileno && DEV_AUTH_ENABLED=true sbt "~reStart"` (see its README for the exact env). Then:

```bash
pnpm run android
```

Expected: cold start shows the login screen. Any email logs in and the home screen appears. Kill and relaunch: home appears directly. `adb shell am start -a android.intent.action.VIEW -d "madrileno://settings"` opens a not-found screen for now (Task 8 adds settings).

- [ ] **Step 8: Commit**

```bash
pnpm run typecheck && pnpm run lint && pnpm run format && pnpm test
git add -A -- . ':!docs'
git commit -m "i18n, dev login screen, auth-gated route groups, hydration behind the splash"
```

---

### Task 6: Auction list screen

**Files:**
- Create: `src/features/auctions/queries.ts`, `src/features/auctions/format.ts`, `src/features/auctions/status.ts`, `src/features/auctions/screens/AuctionListScreen.tsx`, `src/features/auctions/screens/AuctionCard.tsx`, `test/features/auctions/mocks.ts`
- Modify: `app/(app)/index.tsx`, `app/(app)/_layout.tsx`, `test/setup.ts`
- Test: `test/features/auctions/AuctionListScreen.test.tsx`

**Interfaces:**
- Consumes: `orpc`, `ApiClient`, `useInstantFormatter`, `EmptyState`, `ErrorState`, `Screen`, `Card*`, `Badge`, `Text`, `Skeleton`.
- Produces: `useAuctionsInfinite()`, `useAuction(id)`, `useBids(id)`, `usePlaceBid(id)`, types `AuctionsPage`, `AuctionSummary`, `Auction`, `BidsPage`, `PAGE_SIZE`, `BIDS_PAGE_SIZE`; `usePriceFormatter()`, `useAuctionStatusLabel()`; `AuctionListScreen`; fixtures `BASE`, `AUCTION_ID`, `auctionFixture`, `auctionsPageFixture`, `bidsPageFixture(ids, hasMore, offset?)`, `bidTooLowProblem`, `listHandler`, `detailHandler`.

- [ ] **Step 1: Install FlashList and haptics; copy format and status; write queries**

```bash
pnpm expo install @shopify/flash-list expo-haptics
cp ../madrileno-frontend/src/features/auctions/format.ts src/features/auctions/format.ts
cp ../madrileno-frontend/src/features/auctions/status.ts src/features/auctions/status.ts
```

`src/features/auctions/queries.ts` (the web file minus the SSR prefetch helper):

```ts
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { orpc, type ApiClient } from '@/api/orpc'

export type AuctionsPage = Awaited<ReturnType<ApiClient['v1']['auctions']['get']>>
export type AuctionSummary = AuctionsPage['items'][number]
export type Auction = Awaited<ReturnType<ApiClient['v1']['auctions']['byAuctionId']['get']>>
export type BidsPage = Awaited<
  ReturnType<ApiClient['v1']['auctions']['byAuctionId']['bids']['get']>
>

export const PAGE_SIZE = 20
export const BIDS_PAGE_SIZE = 10

const auctionsRoute = orpc.v1.auctions
const auctionRoute = orpc.v1.auctions.byAuctionId
const bidsRoute = orpc.v1.auctions.byAuctionId.bids

// Offset-paged on the wire, infinite in the UI: the next offset is derived
// from the page just received, and the list fetches it on end-reached. The
// web's prev/next pager has no place on a phone.
export function useAuctionsInfinite() {
  return useInfiniteQuery(
    auctionsRoute.get.infiniteOptions({
      input: (pageParam: number) => ({ query: { limit: PAGE_SIZE, offset: pageParam } }),
      initialPageParam: 0,
      getNextPageParam: (last) => {
        const next = last.offset + last.items.length
        return next < last.total ? next : undefined
      },
    }),
  )
}

export function useAuction(auctionId: string) {
  return useQuery(auctionRoute.get.queryOptions({ input: { params: { auctionId } } }))
}

export function useBids(auctionId: string) {
  return useInfiniteQuery(
    bidsRoute.get.infiniteOptions({
      input: (pageParam: string | undefined) => ({
        params: { auctionId },
        query: { limit: BIDS_PAGE_SIZE, 'after-id': pageParam },
      }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.hasMore ? last.items.at(-1)?.id : undefined),
    }),
  )
}

export function usePlaceBid(auctionId: string) {
  const queryClient = useQueryClient()
  return useMutation(
    bidsRoute.post.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: auctionRoute.get.key({ input: { params: { auctionId } } }),
        })
        void queryClient.invalidateQueries({
          queryKey: bidsRoute.get.key({ input: { params: { auctionId } } }),
        })
      },
    }),
  )
}
```

- [ ] **Step 2: Fixtures**

```bash
cp ../madrileno-frontend/test/features/auctions/mocks.ts test/features/auctions/mocks.ts
```

Then in the copy: change `limit: 12` to `limit: 20`, and replace the last two exports with

```ts
export const BASE = 'http://10.0.2.2:9000'

export const listHandler = http.get(`${BASE}/v1/auctions`, () =>
  HttpResponse.json(auctionsPageFixture),
)

export const detailHandler = http.get(`${BASE}/v1/auctions/${AUCTION_ID}`, () =>
  HttpResponse.json(auctionFixture),
)
```

- [ ] **Step 3: Failing list-screen tests**

`test/features/auctions/AuctionListScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import { PAGE_SIZE } from '@/features/auctions/queries'
import { AuctionListScreen } from '@/features/auctions/screens/AuctionListScreen'
import { server } from '../../mswServer'
import { renderWithProviders } from '../../renderApp'
import { mockRouter } from '../../setup'
import { AUCTION_ID, BASE, auctionFixture, auctionsPageFixture, listHandler } from './mocks'

describe('AuctionListScreen', () => {
  it('renders auctions with price and status', async () => {
    server.use(listHandler)
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByText('Château Margaux 2015')).toBeTruthy()
    expect(screen.getByText('€150.00')).toBeTruthy()
    expect(screen.getByText('Open')).toBeTruthy()
  })

  it('navigates to the detail on tap', async () => {
    server.use(listHandler)
    await renderWithProviders(<AuctionListScreen />)
    await fireEvent.press(await screen.findByTestId(`auction-${AUCTION_ID}`))
    expect(mockRouter.push).toHaveBeenCalledWith(`/auctions/${AUCTION_ID}`)
  })

  it('fetches the next page when the end of the list is reached', async () => {
    const items = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({
      ...auctionFixture,
      id: `${AUCTION_ID.slice(0, -2)}${i.toString(16).padStart(2, '0')}`,
      wineName: `Wine ${String(i)}`,
    }))
    const requestedOffsets: number[] = []
    server.use(
      http.get(`${BASE}/v1/auctions`, ({ request }) => {
        const offset = Number(new URL(request.url).searchParams.get('offset') ?? '0')
        requestedOffsets.push(offset)
        return HttpResponse.json({
          items: items.slice(offset, offset + PAGE_SIZE),
          limit: PAGE_SIZE,
          offset,
          total: items.length,
        })
      }),
    )
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByText('Wine 0')).toBeTruthy()
    expect(requestedOffsets).toEqual([0])
    // Virtualised lists render a window, so assert on the request, not on item 21.
    await fireEvent(screen.getByTestId('auction-list'), 'onEndReached')
    await waitFor(() => expect(requestedOffsets).toEqual([0, PAGE_SIZE]))
  })

  it('shows the empty state', async () => {
    server.use(
      http.get(`${BASE}/v1/auctions`, () =>
        HttpResponse.json({ ...auctionsPageFixture, items: [], total: 0 }),
      ),
    )
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByTestId('empty-state')).toBeTruthy()
  })

  it('shows the error state with retry when the API fails', async () => {
    server.use(http.get(`${BASE}/v1/auctions`, () => HttpResponse.error()))
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByTestId('error-state')).toBeTruthy()
    expect(screen.getByText('Try again')).toBeTruthy()
  })
})
```

Run: `pnpm test -- AuctionListScreen` → FAIL, module not found.

- [ ] **Step 4: Implement**

`src/features/auctions/screens/AuctionCard.tsx`:

```tsx
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useInstantFormatter } from '@/api/datetime'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { type AuctionSummary } from '@/features/auctions/queries'
import { useAuctionStatusLabel } from '@/features/auctions/status'

export function AuctionCard({ auction }: { auction: AuctionSummary }) {
  const t = useTranslations('auction')
  const router = useRouter()
  const formatInstant = useInstantFormatter()
  const price = usePriceFormatter()
  const statusLabel = useAuctionStatusLabel()
  const title = `${auction.wineName}${auction.vintage != null ? ` ${String(auction.vintage)}` : ''}`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      testID={`auction-${auction.id}`}
      onPress={() => {
        void Haptics.selectionAsync()
        router.push(`/auctions/${auction.id}`)
      }}
      className="active:opacity-80"
    >
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <CardTitle className="flex-1">{title}</CardTitle>
          <Badge variant={auction.status === 'Open' ? 'default' : 'secondary'}>
            <Text>{statusLabel(auction.status)}</Text>
          </Badge>
        </CardHeader>
        <CardContent className="gap-1">
          <Text variant="muted">
            {auction.color} · {auction.region} · {auction.producerName}
          </Text>
          <View className="flex-row items-baseline gap-2">
            <Text variant="large">{price(auction.currentPrice, auction.currency)}</Text>
            <Text variant="muted">{t('ends', { when: formatInstant(auction.endsAt) })}</Text>
          </View>
        </CardContent>
      </Card>
    </Pressable>
  )
}
```

`src/features/auctions/screens/AuctionListScreen.tsx`:

```tsx
import { FlashList } from '@shopify/flash-list'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Screen } from '@/components/Screen'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useAuctionsInfinite } from '@/features/auctions/queries'
import { AuctionCard } from './AuctionCard'

function ListSkeleton() {
  return (
    <View className="gap-4 p-4" testID="list-skeleton">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-28 w-full rounded-lg" />
      ))}
    </View>
  )
}

export function AuctionListScreen() {
  const t = useTranslations('auction')
  const {
    data,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAuctionsInfinite()

  if (isPending) return <ListSkeleton />
  if (data === undefined) {
    return (
      <Screen>
        <ErrorState message={t('errorList')} onRetry={() => void refetch()} />
      </Screen>
    )
  }

  const items = data.pages.flatMap((page) => page.items)
  return (
    <View className="flex-1 bg-background">
      {isError && (
        <View className="bg-muted px-4 py-2" testID="stale-banner">
          <Text variant="muted">{t('staleBanner')}</Text>
        </View>
      )}
      <FlashList
        testID="auction-list"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AuctionCard auction={item} />}
        ItemSeparatorComponent={() => <View className="h-4" />}
        contentContainerStyle={{ padding: 16 }}
        contentInsetAdjustmentBehavior="automatic"
        refreshing={isFetching && !isFetchingNextPage}
        onRefresh={() => void refetch()}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? <Skeleton className="mt-4 h-28 w-full rounded-lg" /> : null
        }
        ListEmptyComponent={<EmptyState title={t('empty')} body={t('emptyBody')} />}
      />
    </View>
  )
}
```

`app/(app)/index.tsx`:

```tsx
// mobile:auction-block-start
export { AuctionListScreen as default } from '@/features/auctions/screens/AuctionListScreen'
// mobile:auction-block-end
```

`app/(app)/_layout.tsx` — full file, replacing Task 5's:

```tsx
import { Redirect, Stack, usePathname } from 'expo-router'
import { useTranslations } from 'use-intl'
import { setReturnTo } from '@/features/auth/returnTo'
import { useAuth } from '@/features/auth/useAuth'

export default function AppLayout() {
  const { tokens, isHydrated } = useAuth()
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  // mobile:auction-block-start
  const tAuction = useTranslations('auction')
  const indexTitle = tAuction('listTitle')
  // mobile:auction-block-end
  if (!isHydrated) return null
  if (tokens === null) {
    setReturnTo(pathname)
    return <Redirect href="/login" />
  }
  return (
    <Stack screenOptions={{ headerLargeTitle: true }}>
      <Stack.Screen name="index" options={{ title: indexTitle }} />
      <Stack.Screen name="settings" options={{ title: tNav('settings') }} />
      {/* mobile:auction-block-start */}
      <Stack.Screen name="auctions/[id]" options={{ title: '' }} />
      {/* mobile:auction-block-end */}
    </Stack>
  )
}
```

`init-project` strips the marker blocks and re-inserts `const indexTitle = tNav('home')` after the `tNav` line (Task 12).

- [ ] **Step 5: Tests, emulator, commit**

Run: `pnpm test -- AuctionListScreen` → PASS, 5 tests. If FlashList renders nothing under Jest, add to `test/setup.ts`:

```ts
jest.mock('@shopify/flash-list', () => ({ FlashList: require('react-native').FlatList }))
```

(FlatList accepts the same props used here.)

```bash
pnpm run android
```

Expected: after login, cards render; scrolling to the bottom loads the next page (seed more than 20 auctions to see it); pull-to-refresh spins; an empty backend shows the empty state; backend down shows the error state and retry works. Screenshot light and dark.

```bash
pnpm run typecheck && pnpm run lint && pnpm run format
git add -A -- . ':!docs'
git commit -m "Auction list with FlashList, skeleton, empty and error states"
```

---

### Task 7: Auction detail and the bid dialog

**Files:**
- Create: `src/features/auctions/rejection.ts`, `src/features/auctions/screens/PlaceBidDialog.tsx`, `src/features/auctions/screens/BidHistory.tsx`, `src/features/auctions/screens/AuctionDetailScreen.tsx`, `app/(app)/auctions/[id].tsx`
- Modify: `app/_layout.tsx` (Toaster), `test/setup.ts` (toast mock)
- Test: `test/features/auctions/AuctionDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `useAuction`, `useBids`, `usePlaceBid`, `Auction`, `problemFrom`, `problemTag`, `Dialog*`, `Field*`, `Input`, `Button`, `Separator`, `Skeleton`.
- Produces: `AuctionDetailScreen({ auctionId: string })` (testIDs `bid-open`, `bid-amount`, `bid-submit`, `bid-rejection`); `useRejectionMessage(): (p: Problem) => string`; test helper `mockToast` with `.success` and `.error`.

- [ ] **Step 1: Install sonner-native, mount the Toaster, mock it in tests**

```bash
pnpm add sonner-native
```

In `app/_layout.tsx`: `import { Toaster } from 'sonner-native'` and render `<Toaster position="bottom-center" />` right after `<PortalHost />`.

In `test/setup.ts`:

```ts
export const mockToast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() })
jest.mock('sonner-native', () => ({ toast: mockToast, Toaster: () => null }))
```

and clear all three in `afterEach`.

- [ ] **Step 2: Failing detail tests**

`test/features/auctions/AuctionDetailScreen.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import { AuctionDetailScreen } from '@/features/auctions/screens/AuctionDetailScreen'
import { server } from '../../mswServer'
import { renderWithProviders } from '../../renderApp'
import { mockToast } from '../../setup'
import { AUCTION_ID, BASE, bidTooLowProblem, bidsPageFixture, detailHandler } from './mocks'

const bidsUrl = `${BASE}/v1/auctions/${AUCTION_ID}/bids`

async function openDialogAndBid(amount: string) {
  await fireEvent.press(await screen.findByTestId('bid-open'))
  await fireEvent.changeText(await screen.findByTestId('bid-amount'), amount)
  await fireEvent.press(screen.getByTestId('bid-submit'))
}

describe('AuctionDetailScreen', () => {
  it('renders the auction and its bid history', async () => {
    server.use(
      detailHandler,
      http.get(bidsUrl, () =>
        HttpResponse.json(bidsPageFixture(['019ed9bb-0000-7000-8000-000000000b01'], false)),
      ),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    expect(await screen.findByText('Château Margaux 2015')).toBeTruthy()
    expect(await screen.findByText(/by bidder-0/)).toBeTruthy()
  })

  it('loads more bids via the cursor', async () => {
    const first = bidsPageFixture(
      ['019ed9bb-0000-7000-8000-000000000b01', '019ed9bb-0000-7000-8000-000000000b02'],
      true,
    )
    const second = bidsPageFixture(['019ed9bb-0000-7000-8000-000000000b03'], false, 2)
    server.use(
      detailHandler,
      http.get(bidsUrl, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.has('after-id') ? second : first),
      ),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await fireEvent.press(await screen.findByText('Load more bids'))
    expect(await screen.findByText(/by bidder-2/)).toBeTruthy()
  })

  it('places a bid from the dialog and toasts success', async () => {
    let posted: unknown = null
    server.use(
      detailHandler,
      http.get(bidsUrl, () => HttpResponse.json(bidsPageFixture([], false))),
      http.post(bidsUrl, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json(
          {
            id: '019ed9bb-0000-7000-8000-000000000b09',
            auctionId: AUCTION_ID,
            bidderId: '019ed9bb-0000-7000-8000-0000000000bb',
            amount: 200,
            createdAt: '2026-06-16T10:00:00Z',
          },
          { status: 201 },
        )
      }),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await openDialogAndBid('200')
    await waitFor(() => expect(posted).toEqual({ amount: 200 }))
    expect(mockToast.success).toHaveBeenCalledWith('Bid placed.')
  })

  it('shows the typed bid-too-low rejection inline', async () => {
    server.use(
      detailHandler,
      http.get(bidsUrl, () => HttpResponse.json(bidsPageFixture([], false))),
      http.post(bidsUrl, () => HttpResponse.json(bidTooLowProblem, { status: 409 })),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await openDialogAndBid('120')
    expect(await screen.findByText(/Bid too low — someone got there first/)).toBeTruthy()
  })

  it('shows the error state when the auction does not exist', async () => {
    server.use(
      http.get(`${BASE}/v1/auctions/${AUCTION_ID}`, () =>
        HttpResponse.json(
          { type: 'rejection:auction-not-found', status: 404, title: 'Not found' },
          { status: 404 },
        ),
      ),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    expect(await screen.findByTestId('error-state')).toBeTruthy()
  })
})
```

Run: `pnpm test -- AuctionDetailScreen` → FAIL, module not found.

- [ ] **Step 3: Implement**

`src/features/auctions/rejection.ts`:

```ts
import { useTranslations } from 'use-intl'
import { problemTag, type Problem } from '@/api/problem'

export function useRejectionMessage(): (problem: Problem) => string {
  const t = useTranslations('auction')
  return (problem) => {
    switch (problemTag(problem)) {
      case 'bid-too-low':
        return t('rejectBidTooLow')
      case 'already-highest-bidder':
        return t('rejectAlreadyHighest')
      case 'cannot-bid-on-own-auction':
        return t('rejectOwnAuction')
      case 'auction-not-open':
        return t('rejectNotOpen')
      case 'authentication-failed':
        return t('rejectAuthExpired')
      default:
        return problem.detail ?? problem.title
    }
  }
}
```

`src/features/auctions/screens/PlaceBidDialog.tsx`:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner-native'
import { useTranslations } from 'use-intl'
import { z } from 'zod'
import { problemFrom } from '@/api/problem'
import { Field, FieldError, FieldInput, FieldLabel } from '@/components/Field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { usePlaceBid, type Auction } from '@/features/auctions/queries'
import { useRejectionMessage } from '@/features/auctions/rejection'

export function PlaceBidDialog({ auction }: { auction: Auction }) {
  const t = useTranslations('auction')
  const [open, setOpen] = useState(false)
  const [rejection, setRejection] = useState<string | null>(null)
  const price = usePriceFormatter()
  const rejectionMessage = useRejectionMessage()
  const placeBid = usePlaceBid(auction.id)
  // zod 4 infers `unknown` as the input of z.coerce.number(); the <string>
  // argument declares the wire input so the form field and resolver agree.
  const bidSchema = z.object({
    amount: z.coerce.number<string>().positive(t('bidAmountPositive')),
  })
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof bidSchema>, unknown, z.output<typeof bidSchema>>({
    resolver: zodResolver(bidSchema),
    defaultValues: { amount: '' },
  })

  const onSubmit = handleSubmit(({ amount }) => {
    setRejection(null)
    placeBid.mutate(
      { params: { auctionId: auction.id }, body: { amount } },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          reset()
          setOpen(false)
          toast.success(t('bidPlaced'))
        },
        onError: (error) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          const problem = problemFrom(error)
          setRejection(problem ? rejectionMessage(problem) : t('bidFailed'))
        },
      },
    )
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button testID="bid-open" disabled={auction.status !== 'Open'}>
          <Text>{t('bidOpen')}</Text>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bidDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('bidDialogBody', { price: price(auction.currentPrice, auction.currency) })}
          </DialogDescription>
        </DialogHeader>
        <Field invalid={errors.amount !== undefined}>
          <FieldLabel>{t('bidAmountLabel', { currency: auction.currency })}</FieldLabel>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange, onBlur, value } }) => (
              <FieldInput
                testID="bid-amount"
                keyboardType="decimal-pad"
                placeholder={String(auction.currentPrice)}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
          {errors.amount && <FieldError>{errors.amount.message}</FieldError>}
        </Field>
        {rejection !== null && (
          <Text className="text-destructive" testID="bid-rejection">
            {rejection}
          </Text>
        )}
        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onPress={() => setOpen(false)}>
            <Text>{t('bidCancel')}</Text>
          </Button>
          <Button testID="bid-submit" onPress={() => void onSubmit()} disabled={placeBid.isPending}>
            <Text>{placeBid.isPending ? t('bidPlacing') : t('bidPlace')}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

`src/features/auctions/screens/BidHistory.tsx`:

```tsx
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useInstantFormatter } from '@/api/datetime'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { useBids } from '@/features/auctions/queries'

export function BidHistory({ auctionId }: { auctionId: string }) {
  const t = useTranslations('auction')
  const { data, isPending, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBids(auctionId)
  const formatInstant = useInstantFormatter()
  const price = usePriceFormatter()
  if (isPending) return <Skeleton className="h-12 w-full" />
  if (isError) return <Text className="text-destructive">{t('bidError')}</Text>
  const bids = data.pages.flatMap((page) => page.items)
  return (
    <View className="gap-3">
      {bids.length === 0 ? (
        <Text variant="muted">{t('bidNone')}</Text>
      ) : (
        bids.map((bid, i) => (
          <View key={bid.id} className="gap-3">
            {i > 0 && <Separator />}
            <View className="gap-0.5">
              <Text variant="large">{price(bid.amount, bid.currency)}</Text>
              <Text variant="muted">
                {t('bidBy', { bidder: bid.bidderRef, when: formatInstant(bid.createdAt) })}
              </Text>
            </View>
          </View>
        ))
      )}
      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onPress={() => void fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          <Text>{isFetchingNextPage ? t('bidLoadingMore') : t('bidLoadMore')}</Text>
        </Button>
      )}
    </View>
  )
}
```

`src/features/auctions/screens/AuctionDetailScreen.tsx`:

```tsx
import { Stack } from 'expo-router'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { useInstantFormatter } from '@/api/datetime'
import { ErrorState } from '@/components/ErrorState'
import { Screen } from '@/components/Screen'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { usePriceFormatter } from '@/features/auctions/format'
import { useAuction } from '@/features/auctions/queries'
import { useAuctionStatusLabel } from '@/features/auctions/status'
import { BidHistory } from './BidHistory'
import { PlaceBidDialog } from './PlaceBidDialog'

export function AuctionDetailScreen({ auctionId }: { auctionId: string }) {
  const t = useTranslations('auction')
  const { data: auction, isPending, isError, refetch } = useAuction(auctionId)
  const formatInstant = useInstantFormatter()
  const price = usePriceFormatter()
  const statusLabel = useAuctionStatusLabel()

  if (isPending) {
    return (
      <Screen>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-24 w-full" />
      </Screen>
    )
  }
  if (isError) {
    return (
      <Screen>
        <ErrorState message={t('detailError')} onRetry={() => void refetch()} />
      </Screen>
    )
  }

  const title = `${auction.wineName}${auction.vintage != null ? ` ${String(auction.vintage)}` : ''}`
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen scroll>
        <View className="flex-row items-start justify-between gap-3">
          <Text variant="h3" className="flex-1">
            {title}
          </Text>
          <Badge variant={auction.status === 'Open' ? 'default' : 'secondary'}>
            <Text>{statusLabel(auction.status)}</Text>
          </Badge>
        </View>
        <Text variant="muted">
          {auction.color} · {auction.region} · {auction.appellation} · {auction.producerName} ·{' '}
          {auction.bottleCount}× {auction.bottleSize}
        </Text>
        {auction.description != null && <Text>{auction.description}</Text>}
        <View className="gap-0.5">
          <Text variant="h4">{price(auction.currentPrice, auction.currency)}</Text>
          <Text variant="muted">
            {t('startedAt', { price: price(auction.startingPrice, auction.currency) })} ·{' '}
            {t('ends', { when: formatInstant(auction.endsAt) })}
          </Text>
        </View>
        <PlaceBidDialog auction={auction} />
        <Text variant="h4">{t('bidHistory')}</Text>
        <BidHistory auctionId={auction.id} />
      </Screen>
    </>
  )
}
```

`app/(app)/auctions/[id].tsx`:

```tsx
import { useLocalSearchParams } from 'expo-router'
import { AuctionDetailScreen } from '@/features/auctions/screens/AuctionDetailScreen'

export default function AuctionDetailRoute() {
  const { id } = useLocalSearchParams<'/auctions/[id]'>()
  return <AuctionDetailScreen auctionId={id} />
}
```

- [ ] **Step 4: Tests, emulator, commit**

Run: `pnpm test -- AuctionDetailScreen` → PASS, 5 tests. If the dialog content does not mount under Jest, add to `test/setup.ts`:

```ts
jest.mock('@rn-primitives/portal', () => ({
  PortalHost: () => null,
  Portal: ({ children }: { children: unknown }) => children,
}))
```

```bash
pnpm run android
```

Expected: tapping a card opens the detail with the wine name as the header; "Place bid" opens the dialog; a low bid shows the typed rejection inline; a high bid closes the dialog, vibrates, toasts, and the price and history update; Android back returns to the list.

```bash
pnpm run typecheck && pnpm run lint && pnpm run format
git add -A -- . ':!docs'
git commit -m "Auction detail with bid dialog, typed rejections, haptics and toasts"
```

---

### Task 8: Settings screen

**Files:**
- Create: `src/features/settings/screens/SettingsScreen.tsx`, `app/(app)/settings.tsx`
- Modify: `app/(app)/_layout.tsx` (header button), `test/setup.ts` (expo-updates mock)
- Test: `test/features/settings/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `useThemePreference`, `ThemePreference`, `Button`, `Text`, `Screen`, `Separator`, `expo-updates`, `expo-constants`.
- Produces: `SettingsScreen` (testIDs `theme-light|dark|system`, `logout`); header button testID `open-settings`.

- [ ] **Step 1: Install expo-updates and mock it globally**

```bash
pnpm expo install expo-updates
```

`test/setup.ts`:

```ts
jest.mock('expo-updates', () => ({
  isEnabled: false,
  updateId: null,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}))
```

- [ ] **Step 2: Failing test**

`test/features/settings/SettingsScreen.test.tsx`:

```tsx
import { fireEvent, screen } from '@testing-library/react-native'
import { tokenStore } from '@/features/auth/tokenStore'
import { SettingsScreen } from '@/features/settings/screens/SettingsScreen'
import { readThemePreference } from '@/theme/preferences'
import { renderWithProviders } from '../../renderApp'
import { mockRouter } from '../../setup'

describe('SettingsScreen', () => {
  beforeEach(() => {
    tokenStore.set({ jwt: 'j', refreshToken: 'r', email: 'a@example.com' })
  })

  it('shows who is signed in and the version', async () => {
    await renderWithProviders(<SettingsScreen />)
    expect(screen.getByText('Signed in as a@example.com')).toBeTruthy()
    expect(screen.getByText(/Version/)).toBeTruthy()
  })

  it('persists the theme choice', async () => {
    await renderWithProviders(<SettingsScreen />)
    await fireEvent.press(screen.getByTestId('theme-dark'))
    expect(readThemePreference()).toBe('dark')
  })

  it('logs out and returns to login', async () => {
    await renderWithProviders(<SettingsScreen />)
    await fireEvent.press(screen.getByTestId('logout'))
    expect(tokenStore.get()).toBeNull()
    expect(mockRouter.replace).toHaveBeenCalledWith('/login')
  })
})
```

Run: `pnpm test -- SettingsScreen` → FAIL, module not found.

- [ ] **Step 3: Implement**

`src/features/settings/screens/SettingsScreen.tsx`:

```tsx
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import * as Updates from 'expo-updates'
import { View } from 'react-native'
import { useTranslations } from 'use-intl'
import { Screen } from '@/components/Screen'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/useAuth'
import type { ThemePreference } from '@/theme/preferences'
import { useThemePreference } from '@/theme/useThemePreference'

const PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

export function SettingsScreen() {
  const t = useTranslations('settings')
  const tTheme = useTranslations('theme')
  const tNav = useTranslations('nav')
  const router = useRouter()
  const { tokens, logout } = useAuth()
  const { preference, setPreference } = useThemePreference()

  return (
    <Screen scroll>
      <Text variant="muted">{t('signedInAs', { email: tokens?.email ?? '' })}</Text>
      <Separator />
      <Text variant="large">{tTheme('heading')}</Text>
      <View className="flex-row gap-2">
        {PREFERENCES.map((p) => (
          <Button
            key={p}
            variant={preference === p ? 'default' : 'outline'}
            onPress={() => setPreference(p)}
            testID={`theme-${p}`}
          >
            <Text>{tTheme(p)}</Text>
          </Button>
        ))}
      </View>
      <Separator />
      <Button
        variant="destructive"
        testID="logout"
        onPress={() => {
          logout()
          router.replace('/login')
        }}
      >
        <Text>{tNav('logOut')}</Text>
      </Button>
      <Text variant="muted" className="mt-8">
        {t('version', {
          version: Constants.expoConfig?.version ?? '0.0.0',
          updateId: Updates.updateId ?? t('noUpdate'),
        })}
      </Text>
    </Screen>
  )
}
```

`app/(app)/settings.tsx`:

```tsx
export { SettingsScreen as default } from '@/features/settings/screens/SettingsScreen'
```

Header button in `app/(app)/_layout.tsx`: add the imports

```tsx
import { Link, Redirect, Stack, usePathname } from 'expo-router'
import { Settings as SettingsIcon } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { Icon } from '@/components/ui/icon'
```

and change the `index` screen to

```tsx
      <Stack.Screen
        name="index"
        options={{
          title: indexTitle,
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel={tNav('settings')} testID="open-settings" hitSlop={8}>
                <Icon as={SettingsIcon} className="text-foreground" size={22} />
              </Pressable>
            </Link>
          ),
        }}
      />
```

- [ ] **Step 4: Test, emulator, commit**

Run: `pnpm test -- SettingsScreen` → PASS, 3 tests.

```bash
pnpm run android
```

Expected: gear icon in the list header opens Settings; theme buttons switch immediately and persist across restarts; log out returns to login, and a relaunch stays on login.

```bash
pnpm run typecheck && pnpm run lint && pnpm run format
git add -A -- . ':!docs'
git commit -m "Settings screen: theme preference, logout, version"
```

---

### Task 9: App config, EAS profiles, committed assets, OTA update prompt

**Files:**
- Create: `app.config.ts`, `eas.json`, `assets/icon.svg`, `assets/splash.svg`, `assets/generated/*.png` (committed), `scripts/generate-assets.mjs`, `src/updates/useOtaUpdates.ts`
- Delete: `app.json`, the scaffold's `assets/*.png`
- Modify: `app/_layout.tsx`, `package.json`, `.prettierignore`
- Test: `test/updates/useOtaUpdates.test.ts`

**Interfaces:**
- Consumes: `toast`, `expo-updates`, `AppState`, `messages`.
- Produces: `checkForOtaUpdate(deps: OtaDeps): Promise<void>` (pure, tested); `OtaDeps` with `prompt(onAccept)` and `failed(retry)` callbacks; `useOtaUpdates(): void` (mounted once in the root layout).

- [ ] **Step 1: Asset sources and generator**

`assets/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="224" fill="#772938"/>
  <text x="512" y="700" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="560" font-weight="700" fill="#FFFFFF">m</text>
</svg>
```

`assets/splash.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <text x="256" y="350" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="280" font-weight="700" fill="#772938">m</text>
</svg>
```

```bash
rm -f assets/*.png
pnpm add -D sharp
```

`scripts/generate-assets.mjs`:

```js
#!/usr/bin/env node
// Rasterize assets/icon.svg and assets/splash.svg into the PNGs app.config.ts references.
// The PNGs are committed: EAS Build runs its npm hooks after `expo prebuild`, so nothing
// can generate them in time on a clean remote build. Re-run after editing the SVGs.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const out = path.join('assets', 'generated')
fs.mkdirSync(out, { recursive: true })

const icon = fs.readFileSync(path.join('assets', 'icon.svg'))
const splash = fs.readFileSync(path.join('assets', 'splash.svg'))
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

const jobs = [
  ['icon.png', icon, 1024, { fit: 'contain' }],
  ['adaptive-icon-foreground.png', splash, 1024, { fit: 'contain', background: transparent }],
  ['splash-icon.png', splash, 400, { fit: 'contain', background: transparent }],
]
for (const [name, src, size, opts] of jobs) {
  await sharp(src).resize(size, size, opts).png().toFile(path.join(out, name))
  console.log(`wrote ${path.join(out, name)}`)
}
```

Run: `pnpm run generate-assets` → three PNGs in `assets/generated/`.

- [ ] **Step 2: `app.config.ts` and `eas.json`**

Delete `app.json`. Set `"version": "0.1.0"` in `package.json`.

`app.config.ts`:

```ts
import type { ConfigContext, ExpoConfig } from 'expo/config'
import pkg from './package.json'

// name/slug/scheme derive from package.json so init-project's rename re-brands
// the app (the web manifest works the same way).
const name = pkg.name.replace(/-mobile$/, '')
const scheme = name.replace(/[^a-z0-9]/gi, '').toLowerCase()
const bundleId = `dev.${scheme}.mobile`
const associatedDomain = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN
const easProjectId = process.env.EAS_PROJECT_ID

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: pkg.name,
  scheme,
  version: pkg.version,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/generated/icon.png',
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    enabled: true,
    checkAutomatically: 'NEVER',
    ...(easProjectId ? { url: `https://u.expo.dev/${easProjectId}` } : {}),
  },
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    ...(associatedDomain ? { associatedDomains: [`applinks:${associatedDomain}`] } : {}),
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: './assets/generated/adaptive-icon-foreground.png',
      backgroundColor: '#772938',
    },
    ...(associatedDomain
      ? {
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              data: [{ scheme: 'https', host: associatedDomain, pathPrefix: '/' }],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : {}),
  },
  experiments: { typedRoutes: true },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/generated/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#0A0A0A' },
      },
    ],
  ],
  extra: { ...(easProjectId ? { eas: { projectId: easProjectId } } : {}) },
})
```

`eas.json`:

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "local" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "android": { "buildType": "apk" }
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": { "production": {} }
}
```

- [ ] **Step 3: OTA update hook — failing test first**

`test/updates/useOtaUpdates.test.ts`:

```ts
import { checkForOtaUpdate, type OtaDeps } from '@/updates/useOtaUpdates'

type TestDeps = OtaDeps & { prompt: jest.Mock; failed: jest.Mock }

function deps(overrides: Partial<OtaDeps> = {}): TestDeps {
  return {
    isEnabled: true,
    checkForUpdate: jest.fn().mockResolvedValue({ isAvailable: true }),
    fetchUpdate: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    prompt: jest.fn(),
    failed: jest.fn(),
    now: () => 1_000_000,
    ...overrides,
  }
}

function acceptFrom(d: TestDeps): () => Promise<void> {
  return d.prompt.mock.calls[0]?.[0] as () => Promise<void>
}

// The throttle is module state, so each test uses a clock well past the previous one.
describe('checkForOtaUpdate', () => {
  it('prompts before downloading and downloads only on accept', async () => {
    const d = deps()
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).toHaveBeenCalledTimes(1)
    expect(d.fetchUpdate).not.toHaveBeenCalled()
    await acceptFrom(d)()
    expect(d.fetchUpdate).toHaveBeenCalledTimes(1)
    expect(d.reload).toHaveBeenCalledTimes(1)
  })

  it('does nothing when no update is available', async () => {
    const d = deps({
      now: () => 5_000_000,
      checkForUpdate: jest.fn().mockResolvedValue({ isAvailable: false }),
    })
    await checkForOtaUpdate(d)
    expect(d.prompt).not.toHaveBeenCalled()
  })

  it('does nothing when updates are disabled (dev, Expo Go)', async () => {
    const d = deps({ isEnabled: false, now: () => 10_000_000 })
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).not.toHaveBeenCalled()
  })

  it('throttles checks to once per five minutes', async () => {
    let t = 15_000_000
    const d = deps({ now: () => t })
    await checkForOtaUpdate(d)
    t += 60_000
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).toHaveBeenCalledTimes(1)
    t += 5 * 60_000
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).toHaveBeenCalledTimes(2)
  })

  it('swallows check failures', async () => {
    const d = deps({
      now: () => 20_000_000,
      checkForUpdate: jest.fn().mockRejectedValue(new Error('offline')),
    })
    await expect(checkForOtaUpdate(d)).resolves.toBeUndefined()
  })

  it('reports a failed download and offers a retry that can succeed', async () => {
    const d = deps({
      now: () => 25_000_000,
      fetchUpdate: jest
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(undefined),
    })
    await checkForOtaUpdate(d)
    await expect(acceptFrom(d)()).resolves.toBeUndefined()
    expect(d.reload).not.toHaveBeenCalled()
    expect(d.failed).toHaveBeenCalledTimes(1)
    const retry = d.failed.mock.calls[0]?.[0] as () => Promise<void>
    await retry()
    expect(d.reload).toHaveBeenCalledTimes(1)
  })
})
```

Run: `pnpm test -- useOtaUpdates` → FAIL, module not found.

- [ ] **Step 4: Implement and mount**

`src/updates/useOtaUpdates.ts`:

```ts
import * as Updates from 'expo-updates'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { toast } from 'sonner-native'
import { createTranslator } from 'use-intl/core'
import { messages } from '@/i18n/config'

const THROTTLE_MS = 5 * 60_000

export interface OtaDeps {
  isEnabled: boolean
  checkForUpdate: () => Promise<{ isAvailable: boolean }>
  fetchUpdate: () => Promise<unknown>
  reload: () => Promise<void>
  prompt: (onAccept: () => Promise<void>) => void
  failed: (retry: () => Promise<void>) => void
  now: () => number
}

let lastCheck = Number.NEGATIVE_INFINITY

// Consent gates the DOWNLOAD, not the reload: expo-updates launches whatever is
// on disk at the next cold start, so fetching first would apply behind the
// user's back. Check → prompt → fetch+reload only on accept.
export async function checkForOtaUpdate(deps: OtaDeps): Promise<void> {
  if (!deps.isEnabled) return
  if (deps.now() - lastCheck < THROTTLE_MS) return
  lastCheck = deps.now()
  try {
    const { isAvailable } = await deps.checkForUpdate()
    if (!isAvailable) return
    // The accept callback runs long after this try/catch has returned, so it
    // must handle its own failure: a dropped download reports and offers a retry.
    const accept = async (): Promise<void> => {
      try {
        await deps.fetchUpdate()
        await deps.reload()
      } catch {
        deps.failed(accept)
      }
    }
    deps.prompt(accept)
  } catch {
    // Offline or the update server is down: try again on the next check.
  }
}

const t = createTranslator({ locale: 'en', messages, namespace: 'updates' })

const liveDeps: OtaDeps = {
  isEnabled: Updates.isEnabled && !__DEV__,
  checkForUpdate: () => Updates.checkForUpdateAsync(),
  fetchUpdate: () => Updates.fetchUpdateAsync(),
  reload: () => Updates.reloadAsync(),
  prompt: (onAccept) =>
    toast(t('available'), {
      duration: Number.POSITIVE_INFINITY,
      action: { label: t('update'), onClick: () => void onAccept() },
    }),
  failed: (retry) =>
    toast.error(t('failed'), {
      action: { label: t('retry'), onClick: () => void retry() },
    }),
  now: () => Date.now(),
}

export function useOtaUpdates(): void {
  useEffect(() => {
    void checkForOtaUpdate(liveDeps)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkForOtaUpdate(liveDeps)
    })
    return () => sub.remove()
  }, [])
}
```

In `app/_layout.tsx`: `import { useOtaUpdates } from '@/updates/useOtaUpdates'` and call `useOtaUpdates()` inside `RootLayout` before the `if (!ready) return null` line.

Run: `pnpm test -- useOtaUpdates` → PASS, 6 tests.

- [ ] **Step 5: Prebuild gate and commit**

```bash
pnpm exec expo prebuild --platform all --no-install --clean
git check-ignore android ios
rm -rf android ios
pnpm run typecheck && pnpm run lint && pnpm run format && pnpm test
git add -A -- . ':!docs'
git commit -m "app.config.ts from package.json, EAS profiles, committed icon assets, consent-gated OTA updates"
```

Expected: prebuild succeeds for both platforms and `git check-ignore` prints both directories (the scaffold's `.gitignore` covers them).

---

### Task 10: Observability (OpenTelemetry → OpenObserve, opt-in)

**Files:**
- Create: `src/observability/errors.ts`, `src/observability/otel.ts`
- Modify: `app/_layout.tsx`, `package.json` (exact pins), `test/setup.ts` (ErrorUtils shim if needed)
- Test: `test/observability/otel.test.ts`

**Interfaces:**
- Consumes: `env.otel`, `env.apiBaseUrl`.
- Produces: `initObservability(): Promise<void>` (no-op when `env.otel === null`); `installErrorReporting(emit: (r: ErrorRecord) => void): () => void` with `ErrorRecord = { body: string; stack: string | undefined; isFatal: boolean }`.

- [ ] **Step 1: Install with exact pins**

```bash
pnpm add -E @opentelemetry/api@1.9.1 @opentelemetry/api-logs@0.222.0 @opentelemetry/core@2.11.0 @opentelemetry/resources@2.11.0 @opentelemetry/sdk-trace-base@2.11.0 @opentelemetry/sdk-trace-web@2.11.0 @opentelemetry/sdk-logs@0.222.0 @opentelemetry/exporter-trace-otlp-http@0.222.0 @opentelemetry/exporter-logs-otlp-http@0.222.0 @opentelemetry/instrumentation@0.222.0 @opentelemetry/instrumentation-fetch@0.222.0 @opentelemetry/instrumentation-xml-http-request@0.222.0
pnpm expo install expo-device expo-crypto
```

- [ ] **Step 2: Failing tests**

`test/observability/otel.test.ts`:

```ts
import { installErrorReporting } from '@/observability/errors'

describe('observability', () => {
  it('initObservability is a no-op without the env variable', async () => {
    jest.resetModules()
    jest.doMock('@/env', () => ({ env: { apiBaseUrl: 'http://x', otel: null } }))
    const { initObservability } = await import('@/observability/otel')
    const before = ErrorUtils.getGlobalHandler()
    await expect(initObservability()).resolves.toBeUndefined()
    expect(ErrorUtils.getGlobalHandler()).toBe(before)
  })

  it('installErrorReporting forwards uncaught errors and restores the previous handler', () => {
    const previous = jest.fn()
    ErrorUtils.setGlobalHandler(previous)
    const emit = jest.fn()
    const uninstall = installErrorReporting(emit)
    const boom = new Error('boom')
    ErrorUtils.getGlobalHandler()(boom, true)
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ body: 'boom', isFatal: true }))
    expect(previous).toHaveBeenCalledWith(boom, true)
    uninstall()
    expect(ErrorUtils.getGlobalHandler()).toBe(previous)
  })
})
```

Run: `pnpm test -- observability` → FAIL, module not found. If instead it fails with `ErrorUtils is not defined`, add this shim to `test/setup.ts` and re-run:

```ts
type GlobalHandler = (error: unknown, isFatal?: boolean) => void
const g = globalThis as { ErrorUtils?: unknown }
if (g.ErrorUtils === undefined) {
  let handler: GlobalHandler = () => {}
  g.ErrorUtils = {
    getGlobalHandler: () => handler,
    setGlobalHandler: (h: GlobalHandler) => {
      handler = h
    },
  }
}
```

- [ ] **Step 3: Implement**

`src/observability/errors.ts`:

```ts
export interface ErrorRecord {
  body: string
  stack: string | undefined
  isFatal: boolean
}

// Wrap RN's global handler: report, then hand off to whatever was installed
// before (the red box in dev, the crash in production).
export function installErrorReporting(emit: (record: ErrorRecord) => void): () => void {
  const previous = ErrorUtils.getGlobalHandler()
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const e = error instanceof Error ? error : new Error(String(error))
    emit({ body: e.message, stack: e.stack, isFatal: isFatal === true })
    previous(error, isFatal)
  })
  return () => ErrorUtils.setGlobalHandler(previous)
}
```

`src/observability/otel.ts`:

```ts
import { env } from '@/env'

// Lazy: none of the OTel packages load unless EXPO_PUBLIC_OTEL_ENDPOINT is set.
// The JS OTel SDK is not officially supported on React Native (hence the exact
// pins and the two fetch workarounds below, from the OTel demo's RN app).
export async function initObservability(): Promise<void> {
  const cfg = env.otel
  if (cfg === null) return

  const [
    { trace, propagation },
    { logs, SeverityNumber },
    { resourceFromAttributes },
    { WebTracerProvider },
    { BatchSpanProcessor },
    { LoggerProvider, BatchLogRecordProcessor },
    { OTLPTraceExporter },
    { OTLPLogExporter },
    { registerInstrumentations },
    { FetchInstrumentation },
    { XMLHttpRequestInstrumentation },
    { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator },
    Device,
    Crypto,
    { AppState },
    { installErrorReporting },
  ] = await Promise.all([
    import('@opentelemetry/api'),
    import('@opentelemetry/api-logs'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/sdk-trace-web'),
    import('@opentelemetry/sdk-trace-base'),
    import('@opentelemetry/sdk-logs'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/exporter-logs-otlp-http'),
    import('@opentelemetry/instrumentation'),
    import('@opentelemetry/instrumentation-fetch'),
    import('@opentelemetry/instrumentation-xml-http-request'),
    import('@opentelemetry/core'),
    import('expo-device'),
    import('expo-crypto'),
    import('react-native'),
    import('./errors'),
  ])

  const sessionId = Crypto.randomUUID()
  const headers =
    cfg.ingestToken !== undefined ? { Authorization: `Bearer ${cfg.ingestToken}` } : {}
  const resource = resourceFromAttributes({
    'service.name': cfg.serviceName,
    'os.name': Device.osName ?? 'unknown',
    'os.version': Device.osVersion ?? 'unknown',
    'device.model.name': Device.modelName ?? 'unknown',
    'session.id': sessionId,
  })

  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: `${cfg.endpoint}/v1/traces`, headers }), {
        scheduledDelayMillis: 500,
      }),
    ],
  })
  trace.setGlobalTracerProvider(tracerProvider)
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
  )

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // RN's fetch is a polyfill over XMLHttpRequest, not real CORS: always propagate.
        propagateTraceHeaderCorsUrls: /.*/,
        clearTimingResources: false,
      }),
      // …and ignore the API in the XHR layer so each call yields one span, not two.
      new XMLHttpRequestInstrumentation({ ignoreUrls: [new RegExp(env.apiBaseUrl)] }),
    ],
  })

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor(new OTLPLogExporter({ url: `${cfg.endpoint}/v1/logs`, headers })),
    ],
  })
  logs.setGlobalLoggerProvider(loggerProvider)
  const logger = logs.getLogger(cfg.serviceName)

  installErrorReporting((record) => {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: record.body,
      attributes: {
        'exception.stacktrace': record.stack ?? '',
        'error.fatal': record.isFatal,
        'session.id': sessionId,
      },
    })
    if (record.isFatal) void loggerProvider.forceFlush()
  })

  AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      void tracerProvider.forceFlush()
      void loggerProvider.forceFlush()
    }
  })
}
```

In `app/_layout.tsx`, next to `registerAuthTokenProvider()`: `void initObservability()` (import from `@/observability/otel`).

Run: `pnpm test -- observability` → PASS, 2 tests.

- [ ] **Step 4: Verify against OpenObserve, commit**

With the backend's OpenObserve running (see `../madrileno/docs/observability.md`), create an ingest-only token there, put it and `EXPO_PUBLIC_OTEL_ENDPOINT=http://10.0.2.2:5080/api/default` in `.env`, then `pnpm run android`. Open an auction: OpenObserve should show a trace whose client span has the backend's HTTP handler span as a child (same trace id). Temporarily throw inside a button handler, confirm a log record with `error.fatal`, and revert the throw.

```bash
pnpm run typecheck && pnpm run lint && pnpm run format
git add -A -- . ':!docs'
git commit -m "Opt-in OpenTelemetry traces and JS error logs to OpenObserve"
```

---

### Task 11: Maestro flows

**Files:**
- Create: `.maestro/smoke.yml`, `.maestro/auctions.yml`, `.maestro/README.md`

- [ ] **Step 1: Install Maestro, write the flows**

```bash
curl -Ls "https://get.maestro.dev" | bash
export PATH="$HOME/.maestro/bin:$PATH"
maestro --version
```

`.maestro/smoke.yml` (backend-free; survives `init-project`):

```yaml
appId: dev.madrileno.mobile
---
- launchApp:
    clearState: true
- assertVisible:
    id: 'login-email'
- assertVisible:
    id: 'login-submit'
```

`.maestro/auctions.yml` (needs the backend with `DEV_AUTH_ENABLED=true` and one open auction):

```yaml
appId: dev.madrileno.mobile
---
- launchApp:
    clearState: true
- tapOn:
    id: 'login-email'
- inputText: 'maestro@example.com'
- tapOn:
    id: 'login-submit'
- extendedWaitUntil:
    visible:
      id: 'open-settings'
    timeout: 10000
- tapOn:
    id: 'open-settings'
- assertVisible: 'Signed in as maestro@example.com'
- back
- scrollUntilVisible:
    element:
      text: 'Open'
    direction: DOWN
- tapOn: 'Open'
- extendedWaitUntil:
    visible: 'Bid history'
    timeout: 10000
- tapOn:
    id: 'bid-open'
- tapOn:
    id: 'bid-amount'
- inputText: '1'
- tapOn:
    id: 'bid-submit'
- assertVisible:
    id: 'bid-rejection'
```

`.maestro/README.md`:

```markdown
# Maestro flows

- `smoke.yml` — launches the app and asserts the login screen. No backend. Runs in CI.
- `auctions.yml` — dev login, settings, list, detail, a too-low bid. Needs the backend
  (`DEV_AUTH_ENABLED=true`, one open auction). Local only.

Run against a booted emulator with the app installed:

    pnpm run e2e                     # both flows
    maestro test .maestro/smoke.yml  # one flow
```

- [ ] **Step 2: Run both flows locally, commit**

```bash
pnpm run android
pnpm run e2e
```

Expected: both flows pass. The reusables `Button` spreads props onto its `Pressable`, so `testID` reaches the native view.

```bash
git add .maestro
git commit -m "Maestro smoke and auctions flows"
```

---

### Task 12: init-project script

**Files:**
- Create: `scripts/init-project.mjs`
- Test: `test/scripts/init-project.test.ts`

**Interfaces:**
- Produces: `node scripts/init-project.mjs <name>` strips the demo and renames the package to `<name>-mobile`.

- [ ] **Step 1: Failing test (runs the script against a temp copy)**

`test/scripts/init-project.test.ts`:

```ts
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const COPIED = ['app', 'src', 'test', 'scripts', '.maestro', 'package.json', 'README.md', 'LICENSE']

function copyRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-project-'))
  for (const entry of COPIED) {
    const from = path.join(ROOT, entry)
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dir, entry), { recursive: true })
  }
  return dir
}

function grepMarkers(dir: string): string {
  try {
    return execFileSync('grep', ['-rl', 'auction-block', path.join(dir, 'app'), path.join(dir, 'src')], {
      encoding: 'utf-8',
    })
  } catch {
    return '' // grep exits 1 when nothing matches
  }
}

describe('init-project', () => {
  it('strips the auction demo and renames the package', () => {
    const dir = copyRepo()
    execFileSync('node', [path.join(dir, 'scripts', 'init-project.mjs'), 'acme'], { cwd: dir })

    expect(fs.existsSync(path.join(dir, 'src', 'features', 'auctions'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'app', '(app)', 'auctions'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'test', 'features', 'auctions'))).toBe(false)
    expect(fs.existsSync(path.join(dir, '.maestro', 'auctions.yml'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'LICENSE'))).toBe(false)

    const index = fs.readFileSync(path.join(dir, 'app', '(app)', 'index.tsx'), 'utf-8')
    expect(index).toContain('HomeScreen')
    expect(index).not.toContain('auction')

    const layout = fs.readFileSync(path.join(dir, 'app', '(app)', '_layout.tsx'), 'utf-8')
    expect(layout).not.toContain('auction')
    expect(layout).toContain("const indexTitle = tNav('home')")

    // The bundle id follows the name (app.config.ts), so the flows must too.
    const smoke = fs.readFileSync(path.join(dir, '.maestro', 'smoke.yml'), 'utf-8')
    expect(smoke).toContain('appId: dev.acme.mobile')

    const messages = JSON.parse(
      fs.readFileSync(path.join(dir, 'src', 'i18n', 'messages', 'en.json'), 'utf-8'),
    ) as Record<string, unknown>
    expect(messages).not.toHaveProperty('auction')

    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')) as {
      name: string
    }
    expect(pkg.name).toBe('acme-mobile')

    expect(grepMarkers(dir)).toBe('')
  })
})
```

Run: `pnpm test -- init-project` → FAIL, script not found.

- [ ] **Step 2: Implement**

`scripts/init-project.mjs`:

```js
#!/usr/bin/env node
// Remove the wine-auction demo and leave a runnable shell (login + home + settings).
// Usage: node scripts/init-project.mjs [name]
import fs from 'node:fs'
import path from 'node:path'

const name = process.argv[2]

const removals = [
  path.join('src', 'features', 'auctions'),
  path.join('app', '(app)', 'auctions'),
  path.join('test', 'features', 'auctions'),
  path.join('.maestro', 'auctions.yml'),
]
for (const p of removals) if (fs.existsSync(p)) fs.rmSync(p, { recursive: true })

const licenseDeleted = fs.existsSync('LICENSE')
if (licenseDeleted) fs.rmSync('LICENSE')
if (fs.existsSync('README.md')) {
  const readme = fs.readFileSync('README.md', 'utf-8')
  const stripped = readme.replace(/\n?^## License[ \t]*\r?\n[\s\S]*?(?=^## |(?![\s\S]))/m, '')
  if (stripped !== readme) fs.writeFileSync('README.md', stripped)
}

// The demo list route becomes the plain home screen.
fs.writeFileSync(
  path.join('app', '(app)', 'index.tsx'),
  "export { HomeScreen as default } from '@/features/home/screens/HomeScreen'\n",
)

const blockRe = /^.*mobile:auction-block-start[\s\S]*?mobile:auction-block-end.*(?:\n|$)/gm
const leftoverImportRe = /^import .* from '.*features\/auctions.*'\r?\n/gm

function* walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'contracts' || entry.name === 'node_modules') continue
      yield* walk(p)
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      yield p
    }
  }
}

let stripped = 0
for (const file of [...walk('app'), ...walk('src'), ...walk('test')]) {
  const original = fs.readFileSync(file, 'utf-8')
  const transformed = original.replace(blockRe, '').replace(leftoverImportRe, '')
  if (transformed !== original) {
    fs.writeFileSync(file, transformed)
    stripped += 1
  }
}

// The (app) layout's index title came from the auction namespace; restore the home title.
const layoutPath = path.join('app', '(app)', '_layout.tsx')
const layout = fs.readFileSync(layoutPath, 'utf-8')
if (!layout.includes('const indexTitle')) {
  fs.writeFileSync(
    layoutPath,
    layout.replace(
      /^(\s*)const tNav = useTranslations\('nav'\)$/m,
      "$1const tNav = useTranslations('nav')\n$1const indexTitle = tNav('home')",
    ),
  )
}

const messagesPath = path.join('src', 'i18n', 'messages', 'en.json')
const catalog = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'))
if ('auction' in catalog) {
  delete catalog.auction
  fs.writeFileSync(messagesPath, JSON.stringify(catalog, null, 2) + '\n')
}

if (name) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
  pkg.name = `${name}-mobile`
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')

  // app.config.ts derives the bundle id from the name; keep the Maestro flows in step.
  const scheme = name.replace(/[^a-z0-9]/gi, '').toLowerCase()
  const maestroDir = '.maestro'
  if (fs.existsSync(maestroDir)) {
    for (const f of fs.readdirSync(maestroDir).filter((f) => f.endsWith('.yml'))) {
      const p = path.join(maestroDir, f)
      const flow = fs.readFileSync(p, 'utf-8')
      fs.writeFileSync(p, flow.replace(/^appId: .*$/m, `appId: dev.${scheme}.mobile`))
    }
  }
}

console.log('Deleted the auction demo (feature, routes, tests, Maestro flow)')
if (licenseDeleted) console.log('Deleted LICENSE (generated projects may relicense freely)')
console.log(`Stripped auction blocks from ${stripped} file(s)`)
if (name)
  console.log(`Renamed package to ${name}-mobile (app name, slug, scheme, bundle id and Maestro appId follow)`)
console.log()
console.log('Next:')
console.log('  pnpm run typecheck && pnpm run lint && pnpm run test')
console.log('  pnpm run native:prebuild   # bundle ids changed with the name')
console.log('  (after backend init-project + sbt test): pnpm run sync-contracts')
```

Run: `pnpm test -- init-project` → PASS.

- [ ] **Step 3: Prove the post-init shell is green, commit**

```bash
git status --short   # must be empty except the two new files; commit them first if not
git add scripts/init-project.mjs test/scripts
git commit -m "init-project: strip the auction demo and rename the package"
rm -rf /tmp/claude-1000/-home-luksow-iterators-madrileno/6920e7af-2dbf-4a38-9541-0c0eaa0ba98a/scratchpad/init-check
cp -r . /tmp/claude-1000/-home-luksow-iterators-madrileno/6920e7af-2dbf-4a38-9541-0c0eaa0ba98a/scratchpad/init-check
cd /tmp/claude-1000/-home-luksow-iterators-madrileno/6920e7af-2dbf-4a38-9541-0c0eaa0ba98a/scratchpad/init-check
node scripts/init-project.mjs acme
pnpm run typecheck && pnpm run lint && pnpm test
cd /home/luksow/iterators/madrileno/madrileno-mobile
```

Expected: all green in the copy, and its `app/(app)/_layout.tsx` contains no `auction`.

---

### Task 13: CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

Both jobs build a release APK signed with the debug keystore so the JS bundle is embedded and no Metro server is needed; the `sed` after prebuild makes that explicit regardless of how the generated Gradle file is laid out.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

env:
  EMULATOR_OPTIONS: -no-window -gpu swiftshader_indirect -noaudio -no-boot-anim -no-snapshot

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # The contract is vendored (src/contracts), so CI needs no backend.
      - run: pnpm run typecheck
      - run: pnpm run lint
      - run: pnpm run format:check
      - run: pnpm test
      # Icon/splash PNGs are committed; make sure they match their SVG sources.
      - run: pnpm run generate-assets && git diff --exit-code -- assets/generated
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - uses: android-actions/setup-android@v3
      - run: pnpm exec expo prebuild --platform all --no-install --clean
      - run: sed -i 's/signingConfig signingConfigs.release/signingConfig signingConfigs.debug/' android/app/build.gradle
      - run: cd android && ./gradlew assembleRelease --no-daemon
      - name: Install Maestro
        run: |
          curl -Ls "https://get.maestro.dev" | bash
          echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"
      - name: Enable KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm
      - name: Maestro smoke on the emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          target: google_apis
          profile: pixel_6
          emulator-options: ${{ env.EMULATOR_OPTIONS }}
          disable-animations: true
          script: |
            adb install -r android/app/build/outputs/apk/release/app-release.apk
            maestro test .maestro/smoke.yml

  # The post-init shell must stay green: strip the demo and run the same gate.
  init-project-shell:
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: node scripts/init-project.mjs ci-shell
      - run: |
          test ! -f LICENSE || { echo "LICENSE not deleted"; exit 1; }
          ! grep -q '^## License' README.md || { echo "README License section not stripped"; exit 1; }
      - run: pnpm run typecheck
      - run: pnpm run lint
      - run: pnpm test
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
      - uses: android-actions/setup-android@v3
      - run: pnpm exec expo prebuild --platform all --no-install --clean
      - run: sed -i 's/signingConfig signingConfigs.release/signingConfig signingConfigs.debug/' android/app/build.gradle
      - run: cd android && ./gradlew assembleRelease --no-daemon
      - run: |
          curl -Ls "https://get.maestro.dev" | bash
          echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"
      - run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm
      - uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          target: google_apis
          profile: pixel_6
          emulator-options: ${{ env.EMULATOR_OPTIONS }}
          disable-animations: true
          script: |
            adb install -r android/app/build/outputs/apk/release/app-release.apk
            maestro test .maestro/smoke.yml
```

A flaky emulator run is retried by re-running the job; there is no in-workflow retry because a `uses:` step cannot be wrapped.

- [ ] **Step 2: Rehearse the Gradle and Maestro steps locally, commit**

With the emulator booted:

```bash
pnpm exec expo prebuild --platform android --no-install --clean
sed -i 's/signingConfig signingConfigs.release/signingConfig signingConfigs.debug/' android/app/build.gradle
grep -n "signingConfig" android/app/build.gradle
(cd android && ./gradlew assembleRelease --no-daemon)
adb install -r android/app/build/outputs/apk/release/app-release.apk
maestro test .maestro/smoke.yml
rm -rf android ios
```

Expected: `app-release.apk` builds, installs, and the smoke flow passes against it with no Metro running.

```bash
git add .github
git commit -m "CI: gate, asset freshness, Android release APK, Maestro smoke on an emulator, post-init shell"
```

Do **not** push.

---

### Task 14: README, CLAUDE.md, LICENSE, deep-link docs

**Files:**
- Create: `README.md`, `CLAUDE.md`, `LICENSE`, `docs/deep-links.md`

- [ ] **Step 1: LICENSE**

```bash
cp ../madrileno-frontend/LICENSE LICENSE
```

- [ ] **Step 2: CLAUDE.md**

Copy Appendix A of the spec into `CLAUDE.md` verbatim, then make these corrections so it matches what was built:

- the reusables CLI line reads `pnpm dlx @react-native-reusables/cli@0.7.1 add <name>`;
- the Maestro line names `.maestro/smoke.yml` and `.maestro/auctions.yml`;
- the prebuild script is `pnpm run native:prebuild`;
- the Date ban sentence adds the second exemption, `src/updates/useOtaUpdates.ts`;
- the Structure bullet on UI adds: "`Field` (`src/components/Field.tsx`) provides validity by context and `FieldInput` is the `Input` that consumes it, so a `Controller` can sit between them; `Screen` wraps every screen body (`scroll` for content, `form` for inputs)."
- the Tests bullet adds: "RNTL 14: `render` and `fireEvent` are async, always `await` them. Mock variables captured by `jest.mock` factories must be `mock`-prefixed; state that a factory needs lives inside the factory."

- [ ] **Step 3: README.md**

Write it in the web README's voice with these sections, in order. Each bullet is the content that section must carry.

1. **Title + intro.** The reference mobile app for the madrileno backend, built against the generated oRPC contract; the stack line.
2. **The contract loop.** The web README's diagram with `pnpm run sync-contracts` and `pnpm run typecheck`; renaming a backend DTO field fails typecheck at the mobile call site.
3. **Quick start.** Node 22, pnpm, an Android emulator; `pnpm install`; backend with `DEV_AUTH_ENABLED=true`; `pnpm run android`; `10.0.2.2` explained; `.env.sample`.
4. **Auth.** Dev login only, parity with the web. Tokens in expo-secure-store with an authoritative in-memory mirror and why there is no re-read. Logout is local, because the sessions endpoint is keyed by user agent. How to add Google (`expo-auth-session` → `POST /v1/auth/oidc/{provider}`) and Apple (`expo-apple-authentication` → same; Apple requires its own login next to any social login).
5. **EAS: builds and OTA updates.** The three profiles; `eas init` then `EAS_PROJECT_ID` in the environment; `runtimeVersion: appVersion`; the consent-gated flow and why (an update on disk launches at the next cold start); `update:preview` / `update:production`.
6. **Deep links.** `madrileno://auctions/<id>` works out of the box; `adb shell am start -a android.intent.action.VIEW -d "madrileno://settings"`; universal links behind `EXPO_PUBLIC_ASSOCIATED_DOMAIN` with a pointer to `docs/deep-links.md`; cold-start continuation after login.
7. **Observability.** OTel → OpenObserve, opt-in; the three variables; the token is public by construction and must be ingest-only, with rotation; the backend-forward option as a backend follow-up; the exact pins and why; Sentry as the swap for native crash symbolication.
8. **Testing.** jest-expo + RNTL + MSW; the Maestro flows; what CI runs, and that iOS is gated by prebuild and typecheck only.
9. **Security.** Secure store; no CSP equivalent on native; dev auth gated by `DEV_AUTH_ENABLED`; telemetry token scope; `usesNonExemptEncryption: false`.
10. **Conventions.** Types from the contract; typed errors by code; Temporal not Date; feature folders; `app/` is wiring only; tokens not colors.
11. **Starting a real project.** `node scripts/init-project.mjs my-project`; what it removes; `pnpm run native:prebuild` afterwards because the bundle ids follow the name.
12. **Out of scope, and how to add each.** Push notifications (`expo-notifications` plus a device-token endpoint in the backend); offline persistence (`@tanstack/query-persist-client-core` with MMKV); iOS verification (a Mac or EAS cloud builds plus TestFlight).
13. **Scripts.** A table with every script in `package.json`.
14. **License.** The web README's wording. It must stay the last `## ` section so `init-project` can strip it.

`docs/deep-links.md`: the `assetlinks.json` and `apple-app-site-association` templates with the bundle id placeholder `dev.<scheme>.mobile`, where each is served (`/.well-known/`), the SHA-256 fingerprint command for Android, and the `adb` / `xcrun simctl openurl` test commands.

- [ ] **Step 4: Final gate and commit**

```bash
pnpm run typecheck && pnpm run lint && pnpm run format:check && pnpm test
pnpm run android   # one last pass over every screen, light and dark
git add README.md CLAUDE.md LICENSE docs/deep-links.md
git commit -m "README, CLAUDE.md, LICENSE, deep-link docs"
```

---

## Self-review notes

- **Second review pass (2026-09-21).** Ten findings from an external review were verified and folded in: typed ESLint rules scoped to TS (T1); explicit scaffold package name (T1); jest mock factories with factory-local state and `mock`-prefixed captures (T3, T5, T7, T8); RNTL 14 async `render`/`fireEvent` awaited everywhere (T4–T8); safe-area jest mock (T4); `Field` validity by context with `FieldInput` (T4, T5, T7); hydration failure falls back to logged-out (T3); offset-paged infinite list with an end-reached test (T6); zod 4 `z.coerce.number<string>()` (T7); OTA accept path reports failure and offers retry (T9); `init-project` rewrites the Maestro `appId` (T12).

- **Spec coverage.** Layout (T1, T5); core port (T2); token store (T3); UI and theme (T4); screens (T5–T8); navigation, deep links and return-to (T5, T9, T14); EAS, OTA, assets (T9); observability (T10); error handling (T2 tests, T6/T7 states, T5 gate, T9 swallow); testing (every task); Maestro (T11); init-project (T12); CI (T13); docs and CLAUDE.md (T14). The two spec deviations are stated in Global Constraints and applied in T9 (committed PNGs) and T8 (local logout).
- **Names used across tasks.** `tokenStore.{get,set,subscribe,hydrate,isHydrated,flush}`; `useAuth().{tokens,isHydrated,logout}`; `setReturnTo`/`consumeReturnTo`; `Field`/`FieldLabel`/`FieldError`/`FieldInput`/`useFieldInvalid`; `Screen({scroll,form})`; `useAuctionsInfinite`; `EmptyState`; `ErrorState`; `useThemePreference`; `readThemePreference`/`writeThemePreference`; `checkForOtaUpdate`/`useOtaUpdates`/`OtaDeps{prompt,failed}`; `initObservability`/`installErrorReporting`; test helpers `renderWithProviders`, `mockRouter`, `mockToast`, `secureStoreMock`; fixtures `BASE`, `AUCTION_ID`, `auctionsPageFixture`, `bidsPageFixture`, `bidTooLowProblem`, `listHandler`, `detailHandler`; testIDs `login-email`, `login-submit`, `open-settings`, `auction-<id>`, `bid-open`, `bid-amount`, `bid-submit`, `bid-rejection`, `theme-*`, `logout`, `empty-state`, `error-state`, `field-error`.
