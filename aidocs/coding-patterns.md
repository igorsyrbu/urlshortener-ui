# Coding Patterns

> How components, hooks, forms, constants, types, logging and toasts are written in the UI, and which shared primitives to reuse before building new ones. Read before writing or changing any component or hook. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [styling-and-theming.md](styling-and-theming.md) · [architecture.md](architecture.md) · [state-management.md](state-management.md) · [api-layer.md](api-layer.md) · [testing.md](testing.md) · [routing-and-navigation.md](routing-and-navigation.md)

## Where code lives

| Location | Holds |
|---|---|
| [`src/app/`](../url-shortener-ui/src/app) | Route segments only: `page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, the SSE `route.ts`, `manifest.ts`, `favicon.ico`, `globals.css`. No component files live next to routes today. See [routing-and-navigation.md](routing-and-navigation.md). |
| `src/components/<feature>/` | Feature components (`abuse`, `analytics`, `auth`, `icons`, `inspect`, `layout`, `links`, `settings`, `tags`). Every component used by a page lives here, even when only one page uses it. |
| [`src/components/ui/`](../url-shortener-ui/src/components/ui) | shadcn/Radix-style primitives and a few app-specific shared widgets. Catalogue below. |
| [`src/components/layout/`](../url-shortener-ui/src/components/layout) | Dashboard chrome (header, sidebar, toolbar, search) and page-level layout pieces. |
| `src/lib/` | Framework-free logic: `api.ts`, constants (`constants.ts`, `billing-constants.ts`, `tag-constants.ts`, `settings-constants.ts`), `*-utils.ts` helpers, `logger.ts`. Subfolders: `hooks/`, `store/`, `themes/`. See [architecture.md](architecture.md) for dependency direction. |
| `src/providers/` | React context providers mounted in the root layout. |
| `src/test/` | Shared test infrastructure only. See [testing.md](testing.md). |

Rules:

- **Co-locate** component-specific files next to the component: tests (`Foo.test.tsx`), component-only constants (`components/links/import-export-constants.ts`), types (`components/links/create-link-types.ts`), shared class strings (`components/ui/segmented-control-styles.ts`).
- Cross-feature constants and DTO-independent helpers go to `lib/`. Constants live in `*-constants.ts` files or in [`src/lib/constants.ts`](../url-shortener-ui/src/lib/constants.ts) (routes, endpoints, timings, breakpoints, shared class strings).
- Keep `app/` clean: no helpers, constants or components in route folders.
- Import through the `@/` alias (see [configuration.md](configuration.md)). Inside one feature folder a relative `./` import is accepted (`ReportAbuseForm.tsx` imports `./ReasonSelect`).

## Naming

| Thing | Convention | Example |
|---|---|---|
| Component files | `PascalCase.tsx`, one exported component per file | `LinkCard.tsx` |
| Primitives in `components/ui`, a few layout files, providers | `kebab-case.tsx` (shadcn heritage) | `delete-confirmation-modal.tsx`, `sidebar-nav.tsx`, `palette-provider.tsx` |
| Hooks | `useXxx.ts` in `lib/hooks/`, `use` prefix | `useDebounce.ts` |
| Non-component modules in `lib/` | `kebab-case.ts` | `url-utils.ts`, `billing-redirect.ts` |
| Constants | `UPPER_SNAKE_CASE`; files `*-constants.ts` | `MAGIC_LINK_COOLDOWN_STORAGE_KEY` |
| Test helpers | `*-utils.ts` / `*-utils.tsx` in `src/test/` | `link-utils.ts` |
| Booleans (state, props, derived) | read as a question: `is*`, `has*`, `can*`, `should*` | `isSubmitting`, `hasReducedMotion`, `isCooldownActive` |
| Event handlers | `handle` + event, defined inside the component | `handleSubmit`, `handleEmailChange` |
| Callback props | `on` + event | `onSubmit`, `onOpenChange` |

Names must reveal intent; avoid abbreviations and single-letter names except `e` for an event and short loop counters.

## Components

- **One exported component per file.** Small private helper components (not exported) may share the file with their only user (`ConfirmationSection` in `delete-confirmation-modal.tsx`).
- **Explicit `Props` interface**: `interface FooProps {...}` right above the component, destructured in the signature. Never type props inline.
- **Size limits**: functions aim for under 30 lines; ~40 lines is the signal to split. JSX blocks beyond ~50 lines get extracted into named sub-components (the `LinkFormModal` -> `LinkFormFields` -> `LinkFormMainScreen` / `LinkFormTagsScreen` / `TrackerReviewScreen` split is the model).
- **Guard clauses over nesting**: return early for invalid or inactive states; do not stack `if/else` pyramids.
- **One function, one job.** Event handlers validate, call, and update state; extract parsing, formatting and decisions into helpers (`lib/*-utils.ts`) so they can be unit tested.
- **No magic values.** Status codes, lengths, delays, keys and thresholds become named constants (`COPY_FEEDBACK_DURATION_MS`, `MAX_IMPORT_DATA_ROWS`, `OTP_CODE_LENGTH`). A string that appears more than once becomes a constant. UI copy shared by a component and its tests is exported as a constant so tests import it ([testing.md](testing.md)).
- **Clock-dependent values** (today, the current year, date-picker limits) are computed when they are used, never hard-coded as a year or frozen in a module-level constant at import time. Pure helpers take the current date or year as a parameter so tests can pass any value (`getSelectableAnalyticsYears(currentYear)` in `lib/date-utils.ts`).
- **Calendar dates are local days.** Convert between `Date` and `YYYY-MM-DD` only with `formatLocalIsoDate` / `parseLocalIsoDate` and get "today" with `getTodayAtMidnight` ([`src/lib/date-utils.ts`](../url-shortener-ui/src/lib/date-utils.ts)). `toISOString().split("T")[0]` and `new Date("YYYY-MM-DD")` use UTC and shift the day for users east or west of UTC.
- **DRY**: logic or JSX repeated more than twice becomes a shared helper or component; repeated class strings become a constant (`SHORTCUT_KEY_CLASS`, `MORE_ACTIONS_BUTTON_CLASS` in `lib/constants.ts`, `SEGMENTED_CONTROL_*_CLASS_NAME` in `segmented-control-styles.ts`).
- **Icon-only controls have a name.** A button that shows only an icon gets `aria-label` from `ICON_BUTTON_LABELS` in `lib/constants.ts` (or its own constant), and tests find it with `getByRole("button", {name})`. lucide icons are `aria-hidden` by default. Something that opens a menu is a `<button>`, never a clickable `<div>`.
- **Client boundary**: every file with hooks, state or browser APIs starts with `"use client"`. The app is client-rendered by decision; see [architecture.md](architecture.md) for which files are server code.
- **Skeletons** are plain components next to the feature (`LinkCardSkeleton`, `TagCardSkeleton`, `AnalyticsSkeleton`, `*CardSkeleton` in settings) built from `animate-pulse` blocks with `bg-muted`. They are rendered by the component itself while loading; there is no route-level `loading.tsx` ([routing-and-navigation.md](routing-and-navigation.md)). A skeleton reserves only space the loaded content is sure to take, with the same dimensions (padding, negative margins, row heights): never a placeholder for a list whose length is unknown, which would collapse and shift the page (`OtherSessionsList` renders nothing while loading).
- **Signed-in user may be `null`.** With the session hint the dashboard renders its pages before `/users/me` returns ([features/auth](features/auth.md#session-bootstrap)), so a component that reads `useAuthStore` `user` shows a skeleton or placeholder for `null` and never treats a missing value as a match (`DangerZoneCard` keeps delete disabled while the email is unknown).
- **Mounted guards**: components that read `next-themes` state render a skeleton until mounted (`AppearanceCard`, `ThemeCard`, `PresetPaletteGrid`) to avoid hydration mismatch.

### Reuse before building

Check this catalogue and the feature folders before writing a new component. All paths are under [`src/components/ui/`](../url-shortener-ui/src/components/ui) unless noted.

| Need | Use |
|---|---|
| Any button | `Button` (`button.tsx`, cva variants `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`; sizes `default`, `xs`, `sm`, `lg`, `icon*`; `asChild` via Radix `Slot`) |
| Spinner inside a button | `ButtonSpinner` (`button-spinner.tsx`); standalone block spinner: `Spinner` (`spinner.tsx`, sizes `sm`/`md`/`lg`) |
| Text input / textarea / label | `Input`, `Textarea`, `Label` (`input.tsx`, `textarea.tsx`, `label.tsx`) |
| 6-digit code | `InputOTP*` (`input-otp.tsx`) |
| Dropdown of choices | `Select*` (`select.tsx`); action menu: `DropdownMenu*` (`dropdown-menu.tsx`) |
| On/off toggle | `Switch` (`switch.tsx`, hand-written, not Radix; `checked`, `onCheckedChange`, `size`, `readOnly`) |
| Tab-like switcher | `SegmentedControl` (`segmented-control.tsx`; button mode or link mode when every option has `href`). There is no Radix `Tabs` primitive |
| Card surface | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction` (`card.tsx`) |
| Tag / status chip | `Badge` (`badge.tsx`; colour variants are the tag colours) and `TagBadge` (`components/tags/TagBadge.tsx`) |
| Desktop modal | `Dialog*` (`dialog.tsx`) |
| Mobile bottom sheet | `Drawer*` (`drawer.tsx`, vaul) |
| Mobile action list | `ActionDrawer` (`action-drawer.tsx`) |
| Delete / destructive confirmation (Dialog on desktop, Drawer on mobile, optional type-to-confirm) | `DeleteConfirmationModal` (`delete-confirmation-modal.tsx`) |
| Tooltip / popover | `Tooltip*` (`tooltip.tsx`, each `Tooltip` brings its own provider), `Popover*` (`popover.tsx`) |
| Tooltip only when text is truncated | `OverflowTooltip` (`overflow-tooltip.tsx`) |
| Keyboard hints | `Kbd`, `KbdGroup` (`kbd.tsx`), `EnterKbd` (`enter-kbd.tsx`), `SHORTCUT_KEY_CLASS` |
| Avatar | `Avatar*` (`avatar.tsx`) |
| Date picking | `Calendar` (`calendar.tsx`, react-day-picker), `IosWheelPicker` (`ios-wheel-picker.tsx`, embla; styles in `globals.css`) |
| Charts | `ChartContainer` and friends (`chart.tsx`, Recharts wrapper); see [features/analytics.md](features/analytics.md) |
| Hover glow | `GlowingEffect` (`glowing-effect.tsx`); used only in `CreateLinkTitleField` |
| Toasts | `Toaster` (`sonner.tsx`), mounted once in the root layout; call `toast` from `sonner` (Sonner renders in a live region, so toasts are announced) |
| Field validation message | `FieldError` (`field-error.tsx`); see Forms below |
| Screen-reader confirmation without a toast ("Copied") | `announce(message)` from `lib/store/announcer.ts`; `LiveAnnouncer` (`components/layout/`) is the single polite live region in the root layout. `useCopyToClipboard` already announces |
| Page structure | `PageContainer`, `PageHeading`, `PageToolbar`, `SearchBar`, `NoResultsState` (`components/layout/`) |
| Page title for a client page | Re-export `MetadataOnlyLayout` from the route's `layout.tsx` and export `metadata` ([routing-and-navigation.md](routing-and-navigation.md#page-titles-and-skip-link)) |
| No-results states | `NoLinksFoundState`, `NoTagsFoundState` (both wrap `NoResultsState`); first-use states: `EmptyLinksState`, `EmptyTagsState` |
| Debounce, media query, indicator, keyboard | `useDebounce`, `useIsDesktop` / `useIsMobile`, `useSegmentedIndicator`, `useTagSelectKeyboard` in `lib/hooks/` |
| Copy to clipboard | `useCopyToClipboard(failureMessage?)` in [`src/lib/hooks/useCopyToClipboard.ts`](../url-shortener-ui/src/lib/hooks/useCopyToClipboard.ts): returns `{isCopied, copy}`; awaits the write, shows "copied" for `COPY_FEEDBACK_DURATION_MS`, and on failure (including a missing `navigator.clipboard` on insecure origins) logs and shows an error toast. Never call `navigator.clipboard.writeText` directly for text (the QR image copy in `QrCodeModal` is the only other clipboard code) |

Every `components/ui` file except the hand-written widgets (`switch`, `segmented-control`, `spinner`, `button-spinner`, `overflow-tooltip`, `action-drawer`, `delete-confirmation-modal`, `ios-wheel-picker`, `glowing-effect`, `kbd`, `enter-kbd`) follows the shadcn pattern: `data-slot` attributes, `cn()` for classes, cva for variants ([styling-and-theming.md](styling-and-theming.md)). `GlowingEffect` came from the Aceternity registry configured in `components.json`.

## Responsive Dialog vs Drawer

Every modal in the app is a Dialog on desktop and a bottom Drawer on mobile, chosen in JS, not CSS.

- `useIsDesktop()` / `useIsMobile()` ([`src/lib/hooks/useMediaQuery.ts`](../url-shortener-ui/src/lib/hooks/useMediaQuery.ts)) wrap `matchMedia` with `MOBILE_BREAKPOINT_PX` (640, Tailwind `sm`). "Desktop" means width >= 640px, not the `lg` sidebar breakpoint (1024, `LARGE_SCREEN_MIN_WIDTH_PX`).
- Before the first effect runs both hooks return `false`, so the first render takes the mobile branch (`useIsDesktop` false). Do not rely on the initial value.
- Pattern: a `*Modal` component calls `useIsDesktop()`, builds shared body content once (a `const bodyContent`/`formFields` fragment), then returns `<Dialog><DialogContent>...` or `<Drawer><DrawerContent>...` with the same content and the footer buttons stacked full-width in the drawer. Models: `DeleteConfirmationModal`, `TagFormModal`, `LinkFormModal`, `ExportCsvModal`, `ImportCsvModal`, `PeriodSwitchConfirmModal`, `QrCodeModal`.
- Create/Edit variants are thin wrappers over one form modal (`CreateTagModal` / `EditTagModal` over `TagFormModal`; `CreateLinkModal` / `EditLinkModal` over `LinkFormModal`).
- Always render `DialogTitle` + `DialogDescription` (or the Drawer equivalents), using `className="sr-only"` when the design shows its own heading.
- Bottom safe-area spacing belongs to `DrawerContent` (`mobileMenuSpacing` for menus). Do not add manual `env(safe-area-inset-bottom)` padding; the rule and constants are in [DESIGN.md](../DESIGN.md) section 5.
- Tests choose the layout with `stubDesktopViewport()` / `stubMobileViewport()` ([testing.md](testing.md)).

## Forms

There is no form library. Forms are controlled React forms with local `useState`.

- **State**: one `useState` per field plus `isSubmitting`/`loading` and one error value per field (`urlError`, `keyError`) or a single `errorMessage`. Reset state when the modal opens (`useEffect` on `open`, `TagFormModal`).
- **Markup**: `<form onSubmit={handleSubmit}>`, `type="submit"` primary button, `type="button"` for every other button, `<Label htmlFor>` (or `<label>`) tied to the input `id` (custom controls such as a Radix `SelectTrigger` get that `id` too). An invalid field gets `aria-invalid` and `aria-describedby` pointing at its error, rendered with `FieldError` ([`components/ui/field-error.tsx`](../url-shortener-ui/src/components/ui/field-error.tsx), `role="alert"`, id `<fieldId>-error`), so the message is announced and read with the field. Form-level errors use `FieldError` (or `role="alert"`) as well.
- **Submit flow** (`handleSubmit`): `e.preventDefault()`, clear previous errors, validate synchronously with helpers from `lib/` (`isValidUrl`, `normalizeUrl`, `getShortKeyValidationError`), return early on failure after moving focus to the first invalid field (`focusElementById` from `lib/utils.ts`, which waits a frame so a screen switch can mount the field), set pending, `await` the call in `try/catch/finally`, map known failures (`ShortKeyConflictError`, HTTP 429, 422) to field or form messages, always clear pending.
- **Pending UI**: disable inputs and the submit button while pending; swap the label (`submittingLabel`, "Sending magic link...") or show `ButtonSpinner`; the primary button also disables when the form is not submittable (`!name.trim()`).
- **Modal forms** close in the parent after `onSubmit` resolves (`LinkFormModal.handleSubmit`) and stay open with pending cleared when it rejects.
- **Debounced checks**: `useDebounce` + `KEY_AVAILABILITY_CHECK_DEBOUNCE_MS` for key availability, `URL_CLEANER_DEBOUNCE_MS` for the URL cleaner hook.
- **Rate limits**: HTTP 429 with `Retry-After` is parsed to seconds with `parseRetryAfterSeconds` from [`src/lib/retry-after.ts`](../url-shortener-ui/src/lib/retry-after.ts) (never a local parser) and shown or turned into a cooldown (`useMagicLinkCooldown`). See [api-layer.md](api-layer.md) for the error conventions and [features/auth.md](features/auth.md) for the cooldown.
- **Turnstile**: forms that need a captcha render `TurnstileWidget` ([`src/components/auth/TurnstileWidget.tsx`](../url-shortener-ui/src/components/auth/TurnstileWidget.tsx)) only when `process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === "true"`, keep the token in state, pass it as `cf-turnstile-response` in the request body and clear it on `onExpire`. Submit stays disabled, labelled `CAPTCHA_VERIFYING_LABEL`, until a token exists and again after it expires (login form and `ReportAbuseForm`). A missing `NEXT_PUBLIC_TURNSTILE_SITE_KEY` while enabled throws. Used by the login page and `ReportAbuseForm`; flag details in [configuration.md](configuration.md). The test helper is `turnstile-utils.tsx` ([testing.md](testing.md)).

## Toasts

Use `toast.success(message)` / `toast.error(message)` from `sonner` for the outcome of a user action that has no inline place to show it (settings saves, session logout, CSV export, import failure, theme copy/import). The `Toaster` in the root layout restyles toasts with the `success`/`destructive` tokens. Conventions seen in code: messages are short sentences; failures are logged with `logger.error` where the catch site has an error object (e.g. `CustomThemeBuilder`); reusable messages are constants (`EXPORT_SUCCESS_MESSAGE`). Validation errors and request errors inside forms are shown inline, not as toasts. Copy failures are toasted by `useCopyToClipboard`; success feedback is the inline "copied" state, never shown before the write has resolved. Only `success` and `error` toasts exist today; do not introduce other kinds without a reason.

## TypeScript

- **`any` is forbidden**; none exists in application code. Use `unknown` and narrow, or define an interface.
- Function parameters and return types are explicit unless trivially inferred (a small arrow returning a primitive). Utilities and hooks in `lib/` declare return types; many components omit them (see observations).
- `interface` for object shapes and props; `type` for unions, intersections, aliases and `typeof` derivations (`type AbuseReason = (typeof ABUSE_REASONS)[number]`).
- Constant option sets use `as const` objects or arrays and derive the union from them (`ROUTES`, `TRACKER_MODE`, `ABUSE_REASONS`).
- Avoid assertions (`as Foo`). When truly unavoidable, add a comment saying why (`theme-tokens.ts` does this for `Object.entries`). Prefer narrowing helpers (`isTokenMap`, `isHexColor` in `theme-storage.ts`).
- DTOs for API payloads are in `lib/api-types.ts` / `lib/types.ts` ([api-layer.md](api-layer.md)).

## Logging

Never call `console.log/error/warn/info` in application code. Import the logger:

```ts
import {logger} from "@/lib/logger";
```

[`src/lib/logger.ts`](../url-shortener-ui/src/lib/logger.ts) exports `logger` with `debug(message, context?)`, `info(message, context?)`, `warn(message, context?)`, `error(message, error?, context?)`. In development everything prints; in production only `warn` and `error` print (minimum level `warn`). `error` serialises the error object (name, message, stack). The monitoring hand-off (`sendToMonitoring`) is an empty placeholder today, so nothing leaves the browser. Log at the catch site, keep the message static and put variable data in `context`. Tests that exercise error paths `vi.mock("@/lib/logger")` ([testing.md](testing.md)).

## Comments

Code explains itself through names. Comment only the **why** when it is not obvious (an external quirk, a workaround, a constraint invisible in the code), never the what. Remove commented-out code; history lives in version control. Do not add `// TODO` without an issue reference. The few existing comments follow this: the import-status note in `PageToolbar.tsx`, the assertion note in `theme-tokens.ts`, the QR contrast note in `QrCodeModal.tsx`.

## Performance practices

- **React Compiler is on** (`reactCompiler: true` in `next.config.ts`, `babel-plugin-react-compiler`). Do not add `useMemo`, `useCallback` or `memo` by default; add them only with a measurable reason or when a stable identity is a functional requirement (effect dependencies, context values such as `PaletteProvider`'s memoised value, vaul/embla integrations). Existing manual memoisation is tolerated, not a template.
- **Images**: use `next/image` with `width`, `height` and meaningful `alt` (or `alt=""` with `aria-hidden` for decorative icons). The only remote host allowed is configured in `images.remotePatterns` (`www.google.com/s2/favicons`); see [configuration.md](configuration.md). `LinkFavicon` is the reference implementation (`unoptimized` for the external favicon service).
- **Fonts**: only through `next/font` (Manrope in the root layout). Never link external font CDNs.
- **Heavy code is loaded lazily**: `canvas-confetti` is loaded with a dynamic `import()` at the moment of use (`CreateLinkModal`). If a heavy client component must be lazy-loaded, use `dynamic(() => import(...), {ssr: false})`; no `next/dynamic` call exists today.
- **Re-renders**: select the smallest slice from Zustand stores ([state-management.md](state-management.md)); keep `"use client"` boundaries at leaves; use `useDebounce` for per-keystroke work; high-frequency motion uses motion values, not state ([DESIGN.md](../DESIGN.md) section 6).
- **Data loading** is client-side through stores and hooks; do not add server-side fetching ([api-layer.md](api-layer.md)).

## Known limitations and existing exceptions

These are observations of how the code differs from the rules above. They are not templates: do not copy them into new code and do not change them as a drive-by.

- Observation: shadcn primitives in `components/ui` type props inline (`React.ComponentProps<"div">`, `{checked: boolean ...}` in `Switch`) and `PaletteProvider`, `TagCardSkeletonList`, `LinkCardSkeletonList` use inline prop types. Existing exception; feature components use `Props` interfaces.
- Observation: several files export more than one component (`DeleteLinkModal.tsx` exports `LinkPreviewCard`; `*Skeleton.tsx` files export a card and a `...List`; `AnalyticsSkeleton.tsx` exports three). Existing exception.
- Observation: files over the size guidance: `LinkFormFields.tsx` (~600 lines, ~20 `useState`, a ~45-line `handleSubmit`, direct `fetchWithAuth` calls in effects), `QrCodeModal.tsx`, `links/page.tsx`, `LinkCard.tsx`, `DateRangeDrawer.tsx`.
- Observation: `app/login/page.tsx` `handleMagicLinkSubmit` (~70 lines) and `ReportAbuseForm.handleSubmit` (~65 lines) exceed the function-size guidance, and compare status codes as literals (429, 422, 201). They also call `fetch` directly because the endpoints are unauthenticated ([api-layer.md](api-layer.md)).
- Observation: about 50 raw `<button>` elements (e.g. `AppearanceCard`, `CustomThemeBuilder`, `TagSelect`, `LinkCard`, `PageToolbar`) and raw `<label>` elements exist outside `components/ui` instead of `Button` / `Label`. New buttons must use `Button`; the existing raw ones render bespoke chrome.
- Observation: type assertions without an explanatory comment exist (`e.target as HTMLElement` in several keyboard handlers, `color as BadgeVariant` in `CreateTagModal`/`EditTagModal`, `variant={tag.color as never}` in `TagCard`, `payload as Partial<...>` in `billing-api.ts`, `theme as ToasterProps["theme"]` in `sonner.tsx`).
- Observation: many components omit explicit return types (`LinkFavicon.getFaviconSource`, most `export function Foo()` components).
- Observation: some handlers are not named `handle*` (`markFailed` in `LinkFavicon`, `applyDraft` in `CustomColorRow`, inline `onClick={() => ...}` closures are common).
- Observation: raw `<img>` is used where `next/image` cannot be (`OgImage` for arbitrary external preview images, `DeviceTab` and `LocationIcon` for static icons / the flag CDN). Two carry an `eslint-disable-next-line @next/next/no-img-element`.
- Observation: magic literals remain in components (`maxLength={50}` in `TagFormModal`, `maxLength={2048}` in `SearchBar`, `max-w-106.25` dialog width repeated in modals, `COLOR_SLOTS`-style local tables). `lib/constants.ts` also holds `MOCKED_SHORT_DOMAIN` and `FIRST_ANALYTICS_YEAR`, which are product/data constants rather than UI tuning.
- Observation: `ThemeToggle.tsx` exports `ModeToggle` (file and component names differ).
- Observation: `logger` has no production sink yet (`sendToMonitoring` is a stub).
- Observation: styling-related exceptions (raw hex values, arbitrary pixel sizes, repeated class strings) are listed in [styling-and-theming.md](styling-and-theming.md).
