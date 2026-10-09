# Maestro flows

- `smoke.yml` — launches the app and asserts the login screen. No backend. Runs in CI.
- `auctions.yml` — dev login, settings, list, detail, a too-low bid. Needs the backend
  (`DEV_AUTH_ENABLED=true`, one open auction). Local only.

Run against a booted emulator with the app installed:

    pnpm run e2e                     # both flows
    maestro test .maestro/smoke.yml  # one flow
