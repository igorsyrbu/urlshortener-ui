# State Management

> Every Zustand store, the React context providers that hold state, the store patterns used here, and every piece of persisted browser state. Read before adding a store, changing a store action, or persisting anything. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [api-layer.md](api-layer.md) · [architecture.md](architecture.md) · [coding-patterns.md](coding-patterns.md) · [styling-and-theming.md](styling-and-theming.md) · [testing.md](testing.md) · [features/auth.md](features/auth.md) · [features/links-and-tags.md](features/links-and-tags.md) · [features/analytics.md](features/analytics.md) · [features/billing-and-settings.md](features/billing-and-settings.md)

## Where state lives

The app is client-rendered with no SSR data (see the rule in [api-layer.md](api-layer.md#data-fetching-rule-client-rendered-app)), so all data state is client state:

- **Zustand stores** in `src/lib/store/` for data shared between components or routes (lists, filters, session, import tracking).
- **Component/hook `useState`** for form fields, dialogs, and feature-local loads (billing hooks, sessions list, URL cleaner).
- **React context** only where a provider composes several hooks (billing) or wraps a browser-side system (palette).
- **URL search params** for the links page number (`?page=`, see [routing-and-navigation.md](routing-and-navigation.md)).
- **`localStorage`** for a small set of preferences (table below).

## Stores

All stores are created with `create` from `zustand` (v5) and exported as hooks. Each has a co-located `*.test.ts`.

| Store (hook) | File | State | Actions | Used by |
|---|---|---|---|---|
| `useAuthStore` | [`src/lib/store/auth.ts`](../url-shortener-ui/src/lib/store/auth.ts) | `accessToken`, `user` (`UserProfile`) | `setAccessToken`, `setUser`, `logout` (clears both) | `lib/api.ts`, dashboard layout, auth exchange page, settings (profile, danger zone, general), sidebar user menu |
| `useUIStore` | [`src/lib/store/ui.ts`](../url-shortener-ui/src/lib/store/ui.ts) | `isCreateModalOpen`, `isCreateTagModalOpen` | `setCreateModalOpen`, `setCreateTagModalOpen` | dashboard layout (header "Create" button and modals), empty states |
| `useLinkStore` | [`src/lib/store/links.ts`](../url-shortener-ui/src/lib/store/links.ts) | `links`, `loading`, `error`, `showArchived`, `searchQuery`, `currentPage`, `totalElements`, `totalPages` | `fetchLinks(page?)`, `clearError`, `setShowArchived`, `setSearchQuery`, `hydrateShowArchived`, `setLinkArchived` | links page, `CreateLinkModal`, `ExportCsvModal`, `useLinkImport` |
| `useTagStoreWithoutCount` | [`src/lib/store/tags.ts`](../url-shortener-ui/src/lib/store/tags.ts) | `tags`, `loading`, `error`, `searchQuery` | `fetchTags({size?})`, `setSearchQuery` | links page, `TagSelect`, `LinkFormFields`, `LinkCard`, `useTagMutations`, `useLinkImport` |
| `useTagStoreWithCount` | [`src/lib/store/tags-with-count.ts`](../url-shortener-ui/src/lib/store/tags-with-count.ts) | same plus `clearError` | `fetchTags({size?})`, `setSearchQuery`, `clearError` | tags page, `useTagMutations` |
| `usePreferencesStore` | [`src/lib/store/preferences.ts`](../url-shortener-ui/src/lib/store/preferences.ts) | `trackerMode` (`null` until loaded), `hasLoaded`, `isLoading`, `isSaving` | `fetchPreferences` (once per session), `updatePreferences` (optimistic) | `PreferencesCard`, `LinkFormFields` |
| `useAnalyticsStore` | [`src/lib/store/analytics.ts`](../url-shortener-ui/src/lib/store/analytics.ts) | `period`, `customDateRange`, totals, `timeSeries`, `countries`, `continents`, `devices`, `os`, `referrers`, `topLinks`, `status` per section, `overviewLoadedAt`, `locationTab`, `deviceTab` | `setPeriod`, `setCustomDateRange`, `setLocationTab`, `setDeviceTab`, `loadAnalytics`, `retrySection` | analytics page, `AnalyticsBreakdownGrid` |
| `useAnnouncerStore` | [`src/lib/store/announcer.ts`](../url-shortener-ui/src/lib/store/announcer.ts) | `message`, `sequence` | `announce` (also exported as a plain `announce()` function) | `LiveAnnouncer` in the root layout, `useCopyToClipboard` |
| `useImportTracker` | [`src/lib/store/import.ts`](../url-shortener-ui/src/lib/store/import.ts) | `status` (`IMPORT_TRACKING_STATUS`), `progress`, `job` | `trackSubmission`, `ensureDiscovery`, `stopTracking`, `reset` | links page, `PageToolbar`, `useLinkImport` |

Helper: [`src/lib/store/fetch-tags-common.ts`](../url-shortener-ui/src/lib/store/fetch-tags-common.ts) (`fetchTagsResponse`) is the shared GET for both tag stores.

Notes per store:

- **Auth**: the token is memory-only; see [api-layer.md](api-layer.md#token-refresh) for refresh and [features/auth.md](features/auth.md) for bootstrap/logout. Logout clears the store only; redirect is done by the caller.
- **Two tag stores**: one per tag-list variant (`withLinksCount=false` for selectors, `true` for the tags page). They hold independent copies. Mutations in `useTagMutations` write the result into **both** via `setState`, so create/update/delete keep them in sync without refetching. Do not add a third copy; extend one of these.
- **Links**: `fetchLinks` reads `showArchived`, `searchQuery` and the requested page from state. `setLinkArchived` PUTs the whole link then refetches the current page. `showArchived` is persisted (see below).
- **Preferences**: `trackerMode` `null` means "not checked yet"; consumers must treat it that way. `updatePreferences` sets the new value optimistically and reverts on failure, then rethrows.
- **Analytics**: `loadAnalytics()` loads on the first visit, skips data younger than 60 s and refreshes older data silently; `setPeriod` and `setCustomDateRange` (only when both ends are set) reload visibly. Each section aborts its previous request and only the newest may write (`AbortController` per section, the latest-wins rule below). Tab switches fetch lazily when that tab has no data. Data and selection survive navigation (the store is not reset on unmount). Details: [features/analytics.md](features/analytics.md#data-flow).
- **Import tracker**: a state machine (diagram and UI mapping in [features/links-and-tags.md](features/links-and-tags.md)). Module-level variables (`activeController`, `activeGeneration`, `didRefreshCurrentRun`) guard against stale subscriptions: every callback compares its captured `generation` with `activeGeneration`. On completion it refreshes links and tags once (`refreshLinksAndTagsOnce`), cross-calling `useLinkStore.getState().fetchLinks(0)` and `useTagStoreWithoutCount.getState().fetchTags()`. `reset()` is ignored while an import is in progress so closing the modal does not stop toolbar tracking. SSE mechanics: [api-layer.md](api-layer.md#sse-client-import-progress).

## Store patterns

Follow these when adding or changing a store.

- **One file per store**, hook named `use<Name>Store`, state and actions typed in one `interface`. Actions live inside the store, not in components.
- **Overlapping requests:** when the same data can be requested again before an earlier request answers (filters, refreshes, retries), only the newest response may write state: give each request an increasing id and drop answers whose id is no longer the latest (`useBillingSubscription`), or keep one `AbortController` per data slice, abort it when a new request starts and write only when the controller is still the current one. For a store list, use `createLatestRequestTracker()` from [`src/lib/latest-request.ts`](../url-shortener-ui/src/lib/latest-request.ts): `const request = tracker.begin()`, pass `request.signal` to `fetchWithAuth`, and write (including `loading: false`) only while `request.isLatest()` (`useLinkStore.fetchLinks`, both tag stores; `useAnalyticsStore` keeps its own per-section controllers). Never drop a new request because one is in flight (`if (loading) return`): that lost quick searches and filter changes.
- **Async actions** follow the same shape: guard, `set({loading: true, error: null})`, `try` call via `fetchWithAuth`, `set` result or `set({error})`, `catch` logging with `logger` and setting `error`, `finally` `set({loading: false})`. Error values are user-facing strings (see [api-layer.md](api-layer.md#error-handling-conventions)).
- **A list store's `error` describes loading that list.** Mutations (create/update/delete) never write it: they reject and the caller shows the failure where the action happened (inline in a form, a toast for a menu action). Otherwise one failed action makes every page that renders the list look broken.
- **Map DTOs to view models inside the store** (`mapResponseToLinkItem`), so components only see `LinkItem`/`TagItem` (types in [`src/lib/types.ts`](../url-shortener-ui/src/lib/types.ts)).
- **Reading outside React**: use `useXStore.getState()` inside event handlers, effects that must not re-subscribe, and other stores. Cross-store calls go through `getState()`/`setState`, never through hooks.
- **Subscribing in components**: prefer a selector (`useAuthStore((state) => state.user)`) so a component re-renders only for what it reads. Whole-store subscription (`const {a, b} = useXStore()`) re-renders on any change; use it only for stores whose fields the component mostly consumes (see limitations).
- **Do not store derived data**; compute it in the component or a `lib/` util.
- **Persisting** a store field: wrap `localStorage` in try/catch, log failures with `logger`, and hydrate in an effect (`hydrateShowArchived`), never during render, so the server-rendered shell and the first client render match. Keys live in `src/lib/constants.ts` as `*_STORAGE_KEY`.
- **Stores hold no React state**; keep modal-local state in the component and put only cross-component flags in `useUIStore`.

## Persisted browser state

All persistence is `localStorage`. `sessionStorage` is not used by application code (only cleared in test setup).

| Key | Owner file | Content | Lifetime |
|---|---|---|---|
| `showArchived` (`SHOW_ARCHIVED_STORAGE_KEY`) | `src/lib/store/links.ts` | `"true"` / `"false"` string | Until cleared; read by `hydrateShowArchived` from the links page effect |
| `themePalette` (`THEME_PALETTE_STORAGE_KEY`) | [`src/lib/themes/theme-storage.ts`](../url-shortener-ui/src/lib/themes/theme-storage.ts) | JSON `ThemeSelection` (version 2; preset id or custom colours with derived tokens) | Until reset; also read by the pre-hydration script `src/lib/themes/palette-init-script.ts` |
| `theme` | `next-themes` (read in `palette-init-script.ts` as `NEXT_THEMES_STORAGE_KEY`) | `light` / `dark` / `system` | Managed by the library |
| `magicLinkCooldownByEmail` (`MAGIC_LINK_COOLDOWN_STORAGE_KEY`) | [`src/lib/hooks/useMagicLinkCooldown.ts`](../url-shortener-ui/src/lib/hooks/useMagicLinkCooldown.ts) | JSON map `email -> expiry timestamp (ms)`; expired entries are pruned on read | Until expiry |
| `urlshortener:session-hint` (`SESSION_HINT_STORAGE_KEY`) | [`src/lib/session-hint.ts`](../url-shortener-ui/src/lib/session-hint.ts) | `"1"` when this browser had a signed-in session; a rendering hint, not a credential | Set after `/users/me` loads; cleared by `logout()` and a rejected token refresh |
| `urlshortener:billing:portal-return` (`PORTAL_RETURN_STORAGE_KEY`) | [`src/lib/billing-portal-return.ts`](../url-shortener-ui/src/lib/billing-portal-return.ts) | JSON `{expiresAtMs}`, written when the billing portal is opened in a new tab and consumed once by `consumePortalReturn` | Portal link TTL, fallback 10 minutes |

The access token and user profile are deliberately **not** persisted (the session hint stores neither) ([features/auth.md](features/auth.md)). Palette mechanics: [styling-and-theming.md](styling-and-theming.md).

## Context providers

| Provider | File | Holds | Notes |
|---|---|---|---|
| `ThemeProvider` | [`src/providers/theme-provider.tsx`](../url-shortener-ui/src/providers/theme-provider.tsx) | `next-themes` light/dark/system (`attribute="class"`) | Thin wrapper; no own state |
| `PaletteProvider` / `usePalette` | [`src/providers/palette-provider.tsx`](../url-shortener-ui/src/providers/palette-provider.tsx) | `selection: ThemeSelection`, `activePaletteId`, `selectPreset`, `applyCustomColors`, `resetToDefault` | State is initialised from `localStorage` (`readInitialSelection`), subscribes to `subscribeThemeSelection`, applies `data-palette` / inline CSS tokens on `<html>`; `usePalette` throws outside the provider. Both providers are mounted in the root layout (see [architecture.md](architecture.md)) |
| `BillingSettingsProvider` / `useBillingSettings` | [`src/components/settings/BillingSettingsProvider.tsx`](../url-shortener-ui/src/components/settings/BillingSettingsProvider.tsx) | billing `cycle`, plus the state objects of `useBillingSubscription`, `useBillingCheckout`, `useBillingPeriodUpgrade`, `useBillingPortal`, and `handlePortalReturn` | Mounted only by the billing settings page, so billing state is created on entry and discarded on leave. Not a store: nothing is shared outside that subtree. Behaviour: [features/billing-and-settings.md](features/billing-and-settings.md) |

`src/components/ui/chart.tsx` also has a context (`ChartContext`); it is a shadcn chart primitive, not app state.

Use context only for state scoped to a subtree that composes several hooks; use a Zustand store for state read across routes.

## Test reset helpers

- Stores are reset between tests with `useXStore.setState(initialState, true)` where `initialState = useXStore.getInitialState()` (pattern used in the store tests and `useTagMutations.test.ts`).
- `useImportTracker` has module-level state, so use the exported `resetImportTrackerForTests()` from `src/lib/store/import.ts`.
- `localStorage` and `sessionStorage` are cleared after each test in `src/test/setup.ts`.

How to write the tests: [testing.md](testing.md).

## Known limitations and existing exceptions

- Observation: whole-store subscriptions (`const {...} = useLinkStore()`) are used in the links page, tags page, analytics page, `TagSelect`, `LinkFormFields`, `CreateLinkModal`, `ExportCsvModal`, `EmptyLinksState`, `EmptyTagsState`, the dashboard layout (`useUIStore`) and the auth exchange page (`useAuthStore`). Selector subscriptions are used in settings, the sidebar user menu, `LinkCard`, `PageToolbar`, `useLinkImport`. Existing mix; new code should use selectors.
- Observation: components and hooks call `useX.setState` directly (`useTagMutations`) and the import store calls other stores; there is no central cache invalidation. After mutations, pages refetch explicitly (`fetchLinks(currentPage)`).
- Observation: several loads are `useEffect` + store/fetch calls: links page (`fetchLinks`, `fetchTags`, `hydrateShowArchived`, `ensureDiscovery`), tags page, analytics page, `LinkFormFields` (`fetchPreferences`), the dashboard layout (`GET /users/me` auth gate), `ProfileCard` and the settings general page (sessions list with local `useState`), billing hooks, `useUrlCleaner`. This is the current client-rendered convention; the store action is the fetch home, the effect only triggers it. Local-state loads in `settings/general/page.tsx` and `ProfileCard` bypass stores (user data is written to `useAuthStore` by `ProfileCard`). Existing exceptions, not templates.
- Observation: `src/app/(dashboard)/links/page.tsx` stops import tracking on unmount (`stopTracking`), so leaving the page abandons any visible progress; re-entering re-runs `ensureDiscovery`.
