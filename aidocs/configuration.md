# Configuration

> Environment variables (UI and mock server), `next.config.ts`, TypeScript and tooling config, feature flags, Node/package-manager requirements and scripts. Read it before touching env vars, build config or scripts. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [architecture](architecture.md) · [routing-and-navigation](routing-and-navigation.md) · [api-layer](api-layer.md) · [mock-server](mock-server.md) · [testing](testing.md) · [../README.md](../README.md)

## UI

Env files: copy [`.env.example`](../url-shortener-ui/.env.example) to `.env` inside `url-shortener-ui/` (`.env*` is git-ignored except `.env.example`). The README table ([../README.md](../README.md), "Environment Variables" under `url-shortener-ui`) lists the same variables.

| Variable | Default when unset | Effect |
|---|---|---|
| `BACKEND_API_BASE_URL` | `http://localhost:8080` | Backend base URL, **server-only**. Read through `getBackendApiBaseUrl()` in [`src/lib/backend-url.ts`](../url-shortener-ui/src/lib/backend-url.ts) by the `/api/:path*` rewrite (evaluated at build time), the SSE route handler and the inspect page (both read it at request time). Never import that module from client code. |
| `NEXT_PUBLIC_API_BASE_URL` | unset | Deprecated fallback for `BACKEND_API_BASE_URL`, used only when that is unset. Rename it: `NEXT_PUBLIC_` values are inlined at build time and can end up in browser bundles. |
| `NEXT_PUBLIC_ENABLE_TURNSTILE` | disabled | Turnstile is on only when the value is exactly the string `"true"`. Read in `login/page.tsx` and `(legal)/report-abuse/page.tsx`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `""` | Site key for the widget. If Turnstile is enabled and the key is empty, both pages throw `NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when Turnstile is enabled`. |
| `CSP_ENFORCE` | `false` | `"true"` sends the Content-Security-Policy as `Content-Security-Policy` (enforced); anything else sends `Content-Security-Policy-Report-Only` (violations reported in the console, nothing blocked). Read by `next.config.ts` at build/start time, not inlined into the client. |
| `NEXT_PUBLIC_BILLING_ORIGINS` | empty | Comma-separated `https://` origins of the payment provider's hosted checkout and portal pages. `parseBillingUrl` in [`src/lib/billing-redirect.ts`](../url-shortener-ui/src/lib/billing-redirect.ts) only follows API-returned billing URLs on these origins; outside production `http(s)://localhost` is always allowed for the mock. Empty in production = every billing redirect is refused (fail closed). When the mock is reached via another host (LAN IP, production build), add its origin here. Build-time (inlined into the client). |

Facts that matter when changing them:

- `NEXT_PUBLIC_*` values are inlined at build time; restart `next dev` or rebuild after changing them. The rewrite target is also fixed at build time; server code reads `BACKEND_API_BASE_URL` at request time.
- Browser API calls always use the relative base `API_BASE_URL = "/api"` ([api-layer](api-layer.md)), never the backend base URL. The rewrite forwards `/api/x` to `<backend>/x`, which keeps cookies same-origin. Only server-side code (via `getBackendApiBaseUrl()`) talks to the backend origin directly; the browser never does, and no browser bundle contains the backend host.
- `.env.example` ships `NEXT_PUBLIC_ENABLE_TURNSTILE=true` with Cloudflare's always-pass test key `1x00000000000000000000AA` and documents the other dummy keys in comments. Never commit real keys. Set the flag to `false` for local work without Turnstile; tests set the env per test (see [testing](testing.md)).
- The mock server does not verify Turnstile tokens.
- `NODE_ENV` is read by [`src/lib/logger.ts`](../url-shortener-ui/src/lib/logger.ts) (minimum level `warn` in production, `debug` otherwise).

## Mock server

Env files: copy [`.env.example`](../url-shortener-mock-server/.env.example) to `.env` inside `url-shortener-mock-server/`; `dotenv/config` is imported first in `src/index.ts`. Variables are read directly from `process.env` (there is no config module). Behaviour of each feature: [mock-server](mock-server.md).

| Variable | Default | Effect (code reference) |
|---|---|---|
| `PORT` | `8080` | Listen port (`src/index.ts`). |
| `FRONTEND_URL` | `http://localhost:3000` | Where OAuth/OTT flows and hosted billing pages redirect back to (`AuthController`, `BillingController`, startup log). |
| `MOCK_DELAY` | `0` | Milliseconds of artificial latency on every response (`middleware/delay.ts`); only values above 0 delay. |
| `RANDOM_ANALYTICS_DATA` | `false` | When exactly `"true"`, analytics responses are randomised per request (`AnalyticsController`). |
| `MOCK_COOLDOWN_ENABLED` | enabled | Magic-link cooldown is on unless the value is exactly `"false"` (`AuthController`). |
| `MOCK_COOLDOWN_SECONDS` | `60` | Cooldown length in seconds (`AuthController`). |
| `MOCK_COOKIE_SAMESITE` | `lax` | `SameSite` of the `refresh_token` cookie (`lax`, `strict`, `none`). Use `none` for cross-domain deployments (`AuthController`). |
| `MOCK_COOKIE_SECURE` | `false` | `Secure` flag of the cookie when exactly `"true"`; required by browsers with `SameSite=none`. |
| `MOCK_BILLING_SCENARIO` | `free` | Initial billing state of each new sandbox user: `free`, `pro-monthly`, `pro-yearly`, `pro-pending`, `pro-canceling`, `trialing`, `past-due`, `canceled`, `expired`. Unknown values fall back to `free` (`BillingService`). |
| `MOCK_BILLING_PORTAL_EXPIRY` | `reported` | Portal expiry payload: `reported`, `omitted`, `invalid`, `expired`. Unknown values fall back to `reported`. |
| `MOCK_BILLING_TRACE` | `false` | When exactly `"true"`, logs `[mock billing] METHOD path status` per billing request (no query strings, tokens or session URLs) (`middleware/billingTrace.ts`). |
| `MOCK_PUBLIC_URL` | request protocol + host | Origin used to build hosted checkout/portal URLs; set it when the mock server sits behind a proxy (`BillingController`). Commented out in `.env.example`. |

The request header `x-mock-error: true` simulates a 500 on any request (not an env var; see [mock-server](mock-server.md)).

### README discrepancies (verified against code)

- Observation: the README mock table omits `RANDOM_ANALYTICS_DATA`, `MOCK_COOLDOWN_ENABLED` and `MOCK_COOLDOWN_SECONDS`, which the code reads and `.env.example` lists.
- Observation: the README table gives `MOCK_PUBLIC_URL` the value `http://localhost:8080` in its "Example" column; the code has no such default and falls back to the request's protocol and host.
- Observation: the README lists `MOCK_COOKIE_SAMESITE` and `MOCK_COOKIE_SECURE`, but `.env.example` does not contain them.
- Observation: `MOCK_DELAY` is `0` in the README example column and `200` in `.env.example` (the code default is `0`).

## `next.config.ts`

[`next.config.ts`](../url-shortener-ui/next.config.ts):

| Option | Value | Notes |
|---|---|---|
| `reactCompiler` | `true` | React Compiler is on (`babel-plugin-react-compiler` is a devDependency). Memoisation guidance: [coding-patterns](coding-patterns.md). |
| `experimental.optimizePackageImports` | `radix-ui`, `lucide-react` | Barrel-import optimisation. |
| `output` | `standalone` | Production build emits a self-contained server. |
| `rewrites()` | `/api/:path*` -> `${getBackendApiBaseUrl()}/:path*` | The browser's only path to the backend. The route handler `app/api/shortlinks/import/updates/route.ts` is a filesystem route, so it is served instead of the rewrite for that one path ([architecture](architecture.md#sse-pass-through-route-handler)). |
| `redirects()` | `/settings` -> `SETTINGS_ROUTES.DEFAULT` (307) | Answers before any HTML; links target the destination directly ([routing-and-navigation](routing-and-navigation.md#redirects)). |

`poweredByHeader: false` drops `X-Powered-By`. `headers()` adds the security headers built in [`src/lib/security-headers.ts`](../url-shortener-ui/src/lib/security-headers.ts) to every route (`/:path*`) and `Referrer-Policy: no-referrer` to `/auth/:path*`:

- Content-Security-Policy, Report-Only unless `CSP_ENFORCE=true`. `script-src` and `style-src` need `'unsafe-inline'` because every page is prerendered and carries inline flight/palette scripts (a nonce would force dynamic rendering); `'unsafe-eval'` and the absence of `upgrade-insecure-requests` are development-only. Allowed third parties: Turnstile (`script-src`, `frame-src`) and any `https:` image; `connect-src` is `'self'` only, because every browser request goes through `/api`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (with `frame-ancestors 'none'`), `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` denying camera, microphone, geolocation, payment and USB, and HSTS in production builds only.
- A new third-party origin (script, frame, API, font) must be added to the policy in `security-headers.ts` and its test; check the browser console for `[Report Only]` violations after adding one.

There is no `middleware.ts`/`proxy.ts` and no `env` block.

- Observation: other remote images (OG images through `wsrv.nl` in `OgImage`) are plain `<img>` elements. Country flags are no longer remote: they come from a local sprite (see [features/analytics](features/analytics.md#components)). There is no `images.remotePatterns`: the favicon `next/image` is `unoptimized`, so the old Google entry was dead config and was removed. Existing exception - not a template; new images use `next/image` ([coding-patterns](coding-patterns.md)).

## TypeScript and path alias

- [`tsconfig.json`](../url-shortener-ui/tsconfig.json): `strict`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit`, `incremental`, `paths: {"@/*": ["./src/*"]}`. It excludes all `*.test.ts(x)` and `src/test`.
- [`tsconfig.test.json`](../url-shortener-ui/tsconfig.test.json) extends it, adds `vitest/globals` and `@testing-library/jest-dom` types and includes `src/**` plus `vitest.config.ts`. `pnpm type-check` runs both projects.
- The same `@/` alias is mirrored in [`vitest.config.ts`](../url-shortener-ui/vitest.config.ts) (`resolve.alias`) and in `components.json` aliases. Use `@/...` imports for cross-folder imports.
- The mock server has its own [`tsconfig.json`](../url-shortener-mock-server/tsconfig.json): CommonJS, ES2022, `strict`, `rootDir: src`, `outDir: dist`; no alias.

## Tooling config

- **shadcn:** [`components.json`](../url-shortener-ui/components.json): style `new-york`, `rsc: true`, base colour `neutral`, CSS variables, CSS entry `src/app/globals.css`, no Tailwind config file, icon library `lucide`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, extra registry `@aceternity`. Styling conventions: [styling-and-theming](styling-and-theming.md).
- **Tailwind v4 / PostCSS:** [`postcss.config.mjs`](../url-shortener-ui/postcss.config.mjs) registers `@tailwindcss/postcss`; there is no `tailwind.config.*`.
- **ESLint:** [`eslint.config.mjs`](../url-shortener-ui/eslint.config.mjs) flat config extending `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`; ignores `.next`, `out`, `build`, `next-env.d.ts`.
- **Vitest:** jsdom, globals, `setupFiles`, auto-reset flags and coverage thresholds are documented in [testing](testing.md).
- **Formatting:** no Prettier or EditorConfig in the repo.

## Feature flags

The only feature flag is Turnstile (`NEXT_PUBLIC_ENABLE_TURNSTILE`, see [UI](#ui)). It gates the CAPTCHA on the magic-link form (`login/page.tsx`) and on the abuse report form. No other flags, remote config or per-environment toggles exist.

## Node, package manager and versions

- Node: 24 (LTS). `engines.node` is `>=24` in the root, UI and mock-server `package.json`; [`.node-version`](../.node-version) at the repository root pins `24` for nvm, fnm, Volta and editors; both packages use `@types/node` `^24`. The README states Node `>= 24.0.0`. Development, tests and the production server (`output: standalone`) should all run the same major version.
- Package manager: pnpm workspaces. Root `package.json` has no `packageManager` field; the README says pnpm `>= 9.0.0` (not enforced). The lockfile is written by pnpm 10 (`lockfileVersion: '9.0'`). Newer pnpm majors re-resolve unrelated peer dependencies when they rewrite it, so after a dependency change update it with `npx pnpm@10 install --lockfile-only` and check that `git diff pnpm-lock.yaml` touches only the packages you changed. [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) lists both packages and an `allowBuilds` block (esbuild and unrs-resolver allowed, sharp not).
- Installed versions at the time of writing (from `node_modules`): Next 16.2.6, React 19.2.6, Zustand 5.0.13, Tailwind 4.3.0, Vitest 4.1.9, TypeScript 5.9.3. The mock server uses Express 4, `tsx`, `dotenv`, `node-html-parser`.
- Observation: the root `package.json` also declares `workspaces` and an `overrides` block (pnpm reads `pnpm-workspace.yaml`, not `workspaces`) and a root `next` dependency (`^16.2.6`, the UI declares `^16.2.3`). Existing configuration - do not change as a drive-by.

## Scripts

Root ([`package.json`](../package.json)), run from the repository root:

| Script | Runs |
|---|---|
| `pnpm install` / `install:all` | Install both packages. |
| `pnpm dev` | UI and mock server in parallel. |
| `pnpm dev:ui`, `dev:ui:clean`, `dev:mock` | One side only; `dev:ui:clean` removes `.next` first. |
| `pnpm build` | UI build only. |
| `pnpm clean` | Removes the UI `.next`. |
| `pnpm lint` | UI `eslint` only. |
| `pnpm test` | UI `test:run` then mock-server tests, once. |
| `pnpm typecheck` | Mock server `tsc --noEmit` only. |

`url-shortener-ui` scripts: `dev`, `dev:clean`, `clean`, `build`, `start`, `lint`, `test` (watch), `test:run`, `test:ui`, `test:coverage`, `type-check` (app and tests). Test scripts set `NODE_OPTIONS=--no-deprecation`. Test details: [testing](testing.md).

Mock server scripts: `dev` (`tsx watch src/index.ts`), `start` (`node dist/index.js`), `build` (`tsc`), `typecheck`, `test` (`node --import tsx --test 'src/**/*.test.ts'`).

There is no CI workflow; every check runs locally. The root `typecheck` does not cover the UI, so run `pnpm --filter=url-shortener-ui type-check` for it.

- Observation: README says `pnpm --filter=url-shortener-ui start` is the way to try production mode, while `next.config.ts` sets `output: 'standalone'` (Next documents `server.js` in `.next/standalone` as the standalone entry). Not verified here by running a build.
- Observation: the README API reference does not list several endpoints that the UI calls (`API_ENDPOINTS` in `src/lib/constants.ts` includes shortlinks export/import/random/exists, `/public/preview/{key}`, `/public/abuse/report`, `/urlcleaner`, `/users/me/preferences`).
