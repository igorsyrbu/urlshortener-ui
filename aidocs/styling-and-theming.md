# Styling and Theming

> How the UI is styled (Tailwind v4, tokens, palettes, custom themes, dark mode, fonts, motion) and the rules for using the theme and handling long text. Read before touching any class name, colour, `globals.css` or theme code. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [coding-patterns.md](coding-patterns.md) · [architecture.md](architecture.md) · [state-management.md](state-management.md) · [features/billing-and-settings.md](features/billing-and-settings.md) · [testing.md](testing.md) · [../DESIGN.md](../DESIGN.md)

The visual specification (default palette values, typography, spacing shells, radius hierarchy, shadows, intentional colour exceptions, drawer safe area, motion timing) is [DESIGN.md](../DESIGN.md). This guide covers the mechanics and the rules; it does not repeat DESIGN.md's tables. Where DESIGN.md and the code disagree, see [Known limitations](#known-limitations-and-existing-exceptions).

## Rules

1. **Never introduce new design tokens.** Colours, spacing, font sizes, radii, shadows and breakpoints come from the existing theme: Tailwind scale utilities, the CSS custom properties in `globals.css`, and the constants in `lib/constants.ts`.
2. **Never hardcode visual values** (`#3b82f6`, `padding: 12px`, `text-[11px]`) when a token or utility exists. Use semantic colour utilities (`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-destructive`, `text-success`), not palette colours (`bg-gray-100`, `text-white`).
3. **Match the styling approach already in use**: Tailwind utility classes composed with `cn()`; cva for variants. No CSS Modules, styled-components or inline colour styles.
4. **Reuse existing components** before building new ones (catalogue in [coding-patterns.md](coding-patterns.md#reuse-before-building)).
5. **Respect theming.** Every new surface must work in light and dark and in every palette and custom theme. Using semantic tokens is what makes that automatic; do not branch on palette ids in components.
6. **Never rely on a fixed surface colour** for contrast. Pair backgrounds and foregrounds from the same token family (`bg-primary` with `text-primary-foreground`).
7. **User-provided text must never break layout.** See [Text truncation and overflow](#text-truncation-and-overflow).
8. **Zoom stays enabled and text inputs stay at least 16px on mobile.** The root `viewport` export never sets `maximumScale` or `userScalable` (`app/layout.test.ts` guards it). iOS Safari zooms the page when a focused input's text is smaller than 16px, so `Input` and `Textarea` use `text-base md:text-sm`; do not pass `text-sm` (or smaller) through `className` on an editable input.
9. Documented intentional exceptions (rainbow `GlowingEffect`, categorical chart colours, black-on-white QR code) are specified in [DESIGN.md](../DESIGN.md) section 4. Do not "fix" them to brand colours.

## Tailwind v4 setup

- Tailwind is configured entirely in CSS: [`src/app/globals.css`](../url-shortener-ui/src/app/globals.css) starts with `@import "tailwindcss"` and `@import "tw-animate-css"` (the `animate-in` / `fade-in` / `zoom-in` / `slide-in-*` classes used by Radix surfaces). There is no `tailwind.config.*`; `components.json` has `"config": ""`. PostCSS only runs `@tailwindcss/postcss` ([`postcss.config.mjs`](../url-shortener-ui/postcss.config.mjs)).
- `@custom-variant dark (&:is(.dark *))`: the `dark:` variant applies to descendants of an element with class `dark` (next-themes puts it on `<html>`).
- `@theme inline` maps every semantic token to a Tailwind colour (`--color-primary: var(--primary)`), defines `--font-sans`, `--font-mono`, the radius scale and `--shadow-soft`. Because it is `inline`, utilities read the live CSS variable, which is what lets palettes and custom themes swap values at runtime.
- `@layer base` applies `border-border outline-ring/50` to everything and `bg-background text-foreground font-sans antialiased` to `body`.
- `@layer utilities` adds two project utilities: `animate-vertical-scroll` (120 s linear loop, used by `NoResultsState`) and `hairline-divider` (0.5px bottom border in `--border`, used by `ActionDrawer`). `shadow-soft` comes from `@theme`.
- Non-Tailwind CSS blocks in the same file: react-colorful styling (`.react-colorful*`), the vaul overlay blur override (`[data-slot="drawer-overlay"]`, uses `!important` to beat vaul's inline opacity), Recharts outline reset, and the `ios-wheel-picker*` classes for `IosWheelPicker`.
- Scale notes: Tailwind v4 numeric utilities accept any number (`max-w-106.25`, `size-4.5`); the `border-[0.5px]` hairline is the standard border width of cards, popovers and most bespoke panels (inputs and dialogs use the default 1px).

## Token layers

| Layer | Where | Role |
|---|---|---|
| 1. Palette values | `:root`, `.dark` and `[data-palette="..."]` / `.dark[data-palette="..."]` blocks in `globals.css` | Raw colours as CSS custom properties (`--background`, `--card`, `--primary`, ... , `--sidebar-*`, `--chart-clicks`) plus `--radius: 0.5rem` |
| 2. Tailwind mapping | `@theme inline` | `--color-*`, `--radius-*`, `--font-*`, `--shadow-soft` consumed by utilities |
| 3. Runtime override | Inline `style` on `<html>` | Custom theme tokens written by `PaletteProvider`; beat the stylesheet |
| 4. JS mirrors | `CHART_COLORS` in `lib/constants.ts`, `ThemeTokenMap` in `lib/themes/theme-tokens.ts` | Same values or names needed from TypeScript |

Token families: surface (`background`, `card`, `popover`, `sidebar`), text (`foreground`, `*-foreground`, `muted-foreground`), intent (`primary`, `secondary`, `accent`, `muted`, `destructive`, `success`), form (`border`, `input`, `ring`), sidebar variants, and chart tokens. Chart tokens: `--chart-clicks` follows the active palette (every palette and every custom theme sets it); `--chart-locations`, `--chart-devices`, `--chart-os`, `--chart-referrers`, `--chart-top-links` are categorical, defined only in `:root` / `.dark`, and never overridden by palettes. `--chart-clicks` has no `@theme` mapping and is used as `var(--chart-clicks)`.

Cascade rule: palette blocks must stay **unlayered and after** `:root` / `.dark` so they win; palettes override colours only (radii, shadows, typography and categorical chart colours never change).

Adding or renaming a colour token touches all of: the `:root` and `.dark` blocks, every one of the 14 palette blocks, `@theme inline`, `ThemeTokenMap` and `TOKEN_CSS_VAR_NAMES` in `theme-tokens.ts` (the CSS variable name must be the kebab-case of the key; `theme-tokens.test.ts` enforces this), `buildVariant` in `custom-theme.ts`, and the init script (it iterates `TOKEN_CSS_VAR_NAMES`, so it follows automatically). Do this only when explicitly asked, since rule 1 forbids new tokens by default.

## Palettes

- Built-in palette ids (from [`src/lib/themes/palettes.ts`](../url-shortener-ui/src/lib/themes/palettes.ts)): `default` (shown as "Terracotta"), `ayu`, `catppuccin`, `forest`, `mono`, `one-dark`, `tokyo-night`, `zen`. `DEFAULT_PALETTE_ID = "default"` has no CSS block and no `data-palette` attribute; `CUSTOM_PALETTE_ID = "custom"` is only an `activePaletteId` value.
- `PALETTES` carries UI metadata per palette: `name`, light/dark `swatch` (four dots in `PresetPaletteGrid`) and `customColors` (the four builder colours that approximate the preset, used to seed the custom builder when the user starts from a preset).
- Selection model ([`theme-storage.ts`](../url-shortener-ui/src/lib/themes/theme-storage.ts)): a versioned JSON (`v: 2`) in `localStorage` key `themePalette` (`THEME_PALETTE_STORAGE_KEY`), either `{kind: "preset", paletteId}` or `{kind: "custom", colors, authoredMode, derived: {light, dark}}`. `getThemeSelection` validates everything and returns `null` for anything malformed or from another version (falls back to default). `subscribeThemeSelection` listens to the `storage` event so other tabs stay in sync. The full key list of persisted state is in [state-management.md](state-management.md).
- Adding a preset: add `[data-palette="id"]` and `.dark[data-palette="id"]` blocks with the full token set including `--chart-clicks`, and a `PALETTES` entry with swatch and `customColors`.

## Applying a theme: provider and init script

- [`PaletteProvider`](../url-shortener-ui/src/providers/palette-provider.tsx) (inside `ThemeProvider` in the root layout) holds `selection` and exposes `usePalette()`: `selection`, `activePaletteId`, `selectPreset`, `applyCustomColors`, `resetToDefault`. An effect clears all inline tokens, then either sets/removes `data-palette` on `<html>` (preset) or writes the derived light/dark token map as inline custom properties (custom, picking light or dark from `resolvedTheme`). It also copies the resolved `--background` into the matching `meta[name="theme-color"]` so mobile browser chrome follows the theme.
- [`buildPaletteInitScript`](../url-shortener-ui/src/lib/themes/palette-init-script.ts) returns a small inline script that `app/layout.tsx` puts in `<body>` before the providers. It reads the stored selection and sets `data-palette` or the inline tokens before first paint, resolving dark mode from next-themes' `theme` key and `prefers-color-scheme`, and swallows all errors. This avoids a flash of the default palette. Keep it dependency-free ES5-style and in sync with `PaletteProvider`'s rules; `palette-init-script.test.ts` covers it.
- Bootstrapping order and where the providers sit is described in [architecture.md](architecture.md).

## Custom theme builder

[`src/lib/themes/custom-theme.ts`](../url-shortener-ui/src/lib/themes/custom-theme.ts) turns four user colours (`background` = page canvas, `card` = all cards, `accent` = primary actions and accent surfaces, `destructive`) into a full `ThemeTokenMap` for light and dark.

- `buildCustomTheme(colors, authoredMode)` builds the authored variant from the colours as given and derives the opposite mode: background/card lightness is inverted and clamped to per-mode ranges with damped chroma; accent and destructive are nudged until they reach 3:1 contrast against the derived card.
- Text colours are chosen for WCAG AA: `readableForeground` picks white or near-black (falling back to pure black) for at least 4.5:1. Secondary surfaces (`muted`, `secondary`, `accent`, borders, `muted-foreground`, sidebar accent) are OKLCH mixes using the named `*_MIX` constants. `success` is fixed per mode. `chartClicks` equals the accent.
- Helpers: `isValidHex`, `normalizeHex` (3- and 6-digit hex, lower-cased), `serializeCustomColors` / `parseCustomColorsInput` (the shareable comma-separated four-hex string), `surpriseMe(mode)` (random colours inside constrained OKLCH ranges), `DEFAULT_CUSTOM_COLORS`.
- UI: `ThemeCard` (Built-in / Custom `SegmentedControl`) renders `PresetPaletteGrid` or `CustomThemeBuilder` (`CustomColorRow` uses `react-colorful` in a `Popover`; `ImportThemeDialog` accepts a shared string). Page-level behaviour is in [features/billing-and-settings.md](features/billing-and-settings.md). Colour maths uses `culori`.
- Number literals in this file are named constants by design; keep it that way when adjusting the derivation.

## Dark mode

[`ThemeProvider`](../url-shortener-ui/src/providers/theme-provider.tsx) wraps `next-themes` with `attribute="class"`, `defaultTheme="system"`, `enableSystem` and `disableTransitionOnChange`. The user's choice (light / dark / system) is stored by next-themes under `theme`. `ModeToggle` (header) flips between light and dark; `AppearanceCard` offers all three. Components never read the theme to pick colours: they use tokens and, when a one-off tweak is unavoidable, the `dark:` variant (`dark:bg-input/30` on inputs, `dark:invert` on device icons). Components that must know the mode in JS (swatches, builder, provider) use `useTheme().resolvedTheme`; the swatch grid and the appearance cards guard with a mounted check to avoid hydration mismatch.

## Fonts

Manrope is loaded with `next/font/google` in the root layout (`--font-manrope`, latin subset) and exposed as `--font-sans`. Never link font CDNs in markup. `--font-mono` is declared as `var(--font-geist-mono)` but no Geist Mono font is loaded (see observations); `font-mono` is used for hex inputs and `Kbd`.

## Class composition: `cn()`, cva, shadcn

- [`cn()`](../url-shortener-ui/src/lib/utils.ts) = `clsx` + `tailwind-merge`. Always pass a caller's `className` last so it can override; never concatenate class strings with template literals when a conditional could conflict with a base class (several existing files do; use `cn` in new code).
- Variants use `class-variance-authority` (`buttonVariants`, `badgeVariants`). Add a variant to the cva definition rather than overriding with long `className` strings at call sites.
- shadcn conventions (`components.json`: style `new-york`, RSC on, lucide icons, `@/components/ui` alias): primitives wrap Radix/vaul, put `data-slot="..."` on every part, forward `className` through `cn`, and keep tokens-only styling. The Radix packages are imported as `@radix-ui/react-*` (and `radix-ui` for `Slot` in `Button`). Icons come only from `lucide-react`.
- Focus ring is standardised on `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` (see `Button`, `Input`), exported as `FOCUS_RING_CLASS` in `lib/constants.ts` for custom focusable elements (cards with `tabIndex`, sidebar links, raw `<button>`s). Never remove the indicator (`outline-none`, `focus:outline-none`, `focus-visible:ring-0`) without adding `FOCUS_RING_CLASS` or a `focus-within` ring on a wrapper; invalid state is `aria-invalid:border-destructive aria-invalid:ring-destructive/20`.

## Layout conventions

Page shell, spacing rhythm, radius hierarchy, shadows and breakpoints are specified in [DESIGN.md](../DESIGN.md) section 3. In code: `DASHBOARD_CONTENT_SHELL_CLASS`, `MOBILE_BREAKPOINT_PX` and `LARGE_SCREEN_MIN_WIDTH_PX` come from `lib/constants.ts`; the dashboard layout sets `bg-sidebar` as the page canvas with `bg-card` cards on top; `PageContainer` provides the `gap-4` vertical rhythm. Negative-margin hacks for alignment are not used.

## Motion

Details and timing scale: [DESIGN.md](../DESIGN.md) section 6. What the code actually uses:

- `framer-motion` for JS-driven motion (`AnimatePresence`, `motion.*`, `useReducedMotion`, imperative `animate()` in `GlowingEffect`) in `PageToolbar`, `SegmentedControl`, `CreateLinkModal`, `CreateLinkSuccess`, `LinkFormFields`, `ImportCsvDropzone`, `BillingPrice`. Do not add another animation library. Prefer CSS (`tw-animate-css`, `transition-*`) for simple enter fades: the analytics charts use `motion-safe:animate-in motion-safe:fade-in` and no framer.
- `tw-animate-css` classes for Radix/vaul open/close; plain `transition-*` utilities for hover and state changes. Pair every `duration-*` with an explicit `transition-*` scope (a bare `duration-*` animates all properties).
- Loaders: `ButtonSpinner` in buttons, `Spinner` for block loaders, `animate-pulse` skeletons.
- Reduced motion is honoured in `SegmentedControl`, `PageToolbar`, `BillingPrice` (`useReducedMotion`), in the import progress components (`motion-reduce:*` utilities) and in the analytics time-series chart (`usePrefersReducedMotion` from `lib/hooks/useMediaQuery.ts` turns the recharts animation off; `motion-safe:` for the fade).
- Chart animations (recharts) are short (`CHART_ANIMATION_MS` = 400 ms) and off with reduced motion. The time-series area also animates data changes (the curve morphs to the new period). Bar charts animate only their first draw (`useFirstDrawAnimation`), because recharts hides bar labels while bars animate and the labels would blink on every update. Pass recharts `content` / label renderers as elements, not inline functions (a new function per render remounts every label).
- Loading indicators for refreshes that are usually fast get a `delay-300` (it delays both the transition and the `tw-animate-css` animation), so they only appear when the wait is noticeable. Apply the same to new looping or large animations.
- `canvas-confetti` fires once on link creation (lazy import).

## Text truncation and overflow

User-provided strings (titles, URLs, file names, tag names, error reasons) can be arbitrarily long and must never break layout, in desktop dialogs and mobile drawers alike.

- **Single-line text**: use `truncate` (ellipsis) and expose the full value through the `title` attribute (hover / long-press) or `OverflowTooltip` ([`components/ui/overflow-tooltip.tsx`](../url-shortener-ui/src/components/ui/overflow-tooltip.tsx), which opens a tooltip only when the text is actually clipped).
- **`min-w-0` on every flex/grid ancestor**: `truncate` only works when every parent down the flex/grid chain between the constrained container and the text can shrink. One missing `min-w-0` silently disables truncation and blows out the layout. Reference: `LinkCard`, `TagCard`, `DeleteLinkModal`'s `LinkPreviewCard`.
- **Unbreakable content that must stay visible** (long tokens, error reasons, confirmation values): prefer `break-all` and, in tables, a fixed layout (`table-fixed` + `<colgroup>`) over truncation. No table exists in the app today; the rule applies to the first one added. Reference: `DeleteConfirmationModal` (`break-all` on the value), `BillingSettings` error messages (`min-w-0 break-all`).
- Multi-line previews use `line-clamp-*` (`InspectLinkPreviewCard`).
- **Verify with adversarial input**: 200+ characters without spaces, in both desktop (Dialog) and mobile (Drawer) layouts, including inside cards, tables and toolbars.

## Known limitations and existing exceptions

Observations, not templates: do not copy them and do not change them as a drive-by.

DESIGN.md versus code:

- Observation: DESIGN.md states `rounded-xl` is `var(--radius)` (about 8px). In code `--radius-lg` is `var(--radius)` (8px) and `--radius-xl` is `calc(var(--radius) + 4px)` (12px); cards, inputs and toolbars use `rounded-xl`, so they are 12px.
- Observation: DESIGN.md says the mono font is Geist Mono loaded via a variable. `layout.tsx` loads only Manrope; `--font-geist-mono` is never defined, so `--font-mono` points at an undefined variable and no monospace face is actually loaded by the app.
- Observation: DESIGN.md says nothing honours `prefers-reduced-motion`; five components do (see Motion). `NoResultsState`'s 120 s `animate-vertical-scroll` loop and `animate-pulse` skeletons do not.
- Observation: DESIGN.md says `PageToolbar` and `PeriodSelector` use `min-h-10 items-center`; neither file contains `min-h-10` (the 40px height comes from `h-10` on the search bar and option buttons).
- Observation: DESIGN.md's drawer rule forbids manual bottom padding (`px-6 pb-6`), yet the mobile (Drawer) branch of `TagFormModal` uses `px-6 pb-6` on its form. `LinksPagination` positions itself with `env(safe-area-inset-bottom)` directly.
- Observation: DESIGN.md links `GlowingEffect`, `constants.ts` and `QrCodeModal` with absolute `file:///Users/igorsyrbu/...` paths from another machine; they do not resolve here.
- Observation: DESIGN.md says all buttons must use `Button`; many raw `<button>` elements with bespoke classes exist ([coding-patterns.md](coding-patterns.md) lists them).
- Observation: DESIGN.md describes `Spinner` conventions with `Loader2`/`LoaderIcon`; the code also has a div-based `Spinner` component used by the analytics tabs.

Hardcoded values (outside the documented exceptions):

- Observation: arbitrary pixel text sizes `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]` (about 17 uses, e.g. `LinkCard`, `DeviceTab`, `Kbd`) and about 40 other bracketed pixel/rem sizes exist.
- Observation: `CHART_COLORS` in `lib/constants.ts` duplicates the categorical hex values from `globals.css` (comment says they "mirror" the CSS variables); the two must be changed together.
- Observation: `ios-wheel-picker` mask gradients in `globals.css` hardcode white and `rgba(30, 30, 30, ...)`, so they match only the default palette's card colour; `react-colorful` styles hardcode `#fff`/`#000`.
- Observation: `viewport.themeColor` in `layout.tsx` and `theme_color` / `background_color` in `app/manifest.ts` are hex literals (the former is rewritten at runtime by `PaletteProvider`).
- Observation: `PresetPaletteGrid` and `CustomColorRow` apply user/palette data colours through inline `style={{backgroundColor}}`; `GoogleIcon` has brand fills; `QrCodeModal` uses `bg-white`; `TagColorPicker` and `TagSelect` use `zinc` palette classes. Data-driven or brand colours, kept as is.
- Observation: repeated class strings that are not extracted: the three identical action buttons in `CustomThemeBuilder`, the theme option buttons in `AppearanceCard`, and the repeated dialog width `sm:max-w-106.25` across modals.
- Observation: some components build `className` with template literals rather than `cn()` (`AppearanceCard`, `NoResultsState`, dashboard `layout.tsx`).
- Observation: truncated text without a `title` or tooltip fallback exists: `LinkCard` title and short URL, `TagCard` name.
