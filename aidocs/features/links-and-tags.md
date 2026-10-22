# Links, Tags, Import/Export and Public Link Pages

> User flows and non-trivial logic for the links list, the create/edit link form, URL cleaner, archive/delete/QR, CSV import and export, the tags page, and the public `/inspect/[key]` and `/report-abuse` pages; read before changing any of them. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [architecture.md](../architecture.md) · [routing-and-navigation.md](../routing-and-navigation.md) · [state-management.md](../state-management.md) · [api-layer.md](../api-layer.md) · [coding-patterns.md](../coding-patterns.md) · [styling-and-theming.md](../styling-and-theming.md) · [testing.md](../testing.md) · [mock-server.md](../mock-server.md) · [auth.md](auth.md)

## Links page

Route `/links` ([`src/app/(dashboard)/links/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/links/page.tsx)), a client page wrapped in `Suspense` (it reads `useSearchParams`).

| Concern | Where | Behaviour |
|---|---|---|
| List state | [`src/lib/store/links.ts`](../../url-shortener-ui/src/lib/store/links.ts) `useLinkStore` | `links`, `loading`, `error`, `showArchived`, `searchQuery`, `currentPage`, `totalElements`, `totalPages` |
| Fetch | `fetchLinks(page?)` | `GET /shortlinks?page&size=20&showArchived&search`; maps `ShortLinkDTO` to `LinkItem` (empty title becomes `DEFAULT_LINK_TITLE`); reads pagination from `data.page ?? data`. Latest wins: a new call aborts the previous request and only the newest answer is applied, so a search typed during a page load is never lost |
| Page in URL | [`src/lib/pagination.ts`](../../url-shortener-ui/src/lib/pagination.ts) | `?page=N` is **1-based** in the URL, 0-based in the store; page 1 has no query string. Invalid values parse to page 0 |
| Search | `useDebounce(searchInput, SEARCH_DEBOUNCE_MS)` (300 ms) | `commitSearch(text)`: the trimmed text counts as no search when shorter than `MIN_LINK_SEARCH_LENGTH` (2: one character matches nearly every URL, so typing it, or shortening a search to it, shows the unfiltered list instead of costing a request); on a changed value, `setSearchQuery`, reset URL to page 1, `fetchLinks(0)`. The debounced value reaches it through `useEffectEvent`, so the effect runs only when that value changes (a re-run with a stale value would undo a search sent by Enter). Enter (`SearchBar onSubmit`) and Clear / Escape call it at once. The short pause is safe because a newer request aborts the older one. The page clears the store's `searchQuery` when it unmounts: the search box starts empty on every visit, so a kept query would filter the next visit's first load (and clearing it then would cost a page-0 request and drop a back navigation's `?page=`). Placeholder "Search by URL or title" |
| Archived toggle | `showArchived` | Persisted in `localStorage` key `showArchived` (`SHOW_ARCHIVED_STORAGE_KEY`); `hydrateShowArchived()` runs in an effect after mount |
| Tags for badges | `useTagStoreWithoutCount.fetchTags()` | `LinkCard` resolves `link.tagIds` against that store. `/links` refreshes them on mount; elsewhere the create form loads them through `ensureLoaded()` (the prefetch and `CreateLinkModal` on open), so the modal opened from `/analytics` or by the `c` key lists the tags too |
| States | page | One stable tree: the toolbar and every dialog stay mounted; only the list body switches. Skeletons (`LinkCardSkeletonList`) while the first load runs; a failed first load shows `ErrorWithRetry` ("Couldn't load your links." + Try again), never the empty state; `EmptyLinksState` (no links) or `NoLinksFoundState` (search with no match); a failed refresh keeps the list and shows a dismissible notice (`LINKS_LOAD_COPY`). Cold-load CLS measured 0 at 1280 and 375 px |
| Pagination | `LinksPagination` | Floating bar, `Previous`/`Next`, label like `1-20 of 57 links`; buttons call `router.push(buildLinksPageUrl(n), {scroll:false})`, scroll `main` to top and `fetchLinks(n)`. A change of `urlPage` also triggers `fetchLinks(urlPage)` in an effect |

Notes on `fetchLinks`: it returns immediately if `loading` is already true, so overlapping calls are dropped, not queued (see [State management](../state-management.md)). Mutating flows therefore call it after the previous request finished.

### Link card

[`src/components/links/LinkCard.tsx`](../../url-shortener-ui/src/components/links/LinkCard.tsx): favicon (or archive icon when `!isActive`), title (truncated), short URL with copy button (`COPY_FEEDBACK_DURATION_MS`), destination hostname with full URL tooltip, tag badges (first tag plus `+N` with a hover popover; icon-only on mobile), and an actions menu (`DropdownMenu` on desktop, `ActionDrawer` on mobile via `useIsDesktop`): Edit, QR Code, Archive/Unarchive, Delete.

Keyboard shortcuts. One module, [`src/lib/keyboard-shortcuts.ts`](../../url-shortener-ui/src/lib/keyboard-shortcuts.ts), holds the rules and the list (`SHORTCUTS`, which the help dialog renders, so the two cannot drift). Every handler first calls `canRunShortcut(event)`: shortcuts on (`useShortcutsStore`, a switch in Settings, WCAG 2.1.4), no Ctrl / Meta / Alt and no key repeat (Shift is allowed, `?` needs it), the target not editable (`isEditableTarget`: input, textarea, select, contenteditable, `role` textbox / combobox / listbox / searchbox / spinbutton), and no dialog open (`isModalOpen()`). Keys are compared with `isShortcutKey(event, SHORTCUTS.X)`.

- On the active card: `E` edit, `Q` QR code, `A` archive or unarchive, `D` delete (`TagCard`: `E`, `D`). A card is active when its menu is open, when it holds keyboard focus (`card.contains(document.activeElement)`; cards are `tabIndex={0}`), or under the pointer (`isCardShortcutTarget`). Each card adds one `keydown` listener on `document` on mount; the handler is a `useEffectEvent`, so it sees the latest menu state and item without re-registering. Menu items carry `aria-keyshortcuts`.
- `A` without an active card toggles the "show archived" filter and refetches page 1. The page listens on `window` and skips an event a card already handled (`defaultPrevented`); card listeners are on `document`, so they always run first, whichever cards mounted last. The page keeps no hover state, so moving the pointer across cards renders nothing (render budget in `links/page.perf.test.tsx`).
- `C` (header, `window`) opens the create modal; `?` (dashboard layout, `window`) opens `KeyboardShortcutsDialog` (loaded on first open, open state `useUIStore.isShortcutsDialogOpen`), which lists every entry of `SHORTCUTS`.

`LinkFavicon` loads `https://www.google.com/s2/favicons?sz&domain` through `next/image` with `unoptimized`, `referrerPolicy="no-referrer"` (Google does not get the app page as `Referer`) and `fetchPriority="low"`. It falls back to a link icon for non-public hosts (`.local`, `.internal`, private IP ranges), for hosts without a dot, on load error, and when the returned image is 16 px or smaller (the service's placeholder globe). Failed domains are remembered in a module-level `Set` for the page lifetime. No `next.config.ts` entry is needed because the image is `unoptimized` (see [Configuration](../configuration.md)).

### Archive and delete

Both are **optimistic**: confirming closes the dialog and changes the list at once; the request and a quiet refetch of the current page run in the background.

- Archive: `ArchiveLinkModal` (shared `DeleteConfirmationModal`, default variant). `setLinkArchived(id, archived)` in the store first updates the list (without "show archived" the link leaves the list and `totalElements` drops; with it the link stays with `isActive` flipped), then sends a full `PUT /shortlinks` with `isActive: !archived` and the existing title, URL, key and tag ids.
- Delete: `DeleteLinkModal` requires typing the short-link handle (the path of `shortUrl`) as confirmation. `deleteLink(id)` in the store removes the link from the list, then calls `DELETE /shortlinks/{id}`.
- Both resolve `true`/`false` and never write the store `error`. On `false` the store has already put the previous list back; the page shows a toast (`LINK_ACTION_COPY`) with a **Retry** action that repeats the action.
- After archive or delete, `syncPageAfterRemoval` steps back one page (URL and fetch) when the current page became empty while `totalElements > 0`.

### QR code

`QrCodeModal` ([`src/components/links/QrCodeModal.tsx`](../../url-shortener-ui/src/components/links/QrCodeModal.tsx)) lazy-loads `qr-code-styling` once per page lifetime (module-level cache). The page renders it as `LazyQrCodeModal`; opening a card's action menu (dropdown or drawer) calls `preloadQrCodeModal()`, which starts both the dialog chunk and the library before "QR Code" is chosen. A 500 px preview is cached per link id; a 2048 px instance is built on demand for download or copy. Actions: download PNG or SVG (file name `<key>-qrcode`), copy as PNG image or SVG text (uses `ClipboardItem` when supported). Dots are black on a white background on purpose (scan reliability), so this component is a documented exception to theme tokens; do not "fix" it to use theme colours.

## Create and edit link form

Entry points: the dashboard header button and `EmptyLinksState` open `CreateLinkModal` through `useUIStore.isCreateModalOpen` (rendered by the dashboard layout, so it works from any dashboard page; on `/tags` the same header button opens the tag modal instead). Hovering or focusing the header's "Create link" button or the empty state's button calls `prefetchCreateLinkData()` ([`src/lib/prefetch-create-link.ts`](../../url-shortener-ui/src/lib/prefetch-create-link.ts)): it fetches tracker preferences, the tags for the picker (`useTagStoreWithoutCount.ensureLoaded()`: loads once, skipped when already loaded or loading) and one random key ahead ([`src/lib/random-key.ts`](../../url-shortener-ui/src/lib/random-key.ts): held for at most 60 s, used once). The form shows a key that has already arrived on its first render (`peekPrefetchedRandomKey` in the state initializer, `consumePrefetchedRandomKey` in the mount effect, so a StrictMode double render cannot lose it); a key still in flight is handed over by `takeRandomKey` instead of a second request. The `C` shortcut opens at once, without this head start. The layout loads both create modals on demand and preloads them when the browser is idle; the links and tags pages do the same for their row dialogs (see [coding-patterns](../coding-patterns.md), dialogs loaded on demand). Editing opens `EditLinkModal` from the card.

Component chain:

```
CreateLinkModal (Dialog | Drawer) -> LinkFormFields (state machine) -> FormScreenContent | TagsScreenContent | TrackerReviewScreen
EditLinkModal -> LinkFormModal (Dialog | Drawer) -> LinkFormFields
```

[`src/components/links/LinkFormFields.tsx`](../../url-shortener-ui/src/components/links/LinkFormFields.tsx) owns all form state and the screen machine. Create and edit differ only by props: `autoGenerateKey`, `enableTitleSuggestion`, `enableUrlCleaner`, `initial*`, and the `onSubmit(longUrl, title, key, tagIds)` callback supplied by the modal.

### Screens

`activeScreen` is `"form" | "tags" | "review"`, animated with a horizontal slide (`slideDirection` is +1 forward, -1 back).

| Screen | Reached by | Leaves by |
|---|---|---|
| `form` | default; after Back/Apply; on URL validation or key-conflict error | submit, or "Select tags" (mobile only), or "Review" in the tracker banner |
| `tags` | mobile only: tap the tags field (desktop uses the inline `TagSelect` popover, so this screen is unreachable there) | Back arrow, or its own submit button |
| `review` | "Review" in `UrlCleanerBanner` | Back, Apply, or editing the URL (which returns to `form`) |

Create adds a second state in `CreateLinkModal`: `viewState` `"form"` then `"success"`. On a `2xx` it stores the new link, switches to `CreateLinkSuccess` (copyable short URL, "Done"), fires `canvas-confetti` (downloaded when the dialog opens, never awaited), pushes `/links` and refetches page 1.

Edit closes the modal on success (`LinkFormModal.handleSubmit`) and reports the link as saved (`onSuccess(savedLink)`: the submitted values, with the short URL rebuilt by `withShortKey` when the key changed). The page passes it to `applySavedLink`, which shows it in place at once and then refetches the current page quietly, so any server-side normalisation replaces it a round trip later. It does not rely on the `PUT` response body.

### Fields and validation

- **Destination URL**: `normalizeUrl` prepends `https://` to bare domains and leaves any input that already has a scheme (`ftp://...`) unchanged; `isValidUrl` accepts only `http:` and `https:`, so other schemes are rejected rather than rewritten. Normalisation and validation run on blur and on submit (see [`src/lib/url-utils.ts`](../../url-shortener-ui/src/lib/url-utils.ts)). Desktop auto-focuses the empty field.
- **Key** (`ShortLinkKeyField`, prefix `MOCKED_SHORT_DOMAIN`): format rule `^[A-Za-z0-9-]+$`, max 30 (`getShortKeyValidationError`). Create fetches a random key from `GET /shortlinks/random` on open. A ref (`hasUserEditedKeyRef`) records manual edits so late random-key responses never overwrite what the user typed; the shuffle button and clearing the field (blur on an empty key) force a new random key. Only one random-key request runs at a time (`pendingKeyRequestRef`); submit awaits a pending one.
- **Availability**: after `KEY_AVAILABILITY_CHECK_DEBOUNCE_MS` (600 ms) a user-edited, valid key that differs from the initial key triggers `GET /shortlinks/{key}/exists` (`200` is taken, `404` is free, cancelled on change). A taken key sets `SHORT_KEY_TAKEN_MESSAGE` and disables submit.
- **Title**: empty title falls back to `DEFAULT_LINK_TITLE` on submit. Create enables "suggest title" (`GET /longurl/title?url=`); on empty or failed response it derives a title from the hostname with a short glow animation.
- **Tags**: see [Tag selection](#tag-selection).
- **Conflict handling**: a `409` from `POST`/`PUT /shortlinks` throws `ShortKeyConflictError`; the form sets the key error and returns to the `form` screen. Any other failure is logged and rethrown, leaving the submit button re-enabled.
- Form state is reset when the `initialLongUrl`, `initialTitle` or `initialTagIds` props change (switching which link is edited).

### URL cleaner and tracker review

Enabled when `enableUrlCleaner` and the user's preference `trackerMode` is `SUGGEST` or `AUTO_CLEAN` (`usePreferencesStore`, loaded from `GET /users/me/preferences` on form mount; `null` or `DISABLE` turns the cleaner off; the preference is edited in settings, see [Billing and settings](billing-and-settings.md)).

1. `useUrlCleaner` ([`src/lib/hooks/useUrlCleaner.ts`](../../url-shortener-ui/src/lib/hooks/useUrlCleaner.ts)) debounces the URL by `URL_CLEANER_DEBOUNCE_MS` (500 ms), skips invalid URLs and URLs already requested, and posts `POST /urlcleaner {url}` with an `AbortController`. It exposes a result only when `removedParams` is non-empty, the cleaned URL differs, and `completeProviderSkipped` is false. `401/403/400` and other failures yield no banner.
2. `SUGGEST`: `UrlCleanerBanner` shows "N trackers detected" with **Clean** (apply the cleaned URL) and **Review**.
3. `AUTO_CLEAN`: the cleaned URL is applied automatically and `UrlCleanerSuccessBanner` reports the count for `URL_CLEANER_SUCCESS_DURATION_MS`.
4. Review screen: `buildTrackerEntries` ([`src/lib/url-cleaner-utils.ts`](../../url-shortener-ui/src/lib/url-cleaner-utils.ts)) turns `removedParams` into chips (query or path trackers, including a nested `q=` URL). Values are shown percent-decoded for both kinds (`/ref=a%20b` shows `a b`; a malformed escape is shown as typed). The user toggles chips to **keep** specific trackers; `buildFinalUrl` rebuilds the URL, preserving original parameter order and path segments, and, if URL parsing fails, assembles the result as a string: path, then the cleaned URL's own query plus the kept trackers (joined with `&` after one `?`), then the hash. Apply sets the URL and counts removed trackers.
5. `appliedUrl` records the URL produced by a cleaning action so it is not re-suggested; any manual edit clears it.

## Tag selection

- Desktop: `TagSelect` popover (`components/links/TagSelect.tsx`) with search, multi-select, sorted by name, and a "Create" row when the search has no exact match. It follows the combobox pattern: the search input is `role="combobox"` (`aria-controls` the list, `aria-activedescendant` the active option, focus never leaves it), the list is a multi-select `role="listbox"`, options are `role="option"` with `aria-selected` and `tabIndex={-1}`; Up / Down / Enter / Escape come from `useTagSelectKeyboard`. Keyboard logic lives in `useTagSelectKeyboard`: Arrow Up/Down wrap around, `Enter` toggles the active row or creates, `Escape` closes; typing a new name pre-highlights the create row.
- Mobile: the tags field opens the `tags` screen (`TagsScreenContent`, same search and create behaviour, with its own submit button).
- Inline creation uses a random colour from `ALLOWED_TAG_COLORS` ([`src/lib/tag-constants.ts`](../../url-shortener-ui/src/lib/tag-constants.ts)) and `useTagMutations().createTag`; the new tag is auto-selected. Failure shows "Failed to create tag".
- Selected tags show at most 4 badges plus `+N`.

## Tags page

Route `/tags` ([`src/app/(dashboard)/tags/page.tsx`](../../url-shortener-ui/src/app/(dashboard)/tags/page.tsx)).

- Two separate stores: `useTagStoreWithCount` (`withLinksCount=true`, used by this page) and `useTagStoreWithoutCount` (`withLinksCount=false`, used by forms, cards and the links page). Both fetch `GET /tags?size=100[&search]` (`TAGS_PAGE_SIZE`) and load **every** page: `fetchTagsResponse` follows `totalPages` (`page=1`, `page=2`, ...; at most 100 pages) and stores all tags at once, so link badges and `TagSelect` see every tag; a failed page stores only the error. A plain array response counts as one page.
- Mutations live in `useTagMutations` ([`src/lib/hooks/useTagMutations.ts`](../../url-shortener-ui/src/lib/hooks/useTagMutations.ts)): `createTag` (`POST /tags`), `updateTag` (`PUT /tags`), `deleteTag` (`DELETE /tags/{id}`). Each writes the result into **both** stores (create prepends, update replaces, delete filters) On failure they reject with a readable message (`parseProblemDetail` of the body, or `Failed to <action> tag: <status>`) and leave both stores untouched.
- Search: same pattern as links (`SEARCH_DEBOUNCE_MS`, Enter and Clear search at once) but without the minimum length, because tag names are short; the module-level `commitTagSearch` calls `store.setSearchQuery` then `fetchTags()`. The page clears the store's `searchQuery` on unmount, for the same reason as links.
- Colour choice: `TagColorPicker` is a Radix `RadioGroup` labelled "Color" of round swatches (`size-7`, one row of eight down to a 390 px phone): one tab stop, arrow keys move between colours, the checked one is announced (each swatch is named after its colour, with a matching `title`) and gets a ring. A swatch is a miniature of the tag badge: it reuses `badgeVariants` (fill, border and text colour) with the tag icon, so it matches `TagCard` in light and dark. It is `pointer-events-none`, so the badge's hover fill never applies.
- UI: `TagCard` (colour badge, name, `N link(s)` badge when `linkCount > 0`, menu with `E` edit and `D` delete shortcuts), `EmptyTagsState` / `NoTagsFoundState`, `TagCardSkeletonList`. Create and edit use `TagFormModal` (name `maxLength` 50, `TagColorPicker` over the 8 `ALLOWED_TAG_COLORS`, Dialog on desktop and Drawer on mobile; `CreateTagModal` passes `resetOnClose`). Delete uses `DeleteTagModal`; the description says the tag is removed from all associated links.
- Errors: a failed create/edit is shown inline in `TagFormModal` (the modal stays open); a failed delete keeps the list and the dialog open and shows the `TAG_DELETE_FAILED_MESSAGE` toast. A failed **first load** shows `ErrorWithRetry` ("Couldn't load your tags." + Try again) in place of the list, with the toolbar kept; a failed refresh keeps the tags and shows a dismissible notice (`TAGS_LOAD_COPY`).

## CSV import

Entry: the toolbar options menu on `/links` (`PageToolbar`) opens `ImportCsvModal`; the modal is a Dialog on desktop and a non-dismissible-while-uploading Drawer on mobile. All import logic is split between a store and a hook:

| Piece | File | Role |
|---|---|---|
| Tracker store | [`src/lib/store/import.ts`](../../url-shortener-ui/src/lib/store/import.ts) `useImportTracker` | Status machine, progress, SSE subscription lifecycle |
| Hook | [`src/lib/hooks/useLinkImport.ts`](../../url-shortener-ui/src/lib/hooks/useLinkImport.ts) | Pre-check, upload, maps tracker state to an `ImportSession` for the UI |
| Transfer helpers | [`src/lib/link-transfer.ts`](../../url-shortener-ui/src/lib/link-transfer.ts) | `precheckCsv`, `uploadLinksImport`, `TransferError` (error text via `parseProblemDetail` from `problem-details.ts`) |
| SSE client | [`src/lib/import-progress.ts`](../../url-shortener-ui/src/lib/import-progress.ts), [`src/lib/server-sent-events.ts`](../../url-shortener-ui/src/lib/server-sent-events.ts) | Stream reading, reconnect, validation |
| Pass-through | [`src/app/api/shortlinks/import/updates/route.ts`](../../url-shortener-ui/src/app/api/shortlinks/import/updates/route.ts) | Streams the backend SSE response without buffering |

Upload flow: choose a file in `ImportCsvDropzone` (click or drag; `accept=".csv,text/csv"`) and optionally enable "Generate new keys for taken ones" (`generateTakenKeys`; the whole option row is the switch's `<label>`, the switch is named by the title and described by the hint, and disabled during upload). `handleImport` refuses to start unless the tracker is `idle`, reads the file text and runs `precheckCsv` (non-blank lines minus the header; zero rows gives "file is empty", more than `MAX_IMPORT_DATA_ROWS` = 1000 gives "too many rows"), then `POST /shortlinks/import?generateTakenKeys&fileName` with `Content-Type: text/csv`. Errors surface as toasts. The server answers with a `LinkImportJobDTO`; `trackSubmission(job)` takes over.

### Tracker state machine

`status` is one of `idle`, `discovering`, `active`, `reconnecting`, `interrupted`, `completed`.

```
idle --ensureDiscovery--> discovering --first progress--> active <--> reconnecting
idle --trackSubmission(job)--> active           active/reconnecting --stream ends--> completed
interrupted <-- non-retryable stream error (from any tracking state)
completed/idle --reset / stopTracking--> idle
```

- `ensureDiscovery()` runs when `/links` mounts (and `stopTracking()` on unmount). It opens the SSE stream to find an import already running (started in another tab or before a reload). An empty stream returns the tracker to `idle`.
- `trackSubmission(job)` after an upload: a job already `COMPLETED` goes straight to `completed`; otherwise it starts the stream in `active`.
- Progress events carry only `processedRows` and `totalRows`. `parseImportProgress` rejects malformed counters; `applyTrackedProgress` ignores regressions; a changed `totalRows` is treated as a different job and aborts the stream. The stream is terminal when `processedRows === totalRows`.
- Reconnects and stream timeouts are handled by `subscribeToDiscoveredImport` ([API layer](../api-layer.md#sse-client-import-progress)); a non-retryable error ends in `interrupted`.
- On completion `refreshLinksAndTagsOnce()` refetches links (page 1) and tags once per run. Per-row success counts are not known from SSE; the "N imported, M failed" line appears only when the upload response itself was already `COMPLETED`.
- A generation counter and `AbortController` in the module make late callbacks from a replaced stream harmless. `resetImportTrackerForTests()` is the test reset helper (see [Testing](../testing.md)).

### UI states

`useLinkImport` maps the tracker to `ImportSession.state` (`processing`, `reconnecting`, `interrupted`, `completed`). `ImportProgressBody` shows a spinner or check, file name (truncated), `N of M rows processed`, percentage and a progress bar. Footer buttons: Cancel/Import (idle), Close (running; "You can close this window", the import continues), Refresh links (interrupted), Import more and Done (completed). Closing the modal never stops tracking; `reset()` only acts when status is `completed` or `idle`.

While an import is ongoing (`discovering`, `active`, `reconnecting`, **or `interrupted`**) the toolbar disables the import menu item, and shows `ImportRadialProgress` (clickable, reopens the modal) while progress is known and the stream is not interrupted.

## CSV export

`ExportCsvModal` (Dialog or Drawer). The "Apply current filters" switch (default on; its title and its hint are both `<label>`s for it, the title names it and the hint describes it, and the info tooltip button sits beside the title, outside the labels, because a label may not contain another control) exports with `showArchived` and the trimmed search (max `EXPORT_SEARCH_MAX_LENGTH` 2048 chars) from `useLinkStore`; off exports non-archived links without search. `downloadLinksExport` calls `GET /shortlinks/export` with `Accept: text/csv`, retries **once** after `EXPORT_RATE_LIMIT_RETRY_DELAY_MS` (1500 ms) on `429`, turns the body into a blob and downloads `shortlinks-export-YYYY-MM-DD.csv` through a temporary anchor. Failures: rate limit toast, `TransferError` message (from the problem body via `parseProblemDetail`), or a generic toast. Labels and messages are centralised in [`src/components/links/import-export-constants.ts`](../../url-shortener-ui/src/components/links/import-export-constants.ts).

## Inspect page (`/inspect/[key]`)

[`src/app/inspect/[key]/page.tsx`](../../url-shortener-ui/src/app/inspect/[key]/page.tsx) is a public page meant for people who received a short link and want to see where it goes.

- It is an **async server component** and performs a server-side fetch: `GET {getBackendApiBaseUrl()}/public/preview/{key}` with `cache: "no-store"` (the only page that does; this is an explicit exception to the client-rendered model described in [Architecture](../architecture.md)). `404` calls `notFound()` ("Link not found", HTTP 404); any other non-OK response is logged and rethrown, which lands on `inspect/[key]/error.tsx` ("Preview unavailable", Try again).
- It renders `InspectLinkPreviewCard` (OG image, favicon and hostname, title, description clamped to 2 lines), the full destination URL (scrollable, `break-all`) and a "Report this link" button linking to `/report-abuse?shortUrl=<encoded short URL>`.
- `OgImage` loads a resized copy through the third-party proxy `https://wsrv.nl` (`w=1344`, twice the widest card, `output=webp`, `q=80`, `we=1` so small images are not enlarged) with `fetchPriority="high"`, because it is the page's largest element. The image sits on top of a muted placeholder icon and shows the moment it paints; there is no loading overlay, which used to hide an already downloaded image until hydration. Only `onError` falls back to the original URL (a slow proxy download is never abandoned); the 8 s timer only switches to the "Preview unavailable" placeholder when nothing arrived. It uses a raw `<img>` (remote, user-controlled URLs).

## Report abuse page

[`src/app/(legal)/report-abuse/page.tsx`](../../url-shortener-ui/src/app/(legal)/report-abuse/page.tsx) is public and has no auth. It is an async server component that only reads the `shortUrl` search param and the Turnstile env vars and passes them to the client `ReportAbuseForm` (no data fetching).

- Fields: link URL (prefilled from `?shortUrl`), reason (one of 7 `ABUSE_REASONS`), reporter email (required), optional description (max `ABUSE_DESCRIPTION_MAX_LENGTH` 2000, counter shown). Client validation: `isValidUrl`, a reason selected, an email present.
- Submit: `POST /api/public/abuse/report` (same-origin through the `/api` rewrite) as form-urlencoded, with `cf-turnstile-response` when Turnstile is on (`TurnstileWidget` from the auth components; submit stays disabled until the captcha has produced a token, and again after it expires). Responses: `201` shows `ReportAbuseSuccess` (copyable report id, "Report another link"); `429` shows a retry message using `Retry-After`; `422` shows the server `message` or `error`; other failures show a generic message; a thrown fetch shows a network error. See [Mock server](../mock-server.md) for the simulated backend.

## Known limitations and existing exceptions

- Observation: the server-side inspect fetch is an existing exception to the client-rendered model; see [Architecture](../architecture.md#known-limitations-and-existing-exceptions). Do not extend server-side fetching to other pages.
- Observation: `fetchLinks` and `fetchTags` drop calls made while a request is in flight, so a rapid second change (for example a page click during a search refetch) can be ignored.
- Observation: delete failure in `confirmDelete` is only logged; the modal stays open without a user-visible error.
- Observation: `LinkFormFields.tsx` is about 600 lines with a very wide props surface on `FormScreenContent`; `LinkCard` and `QrCodeModal` are also large. Existing exceptions to the size guidance in [Coding patterns](../coding-patterns.md); do not copy, do not split as a drive-by.
- Observation: `TagSelect` and `TagCard` contain raw colour utility classes (`text-red-500`, etc.) and `QrCodeModal` hardcodes black/white. These are existing exceptions to [Styling and theming](../styling-and-theming.md); the QR colours are intentional.
- Observation: `OgImage` depends on the external `wsrv.nl` proxy and uses a raw `<img>`.
