# Analytics

> The `/analytics` page: period selection, comparison badge, time-series chart, breakdown cards and how the analytics store fetches them. Read before changing anything under `components/analytics` or `lib/store/analytics.ts`. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [state-management](../state-management.md) · [api-layer](../api-layer.md) · [styling-and-theming](../styling-and-theming.md) · [coding-patterns](../coding-patterns.md) · [testing](../testing.md) · [mock-server](../mock-server.md) · [routing-and-navigation](../routing-and-navigation.md)

## Overview

- Route: `/analytics` ([`src/app/(dashboard)/analytics/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/analytics/page.tsx)), a `"use client"` page inside the authenticated dashboard group (auth gate: [architecture](../architecture.md)).
- All data lives in one Zustand store, `useAnalyticsStore` ([`src/lib/store/analytics.ts`](../../url-shortener-ui/src/lib/store/analytics.ts)). The page and `AnalyticsBreakdownGrid` destructure the whole store (no selectors) and pass slices to presentational components. The store is the only consumer of the analytics endpoint; the page is its only consumer.
- Endpoint: `API_ENDPOINTS.ANALYTICS` (`/analytics`) via `fetchWithAuth` ([api-layer](../api-layer.md)). Top-link enrichment uses `API_ENDPOINTS.SHORTLINKS_BY_IDS` (`/shortlinks/byIds?ids=a,b,c`).
- Page layout: `PeriodSelector` row, a card with "Total Clicks" + `ComparisonBadge` + `ClicksTimeSeriesChart`, then a 2-column grid of four `AnalyticsCard`s: Top Links, Referrers, Countries/Continents (tabs), Devices/OS (tabs).

## Data flow

The store loads four **sections**, each with its own status (`status.overview`, `status.topLinks`, `status.location`, `status.device`: `idle` | `loading` | `ready` | `error`):

| Section | Requests (`/analytics` + ...) | Writes |
|---|---|---|
| `overview` | `?period=P7D` or `?start=YYYY-MM-DD&end=YYYY-MM-DD` (must be a JSON number), the previous-period window (`null` for `custom`, and `null` if that one request fails), `&groupBy=date`, `&groupBy=referrer` | `totalClicks`, `previousTotalClicks`, `timeSeries`, `referrers` and `overviewLoadedAt`, **together** once all have answered |
| `topLinks` | `&groupBy=top_link`, then `/shortlinks/byIds` | `topLinks`; `details` (a `LinkItem`) attached when the lookup succeeds, otherwise the bars keep the raw id |
| `location` | `&groupBy=country` or `continent` (active tab only) | `countries` / `continents` |
| `device` | `&groupBy=device` or `os` (active tab only) | `devices` / `os` |

1. **Mount**: the page calls `loadAnalytics()`. First visit: every section loads visibly. Revisit: data younger than `ANALYTICS_STALE_AFTER_MS` (60 s) is shown with no request; older data is shown at once and refreshed **silently** (status stays `ready`, a failed silent refresh is only logged). A second call while the first load runs is ignored (StrictMode double mount).
2. **Latest wins**: every section request gets its own `AbortController`; starting a new one aborts the previous request of that section, and only the newest request may write. A slow answer for an earlier period can no longer overwrite a newer one.
3. **Honest failures**: an HTTP error, a network error or an unexpected payload sets the section to `error` (logged with `logger.error`) instead of writing an empty list; nothing is left in `loading`.
4. `retrySection(section)` reloads one section visibly; it backs the "Try again" buttons.

## Period selection

- Presets in `PeriodSelector`: `P7D` (default store value), `P30D`, `P90D` (ISO-8601 durations sent as `period`). `Custom` is a fourth option with `period === "custom"`.
- `setPeriod(period)` stores the value and reloads every section visibly. `setCustomDateRange(range)` stores the range and, only when both `from` and `to` are set, switches `period` to `"custom"` and reloads. Both clear the **hidden** location/device tab arrays, so those tabs reload for the new period when opened instead of showing the previous period's data.
- The previous-period window for the badge is computed client-side: `end = today - N days`, `start = end - N days` where N is the number parsed from the period (`DEFAULT_PERIOD_DAYS` = 30 as fallback). All dates are local calendar days formatted with `formatLocalIsoDate` from [`src/lib/date-utils.ts`](../../url-shortener-ui/src/lib/date-utils.ts) (`YYYY-MM-DD`), never `toISOString()`, which would shift them by a day outside UTC.
- Custom range query uses `start`/`end` with the same local calendar-day formatting, so the picked days are the days sent.

### Custom range: desktop vs mobile

`PeriodSelector` switches on `useIsMobile()` (see the responsive pattern in [coding-patterns](../coding-patterns.md)).

- Desktop: `Custom` opens a `Popover` with a 2-month range `Calendar` (week starts Monday). First click sets `from`; second click sets `to` (swapped if reversed) and calls `onCustomDateRangeChange`. Days before Jan 1 of `FIRST_ANALYTICS_YEAR` or after today are disabled and ignored.
- Mobile: `Custom` opens `DateRangeDrawer` ([`src/components/analytics/DateRangeDrawer.tsx`](../../url-shortener-ui/src/components/analytics/DateRangeDrawer.tsx)), a bottom drawer with a single-month calendar, prev/next month buttons, and an iOS-style wheel picker (month + year) toggled by the header. The second day tap applies the range (swapping if reversed) and closes the drawer. The year wheel and prev/next navigation cover `getSelectableAnalyticsYears(currentYear)` from [`src/lib/date-utils.ts`](../../url-shortener-ui/src/lib/date-utils.ts): every year from `FIRST_ANALYTICS_YEAR` (2026, `lib/constants.ts`) to the current year, computed from the clock at render so the pickers keep working across a new year. The drawer opens on the month of the range end (or today); selecting a future month in the wheel bounces back to the current month after 200 ms.
- Chart drag-zoom (desktop only, `useIsDesktop`): mouse drag over the time series selects an index range and calls `onZoom` with `{from, to}` dates; this goes through `setCustomDateRange`, so zooming switches the page to `custom`. A drag with equal start/end indices does nothing; leaving the chart cancels the drag.

## Components

| Component | Role |
|---|---|
| `ComparisonBadge` | Hidden for `custom` or when `previousTotalClicks === null`. Percent = change vs previous; when previous is 0 it shows +100% if current > 0, else 0%. Green with `TrendingUp` when >= 0, destructive with `TrendingDown` otherwise. Text: "vs last N days" |
| `ClicksTimeSeriesChart` | Recharts `AreaChart`; API `date` strings are parsed as local days (`parseLocalIsoDate`) for both the axis labels (`formatShortDayLabel`) and the drag-zoom range; empty `timeSeries` shows "Gathering chart data..."; Y axis uses integer ticks `0..max` when max <= 4 (`LOW_CLICKS_THRESHOLD`), compact `k`/`M` formatting otherwise |
| `AnalyticsCard` | Card frame with either a title or tab buttons (controlled via `isActive`/`onTabChange`) and a "Clicks" column header |
| `AnalyticsBreakdownGrid` | The four cards; reads the store and swaps a failed section (`topLinks`, `location`, `device`) for `AnalyticsError` with its own retry |
| `AnalyticsError` | Message + "Try again" button (`role="alert"`), used for the first-load error, the refresh banner and failed cards |
| `HorizontalBarChart` | Shared Recharts bar chart for all four breakdowns; bar value = clicks, tooltip shows percentage of `totalClicks`; each tab supplies a `renderLabel` |
| `TopLinksTab` | Sorted by clicks desc; label is `details.shortUrl` or the raw `shortLinkId`; favicon via `LinkFavicon` when `details.longUrl` exists, otherwise `FaviconPlaceholder` |
| `ReferrersTab` | Favicon from `https://<hostname>`; `(direct)` or missing hostname gets a link icon |
| `LocationTab` / `LocationIcon` | Countries: name via `Intl.DisplayNames`, flag image from `FLAG_SERVICE_URL` (external host) with a `MapPin` fallback on load error; continents use the pin |
| `DeviceTab` | Icons from `public/icons/*.png` chosen by case-insensitive name match (`windows`, `mac`, `linux`, `ios`, `android`, `other`, else `unknown`) |
| `AnalyticsPageSkeleton` | Full-page skeleton |

Bar colours come from `CHART_COLORS` in `lib/constants.ts`; chart/theme details in [styling-and-theming](../styling-and-theming.md).

## Tabs and lazy fetching

`setLocationTab` / `setDeviceTab` switch the active tab and fetch that tab's data only if its array is empty. Tab data is not refetched on tab switch otherwise; a period change empties the hidden tab so it is fetched for the new period.

## Loading, empty and error states

- **First load**: `AnalyticsPageSkeleton` until the overview has loaded once (`overviewLoadedAt === null`); if it fails, the period selector plus `AnalyticsError` ("Couldn't load analytics for this period." + Try again).
- **Period change**: the previous numbers stay visible, dimmed (`opacity-60`) with `aria-busy="true"` on the summary card and grid, and a small spinner with the screen-reader text "Updating analytics" next to the selector; everything in the overview updates at once. If the reload fails, a banner says the numbers are from the previous selection and offers Try again.
- **Sections**: tab components show their spinner while their section is `idle` or `loading` and they have no data (never "no data" before the first answer); a failed `topLinks`, `location` or `device` section shows "Couldn't load this section." with its own retry while the other cards keep their data. Referrers belong to the overview.
- Empty states per card: "No top links data available.", "No referrer data active.", "No location data available for this period.", "No traffic to display." (devices), and "Gathering chart data..." for the chart.

## Known limitations and existing exceptions

All are observations; they are not templates and not permission for drive-by changes.

- Observation: `useAnalyticsStore` is subscribed to as a whole in the page, so any slice update re-renders the page.
- Observation: the mock server returns fixed prior totals for `start`/`end` requests without `groupBy` (see [mock-server](../mock-server.md)), so the comparison badge values in dev are canned.
- Observation: country flags load from the external `FLAG_SERVICE_URL`; the page degrades to the pin icon if it is unreachable.
- Tests: see [testing](../testing.md); `src/test/analytics-utils.tsx` holds shared analytics fixtures.
