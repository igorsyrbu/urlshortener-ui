# Billing and Settings

> The `/settings` shell and its two tabs: General (profile, appearance, color theme, preferences, sessions, danger zone) and Billing (plans, checkout, portal, period switch). Read before touching `components/settings`, `lib/billing-*.ts` or `lib/hooks/useBilling*.ts`. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [auth](auth.md) · [styling-and-theming](../styling-and-theming.md) · [state-management](../state-management.md) · [api-layer](../api-layer.md) · [routing-and-navigation](../routing-and-navigation.md) · [coding-patterns](../coding-patterns.md) · [testing](../testing.md) · [mock-server](../mock-server.md) · [architecture](../architecture.md)

## Settings shell

| File | Role |
|---|---|
| [`src/app/(dashboard)/settings/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/page.tsx) | Server-side `redirect()` to `SETTINGS_ROUTES.GENERAL` (`/settings/general`); one of the sanctioned server-side pages ([architecture](../architecture.md)) |
| [`src/app/(dashboard)/settings/layout.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/layout.tsx) | `PageContainer` + `SettingsTabs` + `children` (static layout, no `"use client"`) |
| [`src/components/settings/SettingsTabs.tsx`](../../url-shortener-ui/src/components/settings/SettingsTabs.tsx) | `SegmentedControl` whose options are links (`href`) built from `SETTINGS_SECTIONS`; active value is `usePathname()` |
| [`src/lib/settings-constants.ts`](../../url-shortener-ui/src/lib/settings-constants.ts) | `SETTINGS_ROUTES`, `SETTINGS_LABELS`, `SETTINGS_SECTIONS` |

Adding a settings tab: add a route folder under `settings/`, then extend the three constants; `SettingsTabs` needs no change. Route map: [routing-and-navigation](../routing-and-navigation.md).

## General tab

[`src/app/(dashboard)/settings/general/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/general/page.tsx) is a client page that composes cards in this order: `ProfileCard`, `AppearanceCard`, `ThemeCard`, `PreferencesCard`, current/other sessions, `DangerZoneCard`, plus `SessionLogoutDialog`.

### Profile

`ProfileCard` reads `user` from `useAuthStore`; until it exists it renders `ProfileCardSkeleton`. Email is a disabled input. Saving the name does `PUT /users/me/name` (`API_ENDPOINTS.USERS_ME_NAME`), then refetches `GET /users/me` and writes the result with `setUser`, then toasts. Save is disabled while saving or when the trimmed name is empty. Local form state (`name`, `email`) is re-synced from the store whenever `user` changes. Form conventions: [coding-patterns](../coding-patterns.md).

### Appearance and color theme

- `AppearanceCard`: Light / Dark / System buttons calling `next-themes` `setTheme`. Renders a skeleton until mounted to avoid a hydration mismatch.
- `ThemeCard`: `SegmentedControl` with "Built-in" and "Custom" tabs. It opens on "Custom" automatically when the stored palette selection is custom, unless the user already switched tabs. Skeleton until mounted (`useSyncExternalStore`).
  - `PresetPaletteGrid`: picks a preset with `selectPreset` from `usePalette()`.
  - `CustomThemeBuilder`: four colour rows (`CustomColorRow`), applied with `applyCustomColors`; Share copies the serialized colours to the clipboard, a "Surprise me" action randomises them, and Import (`ImportThemeDialog`) parses pasted input with `parseCustomColorsInput`, toasting "Theme imported" on success and showing an inline error on invalid input.
  - All palette mechanics (storage, init script, token mapping) are in [styling-and-theming](../styling-and-theming.md).

### Preferences (tracker detection)

`PreferencesCard` + `usePreferencesStore` ([`src/lib/store/preferences.ts`](../../url-shortener-ui/src/lib/store/preferences.ts)):

- On mount (once, guarded by a ref) `fetchPreferences()` calls `GET /users/me/preferences`. The store loads once per session (`hasLoaded`), ignores concurrent loads, and validates the payload (`urlCleanerMode` must be one of `TRACKER_MODE` values); an invalid payload is logged and treated as a failed load.
- Failure with no value shows an inline message and a Retry button; while `trackerMode` is `null` the three option cards render as skeletons.
- Options (radiogroup of buttons): disabled / suggest / auto-clean, labels from `TRACKER_MODE_LABELS` / `TRACKER_MODE_DESCRIPTIONS`.
- Selecting an option is optimistic: `updatePreferences` sets the mode, sends `PUT /users/me/preferences` with `{urlCleanerMode}`, adopts the server's returned value, and on failure reverts to the previous mode and rethrows; the card toasts "Couldn't save preference. Please try again." Buttons are disabled while loading or saving.
- The same store is read by the link form (`components/links/LinkFormFields.tsx`) to decide the URL-cleaner behaviour; see [links-and-tags](links-and-tags.md).

### Sessions

Fetching and mutation live in the page component with local state (not a store): `GET /users/sessions` on mount (current session sorted first), `DELETE /users/sessions/{id}`, `DELETE /users/sessions/current`, `DELETE /users/sessions/other`. Terminating the current session calls `useAuthStore.getState().logout()` and `router.replace(ROUTES.LOGIN)`. Components, confirm dialog wording (JWT TTL note) and logout semantics: [auth](auth.md).

### Danger zone

`DangerZoneCard` opens a Dialog (desktop) or Drawer (mobile, `useIsDesktop`) that requires typing the user's email (case-insensitive, trimmed) to enable "Yes, Delete Account". See limitations: confirming does not call an API.

## Billing tab

[`src/app/(dashboard)/settings/billing/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/billing/page.tsx) wraps `BillingSettings` in `BillingSettingsProvider`. The provider ([`BillingSettingsProvider.tsx`](../../url-shortener-ui/src/components/settings/BillingSettingsProvider.tsx)) is a React context holding the selected `cycle` (`"monthly"` default) and the four hooks below; consumers use `useBillingSettings()` (throws outside the provider). State here is local to the billing page, not in a Zustand store ([state-management](../state-management.md)).

### API module and DTO mapping

The four billing calls, `BillingApiError` and the `X-Rate-Limit-Retry-After-Seconds` handling are described once in [api-layer](../api-layer.md#billing-api-module). Constants and copy are in [`src/lib/billing-constants.ts`](../../url-shortener-ui/src/lib/billing-constants.ts) (`BILLING_COPY`, `BILLING_PRICES`, `BILLING_PLANS`, `FREE_BILLING_SUBSCRIPTION`).

`toBillingSubscription` decides the UI plan: Pro only if `plan === "PRO"`, `status` is `ACTIVE` or `TRIALING`, and `currentPeriodEnd` is in the future; anything else (past due, canceled, expired, invalid date) resolves to Free. A pending switch is recognised only when `pendingBillingPeriod === "YEARLY"`; an unparsable `pendingAppliesAt` yields a switch with a null date.

### Page states

`BillingSettings` ([`BillingSettings.tsx`](../../url-shortener-ui/src/components/settings/BillingSettings.tsx)):

- Initial/retry load: `BillingSettingsSkeleton`. Load failure: red message plus Retry (`handleRetry` bumps a counter that reruns the load effect); plan cards are hidden while the error shows.
- Two plan cards (`BillingPlanCard`) from `BILLING_PLANS`: Free and Pro. The current plan gets a ring and a "Current plan" badge. Prices come from `BILLING_PRICES[cycle]` ($9.99 monthly, $8.33/month billed yearly at $99.99) with an animated `BillingPrice`.
- `BillingCycleSelector` (Monthly / Yearly "Save 17%") is disabled while anything is busy or a yearly switch is scheduled.
- Pro users also see "Manage subscription" and a note: "Switches to yearly billing on <date>" (or "...at your next renewal" when the date is unknown), else "Cancels on <date>" when `cancelAtPeriodEnd`, else "Renews on <date>". The scheduled note prefers server `pendingSwitch` over the local optimistic `scheduledSwitch`.

Request ordering in [`useBillingSubscription`](../../url-shortener-ui/src/lib/hooks/useBillingSubscription.ts): every load and silent refresh takes the next request id and only the newest may update state, so a slow, older response can never overwrite a newer one (portal return, period switch and Retry can overlap). Whichever request finishes last also ends a pending visible load (skeleton) and shows the load error if it failed. Unmount discards everything in flight.

### Checkout (Free to Pro)

1. Free user selects a cycle and clicks "Upgrade to Pro" on the Pro card.
2. `useBillingCheckout.handleUpgrade` sets `isRedirecting`, calls `createBillingCheckoutUrl(cycle)` and `redirectToBillingUrl(url)` (both refuse a URL outside the billing allowlist, which then shows the generic checkout error; see [api-layer](../api-layer.md#billing-api-module)) (`window.location.assign`, same tab).
3. The user pays on the external page, which returns to `/settings/billing`; the page remounts and loads the subscription fresh.
   Pressing Back on the external page instead can restore `/settings/billing` from the browser's back/forward cache, without a remount. `isRedirecting` is never reset after a successful redirect, so a `pageshow` listener with `event.persisted` resets it; otherwise the button would stay on "Redirecting…".
4. Errors (button re-enabled, inline alert): 409 -> "You're already on Pro." and the subscription is reloaded (`handleRetry`); 400 -> invalid period; 429 -> rate-limited message with ` Try again in Ns.` when the header was present; anything else -> generic failure.

### Portal and return refresh

1. Pro user clicks "Manage subscription": `useBillingPortal.handleManage` calls `createBillingPortalUrl`, then `markPortalOpened(expiresInSeconds)` and `openBillingUrlInNewTab(url)` (`window.open(..., "_blank")` with `opener` nulled; falls back to same-tab navigation if the popup is blocked).
2. [`billing-portal-return.ts`](../../url-shortener-ui/src/lib/billing-portal-return.ts) stores `{expiresAtMs}` under `localStorage["urlshortener:billing:portal-return"]`; the TTL is `expiresInSeconds` or, when missing/invalid, `PORTAL_RETURN_FALLBACK_TTL_MS` (10 minutes). Storage errors are swallowed (refresh just stays disabled).
3. In the original tab, `BillingSettings` listens to `window` `focus` and `document` `visibilitychange` (when visible). If the current subscription is Pro and `consumePortalReturn()` returns true (flag present and unexpired; it is always removed when read), it calls `handlePortalReturn`.
4. `handlePortalReturn` calls `refreshSilently()` (re-fetches the subscription without the skeleton; returns false on error, on unmount, or when a newer request superseded it) and, if it succeeded, clears the local optimistic `scheduledSwitch` so the server state wins (e.g. after "Cancel yearly switch" in the portal).
5. Errors: 404 -> "No billing history yet..."; 429 -> rate-limited message; else generic. The flag is shared by same-origin tabs and consumed by the first eligible event. Reproduction recipes live in [`README.md`](../../README.md) (mock billing section).

### Period switch (monthly to yearly)

1. A Pro user selects "Yearly"; the Pro card button becomes "Switch to yearly" (shown only when `isPro`, plan is Pro, cycle is yearly, no local scheduled switch and no server pending switch). On Pro with Monthly selected it is "Current plan" (disabled).
2. Clicking it opens `PeriodSwitchConfirmModal` (Dialog on desktop, Drawer on mobile) with the "Switch to annual billing?" copy.
3. Confirm closes the modal and runs `useBillingPeriodUpgrade.handleSwitch` -> `POST /billing/subscription/upgrade`.
4. Success: `scheduledSwitch = {effectiveDate}` is stored locally and `onScheduled` triggers `refreshSilently()`. The note switches to "Switches to yearly billing on ...", the cycle selector locks.
5. Errors: 409 -> `onConflict` (reloads the subscription, no message); 404 -> "subscription couldn't be found"; 422 -> "can't be switched ... right now"; 429 -> rate-limited message; else generic. Repeat clicks are ignored while scheduling or once scheduled.

### Mock server contract

Endpoints, scenarios, error codes (400/404/409/422/429), rate limits and hosted checkout/portal pages are described in [mock-server](../mock-server.md) and the "Billing" section of [`README.md`](../../README.md). The checkout and portal URLs the UI receives point at the mock server's hosted pages, which redirect back to `/settings/billing`.

## Known limitations and existing exceptions

All are observations; not templates and not permission for drive-by changes.

- Observation: `DangerZoneCard`'s confirm handler (`onConfirmDelete` in the General page) only closes the dialog; there is no account-deletion request.
- Observation: the subscription DTO carries no "current billing period", so a Pro user already billed yearly who selects Yearly still sees "Switch to yearly"; the backend answers 409 and the UI silently reloads. The mock does so for yearly, pending and canceling subscriptions.
- Observation: `consumePortalReturn` removes the flag on any focus/visibility event while the subscription is Pro, even if the later refresh fails, so a failed refresh is not retried by a subsequent focus.
- Observation: a 409 from checkout ("already on Pro" message) or from the period switch (no message) reloads the whole subscription through `handleRetry`, which shows the billing skeleton again.
- Observation: plan features, prices and the "Save 17%" label are hard-coded in `billing-constants.ts`; they are not loaded from the API.
- Observation: sessions logic (fetch, terminate, sort) lives inside the General page component with `useState`/`useEffect`, not in a store or hook; `ProfileCard` and `PreferencesCard` also fetch in effects. Existing pattern for this feature, not a template for new data loading (see [api-layer](../api-layer.md)).
- Tests: component and hook tests are co-located; billing fixtures are in `src/test/billing-utils.ts` ([testing](../testing.md)).
