# Deep links

Custom-scheme deep links (`madrileno://…`) work with no extra setup — Expo
Router turns every route into one. This doc covers the universal / App Links
opt-in: `https://` links that open the app directly instead of a browser, via
`EXPO_PUBLIC_ASSOCIATED_DOMAIN` (see `.env.sample` and `app.config.ts`).

## How it's wired

Setting `EXPO_PUBLIC_ASSOCIATED_DOMAIN=app.example.com` at build time makes
`app.config.ts` add:

- iOS: `associatedDomains: ["applinks:app.example.com"]`
- Android: an `autoVerify` intent filter for `https://app.example.com/*`

Both platforms verify the domain by fetching a well-known file from it at
install/link time, so you also need to serve one of the templates below from
that domain — not from the app.

## Android: `assetlinks.json`

Served at `https://app.example.com/.well-known/assetlinks.json`, exactly:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "dev.<scheme>.mobile",
      "sha256_cert_fingerprints": ["<SHA256_FINGERPRINT>"]
    }
  }
]
```

`<scheme>` is the app's scheme (`app.config.ts`, derived from `package.json`'s
`name`). Get the signing certificate's fingerprint:

```bash
# Local debug/release keystore:
keytool -list -v -keystore <path-to-keystore> -alias <alias> | grep 'SHA256:'

# EAS-managed credentials:
eas credentials
```

A release build can carry more than one fingerprint (e.g. Play App Signing's
key differs from your upload key) — list every one that needs to open the
link.

## iOS: `apple-app-site-association`

Served at `https://app.example.com/.well-known/apple-app-site-association`
(no file extension, `Content-Type: application/json`):

```json
{
  "applinks": {
    "details": [
      {
        "appID": "<TEAM_ID>.dev.<scheme>.mobile",
        "paths": ["/auctions/*", "/settings"]
      }
    ]
  }
}
```

`<TEAM_ID>` is the Apple Developer Team ID (Apple Developer → Membership).
Not verifiable in this repo — see the README's Testing section for why
(no Mac, no Apple account).

## Testing

Custom scheme (works out of the box, no domain needed):

```bash
adb shell am start -a android.intent.action.VIEW -d "madrileno://auctions/123"
xcrun simctl openurl booted "madrileno://auctions/123"
```

Universal / App Links (needs the domain serving the file above, and the app
installed from a build with `EXPO_PUBLIC_ASSOCIATED_DOMAIN` set):

```bash
adb shell am start -a android.intent.action.VIEW -d "https://app.example.com/auctions/123"
xcrun simctl openurl booted "https://app.example.com/auctions/123"
```

If Android opens the link in a browser instead of the app, re-check the
intent filter's verification status:

```bash
adb shell pm get-app-links dev.<scheme>.mobile
```
