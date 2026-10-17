# Mock server

> How `url-shortener-mock-server` is built and how to change it so it stays in sync with the UI; read it before adding or changing an endpoint, or when a UI flow behaves differently against the mock. Paths are relative to `url-shortener-mock-server/` unless stated otherwise.

Related: [api-layer](api-layer.md) · [configuration](configuration.md) · [testing](testing.md) · [features/auth](features/auth.md) · [features/billing-and-settings](features/billing-and-settings.md) · [features/links-and-tags](features/links-and-tags.md) · [features/analytics](features/analytics.md)

## Purpose and shape

The real backend is a closed-source REST API; the mock server (Express 4 + TypeScript, package `@url-shortener/url-shortener-mock-server`) mirrors every endpoint the UI uses with in-memory data. The UI reaches it through the Next.js `/api/*` rewrite (see [configuration](configuration.md)), so UI requests use an `/api` prefix while the mock's routes are unprefixed. Setup, ports and the API reference table are in the root [README](../README.md) (mock-server sections); this guide describes the code.

Layering: `routes/*.ts` (path + middleware wiring only) to `controllers/*Controller.ts` (HTTP: parse request, status codes, response shape) to `services/*Service.ts` (logic and state) to `services/MemoryStore.ts` (per-user state). Controllers are classes of static methods; services are singleton instances (`shortLinksService`, `tagsService`, `usersService`, `analyticsService`, `importJobsService`, `billingService`, `authService`).

Scripts (from [`package.json`](../url-shortener-mock-server/package.json)): `dev` (`tsx watch src/index.ts`), `build` (`tsc`), `start` (`node dist/index.js`), `typecheck`, `test`. Tests: [testing](testing.md#mock-server-tests).

## Request pipeline

Order in [`src/index.ts`](../url-shortener-mock-server/src/index.ts) (mock server):

| # | Middleware | Job |
|---|---|---|
| 1 | `cors` ([`middleware/cors.ts`](../url-shortener-mock-server/src/middleware/cors.ts)) | Any origin (`origin: true`), credentials on, methods `GET POST PUT DELETE OPTIONS`, allowed headers `Content-Type`, `Authorization`, `x-mock-error`; exposes `X-Rate-Limit-Retry-After-Seconds` and `Retry-After` |
| 2 | `express.json()`, `express.urlencoded()` | JSON and form bodies (forms are used by the fake billing pages) |
| 3 | `express.text({ type: "text/csv", limit: "100kb" })` | CSV import body as a string; larger bodies produce 413 via `jsonErrors` |
| 4 | `delay` ([`middleware/delay.ts`](../url-shortener-mock-server/src/middleware/delay.ts)) | Waits `MOCK_DELAY` ms (read per request) before continuing |
| 5 | `errorSimulation` ([`middleware/errorSimulation.ts`](../url-shortener-mock-server/src/middleware/errorSimulation.ts)) | Header `x-mock-error: true` returns 500 `{ error, message }` immediately, before any route |
| 6 | Routers: auth, users, shortlinks, analytics, tags, abuse, billing | Endpoints (below) |
| 7 | `jsonErrors` ([`middleware/jsonErrors.ts`](../url-shortener-mock-server/src/middleware/jsonErrors.ts)) | Error handler: body-parser/unexpected errors become `{ detail }` with the error's `status` (default 500) |
| 8 | `GET /health` | Registered after the error handler; returns `{ status: "ok", timestamp }` |

Per-route middleware:

- `authentication` ([`middleware/authentication.ts`](../url-shortener-mock-server/src/middleware/authentication.ts)): requires `Authorization: Bearer <jwt>`. The token is not verified; the payload `sub` must be `mock-user-<uuid>` with a well-formed UUID, and that UUID must already have state in `memoryStore` (otherwise 401 `User not logged in.`). On success it sets `req.user.uuid`. All 401s are `{ error: "Unauthorized", message }`.
- `billingTrace` ([`middleware/billingTrace.ts`](../url-shortener-mock-server/src/middleware/billingTrace.ts)): mounted on `/billing`; when `MOCK_BILLING_TRACE=true` logs `[mock billing] METHOD path status` after each response (query string stripped, never tokens). Does not cover `/mock/billing/*`.
- `billingRateLimit` ([`middleware/billingRateLimit.ts`](../url-shortener-mock-server/src/middleware/billingRateLimit.ts)): fixed one-minute window per `uuid + method + path`; 60 requests for GET, 10 for other methods. Over the limit: 429 `{ detail }` with `Retry-After` and `X-Rate-Limit-Retry-After-Seconds`. Constants live in [`services/billing-constants.ts`](../url-shortener-mock-server/src/services/billing-constants.ts).

## Endpoints

| Router | Endpoints | Auth |
|---|---|---|
| [`routes/auth.ts`](../url-shortener-mock-server/src/routes/auth.ts) | `POST /ott/generate`, `POST /ott/login`, `GET /auth/code/exchange`, `POST /token/refresh`, `GET /oauth2/authorization/google` | none |
| [`routes/users.ts`](../url-shortener-mock-server/src/routes/users.ts) | `GET /users/me`, `PUT /users/me/name`, `GET`/`PUT /users/me/preferences`, `GET /users/sessions`, `DELETE /users/sessions/current`, `/other`, `/:id` | yes |
| [`routes/shortlinks.ts`](../url-shortener-mock-server/src/routes/shortlinks.ts) | `GET /shortlinks`, `/random`, `/export`, `/byIds`, `/:key/exists`, `/import/updates` (SSE); `POST /shortlinks`, `/import`; `PUT /shortlinks`; `DELETE /shortlinks/:id`; `GET /longurl/title`; `POST /urlcleaner` | yes |
| same | `GET /public/preview/:key` | none |
| [`routes/tags.ts`](../url-shortener-mock-server/src/routes/tags.ts) | `GET`/`POST`/`PUT /tags`, `DELETE /tags/:id` | yes |
| [`routes/analytics.ts`](../url-shortener-mock-server/src/routes/analytics.ts) | `GET /analytics` | yes |
| [`routes/abuse.ts`](../url-shortener-mock-server/src/routes/abuse.ts) | `POST /public/abuse/report` | none |
| [`routes/billing.ts`](../url-shortener-mock-server/src/routes/billing.ts) | `GET /billing/subscription`, `POST /billing/checkout`, `/billing/portal`, `/billing/subscription/upgrade` | yes + rate limit |
| same | `POST /mock/billing/scenario` | yes, no rate limit |
| same | `GET`/`POST /mock/billing/checkout/:token`, `GET`/`POST /mock/billing/portal/:token`, `POST /mock/billing/portal/:token/scenario` | none (token in URL) |

Notes on behaviour that differs from what a REST API usually does:

- Error body shapes are not uniform: most controllers return `{ error: "..." }`, import and billing return `{ detail: "..." }`, auth returns `{ error, message }`, public preview 404 returns `{ type: "about:blank", title, status }`. The UI error handling that copes with this is in [api-layer](api-layer.md).
- `DELETE /tags/:id` returns 204; `POST /abuse/report` returns 201 with `status: "RECEIVED"`; `GET /shortlinks/:key/exists` returns 404 `{ exists: false }` when free.
- `GET /public/preview/:key` fetches the long URL's Open Graph data ([`services/OpenGraphService.ts`](../url-shortener-mock-server/src/services/OpenGraphService.ts): 3 s timeout, 50 KB cap) and `GET /longurl/title` does the same for the create-link form; failures degrade to empty data, not errors. This is the only outbound network access of the mock.
- `POST /urlcleaner` and the preference `urlCleanerMode` (`DISABLE`, `SUGGEST`, `AUTO_CLEAN`, default `SUGGEST`) back the URL cleaner ([`services/UrlCleanerService.ts`](../url-shortener-mock-server/src/services/UrlCleanerService.ts)); see [features/links-and-tags](features/links-and-tags.md).
- Analytics: `groupBy` (`date`, `country`, `continent`, `device`, `os`, `referrer`, `top_link`), `period` (`P7D`, `P30D`, `P90D`), `start`/`end`. With `start`+`end` and no `groupBy` it returns a bare number (constant prior-period total chosen by range length, used for comparison badges). `RANDOM_ANALYTICS_DATA=true` randomises click data per request. See [features/analytics](features/analytics.md).
- CSV import: `POST /shortlinks/import` (text/csv body, query `generateTakenKeys`, `fileName`) creates one job per user; a second job while one is active returns 422. [`services/ImportJobsService.ts`](../url-shortener-mock-server/src/services/ImportJobsService.ts) processes one row per 100 ms and publishes progress; `GET /shortlinks/import/updates` is a `text/event-stream` emitting `event: progress` with `{ processedRows, totalRows }` and ending when the job completes (or immediately when no job is active). The UI consumes it through the pass-through route handler described in [api-layer](api-layer.md).

## Auth and sandbox isolation

State is keyed by a **sandbox UUID** and lives only in memory.

1. Login flows produce a code containing the UUID: Google sandbox page ([`views/loginPage.ts`](../url-shortener-mock-server/src/views/loginPage.ts), `GET /oauth2/authorization/google`) uses `mock-google-code-<uuid>`; `POST /ott/login` (`loginType` `token` or `otp`, any token/code accepted, validates only that fields are present) redirects to `<FRONTEND_URL>/auth/exchange?code=mock-auth-code-<uuid>` with a fresh random UUID.
2. `GET /auth/code/exchange?code=...` extracts the UUID, calls `memoryStore.registerUserSession(uuid)` (creates state on first use, reuses it on resume), sets the `refresh_token` cookie `mock-refresh-token-<uuid>` (HttpOnly, 7 days, `SameSite` and `Secure` from env, path `/`) and returns `{ accessToken }`. A missing or malformed UUID clears the cookie and returns 401.
3. `POST /token/refresh` reads that cookie, re-registers the UUID and returns a new access token; invalid cookie clears it and returns 401.
4. The access token is an unsigned JWT-shaped string ([`services/AuthService.ts`](../url-shortener-mock-server/src/services/AuthService.ts)): payload `sub: mock-user-<uuid>`, `accountId`, `name`, `email`, `scope: "business"`, 1 hour expiry (not enforced by `authentication`).
5. `POST /ott/generate` has a per-email cooldown (429 with `Retry-After`) unless `MOCK_COOLDOWN_ENABLED=false`; duration `MOCK_COOLDOWN_SECONDS` (default 60). The cooldown map is module-level and is not reset between requests.

Client-side use of these flows: [features/auth](features/auth.md), token handling: [api-layer](api-layer.md).

## MemoryStore and seed data

[`services/MemoryStore.ts`](../url-shortener-mock-server/src/services/MemoryStore.ts) holds `Map<uuid, UserState>`. `UserState` = `links`, `tags`, `tagAssociations` (link id to tag ids), `user`, `sessions`, `preferences`. `registerUserSession` builds a fresh state from the JSON in [`src/data`](../url-shortener-mock-server/src/data): `shortlinks.json`, `tags.json`, `users.json`, `sessions.json`; `analytics.json` is read by `analyticsService` and not copied per user. The seeded user is "John Doe" with `john.doe@<first 8 uuid chars>.dev` and `accountId` `acc-<first 8 chars>`. Mutations affect only the calling user's state; a server restart wipes everything, after which existing tokens fail with 401 `User not logged in.` until the user logs in again (a refresh cookie re-registers the UUID).

Billing and import-job state is held in separate in-memory maps (`BillingService.states`/`sessions`, `ImportJobsService.jobs`) keyed by the same UUID, not in `UserState`.

## Billing simulation

Endpoints and UI behaviour: [features/billing-and-settings](features/billing-and-settings.md); step-by-step reproduction and the `curl` examples are in the root [README](../README.md) ("Mock Billing and Portal-Return Reproduction"). Implementation facts:

- Scenarios ([`services/billing-constants.ts`](../url-shortener-mock-server/src/services/billing-constants.ts)): `free`, `pro-monthly`, `pro-yearly`, `pro-pending`, `pro-canceling`, `trialing`, `past-due`, `canceled`, `expired`. A user's first billing request initialises state from `MOCK_BILLING_SCENARIO` (default `free`). `POST /mock/billing/scenario` `{ scenario, portalExpiryMode? }` resets that user's state and invalidates their hosted sessions.
- `plan` in the response is derived: `PRO` only when status is `ACTIVE`/`TRIALING` and `currentPeriodEnd` is in the future, otherwise `FREE`.
- Portal expiry modes (`reported`, `omitted`, `invalid`, `expired`) shape `expiresInSeconds` in `POST /billing/portal` or create an already-expired session; default from `MOCK_BILLING_PORTAL_EXPIRY`.
- Error statuses from [`services/BillingService.ts`](../url-shortener-mock-server/src/services/BillingService.ts) (`BillingError`): 400 invalid period/scenario/action, 404 no customer or subscription, 409 checkout while already Pro or conflicting upgrade, 410 missing/expired hosted session, 422 upgrade on a non-active subscription, 429 rate limit. All billing responses carry `Cache-Control: no-store`.
- Hosted pages ([`views/billingPage.ts`](../url-shortener-mock-server/src/views/billingPage.ts), styles in [`views/billingPageStyles.ts`](../url-shortener-mock-server/src/views/billingPageStyles.ts)) are server-rendered HTML with plain forms and an inline dark stylesheet (no assets, generic "Mock billing" branding; subscription card with status badge, dates formatted in UTC, a collapsible "Sandbox controls" panel). Covered by `views/billingPage.test.ts`. Behaviour: checkout completes and redirects (303) to `<FRONTEND_URL>/settings/billing`; the portal offers cancel/resume/end-subscription, cancel yearly switch and a scenario selector. Session URLs use `MOCK_PUBLIC_URL` or the request origin. Sessions live 60 minutes.

## Environment variables

Names, defaults and effects are tabulated in [configuration](configuration.md#mock-server) and, partially, in the root [README](../README.md) and [`.env.example`](../url-shortener-mock-server/.env.example). Variables the code reads: `PORT`, `FRONTEND_URL`, `MOCK_DELAY`, `MOCK_COOKIE_SAMESITE`, `MOCK_COOKIE_SECURE`, `RANDOM_ANALYTICS_DATA`, `MOCK_COOLDOWN_ENABLED`, `MOCK_COOLDOWN_SECONDS`, `MOCK_BILLING_SCENARIO`, `MOCK_BILLING_PORTAL_EXPIRY`, `MOCK_BILLING_TRACE`, `MOCK_PUBLIC_URL`. Several are read at module load (cookie options, cooldown, trace), so restart the server after changing them; `MOCK_DELAY`, `FRONTEND_URL` in billing, scenario and expiry defaults are read per request.

## Keeping UI and mock in sync

When the UI gains or changes an endpoint (this is also required by [CONTRIBUTING](../CONTRIBUTING.md)):

1. Add the UI side first: types and call in the layers described in [api-layer](api-layer.md); remember the UI calls `/api/<path>`.
2. Add the route in `routes/<area>.ts` with `authentication` unless the real endpoint is public; wire it to a static method in the controller.
3. Put request parsing, status codes and response shape in the controller; put logic and state in the service; keep per-user state in `UserState` (extend its initialiser in `MemoryStore` and the seed JSON when new data is needed). Always read the user via `req.user.uuid`, never a shared global.
4. Use the status codes and error body shape the real API uses for that area (see the non-uniform shapes above and what the UI error handling expects).
5. If it is a new router, register it in `src/index.ts` **and** in `createTestApp()` in `src/test-utils.ts`.
6. Add `routes/<area>.test.ts` and service tests ([testing](testing.md#mock-server-tests)); update the endpoint table in the root [README](../README.md).
7. For error-path UI testing, remember `x-mock-error: true` makes any endpoint fail with 500 without code changes.

## Known limitations and existing exceptions

- Observation: README states the UUID is in both `access_token` and `refresh_token` cookies and that any invalid-UUID API request wipes the cookie. In code only `refresh_token` is a cookie (the access token is returned in the response body) and only `/auth/code/exchange` and `/token/refresh` clear it; `authentication` just returns 401. README is not the source of truth here.
- Observation: README's mock env table is out of date; the verified differences are listed in [configuration](configuration.md#readme-discrepancies-verified-against-code).
- Observation: all state is lost on restart, and there is no endpoint to reset the non-billing state of a sandbox.
- Observation: access-token expiry and signature are never checked, and the refresh cookie is not invalidated by logout/session deletion endpoints.
- Observation: the CORS `methods` list lacks `PATCH`; adding a `PATCH` endpoint needs a change in `middleware/cors.ts`.
- Observation: `/health` is registered after the error handler and is absent from the test app.
- Observation: error body shapes are inconsistent across controllers (see Endpoints). Existing exception — not a template; do not unify as a drive-by, the UI error handling depends on the current shapes.
