# Routing and Navigation

> Every route of the UI, how redirects, auth guarding, error boundaries, URL state and keyboard shortcuts work. Read it before adding or changing a page, a link, or a redirect. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [architecture](architecture.md) · [configuration](configuration.md) · [state-management](state-management.md) · [api-layer](api-layer.md) · [features/auth](features/auth.md) · [features/links-and-tags](features/links-and-tags.md) · [features/billing-and-settings](features/billing-and-settings.md)

The UI uses the App Router exclusively (`src/app/`); there is no Pages Router and no `middleware`/`proxy` file. Route groups `(dashboard)` and `(legal)` do not affect URLs.

## Route map

| URL | File under `src/app/` | Kind | Renders |
|---|---|---|---|
| `/` | `page.tsx` | server, `redirect()` only | Redirects to `/links` (`redirect('/links')`). |
| `/login` | `login/page.tsx` | client | Magic-link / OTP / Google login. See [features/auth](features/auth.md). |
| `/auth/exchange?code=` | `auth/exchange/page.tsx` | client | Exchanges the OAuth code for an access token, then goes to `/links`. |
| `/auth/ott?token=&email=` | `auth/ott/page.tsx` | client | Auto-submits a hidden form (`OttLoginForm`) with the magic-link token. |
| `/links` | `(dashboard)/links/page.tsx` | client | Paginated links list, search, modals. `?page=` is the page number (1-based). |
| `/tags` | `(dashboard)/tags/page.tsx` | client | Tags list with counts, search, modals. |
| `/analytics` | `(dashboard)/analytics/page.tsx` | client | Analytics dashboard (period selector, chart, breakdown cards). |
| `/dashboard` | `(dashboard)/dashboard/page.tsx` | server, static | Placeholder card ("Dashboard Content (Mock)"). |
| `/settings` | `(dashboard)/settings/page.tsx` | HTTP 307 from `next.config.ts` `redirects()`; the `redirect()`-only page is a fallback | Redirects to `SETTINGS_ROUTES.DEFAULT` (`/settings/general`). Nothing in the app links here. |
| `/settings/general` | `(dashboard)/settings/general/page.tsx` | client | Profile, appearance, theme, preferences, sessions, danger zone. |
| `/settings/billing` | `(dashboard)/settings/billing/page.tsx` | server wrapper | `BillingSettingsProvider` + `BillingSettings` (client). |
| `/inspect/[key]` | `inspect/[key]/page.tsx` | server, async | Public link inspector (preview card, destination URL, report link). Answers HTTP 404 with its own `not-found.tsx` ("Link not found") when the preview returns 404. |
| `/report-abuse?shortUrl=` | `(legal)/report-abuse/page.tsx` | server, async | Public abuse report form; `shortUrl` prefills the field. |
| `/api/shortlinks/import/updates` | `api/shortlinks/import/updates/route.ts` | route handler | SSE pass-through, not a page. See [architecture](architecture.md#sse-pass-through-route-handler). |
| `/manifest.webmanifest` | `manifest.ts` | metadata route | PWA manifest with `start_url: "/links"`. |
| any unknown URL | `not-found.tsx` | client | 404 page. |

Layouts: `layout.tsx` (root: fonts, providers, `Toaster`), `(dashboard)/layout.tsx` (client: session bootstrap, sidebar, header, global modals), `(dashboard)/settings/layout.tsx` (server: `PageContainer` capped at `max-w-4xl`, page description, `SettingsTabs`). Metadata-only server layouts (re-exporting `MetadataOnlyLayout`) give client pages their title: `links`, `tags`, `analytics`, `settings/general`, `login` and `auth/`. `(legal)` has no layout.

Why server vs client per file is in [architecture](architecture.md#rendering-model).

## Redirects

- `/` and `/settings` are `redirect()`-only server pages (`next/navigation`). Keep such pages free of other logic. `/settings` is also redirected over HTTP in `next.config.ts` (`redirects()`, 307), so the server answers before any HTML; links go straight to the destination (`SETTINGS_ROUTES.DEFAULT`) instead of through a redirect.
- `inspect/[key]` calls `notFound()` when the backend has no preview for the key, so a visitor sees "Link not found" instead of being bounced through `/` -> `/links` -> `/login`. Not-found pages share `components/layout/NotFoundView` (404 mark, heading, text, action buttons as children).
- Client redirects use `router.replace` when the previous entry must not stay in history (login after a failed auth check, after logout, `auth/exchange` -> `/links` so Back cannot resend the spent code) and `router.push` otherwise (link creation and import -> `/links`).
- Hard navigations (`window.location`) exist for things the router cannot do: `fetchWithAuth` goes to `/login` when refresh fails ([api-layer](api-layer.md)), Google sign-in goes to `/api/oauth2/authorization/google` (cross-origin redirect chain through the proxy), billing checkout/portal go to provider URLs (`src/lib/billing-redirect.ts`).
- Route constants: `ROUTES` (`LOGIN`, `LINKS`, `SETTINGS`) in [`src/lib/constants.ts`](../url-shortener-ui/src/lib/constants.ts) and `SETTINGS_ROUTES` in [`src/lib/settings-constants.ts`](../url-shortener-ui/src/lib/settings-constants.ts). Prefer them over string literals for these paths.

## Auth guarding

Guarding is client-side only; there is no server-side check.

- Everything inside the `(dashboard)` group goes through the session bootstrap in [`src/app/(dashboard)/layout.tsx`](../url-shortener-ui/src/app/(dashboard)/layout.tsx): without a user it calls `/users/me` through `fetchWithAuth`; 401/403 -> `router.replace("/login")`. A browser with the session hint gets the shell and page while that runs; without it "Securing session..." is shown and the page is not rendered. Full description: [architecture](architecture.md#app-bootstrapping).
- Any later 401 that cannot be recovered by a token refresh makes `fetchWithAuth` hard-redirect to `/login` once ([api-layer](api-layer.md#token-refresh)); a refresh that cannot reach the server (offline, 5xx) does not redirect.
- Logout (sidebar user menu and the current-session card in settings) calls `DELETE /users/sessions/current`, clears `useAuthStore` and `router.replace`s to `/login` ([features/auth](features/auth.md)).
- Public pages (no gate): `/login`, `/auth/exchange`, `/auth/ott`, `/inspect/[key]`, `/report-abuse`, `not-found`. The login page does not redirect an already signed-in user away.

## Page titles and skip link

- Every route has its own browser-tab title: the root layout sets `title: {default: APP_NAME, template: "%s | Short Links"}` and each route sets `metadata.title` from `PAGE_TITLES` in `lib/constants.ts` (the same names the dashboard header shows). Settings tabs read `<tab> · Settings`. Distinct titles also let the App Router's route announcer tell screen-reader users that the page changed.
- Client pages cannot export `metadata`, so their folder gets a server `layout.tsx` that re-exports `MetadataOnlyLayout` ([`src/components/layout/MetadataOnlyLayout.tsx`](../url-shortener-ui/src/components/layout/MetadataOnlyLayout.tsx)) and exports `metadata`; server pages export it directly. A new route adds its name to `PAGE_TITLES` and one of these exports; `src/app/route-titles.test.ts` checks that titles are set and unique.
- The dashboard layout starts with a "Skip to main content" link, visible only on keyboard focus, that targets `<main id="main-content" tabIndex={-1}>` (`MAIN_CONTENT_ID`).

## Error and not-found boundaries

- [`src/app/(dashboard)/error.tsx`](../url-shortener-ui/src/app/(dashboard)/error.tsx) catches render errors of dashboard pages (not of the dashboard layout itself, per Next.js semantics). It logs through `logger.error` and offers "Try again" (`reset`).
- [`src/app/error.tsx`](../url-shortener-ui/src/app/error.tsx) is the boundary for every other route segment (login, auth, inspect, report-abuse). It logs through `logger.error`. There is no `global-error.tsx`.
- [`src/app/not-found.tsx`](../url-shortener-ui/src/app/not-found.tsx) renders the 404 with "Go back" (`router.back()`) and "Go to Dashboard" (`router.push("/dashboard")`).
- Add an `error.tsx` at a segment when that segment needs its own recovery UI; do not wrap pages in ad-hoc error boundaries.

## No route-level `loading.tsx`

There are no `loading.tsx` files and none may be added. Loading states are component-level to avoid full-page layout shifts: skeletons (`LinkCardSkeletonList`, `TagCardSkeletonList`, `AnalyticsPageSkeleton`, profile/session skeletons, the billing card's loading state) rendered by the page or component that fetches. Pages that call `useSearchParams` are wrapped in `<Suspense>` with a skeleton fallback (`links/page.tsx`, `auth/exchange`, `auth/ott`).

## Links and `<Link>`

- Internal navigation uses `next/link` (`Link`): sidebar items (`sidebar-nav.tsx`), settings tabs (`SettingsTabs`: `Link`s inside a `<nav>` with `aria-current="page"`), and the inspect page header/report links.
- Programmatic navigation uses `useRouter` from `next/navigation`.
- The only raw `<a>` is the skip link in the dashboard layout (`href="#main-content"`, an in-page fragment, not a route). Internal routes always use `Link`. External provider URLs are opened with `window.location.assign` / `window.open` ([`src/lib/billing-redirect.ts`](../url-shortener-ui/src/lib/billing-redirect.ts)).
- Active state: `sidebar-nav.tsx` marks an item active when `isPathWithin(pathname, matchPrefix ?? href)`: the path equals the prefix or starts with `prefix + "/"`. The active link carries `aria-current="page"` (the bold text alone was not announced). Settings links to `/settings/general` with `matchPrefix: ROUTES.SETTINGS`, so it stays active on every settings tab.

## Sidebar and settings tabs

- Sidebar items (defined in `sidebar-nav.tsx`): Dashboard `/dashboard`, Links `/links`, Analytics `/analytics`, Tags `/tags`, Settings `/settings/general` (`SETTINGS_ROUTES.DEFAULT`). Desktop (`lg` and up): fixed `Sidebar`. Below `lg`: `MobileSidebarDrawer` opened from the header menu button; it closes on navigation (`onNavigate`) and when the viewport grows past `LARGE_SCREEN_MIN_WIDTH_PX`.
- Pending cue: every sidebar item and every settings tab (`SettingsTabs`) renders `LinkPendingIndicator` ([`components/ui/link-pending-indicator.tsx`](../url-shortener-ui/src/components/ui/link-pending-indicator.tsx)), a dot driven by `useLinkStatus()` from `next/link`. It is always rendered (opacity only, so it never moves the layout) and fades in after a 150 ms transition delay, so navigations that finish sooner show nothing (a local dev switch to Settings was pending about 106 ms). Tests that mock `next/link` must also provide `useLinkStatus`.
- `SidebarUserMenu` offers Settings (`router.push(SETTINGS_ROUTES.DEFAULT)`) and Logout.
- Header title is derived from `pathname` in `Header.tsx` (a fixed map; any `/settings/*` path shows "Settings"). A new top-level page must be added to that map and to the sidebar list.
- Settings tabs: [`src/components/settings/SettingsTabs.tsx`](../url-shortener-ui/src/components/settings/SettingsTabs.tsx) renders `SETTINGS_SECTIONS` (General, Billing) from `settings-constants.ts` as underline tabs. The active one is `getActiveSettingsSectionHref(pathname)` (`settings-constants.ts`): the section whose route is the path or a prefix of it (`isPathWithin` from [`lib/route-match.ts`](../url-shortener-ui/src/lib/route-match.ts), also used by the sidebar), and the default section for `/settings` and `/settings/`, so exactly one tab is current on every settings path. Add a settings section by adding a route folder under `settings/` and an entry in `SETTINGS_SECTIONS`.

## Search params and URL state

| State | Where it lives | Notes |
|---|---|---|
| Links page number | `?page=` on `/links` (1-based, absent on page 1) | Parsed by `parseLinksPageParam`, built by `buildLinksPageUrl` in [`src/lib/pagination.ts`](../url-shortener-ui/src/lib/pagination.ts). Page changes use `router.push(url, {scroll: false})`. Invalid or `< 1` values fall back to the first page. |
| OAuth code | `?code=` on `/auth/exchange` | Missing code shows an error card. Read once, then removed from the URL and history (`clearQueryString`). |
| Magic-link token and email | `?token=&email=` on `/auth/ott` | Missing either shows "Invalid or incomplete magic link". Read once, then removed from the URL and history (`clearQueryString`). |
| Abuse report prefill | `?shortUrl=` on `/report-abuse` | Built by the inspect page with `encodeURIComponent`. |
| Search text, archived toggle, analytics period/range, tag search | Not in the URL | Component/store state; "show archived" is persisted in `localStorage` ([state-management](state-management.md)). |

Search and the archived toggle reset the URL to `/links` (first page) when the current page is greater than 0. Pages that read search params from the client use `useSearchParams` under `Suspense`.

## Keyboard shortcuts

No shortcut navigates between routes. Shortcuts that exist, all guarded so they do not fire while typing in inputs or while a modal is open (`isModalOpen()` from `src/lib/utils.ts`):

| Key | Where | Effect |
|---|---|---|
| `C` | `Header.tsx` (all dashboard pages) | Opens "Create link", or "Create tag" on `/tags`. |
| `Cmd/Ctrl+K` | `SearchBar.tsx` | Focuses the search input; `Esc` clears or blurs it. |
| `A` | `links/page.tsx` | Archives the hovered link, or toggles "show archived" when none is hovered. |
| `E`, `D`, `Q` | `LinkCard.tsx` (menu open) | Edit, delete, QR code. |
| `E`, `D` | `TagCard.tsx` (menu open) | Edit, delete. |

Details of the links and tags behaviours: [features/links-and-tags](features/links-and-tags.md).

## Known limitations and existing exceptions

- Observation: `/dashboard` is a placeholder page, yet it is the target of "Go to Dashboard" in `not-found.tsx` and the first sidebar item, while `/` redirects to `/links`. Existing behaviour - do not change as a drive-by.
- Observation: `not-found.tsx` and `sidebar-user-menu.tsx` use string literals (`"/dashboard"`, `"/login"`) instead of `ROUTES`; `ROUTES` has no entries for `/dashboard`, `/tags`, `/analytics`, `/inspect` or `/report-abuse`. Existing exception - not a template.
- Observation: `inspect/[key]/page.tsx` (server fetch, `notFound()` on a missing key) and `report-abuse/page.tsx` (async server page) are exceptions to the client-rendered model; see [architecture](architecture.md#known-limitations-and-existing-exceptions).
- Observation: the auth gate is client-side, so a protected page's JS bundle is delivered before the check completes; nothing user-specific is rendered until it passes.
- Observation: `app/error.tsx` exports a component named `GlobalError`, but the file is a regular segment boundary, not `global-error.tsx`.
- Observation (dev server only): Back to a dashboard page that was opened with a full page load (for example from the mock checkout) reloads it from the HTTP cache (`Cache-Control: no-cache`), and React never hydrates, so the page stays on "Securing session..." until a reload. Seen with `next dev` in the in-app browser; the same Back on a production build (`next start`) hydrates normally. Reload the page; this is not an app bug to fix.
