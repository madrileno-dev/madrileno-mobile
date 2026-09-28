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
- NEVER use the JS `Date` global outside `src/api/datetime.ts` and
  `src/updates/useOtaUpdates.ts` (ESLint enforces this). Use `Temporal` from
  `temporal-polyfill`; convert wire values at the boundary with `toInstant` /
  `formatInstant`.
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
  its `_layout.tsx`. There is no `src/app/` directory here (unlike the web
  repo's `src/app/`) — Expo Router would treat it as an alternate routes root.
  Keep feature code under `src/features/`, not `src/app/`.
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
  RNTL 14: `render` and `fireEvent` are async, always `await` them. Mock
  variables captured by `jest.mock` factories must be `mock`-prefixed; state
  that a factory needs lives inside the factory. Maestro flows in `.maestro/`
  (`smoke.yml`, `auctions.yml`).
- Blocks bracketed by `// mobile:auction-block-start` / `-end` are demo wiring
  that `scripts/init-project.mjs` strips — keep the markers accurate.
- UI: this is **react-native-reusables** (shadcn for React Native) on
  NativeWind. Compose the primitives in `src/components/ui/` (`Button`,
  `Input`, `Card`, `Badge`, `Text`) and the `Field` composition in
  `src/components/` — don't hand-write raw `View`/`TextInput` styling in feature
  code. Add more with `pnpm dlx @react-native-reusables/cli@0.7.1 add <name>`;
  those files are vendored (edit freely). Style with tokens (`bg-card`,
  `text-primary`, …), never hard-coded colors, so dark mode and the palette
  (`global.css`) apply. `Field error={…}` (`src/components/Field.tsx`) provides
  the error by context; `FieldInput` is the `Input` that turns it into an
  `accessibilityHint` and `FieldError` renders it as an `alert` live region, so
  a `Controller` can sit between them. React Native has no `invalid`
  accessibility state — don't invent one. `Screen` wraps every screen body
  (`scroll` for content, `form` for inputs); lists use FlashList.
- Navigation: typed routes are on — `router.push('/auctions/[id]')` style hrefs
  are checked. New screens need a file in `app/`; deep links follow from it.

# Modes

- `pnpm run start` — Expo dev server; `pnpm run android` builds and runs on the
  emulator (the API defaults to `http://10.0.2.2:9000`, the emulator's alias
  for the host's backend). iOS builds go through `eas build`; there is no Mac
  in the loop, so state clearly when something is unverified on iOS.
- Native config changes (bundle id, plugins, associated domains) need
  `pnpm run native:prebuild` to regenerate `android/`/`ios/` — neither is
  committed. The script isn't named `prebuild`: npm/pnpm would otherwise run
  it automatically as `build`'s pre-hook.
- OTA updates and RUM are opt-in via env and inert in dev; don't add code
  paths that assume they're on.
