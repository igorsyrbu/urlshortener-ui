# Billing and Settings

> The `/settings` shell and its two tabs: General (profile, appearance, color theme, preferences, sessions, danger zone) and Billing (plans, checkout, portal, period switch). Read before touching `components/settings`, `lib/billing-*.ts` or `lib/hooks/useBilling*.ts`. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [auth](auth.md) · [styling-and-theming](../styling-and-theming.md) · [state-management](../state-management.md) · [api-layer](../api-layer.md) · [routing-and-navigation](../routing-and-navigation.md) · [coding-patterns](../coding-patterns.md) · [testing](../testing.md) · [mock-server](../mock-server.md) · [architecture](../architecture.md)

## Settings shell

| File | Role |
|---|---|
| [`src/app/(dashboard)/settings/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/page.tsx) | Server-side `redirect()` to `SETTINGS_ROUTES.GENERAL` (`/settings/general`); one of the sanctioned server-side pages ([architecture](../architecture.md)) |
| [`src/app/(dashboard)/settings/layout.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/layout.tsx) | `PageContainer` capped at `max-w-4xl` and centred (`mx-auto`), `gap-6`: the page description (`SETTINGS_PAGE_COPY.DESCRIPTION`), `SettingsTabs`, `children` (static layout, no `"use client"`) |
| [`src/components/settings/SettingsTabs.tsx`](../../url-shortener-ui/src/components/settings/SettingsTabs.tsx) | Underline tabs: a `<nav>` of `Link`s from `SETTINGS_SECTIONS` on a hairline (`border-b-[0.5px]`); the active one (`getActiveSettingsSectionHref(pathname)`: the section containing the path, General for `/settings` and `/settings/`) gets `aria-current="page"`, foreground text and a 2 px foreground bar; each carries `LinkPendingIndicator` |
| [`src/lib/settings-constants.ts`](../../url-shortener-ui/src/lib/settings-constants.ts) | `SETTINGS_ROUTES`, `SETTINGS_LABELS`, `SETTINGS_SECTIONS`, `SETTINGS_PAGE_COPY`, `SETTINGS_SECTION_COPY` (title and description of every section) |
| [`src/components/settings/SettingsSection.tsx`](../../url-shortener-ui/src/components/settings/SettingsSection.tsx) | One row: a `<section>` labelled by its `h2`; title and description on the left (`16rem`), the cards on the right, once the list is 48rem wide (container query `@3xl`, because the width next to the sidebar matters, not the viewport); stacked below. `SETTINGS_SECTION_LIST_CLASS` on the parent separates rows with a hairline. `isDestructive` colours the title (Danger zone) |
| [`SettingsCardFooter.tsx`](../../url-shortener-ui/src/components/settings/SettingsCardFooter.tsx) | The action bar at the bottom of a card (card colour, hairline on top, actions on the right); the card gets `SETTINGS_CARD_WITH_FOOTER_CLASS` (`pb-0`) so the bar reaches its edge. Used by Profile, the current session, the current plan and the plan cards |
| [`SettingsCallout.tsx`](../../url-shortener-ui/src/components/settings/SettingsCallout.tsx) | A short message inside a card, `info` or `destructive` (with `isAlert` it is `role="alert"`); text wraps with `break-all` because server reasons can be one long token |

Adding a settings tab: add a route folder under `settings/`, then extend the three constants; `SettingsTabs` needs no change. Route map: [routing-and-navigation](../routing-and-navigation.md).

## General tab

[`src/app/(dashboard)/settings/general/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/general/page.tsx) is a client page made of `SettingsSection` rows: Profile (`ProfileCard`), Appearance (`AppearanceCard`, `ThemeCard`), Preferences (`PreferencesCard`), Sessions (current/other sessions), Danger zone (`DangerZoneCard`), plus `SessionLogoutDialog`. Section titles and descriptions come from `SETTINGS_SECTION_COPY`, so the cards themselves carry no title.

### Profile

`ProfileCard` reads `user` from `useAuthStore`; until it exists it renders `ProfileCardSkeleton` (the same layout: avatar circle, text-sized bars for name and email, the real field labels, field-sized placeholders, the footer bar). The card starts with the avatar (`pictureUrl`, user icon fallback), name and email, both truncated with `title`; then full-width Email (disabled) and Name fields; Save sits in the `SettingsCardFooter`. Saving the name does `PUT /users/me/name` (`API_ENDPOINTS.USERS_ME_NAME`), then refetches `GET /users/me` and writes the result with `setUser`, then toasts. Save is disabled while saving or when the trimmed name is empty. Local form state (`name`, `email`) is re-synced from the store whenever `user` changes. Form conventions: [coding-patterns](../coding-patterns.md).

### Appearance and color theme

- `AppearanceCard`: a "Mode" row (label and description left, a Light / Dark / System `SegmentedControl` right, full width on phones) calling `next-themes` `setTheme`. The stored mode is only known after hydration, so until mounted the same control renders disabled with nothing selected (no separate skeleton, nothing moves).
- `ThemeCard`: a header row ("Color theme" heading from `ThemeCardHeading`, the Built-in / Custom `SegmentedControl` on the right) above the content. It opens on "Custom" automatically when the stored palette selection is custom, unless the user already switched tabs. Skeleton until mounted (`useHasMounted`): the same heading, a placeholder for the switch and one tile per palette with its real name, so the card keeps its height. `CustomThemeBuilder` (with `culori` and `react-colorful`) loads on demand through `next/dynamic`, with a placeholder of its measured height (`min-h-87 sm:min-h-54`); the "Custom" option preloads it on hover or focus (`onIntent`). First-load JS of `/settings/general`: 271.4 -> 246.0 KB gzip.
  - `PresetPaletteGrid`: picks a preset with `selectPreset` from `usePalette()`. Each tile shows four swatch circles and the name. Columns follow the card width (`PALETTE_GRID_CLASS`: 2, 3 from `@md`, 4 from `@2xl`; `ThemeCard`'s content is the container).
  - `CustomThemeBuilder`: four colour rows (`CustomColorRow`), applied with `applyCustomColors`; Share copies the serialized colours to the clipboard, a "Surprise me" action randomises them, and Import (`ImportThemeDialog`) parses pasted input with `parseCustomColorsInput`, toasting "Theme imported" on success and showing an inline error on invalid input.
  - All palette mechanics (storage, init script, token mapping) are in [styling-and-theming](../styling-and-theming.md).

### Preferences (tracker detection, keyboard shortcuts)

[`ShortcutsCard`](../../url-shortener-ui/src/components/settings/ShortcutsCard.tsx) sits under the tracker card: a labelled `Switch` (`id` and `aria-describedby` from `useId`) for `useShortcutsStore.isEnabled` and a "View shortcuts" footer button that opens the shortcuts dialog. Shortcut rules: [links-and-tags](links-and-tags.md).

`PreferencesCard` + `usePreferencesStore` ([`src/lib/store/preferences.ts`](../../url-shortener-ui/src/lib/store/preferences.ts)):

- On mount (once, guarded by a ref) `fetchPreferences()` calls `GET /users/me/preferences`. The store loads once per session (`hasLoaded`), ignores concurrent loads, and validates the payload (`urlCleanerMode` must be one of `TRACKER_MODE` values); an invalid payload is logged and treated as a failed load.
- Layout: a "Tracker detection" header, then one row per option under a hairline (icon, label and description, a round check mark on the selected one). Failure with no value shows a destructive `SettingsCallout` and a Retry button; while `trackerMode` is `null` the three real option rows render disabled with none selected (`aria-busy` on the group), so nothing moves when the value arrives.
- Options (radiogroup of buttons): disabled / suggest / auto-clean, labels from `TRACKER_MODE_LABELS` / `TRACKER_MODE_DESCRIPTIONS`.
- Selecting an option is optimistic: `updatePreferences` sets the mode, sends `PUT /users/me/preferences` with `{urlCleanerMode}`, adopts the server's returned value, and on failure reverts to the previous mode and rethrows; the card toasts "Couldn't save preference. Please try again." Buttons are disabled while loading or saving.
- The same store is read by the link form (`components/links/LinkFormFields.tsx`) to decide the URL-cleaner behaviour; see [links-and-tags](links-and-tags.md).

### Sessions

Fetching and mutation live in the page component with local state (not a store): `GET /users/sessions` on mount (current session sorted first), `DELETE /users/sessions/{id}`, `DELETE /users/sessions/current`, `DELETE /users/sessions/other`. Terminating the current session calls `useAuthStore.getState().logout()` and `router.replace(ROUTES.LOGIN)`. Components, confirm dialog wording (JWT TTL note) and logout semantics: [auth](auth.md).

### Danger zone

`DangerZoneCard` is one row in a card with a destructive border: "Delete account" with its description on the left, an outline "Delete Account" button in destructive text on the right (full width on phones). It opens `DeleteAccountDialog` (loaded on first open), a Dialog (desktop) or Drawer (mobile, `useIsDesktop`) that requires typing the user's email (case-insensitive, trimmed) to enable "Yes, Delete Account". See limitations: confirming does not call an API.

## Billing tab

[`src/app/(dashboard)/settings/billing/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/settings/billing/page.tsx) wraps `BillingSettings` in `BillingSettingsProvider`. The provider ([`BillingSettingsProvider.tsx`](../../url-shortener-ui/src/components/settings/BillingSettingsProvider.tsx)) is a React context holding the selected `cycle` (`"monthly"` default) and the four hooks below; consumers use `useBillingSettings()` (throws outside the provider). State here is local to the billing page, not in a Zustand store ([state-management](../state-management.md)).

### API module and DTO mapping

The four billing calls, `BillingApiError` and the `X-Rate-Limit-Retry-After-Seconds` handling are described once in [api-layer](../api-layer.md#billing-api-module). Constants and copy are in [`src/lib/billing-constants.ts`](../../url-shortener-ui/src/lib/billing-constants.ts) (`BILLING_COPY`, `BILLING_PRICES`, `BILLING_PLANS`, `FREE_BILLING_SUBSCRIPTION`).

`toBillingSubscription` decides the UI plan: Pro only if `plan === "PRO"`, `status` is `ACTIVE` or `TRIALING`, and `currentPeriodEnd` is in the future; anything else (past due, canceled, expired, invalid date) resolves to Free. A pending switch is recognised only when `pendingBillingPeriod === "YEARLY"`; an unparsable `pendingAppliesAt` yields a switch with a null date.

### Page states

`BillingSettings` ([`BillingSettings.tsx`](../../url-shortener-ui/src/components/settings/BillingSettings.tsx)):

- Layout: two rows in `SETTINGS_SECTION_LIST_CLASS`. "Current plan" is a `SettingsSection` with [`BillingCurrentPlanCard`](../../url-shortener-ui/src/components/settings/BillingCurrentPlanCard.tsx); "Billing plans" (`BILLING_COPY.PLANS_TITLE`) spans the full width, with its heading and description left and `BillingCycleSelector` right, above the plan grid (two columns from a 36rem container).
- `BillingCurrentPlanCard`: plan name plus a status badge (`gray` Free, `green` Active, `yellow` Canceling or Pending change), a note (Free: `FREE_PLAN_NOTE`; Pro: "Cancels on <date>" when `cancelAtPeriodEnd`, else "Renews on <date>"), an info `SettingsCallout` "Switches to yearly billing on <date>" (or "...at your next renewal") when a switch is scheduled (server `pendingSwitch` wins over the local optimistic `scheduledSwitch`), a destructive callout for a portal error, and for Pro a footer bar with "Manage subscription".
- Initial/retry load: the real layout renders with the cycle selector disabled, the current-plan card as the Free layout with text-sized bars and a hidden badge (Free is the default, so most visits move nothing), and both plan cards in `isLoading` (prices and features shown; no current-plan badge or ring; a pulse bar in place of the button), with the current-plan card as `role="status"` "Loading subscription…" (on the card, not as an extra child of the section list, which would take the first section's `first:pt-0` away and shift the page when it disappears). Load failure: a destructive callout plus Retry instead of both rows (`handleRetry` bumps a counter that reruns the load effect).
- Two plan cards (`BillingPlanCard`) from `BILLING_PLANS`: Free and Pro. Each has a header row (name, "Current plan" badge) under a hairline, price and billing note, the plan description, the feature list, and its button in the footer bar. The current plan gets a ring and the badge. Prices come from `BILLING_PRICES[cycle]` ($9.99 monthly, $8.33/month billed yearly at $99.99) with an animated `BillingPrice` (CSS cross-fade, see [styling-and-theming](../styling-and-theming.md) motion rules).
- `BillingCycleSelector` (Monthly / Yearly "Save 17%") is disabled while anything is busy or a yearly switch is scheduled.

Request ordering in [`useBillingSubscription`](../../url-shortener-ui/src/lib/hooks/useBillingSubscription.ts): every load and silent refresh takes the next request id and only the newest may update state, so a slow, older response can never overwrite a newer one (portal return, period switch and Retry can overlap). Whichever request finishes last also ends a pending visible load (skeleton) and shows the load error if it failed. Unmount discards everything in flight.

### Checkout (Free to Pro)

1. Free user selects a cycle and clicks "Upgrade to Pro" on the Pro card.
2. `useBillingCheckout.handleUpgrade` sets `isRedirecting`, calls `createBillingCheckoutUrl(cycle)` and `redirectToBillingUrl(url)` (both refuse a URL outside the billing allowlist, which then shows the generic checkout error; see [api-layer](../api-layer.md#billing-api-module)) (`window.location.assign`, same tab).
3. The user pays on the external page, which returns to `/settings/billing`; the page remounts and loads the subscription fresh.
   Pressing Back on the external page instead can restore `/settings/billing` from the browser's back/forward cache, without a remount. `isRedirecting` is never reset after a successful redirect, so a `pageshow` listener with `event.persisted` resets it; otherwise the button would stay on "Redirecting…".
4. Errors (button re-enabled, inline alert): 409 -> "You're already on Pro." and the subscription is reloaded (`handleRetry`); 400 -> invalid period; 429 -> rate-limited message with ` Try again in Ns.` when the header was present; anything else -> generic failure.

### Portal and return refresh

1. Pro user clicks "Manage subscription": `useBillingPortal.handleManage` first opens an empty tab with `openBlankBillingTab` (`window.open("about:blank", "_blank")`, `opener` nulled, "Opening portal…" as title and text), synchronously in the click. Only then does it call `createBillingPortalUrl`, then `showBillingUrlInTab(tab, url)` (`tab.location.replace`) and `markPortalOpened()`. A failed request closes the empty tab and shows the inline error; a blocked tab (`null`) falls back to same-tab navigation. Opening the tab after the `await` would be blocked once the click's user activation expires (about 1 s in Safari).
2. [`billing-portal-return.ts`](../../url-shortener-ui/src/lib/billing-portal-return.ts) stores `{openedAtMs}` under `sessionStorage["urlshortener:billing:portal-return"]`: per tab (another tab with the billing page cannot take the refresh), it survives a reload of this tab, it is not shared with the portal tab, and it ends with the tab (no leak to the next user). It counts for `PORTAL_RETURN_MAX_AGE_MS` (24 h), independent of the portal session's lifetime, so changes made just before the session expired still refresh. The UI does not read `expiresInSeconds`. Storage errors are swallowed (refresh just stays disabled).
3. In the original tab, `BillingSettings` listens to `window` `focus` and `document` `visibilitychange` (when visible). While `peekPortalReturn()` is true it calls `handlePortalReturn` and clears the flag (`clearPortalReturn`) only when that refresh succeeded, so a failed refresh is tried again on the next return.
4. `handlePortalReturn` calls `refreshSilently()` (re-fetches the subscription without the skeleton; returns false on error, on unmount, or when a newer request superseded it), returns that result and, if it succeeded, clears the local optimistic `scheduledSwitch` so the server state wins (e.g. after "Cancel yearly switch" in the portal).
5. Errors: 404 -> "No billing history yet..."; 429 -> rate-limited message; else generic. Reproduction recipes live in [`README.md`](../../README.md) (mock billing section).

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
- Observation: a 409 from checkout ("already on Pro" message) or from the period switch (no message) reloads the whole subscription through `handleRetry`, which shows the loading state again.
- Observation: plan features, prices and the "Save 17%" label are hard-coded in `billing-constants.ts`; they are not loaded from the API.
- Observation: sessions logic (fetch, terminate, sort) lives inside the General page component with `useState`/`useEffect`, not in a store or hook; `ProfileCard` and `PreferencesCard` also fetch in effects. Existing pattern for this feature, not a template for new data loading (see [api-layer](../api-layer.md)).
- Tests: component and hook tests are co-located; billing fixtures are in `src/test/billing-utils.ts` ([testing](../testing.md)).
