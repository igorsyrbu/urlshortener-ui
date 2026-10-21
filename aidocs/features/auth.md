# Authentication and Sessions

> How a user signs in (magic link, OTP, Google OAuth), how the session is bootstrapped and ended, and how the sessions list in settings works; read before touching `login`, `auth/*`, the auth store or the session cards. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [architecture.md](../architecture.md) · [routing-and-navigation.md](../routing-and-navigation.md) · [state-management.md](../state-management.md) · [api-layer.md](../api-layer.md) · [mock-server.md](../mock-server.md) · [billing-and-settings.md](billing-and-settings.md) · [testing.md](../testing.md)

## Overview

All authentication is performed by the external REST API. The UI only collects the identifier, forwards it, and stores the resulting short-lived access token in memory. The long-lived credential is an `HttpOnly` refresh cookie that the UI never reads.

| Piece | File | Role |
|---|---|---|
| Login page | [`src/app/login/page.tsx`](../../url-shortener-ui/src/app/login/page.tsx) | Client page; email form, OTP form, Google button, Turnstile |
| Magic-link landing | [`src/app/auth/ott/page.tsx`](../../url-shortener-ui/src/app/auth/ott/page.tsx) | Reads `token` + `email` from the query string, auto-submits `OttLoginForm` |
| OAuth / OTT exchange | [`src/app/auth/exchange/page.tsx`](../../url-shortener-ui/src/app/auth/exchange/page.tsx) | Trades `code` for an access token, then goes to `/links` |
| Auth store | [`src/lib/store/auth.ts`](../../url-shortener-ui/src/lib/store/auth.ts) | `useAuthStore`: `accessToken`, `user`, `logout()` |
| Session bootstrap | [`src/app/(dashboard)/layout.tsx`](../../url-shortener-ui/src/app/(dashboard)/layout.tsx), [`src/lib/hooks/useSessionBootstrap.ts`](../../url-shortener-ui/src/lib/hooks/useSessionBootstrap.ts) | Restores the session for every dashboard route |
| Session hint | [`src/lib/session-hint.ts`](../../url-shortener-ui/src/lib/session-hint.ts) | `localStorage` flag "this browser had a session"; lets the shell render before the session is confirmed |
| Token refresh | [`src/lib/api.ts`](../../url-shortener-ui/src/lib/api.ts) | `fetchWithAuth`; see [API layer](../api-layer.md) |
| Cooldown hook | [`src/lib/hooks/useMagicLinkCooldown.ts`](../../url-shortener-ui/src/lib/hooks/useMagicLinkCooldown.ts) | Per-email resend cooldown persisted in `localStorage` |
| Session UI | [`src/app/(dashboard)/settings/general/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/general/page.tsx) | Lists and terminates sessions |

The auth store holds only `accessToken: string | null` and `user: UserProfile | null` (`email`, `name`, optional `pictureUrl`). `logout()` nulls both and clears the session hint. Nothing is persisted: a reload always starts with an empty store and recovers through the refresh cookie (see [Session bootstrap](#session-bootstrap)). See [State management](../state-management.md) for store conventions.

## Login page flows

`LoginPage` is a single client component that owns all form state (`email`, `code`, `submittedCode`, `showOtpForm`, `loading`, `message`, `manuallyLocked`, `turnstileToken`). The card shows one of two forms plus a status line and the Google button.

```
magic-link form --POST /api/ott/generate (200)--> OTP form --6 chars--> hidden native POST /api/ott/login
       |                                                                          |
       +-- 429 + Retry-After --> cooldown message          browser follows backend redirect to /auth/exchange?code=...
```

### Magic link and OTP

1. `LoginMagicLinkForm` collects the email. `handleMagicLinkSubmit` validates in order: non-empty trimmed email, no active cooldown, Turnstile token present (only when enabled).
2. It sends `POST {API_BASE_URL}/ott/generate` with `application/x-www-form-urlencoded` (`username`, plus `cf-turnstile-response` when Turnstile is on). This uses plain `fetch`, not `fetchWithAuth`, because the user has no token yet.
3. On `200` the page switches to `LoginOtpForm` (`showOtpForm = true`) and clears the Turnstile token. `LoginOtpForm` (with `input-otp`) is loaded through `next/dynamic`; its download starts when the magic link is requested, in parallel with the request, so the code step renders as soon as the server answers (`/login` first-load -4 KB). The email arrives with both a link (`/auth/ott?token=...&email=...`) and a 6-character code.
4. `LoginOtpForm` renders a read-only email field with a clear button (`handleChangeEmail` resets email, code, message and returns to step 1) and a 6-slot `InputOTP` (letters and digits, `OTP_CODE_LENGTH = 6` in the page).
5. Submitting is a state change, not a fetch: `handleSubmitCode` sets `loading` and `submittedCode`, which mounts a hidden `OttLoginForm` (`loginType="otp"`) that posts the credentials as a native form.

OTP submit rules in `LoginOtpForm`: a code typed character by character is submitted by the Continue button or Enter; a **pasted** code (length increases by more than one in one change) is submitted automatically from `onComplete`. The Continue button is disabled until 6 characters are entered. The `loading` flag is never reset after step 5 because the browser navigates away.

### Hidden native form (`OttLoginForm`)

[`src/components/auth/OttLoginForm.tsx`](../../url-shortener-ui/src/components/auth/OttLoginForm.tsx) renders a `display:none` `<form method="POST" action="/api/ott/login">` with hidden inputs `loginType` (`token` or `otp`), `token`, `email`, `code`, and submits it once from an effect (`requestSubmit`, with fallbacks). A native form post is used because the backend answers with a redirect chain that sets cookies and ends on the UI's `/auth/exchange`. A `submittedRef` guard prevents double submission; the cleanup resets it only if the timeout had not fired yet (React strict-mode re-run).

### Cooldown

`useMagicLinkCooldown(email)` keeps `remainingSeconds` for the trimmed email.

- Storage: one `localStorage` key, `magicLinkCooldownByEmail` (`MAGIC_LINK_COOLDOWN_STORAGE_KEY` in [`src/lib/constants.ts`](../../url-shortener-ui/src/lib/constants.ts)), holding `{ [email]: expiryEpochMs }`. Expired or malformed entries are dropped on every read.
- A cooldown is started **only** by a `429` response carrying a positive integer `Retry-After` (`parseRetryAfterSeconds` from `lib/retry-after.ts`). A `429` without it shows "Too many attempts. Please try again later."
- The hook re-reads storage every `MAGIC_LINK_COOLDOWN_INTERVAL_MS` (1 s) while active, so the countdown survives reloads and is shared across tabs.
- Locking: `isLocked = manuallyLocked && isCooldownActive`. `manuallyLocked` becomes true when a `429` arrives or when the user submits during an active cooldown; editing the email clears it. Until then, an active cooldown restored from storage does not disable the form; the first submit attempt locks it without any network call.
- While locked, `MagicLinkCooldownMessage` replaces the status message and shows `m:ss`; the input and button are disabled.

### Turnstile

Controlled by `NEXT_PUBLIC_ENABLE_TURNSTILE` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (see [Configuration](../configuration.md)). When enabled and the key is missing the page throws during render. `TurnstileWidget` wraps `@marsidev/react-turnstile` (`appearance: "interaction-only"`, auto retry and refresh) and is rendered below the card only on the magic-link step. Until a token arrives the submit button shows "Verifying..." and is disabled; `onError` logs through `logger` and clears the token, `onExpire` clears it. It is imported statically on purpose: lazy-loading its ~2 KB wrapper would start the Cloudflare challenge one request later on a page where the user waits for the token. The same widget is reused by the abuse form (see [Links and tags](links-and-tags.md#report-abuse-page)).

### Google OAuth

`handleGoogleSignIn` sets `window.location.href = "/api/oauth2/authorization/google"`. The backend runs the OAuth dance and finishes with a redirect to `/auth/exchange?code=...`. The mock server serves a fake consent page for this URL (see [Mock server](../mock-server.md)).

## Code exchange (`/auth/exchange`)

`ExchangeProcessor` (inside `Suspense`, because it uses `useSearchParams`) reads `code` once, into state, on its first render:

1. No `code`: renders an "Error / No authorization code provided" card.
2. Otherwise one effect calls, at most once per code (a ref guard survives StrictMode's double effect run and router identity changes, because the code is single-use), first removes the query string from the address bar and the current history entry (`clearQueryString` from `lib/url-utils.ts`, a `history.replaceState` without a navigation), then calls `GET /api/auth/code/exchange?code=<encoded>` with `credentials: "include"` so the response can set the refresh cookie. Plain `fetch`, no `Authorization` header.
3. On success it stores `data.accessToken` via `useAuthStore().setAccessToken`, sets the session hint (so the first dashboard render is the shell, see [Session bootstrap](#session-bootstrap)) and immediately calls `router.replace(ROUTES.LINKS)`: no wait, and the exchange URL with its single-use code leaves the history, so Back cannot resend it.
4. On failure it renders "Exchange Failed" with the error message and offers no retry or link back to `/login`. The code is already gone from the URL, so a reload shows "No authorization code provided".

Why the code is read into state: Next.js syncs `useSearchParams` with `history.replaceState`, so after the address bar is cleared the search params are empty; the page keeps the value it was opened with. `Referrer-Policy: no-referrer` on `/auth/*` (see [configuration](../configuration.md)) covers the moment before the URL is cleared.

There is no `returnTo` support: the destination after any successful login is always `/links`. The login page does not redirect already authenticated users.

## One-time token landing (`/auth/ott`)

Reached from the email link. It reads `token` and `email` into state once and clears the query string on mount (`clearQueryString`), so the token and the email address do not stay in history; the form posts the values from state. If `token` or `email` is missing it renders "Invalid or incomplete magic link". Otherwise it shows a "Verifying..." spinner and mounts `OttLoginForm` with `loginType="token"`, which posts and follows the same redirect chain to `/auth/exchange`.

## Session bootstrap

The dashboard layout ([`src/app/(dashboard)/layout.tsx`](../../url-shortener-ui/src/app/(dashboard)/layout.tsx)) is the only auth gate; see [Routing](../routing-and-navigation.md) and [Architecture](../architecture.md).

1. If the store has a `user`, the shell and page render immediately and no profile request is sent.
2. Otherwise `useSessionBootstrap` calls `fetchWithAuth("/users/me")`. With no token, `fetchWithAuth` first runs `POST /api/token/refresh` (cookie based); the page's own requests wait for the same single refresh (see [API layer](../api-layer.md#token-refresh)).
3. **With the session hint** the shell and page render while that request runs (the sidebar shows a name placeholder until the profile arrives). **Without it** a full-screen "Securing session..." spinner is shown until the profile arrives, so a signed-out visitor never sees the dashboard.
4. `res.ok` gives `setUser(data)` and sets the hint. 401/403 clears the hint, hides the page and calls `router.replace("/login")`. Any other failure (offline, 5xx, 503 from an unreachable refresh) never signs the user out: without a hint it shows "Can't reach the server" with a retry button; with a hint the shell stays and the pages show their own errors.
5. The hint is set after a loaded profile and cleared by `logout()` and by a rejected token refresh. It is never a credential: a stale hint only means the shell flashes for one round trip before the redirect.
6. Components that read `user` must cope with `null` while the profile loads (`ProfileCard` shows its skeleton, the sidebar menu a placeholder, and `DangerZoneCard` never accepts an empty confirmation for an unknown email).

The public pages (`/login`, `/auth/*`, `/inspect/[key]`, `/report-abuse`) sit outside this layout and have no gate.

## Logout

Two implementations end the current session; both call `DELETE /users/sessions/current`. `fetchWithAuth` treats that exact request specially (no refresh before it, no retry on `401`).

| Place | Behaviour |
|---|---|
| Sidebar user menu, [`src/components/layout/sidebar-user-menu.tsx`](../../url-shortener-ui/src/components/layout/sidebar-user-menu.tsx) | Confirm dialog or drawer (`LogoutConfirmDialog`, loaded on first open; the phone account drawer is `AccountMenuDrawer`, also on demand), request, then `logout()` and `router.replace("/login")` in `finally`, so the UI signs out even if the request fails |
| Settings current-session row | Request first; only on `res.ok` does it call `logout()` and navigate; otherwise a toast "Failed to terminate session" |

Neither resets other stores (links, tags, preferences, import). Navigation is client-side, so their in-memory data stays until overwritten by the next login's fetches.

## Sessions list (Settings, General tab)

`GeneralSettingsPage` owns the state; the cards are presentational. The tab shell is covered in [Billing and settings](billing-and-settings.md).

- Load: one `GET /users/sessions` on mount (a `useRef` guard prevents the strict-mode double call). The array is sorted so the entry with `current: true` is first, then split into `currentSession` and `otherSessions`. Failures are logged and the list stays empty.
- Display: both cards render [`SessionRow`](../../url-shortener-ui/src/components/settings/SessionRow.tsx) (`role="group"` named by the device text; icon tile, device and location truncated with `title`, a ghost "Log out" button). `CurrentSessionCard` ("This device" badge, skeleton row while loading, "Current session information unavailable." when absent, and a footer bar with "Log out all other sessions" when there are others). `OtherSessionsList` ("Active sessions" heading, one card of rows, scrollable at `max-h-96`, hidden when empty and while loading, because the number of other sessions is unknown). Labels come from [`src/lib/session-utils.ts`](../../url-shortener-ui/src/lib/session-utils.ts): `formatDeviceText` (`"Device (OS)"`, hides `unknown`), `formatLocation` (city, region, country, or "Unknown Location"), `getIconForDevice` (monitor, phone, laptop, help icon).
- Actions are routed through `SessionLogoutDialog`, driven by a `LogoutTarget` union: `{type: "single", id, isCurrent}` or `{type: "other"}`. It is a `Dialog` on desktop and a `Drawer` on mobile (`useIsDesktop`). Confirming closes the dialog immediately and runs the request.
- Request map: current session `DELETE /users/sessions/current` (then sign-out as above); other session `DELETE /users/sessions/{id}`; all others `DELETE /users/sessions/other`. Success removes the rows locally and shows a success toast; failure shows an error toast.
- `sessionActionLoading` (`id`, `"other"` or `null`) disables every action button while one request runs.
- Dialog copy mentions how long a terminated session may stay valid: `getJwtTTL(accessToken)` in [`src/lib/utils.ts`](../../url-shortener-ui/src/lib/utils.ts) decodes the base64url JWT payload and formats `exp - iat` (both must be numbers; `0` is valid), falling back to `DEFAULT_JWT_TTL_DISPLAY` ("1 hour") when the token cannot be decoded.

## Known limitations and existing exceptions

- Observation: `LoginPage` is about 236 lines and mixes network calls with state (it calls `fetch` directly rather than using a store or hook). Existing exception, not a template.
- Observation: a failed native post to `/api/ott/login` leaves the user on whatever the backend returned (the UI has no handler); a wrong OTP is therefore not reported inside the login card.
- Observation: `/auth/exchange` has no retry or back-to-login action on failure, and its `setTimeout` redirect is not cleaned up on unmount.
- Observation: the sidebar logout and the settings logout differ on failure (sidebar always signs out locally; settings does not).
- Observation: `app/auth/ott/page.tsx` and `app/auth/exchange/page.tsx` use raw `useEffect` + `fetch` for the exchange; they are pre-token flows and are not a pattern for authenticated data loading.
- Observation: the settings page uses a non-null assertion (`currentSession!`) in the current-session logout handler; the button only renders when `currentSession` exists.
