# Analytics

> The `/analytics` page: period selection, comparison badge, time-series chart, breakdown cards and how the analytics store fetches them. Read before changing anything under `components/analytics` or `lib/store/analytics.ts`. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [state-management](../state-management.md) · [api-layer](../api-layer.md) · [styling-and-theming](../styling-and-theming.md) · [coding-patterns](../coding-patterns.md) · [testing](../testing.md) · [mock-server](../mock-server.md) · [routing-and-navigation](../routing-and-navigation.md)

## Overview

- Route: `/analytics` ([`src/app/(dashboard)/analytics/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/analytics/page.tsx)), a `"use client"` page inside the authenticated dashboard group (auth gate: [architecture](../architecture.md)).
- All data lives in one Zustand store, `useAnalyticsStore` ([`src/lib/store/analytics.ts`](../../url-shortener-ui/src/lib/store/analytics.ts)). The page destructures the whole store (no selectors) and passes slices to presentational components. The store is the only consumer of the analytics endpoint; the page is its only consumer.
- Endpoint: `API_ENDPOINTS.ANALYTICS` (`/analytics`) via `fetchWithAuth` ([api-layer](../api-layer.md)). Top-link enrichment uses `API_ENDPOINTS.SHORTLINKS_BY_IDS` (`/shortlinks/byIds?ids=a,b,c`).
- Page layout: `PeriodSelector` row, a card with "Total Clicks" + `ComparisonBadge` + `ClicksTimeSeriesChart`, then a 2-column grid of four `AnalyticsCard`s: Top Links, Referrers, Countries/Continents (tabs), Devices/OS (tabs).

## Data flow

1. Mount: the page calls `fetchAnalytics()` in `useEffect`. Without `force` it is a no-op once `hasFetched` is true, so navigating away and back reuses the cached data (and the selected period) for the lifetime of the page load.
2. `fetchAnalytics` sets `loading`, `isLocationLoading`, `isDeviceLoading` to true, builds the query string and fires independent requests in parallel (fire-and-forget, each writes its own slice):

| Slice | Request (`/analytics` + ...) | Notes |
|---|---|---|
| `totalClicks` | `?period=P7D` or `?start=YYYY-MM-DD&end=YYYY-MM-DD` | Response must be a JSON number; also clears `loading` |
| `previousTotalClicks` | `?start=..&end=..` for the window before the period | `null` for `custom` (no request) |
| `timeSeries` | `&groupBy=date` | `[{date, clicks}]` |
| `referrers` | `&groupBy=referrer` | `[{label, clicks, hostname?}]` |
| `topLinks` | `&groupBy=top_link`, then `/shortlinks/byIds` | `details` (a `LinkItem`) attached when the lookup succeeds |
| `countries` / `continents` | `&groupBy=country` / `continent` | Only the active tab is fetched initially |
| `devices` / `os` | `&groupBy=device` / `os` | Only the active tab is fetched initially |

3. Non-OK responses for the grouped requests fall back to `[]`; errors are logged with `logger.error` and swallowed. There is no error UI for this page.

## Period selection

- Presets in `PeriodSelector`: `P7D` (default store value), `P30D`, `P90D` (ISO-8601 durations sent as `period`). `Custom` is a fourth option with `period === "custom"`.
- `setPeriod(period)` stores the value and calls `fetchAnalytics(true)`. `setCustomDateRange(range)` stores the range and, only when both `from` and `to` are set, switches `period` to `"custom"` and refetches.
- The previous-period window for the badge is computed client-side: `end = today - N days`, `start = end - N days` where N is the number parsed from the period (`DEFAULT_PERIOD_DAYS` = 30 as fallback). Dates are formatted with `toISOString().split("T")[0]` (UTC date).
- Custom range query uses `start`/`end` with the same UTC date formatting.

### Custom range: desktop vs mobile

`PeriodSelector` switches on `useIsMobile()` (see the responsive pattern in [coding-patterns](../coding-patterns.md)).

- Desktop: `Custom` opens a `Popover` with a 2-month range `Calendar` (week starts Monday). First click sets `from`; second click sets `to` (swapped if reversed) and calls `onCustomDateRangeChange`. Days before Jan 1 of `ALLOWED_YEARS[0]` or after today are disabled and ignored.
- Mobile: `Custom` opens `DateRangeDrawer` ([`src/components/analytics/DateRangeDrawer.tsx`](../../url-shortener-ui/src/components/analytics/DateRangeDrawer.tsx)), a bottom drawer with a single-month calendar, prev/next month buttons, and an iOS-style wheel picker (month + year) toggled by the header. The second day tap applies the range (swapping if reversed) and closes the drawer. Navigation is limited to the months of `ALLOWED_YEARS`; selecting a future month in the wheel bounces back to the current month after 200 ms.
- Chart drag-zoom (desktop only, `useIsDesktop`): mouse drag over the time series selects an index range and calls `onZoom` with `{from, to}` dates; this goes through `setCustomDateRange`, so zooming switches the page to `custom`. A drag with equal start/end indices does nothing; leaving the chart cancels the drag.

## Components

| Component | Role |
|---|---|
| `ComparisonBadge` | Hidden for `custom` or when `previousTotalClicks === null`. Percent = change vs previous; when previous is 0 it shows +100% if current > 0, else 0%. Green with `TrendingUp` when >= 0, destructive with `TrendingDown` otherwise. Text: "vs last N days" |
| `ClicksTimeSeriesChart` | Recharts `AreaChart`; empty `timeSeries` shows "Gathering chart data..."; Y axis uses integer ticks `0..max` when max <= 4 (`LOW_CLICKS_THRESHOLD`), compact `k`/`M` formatting otherwise |
| `AnalyticsCard` | Card frame with either a title or tab buttons (controlled via `isActive`/`onTabChange`) and a "Clicks" column header |
| `HorizontalBarChart` | Shared Recharts bar chart for all four breakdowns; bar value = clicks, tooltip shows percentage of `totalClicks`; each tab supplies a `renderLabel` |
| `TopLinksTab` | Sorted by clicks desc; label is `details.shortUrl` or the raw `shortLinkId`; favicon via `LinkFavicon` when `details.longUrl` exists, otherwise `FaviconPlaceholder` |
| `ReferrersTab` | Favicon from `https://<hostname>`; `(direct)` or missing hostname gets a link icon |
| `LocationTab` / `LocationIcon` | Countries: name via `Intl.DisplayNames`, flag image from `FLAG_SERVICE_URL` (external host) with a `MapPin` fallback on load error; continents use the pin |
| `DeviceTab` | Icons from `public/icons/*.png` chosen by case-insensitive name match (`windows`, `mac`, `linux`, `ios`, `android`, `other`, else `unknown`) |
| `AnalyticsPageSkeleton` | Full-page skeleton |

Bar colours come from `CHART_COLORS` in `lib/constants.ts`; chart/theme details in [styling-and-theming](../styling-and-theming.md).

## Tabs and lazy fetching

`setLocationTab` / `setDeviceTab` switch the active tab and fetch that tab's data only if its array is empty. Tab data is not refetched on tab switch otherwise.

## Loading, empty and error states

- Page-level skeleton: shown only while `loading && timeSeries.length === 0` (first load). During later period changes the old data stays visible and the section components show their own state: the tab components show a spinner only when `isLoading` and their data is empty; otherwise they render the stale data until the new response replaces it.
- Empty states per card: "No top links data available.", "No referrer data active.", "No location data available for this period.", "No traffic to display." (devices), and "Gathering chart data..." for the chart.
- Failed requests are indistinguishable from empty data for grouped slices (see limitations).

## Known limitations and existing exceptions

All are observations; they are not templates and not permission for drive-by changes.

- Observation: `ALLOWED_YEARS` in `lib/constants.ts` is the hard-coded tuple `[2026]`. The desktop calendar lower bound, the drawer's year wheel and prev/next limits all derive from it, so ranges in other years cannot be picked until it is edited.
- Observation: `loading` is cleared only when the total-clicks request returns a number. If that request fails or returns a non-number, `loading` stays true; with an empty `timeSeries` the page keeps showing the skeleton.
- Observation: no request-race protection. Changing the period quickly can let an older response overwrite a newer one, since each response writes unconditionally.
- Observation: on a period change, `fetchAnalytics(true)` refetches only the active location/device tab. The inactive tab (e.g. Continents) keeps its previous-period array and `setLocationTab` will not refetch it because the array is non-empty, so it can show stale data.
- Observation: `useAnalyticsStore` is subscribed to as a whole in the page, so any slice update re-renders the page.
- Observation: custom/previous dates are formatted in UTC via `toISOString()`, while calendar selections are local-midnight dates; in time zones ahead of UTC the sent `start`/`end` can fall one day earlier than the selected day.
- Observation: the mock server returns fixed prior totals for `start`/`end` requests without `groupBy` (see [mock-server](../mock-server.md)), so the comparison badge values in dev are canned.
- Observation: country flags load from the external `FLAG_SERVICE_URL`; the page degrades to the pin icon if it is unreachable.
- Tests: see [testing](../testing.md); `src/test/analytics-utils.tsx` holds shared analytics fixtures.
