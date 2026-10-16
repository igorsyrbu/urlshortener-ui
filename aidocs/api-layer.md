# API Layer

> How the UI talks to the external REST API: `fetchWithAuth`, token refresh, DTOs, error handling, pagination helper, SSE client, billing API module, and where fetches are allowed to live. Read before adding or changing any network call. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [state-management.md](state-management.md) · [architecture.md](architecture.md) · [configuration.md](configuration.md) · [mock-server.md](mock-server.md) · [testing.md](testing.md) · [features/auth.md](features/auth.md) · [features/billing-and-settings.md](features/billing-and-settings.md)

## Data-fetching rule (client-rendered app)

The UI is client-rendered against an external REST API. By product decision there is **no SSR and no server-side data fetching**: do not add Server Components that fetch, API routes, or server actions acting as a backend layer. All authenticated requests are made in the browser through `fetchWithAuth`.

Where fetches live today (use these homes for new code):

| Home | What goes there | Examples |
|---|---|---|
| Zustand store action | Data shared across components or pages: lists, filters, loading/error flags | `fetchLinks` in [`src/lib/store/links.ts`](../url-shortener-ui/src/lib/store/links.ts), `fetchAnalytics` in [`src/lib/store/analytics.ts`](../url-shortener-ui/src/lib/store/analytics.ts) |
| `lib/*-api.ts` module | A group of related endpoints with DTO parsing and typed errors | [`src/lib/billing-api.ts`](../url-shortener-ui/src/lib/billing-api.ts), [`src/lib/link-transfer.ts`](../url-shortener-ui/src/lib/link-transfer.ts) (CSV import/export) |
| Hook in `lib/hooks` | Mutations or loads owned by one feature, with local pending/error state | `useTagMutations`, `useUrlCleaner`, `useBillingSubscription` in `src/lib/hooks/` |
| Component handler | One-off mutations tied to a single form or dialog | `CreateLinkModal`, `EditLinkModal` |

Pages trigger loads from `useEffect` by calling a store action; the fetch itself stays in the store. Store design is in [state-management.md](state-management.md). Never import `fetchWithAuth` into a Server Component.

## `fetchWithAuth`

Defined in [`src/lib/api.ts`](../url-shortener-ui/src/lib/api.ts). Signature: `fetchWithAuth(endpoint: string, options?: RequestInit): Promise<Response>`.

- `endpoint` is a path such as `API_ENDPOINTS.SHORTLINKS` (never a full URL). The helper prepends `API_BASE_URL` (`"/api"`), so the browser calls the Next.js origin and the `/api/:path*` rewrite in `next.config.ts` forwards to the backend (see [configuration.md](configuration.md)).
- All endpoint paths are in `API_ENDPOINTS` in [`src/lib/constants.ts`](../url-shortener-ui/src/lib/constants.ts). Dynamic ones are functions (`SHORTLINKS_EXISTS(key)`, `SHORTLINKS_PREVIEW(key)`). Add new paths there.
- Headers: `Content-Type: application/json` is always set (callers override it, e.g. `text/csv`), `Authorization: Bearer <token>` is added when a token exists. Caller headers are merged on top of the defaults.
- It returns the raw `Response`; it does not throw on non-2xx. Callers check `res.ok`.
- Network errors and aborts (`signal`) propagate as thrown errors.

### Token refresh

The access token lives only in memory, in `useAuthStore.accessToken` (see [features/auth.md](features/auth.md)). It is not persisted; a page reload starts without a token and the first request refreshes it using the HTTP-only cookie.

1. **No token yet** (`ensureValidToken`): the first caller sets the module-level `isRefreshing` flag and calls `POST /api/token/refresh` with `credentials: "include"` (accepts `accessToken` or `access_token` in the body). Callers arriving meanwhile are parked in `failedQueue` and released when that refresh settles.
2. **Refresh fails**: `redirectToLogin()` does a hard `window.location.href = ROUTES.LOGIN` and `fetchWithAuth` resolves with a synthetic `new Response(null, {status: 401})`.
3. **401 on a request with a token** (`retryOnUnauthorized`): refresh once and replay the original request with the new token. If a refresh is already in flight, the 401 response is returned as is. If the refresh fails, redirect to login and return the 401.
4. **Logout exception**: `DELETE /users/sessions/current` skips the token check and the 401 retry (`isLogoutRequest`), so logging out never triggers a refresh or redirect loop.

Callers can therefore treat a 401 from `fetchWithAuth` as "session is gone, redirect already happening".

### Raw `fetch` call sites (exceptions)

Requests that must not carry or refresh a token use plain `fetch`:

| Site | Why |
|---|---|
| `refreshAccessToken` in `src/lib/api.ts` | Is the refresh itself |
| [`src/app/auth/exchange/page.tsx`](../url-shortener-ui/src/app/auth/exchange/page.tsx) | OAuth code exchange before any token exists |
| [`src/app/login/page.tsx`](../url-shortener-ui/src/app/login/page.tsx) | `POST /ott/generate` (magic link), pre-login |
| [`src/components/abuse/ReportAbuseForm.tsx`](../url-shortener-ui/src/components/abuse/ReportAbuseForm.tsx) | Public endpoint, anonymous |

The first three use `API_BASE_URL` (same-origin `/api`). `ReportAbuseForm` uses `SERVER_API_BASE_URL` (`NEXT_PUBLIC_API_BASE_URL`, default `http://localhost:8080`), i.e. a direct cross-origin browser call to the backend, so the backend must allow CORS for it. `OttLoginForm` and the Google login button use `API_BASE_URL` for a form `action` / redirect, not `fetch`.

## DTOs and types

- [`src/lib/api-types.ts`](../url-shortener-ui/src/lib/api-types.ts): wire shapes of backend responses/requests (`ShortLinkDTO`, `PageDTO<T>`, `ShortLinkPreviewDTO`, `LinkImportJobDTO`, `LinkImportProgressDTO`, `UrlCleanerResponse`, `UserPreferences`, ...). Suffix `DTO` marks a wire shape.
- [`src/lib/types.ts`](../url-shortener-ui/src/lib/types.ts): UI view models (`LinkItem`, `TagItem`). Stores map DTO to view model (for example `mapResponseToLinkItem` in the links store fills the `Untitled Link` default title).
- [`src/lib/billing-constants.ts`](../url-shortener-ui/src/lib/billing-constants.ts) holds billing DTOs next to their mapper `toBillingSubscription`.
- Analytics response types are declared in the analytics store file.

Responses are mostly typed by annotation (`const data: PageDTO<ShortLinkDTO> = await res.json()`), not validated at runtime. Modules that do validate untrusted payloads: `billing-api.ts` (`parseBillingUrlPayload`, `parsePeriodUpgradePayload`), `import-progress.ts` (`parseImportProgress`), the preferences store (`parsePreferences`). Prefer runtime narrowing with `unknown` for new payloads that drive redirects or counters; do not use `any` (see [coding-patterns.md](coding-patterns.md)).

## Error handling conventions

There is no single error type; conventions by area:

| Area | Convention |
|---|---|
| Stores | Set `error: string` in state (`"Failed to fetch links: <status>"` or the thrown message), log with `logger.error` for thrown errors; components render the message. Details in [state-management.md](state-management.md) |
| Billing | `BillingApiError(status, message, retryAfterSeconds)` thrown by `billing-api.ts`; each billing hook maps `status` to a message from `BILLING_COPY` (400, 404, 409, 422, 429) |
| CSV import/export | `TransferError(message, status)` from `link-transfer.ts`; message extracted by `parseProblemDetail` |
| Forms (create/edit link) | Component handler throws a typed error (`ShortKeyConflictError` on 409) or generic `Error`; the form shows it |
| Login / report abuse | Inline `if (response.status === 429)` branches in the component |

Rules for new code:

- Check `res.ok` before parsing the body; do not assume JSON on errors.
- Log through `logger` from `@/lib/logger`, never `console.*`. Failures usually pass `{status}` as context.
- Name status codes as constants (`HTTP_TOO_MANY_REQUESTS`, `HTTP_CONFLICT`, ...), never inline literals. Existing literals are listed under limitations.

### Error body shape

`parseProblemDetail(bodyText, status)` in [`src/lib/link-transfer.ts`](../url-shortener-ui/src/lib/link-transfer.ts) reads the first non-empty string among `detail`, `message`, `title` of a JSON body (problem-details style). A non-JSON body is used verbatim when 200 characters or fewer; otherwise, or when empty, the message is `Request failed: <status>`. The mock server answers framework errors with `{detail}` and some controller errors with `{error}` (see [mock-server.md](mock-server.md)).

### Rate limits and `Retry-After`

- Billing endpoints: header `X-Rate-Limit-Retry-After-Seconds` (`RATE_LIMIT_RETRY_AFTER_HEADER`), parsed by `readRetryAfterSeconds` into `BillingApiError.retryAfterSeconds`; `buildRateLimitedMessage` appends `Try again in <n>s.`
- Magic link login: standard `Retry-After`, parsed in the login page and fed to `useMagicLinkCooldown` (see [features/auth.md](features/auth.md)).
- CSV export: one automatic retry after `EXPORT_RATE_LIMIT_RETRY_DELAY_MS` when the first response is 429 (`fetchExportWithRetry`). Import uploads are not retried.
- SSE reconnect treats 429 and 5xx as retryable (see below).

## Pagination helper

[`src/lib/pagination.ts`](../url-shortener-ui/src/lib/pagination.ts) is UI-side pagination for the links page: zero-based `page` in the store and API, one-based `?page=` in the URL.

- `getPaginationRange(page, pageSize, totalElements)` returns the shown `{start, end}`; `formatLinksRangeLabel` builds the "x-y of n links" text.
- `parseLinksPageParam(value)` converts the URL param to a zero-based page (invalid or `< 1` becomes 0). `buildLinksPageUrl(page)` is the inverse and omits the param for page 0.
- Server pages arrive as `PageDTO<T>`: `content` plus either top-level metadata or a nested `page` object. The links store accepts both (`data.page ?? data`) and falls back to `requestedPage`, `content.length` and `1` when fields are absent. Page size is `DEFAULT_PAGE_SIZE` (20).

## SSE client (import progress)

Three layers:

1. **Route handler** [`src/app/api/shortlinks/import/updates/route.ts`](../url-shortener-ui/src/app/api/shortlinks/import/updates/route.ts): `GET` that forwards the client `Authorization` header to `SERVER_API_BASE_URL` + `/shortlinks/import/updates` and streams the backend body straight through with SSE headers (`no-cache, no-transform`, `X-Accel-Buffering: no`). It exists only so the stream is not buffered by the generic `/api/:path*` rewrite; it must not read the body into memory. Non-OK backend responses are passed through with their status. Sanctioned server-side code is listed in [architecture.md](architecture.md#rendering-model).
2. **Decoder** [`src/lib/server-sent-events.ts`](../url-shortener-ui/src/lib/server-sent-events.ts): `ServerSentEventDecoder` (handles CR, LF, CRLF split across chunks, multi-line `data`, default event name `message`, 64 KiB per-event limit that throws) and `readServerSentEvents(response, handleEvent)`, which reads the stream until the handler returns `true` or the stream ends, then cancels the reader.
3. **Subscription** [`src/lib/import-progress.ts`](../url-shortener-ui/src/lib/import-progress.ts): `subscribeToDiscoveredImport({signal, onProgress, onConnectionChange})`.
   - Connects with `fetchWithAuth(API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES, {Accept: text/event-stream, cache: "no-store", signal})`, so auth refresh applies. Each connection is capped at `STREAM_TIMEOUT_MS` (315 s).
   - Only `progress` events are used; `parseImportProgress` validates safe non-negative integers and `processedRows <= totalRows`. A change of `totalRows` mid-stream is treated as a different job and throws.
   - Outcomes: `"completed"` (processed equals total), `"empty"` (stream ended with no events, meaning no ongoing import), or `"incomplete"` which triggers reconnect.
   - Reconnect with exponential backoff (`reconnectDelayMs`: 2 s base, doubling, max 60 s) on stream end without completion and on retryable errors (network errors, 429, 5xx). Other HTTP errors (`TransferError` with a non-retryable status) and aborts end the subscription by throwing.

The store that drives this (`useImportTracker`) and its state machine are in [state-management.md](state-management.md); the user-facing flow is in [features/links-and-tags.md](features/links-and-tags.md).

## Billing API module

[`src/lib/billing-api.ts`](../url-shortener-ui/src/lib/billing-api.ts) is the model for a feature API module: thin functions over `fetchWithAuth`, typed return values, runtime payload checks, typed error.

| Function | Request | Returns |
|---|---|---|
| `getBillingSubscription` | `GET /billing/subscription` | `BillingSubscription` (DTO mapped by `toBillingSubscription`) |
| `createBillingCheckoutUrl(cycle)` | `POST /billing/checkout` with `{billingPeriod}` | checkout URL string |
| `createBillingPortalUrl` | `POST /billing/portal` | `{url, expiresInSeconds}` |
| `scheduleBillingPeriodUpgrade` | `POST /billing/subscription/upgrade` | `{status: "scheduled", effectiveDate?}` |

Non-OK responses throw `BillingApiError` with a generic message; the hooks in `src/lib/hooks/useBilling*.ts` choose the user-facing text. Redirect helpers are in [`src/lib/billing-redirect.ts`](../url-shortener-ui/src/lib/billing-redirect.ts) (`redirectToBillingUrl`, `openBillingUrlInNewTab`). Portal-return bookkeeping uses `localStorage` (`src/lib/billing-portal-return.ts`, listed in [state-management.md](state-management.md)). The mapping of subscription to plan (only active `PRO` with a future period end counts as `pro`) and the UI behaviour are described in [features/billing-and-settings.md](features/billing-and-settings.md).

## Adding a new endpoint

1. **Mock server first**, so the UI can be developed and tested: add the route in `src/routes/*.ts`, controller, service (and seed data if needed) in the mock server; follow [mock-server.md](mock-server.md). Keep status codes and error body shape consistent with the real backend contract documented in [`../README.md`](../README.md) (API reference), and update that reference.
2. Add the path to `API_ENDPOINTS` in `src/lib/constants.ts`.
3. Add DTO types to `src/lib/api-types.ts` (suffix `DTO`) and, if the UI needs a different shape, a view model in `src/lib/types.ts` plus a mapper.
4. Choose the home from the table at the top. Several endpoints for one feature: a `lib/<feature>-api.ts` module with a typed error. Shared list state: a store action. Otherwise a hook.
5. Call `fetchWithAuth`, check `res.ok`, narrow untrusted payloads, log with `logger`, expose a user-facing message.
6. Tests: mock `@/lib/api` (`fetchWithAuth`) at the boundary; build responses with `Response.json`; add a mock-server route test. See [testing.md](testing.md).

## Known limitations and existing exceptions

- Observation: [`src/app/inspect/[key]/page.tsx`](../url-shortener-ui/src/app/inspect/[key]/page.tsx) fetches `/public/preview/:key` on the server. Existing exception to the rule above, described in [architecture.md](architecture.md#known-limitations-and-existing-exceptions); not a template.
- Observation: concurrent 401s are not coalesced. If a refresh is already running when a second request gets a 401, `retryOnUnauthorized` returns the 401 unchanged instead of waiting and replaying. Existing exception, not a template.
- Observation: callers parked in `failedQueue` are released with `null` when the refresh fails, and then continue to send their request without an `Authorization` header (the refreshing caller performs the login redirect). Existing exception, not a template.
- Observation: `SERVER_API_BASE_URL` is a `NEXT_PUBLIC_` variable, so it is bundled into client code, and `ReportAbuseForm` uses it for a direct cross-origin request instead of the `/api` rewrite.
- Observation: `src/components/layout/sidebar-user-menu.tsx` calls `fetchWithAuth("/users/sessions/current")` with a literal path instead of `API_ENDPOINTS.USERS_SESSIONS_CURRENT`, and `src/app/(dashboard)/settings/general/page.tsx` builds `/users/sessions/${id}` inline. Existing exceptions, not templates.
- Observation: `useTagMutations` and several component handlers (`CreateLinkModal`, `EditLinkModal`, `LinkFormFields`, `ProfileCard`, the settings general page) call `fetchWithAuth` directly in components or hooks rather than through a `lib/*-api.ts` module; error bodies are surfaced differently in each (raw text in tag mutations, status text elsewhere).
- Observation: status literals `401`, `403`, `400`, `409`, `422`, `429` appear inline in `useUrlCleaner`, `login/page.tsx`, `ReportAbuseForm`, `CreateLinkModal`, `EditLinkModal`, contrary to the named-constants rule in [coding-patterns.md](coding-patterns.md). Existing exceptions, not templates.
- Observation: `API_ENDPOINTS` has no entry for `/ott/login` and `/oauth2/authorization/google`; they are inline strings in `OttLoginForm` and `login/page.tsx`.
