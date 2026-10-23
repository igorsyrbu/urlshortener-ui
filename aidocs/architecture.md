# Architecture

> How the workspace, the UI modules, app bootstrapping and the rendering model fit together, plus the main data flows at overview level. Read it first when you are new to the repo or deciding where code belongs. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [routing-and-navigation](routing-and-navigation.md) · [configuration](configuration.md) · [state-management](state-management.md) · [api-layer](api-layer.md) · [styling-and-theming](styling-and-theming.md) · [coding-patterns](coding-patterns.md) · [mock-server](mock-server.md)

## Workspace layout

pnpm workspace (see [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)) with two packages:

| Package | Path | What it is |
|---|---|---|
| `url-shortener-ui` | `url-shortener-ui/` | Next.js 16 App Router UI (React 19, Zustand 5, Tailwind v4, Radix/shadcn, Vitest). Talks to an external REST API. |
| `@url-shortener/url-shortener-mock-server` | `url-shortener-mock-server/` | Express 4 + TypeScript stand-in for that REST API (in-memory, per-user sandbox). See [mock-server](mock-server.md). |

Root files that stay outside `aidocs/`: [`README.md`](../README.md) (setup, API reference, mock billing reproduction), [`DESIGN.md`](../DESIGN.md) (visual design system), [`CONTRIBUTING.md`](../CONTRIBUTING.md). Root and per-package scripts are listed in [configuration](configuration.md#scripts).

The real backend is a separate closed-source service; the mock server mirrors every endpoint the UI uses. The UI never imports from the mock server.

## UI module map

All UI code lives in `src/`; the alias `@/` points at it (see [configuration](configuration.md#typescript-and-path-alias)).

| Directory | Responsibility |
|---|---|
| `src/app/` | Route segments only: layouts, pages, `error.tsx`, `not-found.tsx`, `manifest.ts`, `globals.css`, one route handler. Details in [routing-and-navigation](routing-and-navigation.md). |
| `src/components/<feature>/` | Feature components: `abuse`, `analytics`, `auth`, `icons`, `inspect`, `layout`, `links`, `settings`, `tags`. Tests are co-located. |
| `src/components/ui/` | shadcn/Radix primitives and small shared widgets (button, dialog, drawer, segmented control, ...). See [coding-patterns](coding-patterns.md). |
| `src/lib/` | Framework-agnostic logic: `api.ts`, `api-types.ts`, `types.ts`, `constants.ts`, `*-constants.ts`, `*-utils.ts`, `logger.ts`, SSE client, billing API. |
| `src/lib/store/` | Zustand stores. See [state-management](state-management.md). |
| `src/lib/hooks/` | Reusable hooks (billing flows, debounce, media query, import, url cleaner, ...). |
| `src/lib/themes/` | Palette definitions, custom theme builder, theme storage, the palette init script. See [styling-and-theming](styling-and-theming.md). |
| `src/providers/` | Client providers mounted by the root layout: `theme-provider.tsx` (`next-themes`) and `palette-provider.tsx` (palette selection context). |
| `src/test/` | Shared test infrastructure only. See [testing](testing.md). |

### Dependency direction

Intended direction: `app` -> `components` -> `lib/hooks` -> `lib/store` -> `lib/api` -> `lib/constants`/`logger`. `lib/` does not depend on `app/`; stores do not import components. Verified in code:

- Stores call `fetchWithAuth` from `@/lib/api`; `@/lib/api` reads the token from `useAuthStore` (a deliberate `api` <-> `store/auth` link).
- `src/lib/store/import.ts` calls `useLinkStore` and `useTagStoreWithoutCount` (store -> store) to refresh lists when an import finishes.
- Providers hold React context only; `PaletteProvider` is used by settings components via `usePalette`.

Known limitations and existing exceptions are at the end of this guide.

## App bootstrapping

Development builds also install the local React Scan observer before React loads, then start its toolbar through client instrumentation. The setup is development-only; details are in [configuration](configuration.md#tooling-config).

1. **Root layout** ([`src/app/layout.tsx`](../url-shortener-ui/src/app/layout.tsx), server component). Loads Manrope through `next/font/google`, exports `metadata` and `viewport`, renders `<html suppressHydrationWarning>` and `<body>`. Inside the body, in this order:
   1. an inline `<script>` built by `buildPaletteInitScript()` ([`src/lib/themes/palette-init-script.ts`](../url-shortener-ui/src/lib/themes/palette-init-script.ts)) that reads `localStorage` and sets `data-palette` / inline token variables before first paint (prevents a palette flash);
   2. `ThemeProvider` (`next-themes`, `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`);
   3. `PaletteProvider`, which re-applies the stored selection, reacts to dark/light changes and updates the `theme-color` meta;
   4. `{children}`, the sonner `Toaster`, then `LiveAnnouncer`.
2. **Session bootstrap for the dashboard** ([`src/app/(dashboard)/layout.tsx`](../url-shortener-ui/src/app/(dashboard)/layout.tsx), client component, logic in [`src/lib/hooks/useSessionBootstrap.ts`](../url-shortener-ui/src/lib/hooks/useSessionBootstrap.ts)). Every page of the `(dashboard)` route group renders inside it. The hook returns a phase:
   - `ready` when the store already has a `user`, or when this browser has the **session hint** (`localStorage` `urlshortener:session-hint`, [`src/lib/session-hint.ts`](../url-shortener-ui/src/lib/session-hint.ts)). The layout then renders `Sidebar`, `Header`, `<main>` with the page and the global modals at once, while `fetchWithAuth(API_ENDPOINTS.USERS_ME)` runs **alongside** the page's own requests. They all wait for the one shared token refresh ([api-layer](api-layer.md#token-refresh)), so a reload costs 2 serial round trips (refresh, then profile + page data) instead of 3.
   - `checking` when there is no user and no hint (first visit, signed out), or while a rejected session redirects: a full-screen "Securing session..." spinner ([`SessionCheckScreen`](../url-shortener-ui/src/components/layout/SessionCheckScreen.tsx)), so signed-out visitors never see the dashboard.
   - `unavailable` when the profile request fails with anything but 401/403 (offline, 5xx, the 503 from an unreachable refresh) and there is no hint: "Can't reach the server" with a retry button, instead of signing the user out. With a hint the shell stays and the pages show their own errors.
   - Profile loaded: `setUser` and the hint is set. 401/403: the hint is cleared and the layout calls `router.replace(ROUTES.LOGIN)`.
   - The server cannot read `localStorage`, so the prerendered HTML is always the spinner; the hint is read with `useSyncExternalStore` and the shell appears on hydration without a hydration mismatch.
3. Pages outside the group (`/login`, `/auth/*`, `/inspect/[key]`, `/report-abuse`) have no gate. See [routing-and-navigation](routing-and-navigation.md#auth-guarding).

The access token lives only in memory (`useAuthStore`); a full reload therefore always goes through the refresh path above. Details: [features/auth](features/auth.md) and [state-management](state-management.md).

## Rendering model

Product decision: **the UI is client-rendered against an external REST API. There is no SSR of user data and no server-side data fetching in the product.** Data is fetched in the browser through `fetchWithAuth` from stores and hooks (see [api-layer](api-layer.md)).

Server-side code in `src/app` is deliberately small. Sanctioned: `redirect()`-only pages, static composition files and the SSE route handler. The two inspect/report-abuse rows are pre-existing exceptions, not sanctioned patterns:

| File | Kind | Why it is server-side |
|---|---|---|
| `app/layout.tsx` | server component | Fonts, metadata, providers, palette init script. |
| `app/page.tsx`, `app/(dashboard)/settings/page.tsx` | server components that only call `redirect()` | `/` -> `/links`, `/settings` -> `/settings/general`. |
| `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/settings/layout.tsx`, `app/(dashboard)/settings/billing/page.tsx` | server components without logic | Static composition; they only render client components (`SettingsTabs`, `BillingSettingsProvider`, `BillingSettings`). |
| `layout.tsx` in `links`, `tags`, `analytics`, `settings/general`, `login`, `auth` | metadata-only server layouts | Attach a page title to a client page; see [routing-and-navigation](routing-and-navigation.md#page-titles-and-skip-link). |
| `app/manifest.ts` | metadata route | Web app manifest. |
| `app/inspect/[key]/page.tsx` | async server component that fetches | Existing server-side fetch of the public link preview (`cache: "no-store"`). Observation / existing exception - not a template for new server fetching (see limitations). |
| `app/(legal)/report-abuse/page.tsx` | async server component, no fetch | Awaits `searchParams` and reads the Turnstile env vars; existing exception. |
| `app/api/shortlinks/import/updates/route.ts` | route handler | SSE pass-through (see below). This is the only route handler. |

Everything else in `src/app` starts with `"use client"`: the dashboard layout, `links`, `tags`, `analytics`, `settings/general`, `login`, `auth/exchange`, `auth/ott`, every `error.tsx`, `global-error.tsx` and `not-found.tsx`.

Rules that follow from this:

- Add `"use client"` only where a file needs state, effects, browser APIs or event handlers, and keep the boundary as deep in the tree as possible. Pure layout/composition files stay server components (the files in the table above are the pattern).
- Do not add API routes, server actions, `generateStaticParams`-style data loading or server-side `fetch` for product data. The existing places that do server work are listed under limitations.
- Route-level `loading.tsx` is not used; see [routing-and-navigation](routing-and-navigation.md#error-and-not-found-boundaries).

### SSE pass-through route handler

`GET /api/shortlinks/import/updates` ([`src/app/api/shortlinks/import/updates/route.ts`](../url-shortener-ui/src/app/api/shortlinks/import/updates/route.ts)) forwards the caller's `Authorization` header (401 without a backend call when it is missing) to the backend at `getBackendApiBaseUrl() + /shortlinks/import/updates` and streams the body back unchanged as `text/event-stream`. It exists so the stream is not buffered by the generic `/api/:path*` rewrite ([configuration](configuration.md#nextconfigts)). The body must be forwarded as a stream, never read into memory. Client side: [api-layer](api-layer.md) and [features/links-and-tags](features/links-and-tags.md).

## Main data flows (overview)

- **Auth bootstrap.** Dashboard layout -> `useSessionBootstrap` -> `fetchWithAuth(USERS_ME)` (alongside the page's requests when the session hint exists, otherwise behind a spinner) -> one shared refresh via cookie when there is no token -> `useAuthStore.setUser` + session hint. Login paths (magic link, OTP, Google, one-time token) end at `/auth/exchange` or `/auth/ott`, which store the access token and navigate to `/links`. See [features/auth](features/auth.md).
- **List page load.** `links/page.tsx` derives the page number from `?page=`, calls `useLinkStore().fetchLinks(page)` in an effect; the store calls `fetchWithAuth("/shortlinks?...")`, maps DTOs to `LinkItem` and the page renders skeletons, empty state or cards. The tags and analytics pages follow the same store-in-effect pattern; `settings/general` fetches sessions with a local `useEffect` instead. See [state-management](state-management.md), [features/links-and-tags](features/links-and-tags.md), [features/analytics](features/analytics.md).
- **Mutation.** Component handler -> `fetchWithAuth` (POST/PUT/DELETE) -> on success refetch through the store (`fetchLinks`, `fetchTags`) and show a toast or close the modal; errors go to `logger` and to user-facing state. See [api-layer](api-layer.md).
- **Import progress (SSE).** CSV upload starts a job; `useImportTracker` subscribes through `subscribeToDiscoveredImport` -> `fetchWithAuth("/shortlinks/import/updates")` -> route handler above -> backend stream, decoded by `readServerSentEvents`. On completion it refreshes links and tags once. See [api-layer](api-layer.md) and [features/links-and-tags](features/links-and-tags.md).
- **Billing redirect.** `/settings/billing` mounts `BillingSettingsProvider` (subscription, checkout, portal, period upgrade hooks). Checkout navigates the current tab to the hosted URL (`window.location.assign`); the portal opens in a new tab and stores a return flag in `sessionStorage`, and a `focus`/`visibilitychange` listener refreshes the subscription when the user comes back. See [features/billing-and-settings](features/billing-and-settings.md).

## Known limitations and existing exceptions

- Observation: `src/app/inspect/[key]/page.tsx` is an async server component that calls `fetch` on `getBackendApiBaseUrl()` with `cache: "no-store"` and calls `notFound()` on 404 (HTTP 404 with `inspect/[key]/not-found.tsx`). This is server-side data fetching and contradicts the product decision above. Existing exception - not a template; do not copy it and do not change it as a drive-by.
- Observation: `src/app/(legal)/report-abuse/page.tsx` is an async server component that awaits `searchParams` and reads the Turnstile env vars; it makes no data fetch (the form posts from the browser). Existing exception - not a template.
- Observation: the inspect page (server side) calls the backend directly through `getBackendApiBaseUrl()`, not the `/api` proxy. See [configuration](configuration.md#ui) and [features/links-and-tags](features/links-and-tags.md).
- Observation: `src/lib/types.ts`, `src/lib/tag-constants.ts` and `src/lib/hooks/useTagMutations.ts` import `BadgeVariant` from `@/components/ui/badge`, and `src/lib/hooks/useLinkImport.ts` imports from `@/components/links/import-export-constants`. This is `lib` depending on `components`, against the intended direction. Existing exception - not a template.
- Observation: `src/lib/store/auth.ts` keeps the access token in memory only; any code that needs a token must go through `fetchWithAuth` so refresh and 401 handling apply (see [api-layer](api-layer.md)).
