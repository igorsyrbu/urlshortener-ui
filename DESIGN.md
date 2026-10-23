# Design System & Guidelines

This document outlines the design system, styling guidelines, and established visual standards within the URL Shortener Next.js application.

---

## 1. Theme & Color Palette
The application ships with a **default warm, cream/terracotta-based palette** (reminiscent of the "Claude" aesthetic), plus a set of alternative built-in color palettes and a custom theme builder.

### Palettes (color themes)
* The default palette ("Terracotta") is defined in `:root` / `.dark` in `src/app/globals.css` and corresponds to the absence of the `data-palette` attribute.
* Alternative palettes (`ayu`, `catppuccin`, `mono`, `forest`, `one-dark`, `tokyo-night`, `zen`) are defined as `[data-palette="..."]` blocks in `globals.css`, applied by `PaletteProvider` (`src/providers/palette-provider.tsx`). They override **colors only** — typography, radii, and shadows never change.
* All card surfaces (link cards, tag cards, analytics cards, settings cards, empty states, skeletons) use the `--card` token; the dashboard page canvas uses `--sidebar`. Border colors in every palette are solid (no transparency) and tuned to the same contrast as the default theme's borders.
* Custom themes are derived at runtime from 4 user-picked colors (background = page canvas behind the cards, cards = all link/tag/analytics/settings cards, accent = drives both primary actions and accent surfaces, danger = delete/error actions) by `src/lib/themes/custom-theme.ts` and applied as inline CSS variables. Text colors are auto-derived for WCAG AA readability; the opposite light/dark variant is derived automatically. Custom themes can be shared/imported as a comma-separated string of 4 hex colors.
* Selection persists in `localStorage` (key `themePalette`) and is applied before first paint by an inline init script in `src/app/layout.tsx`.
* Palette definitions below describe the **default** palette.

### Brand & Core Colors (default palette)
* **Primary (Terracotta):**
  * Light Mode: `#d96a47`
  * Dark Mode: `#c95d3c`
  * Used for main action buttons, primary UI accents, active page indicators, focus rings.
* **Core Text (Foreground):**
  * Light Mode: `#2d2b28` (Warm dark-gray/brown)
  * Dark Mode: `#eae6df` (Warm light-cream)
* **Canvas Backgrounds:**
  * Light Mode: `#ffffff` (Pure white for main page cards & interactive elements)
  * Dark Mode: `#1e1e1e` (Sleek dark-gray)
* **Sidebar & Section Canvas:**
  * Light Mode: `#f5f4ef` (Signature warm off-white/beige)
  * Dark Mode: `#121212` (Deep dark-gray)

### Semantic Colors
* **Secondary:** Light: `#e5e1d8` | Dark: `#3b3a36`
* **Muted / Utility BG:** Light: `#f3f1eb` | Dark: `#3d3b36`
* **Muted Foreground:** Light: `#8a8882` | Dark: `#9b978f`
* **Accent:** Light: `#f5f4ef` | Dark: `#3b3a36`
* **Destructive (Error):** Light: `#cc2525` | Dark: `#c93336`
* **Success:** Light: `#16a34a` | Dark: `#22c55e`
* **Border & Input:** Light: `#d1cabe` | Dark: `#33322f`

---

## 2. Typography
* **Primary Sans-Serif Font:** [Manrope](https://fonts.google.com/specimen/Manrope) (`--font-manrope` variable, loaded dynamically via `next/font/google`).
* **Fallback Fonts:** `ui-sans-serif`, `system-ui`, `sans-serif`, `Apple Color Emoji`, `Segoe UI Emoji`, `Segoe UI Symbol`.
* **Mono Font (for URL short keys, codes, tables):** the system monospace stack (`--font-mono`: `ui-monospace`, SF Mono, Menlo, Consolas, ...); no web font is loaded for it.

---

## 3. Layout, Spacing & Borders

### Screen Breakpoints (Aligning with Tailwind v4)
* **Mobile Breakpoint:** `< 640px` (`sm`). Used to toggle mobile sheets/drawers.
* **Desktop Sidebar Navigation Toggle:** `1024px` (`lg`). Screens larger than this show the persistent side nav.

### Spacing & Padding Shells
* Page content wrappers and layouts align visually using a shared shell styling:
  ```ts
  "mx-auto w-full max-w-7xl px-4 md:px-8 lg:px-10"
  ```
  *(Registered as `DASHBOARD_CONTENT_SHELL_CLASS` in `constants.ts`)*

### Page Layout Spacing Standards
To ensure consistent alignment across all pages:
* **PageContainer Spacing:** Standardized to a `gap-4` (16px) vertical flex layout.
* **Layout Top Padding:** Set to `pt-2 md:pt-6 lg:pt-6` in layout shells. Negative margin hacks (such as `-mt-6`) are forbidden.
* **Header Height Alignment:** The toolbar row aligns on the 40px (`h-10`) search field and option buttons; the analytics period row uses `ANALYTICS_PERIOD_ROW_CLASS` (`min-h-10 items-center`). Keep any new toolbar or period row at 40px so the first content card on every page starts at the same vertical position.
* **Card List Gaps:** Link lists, tag lists, and their loading skeleton rows must use `gap-3` (12px) grid gap spacing for a consistent rhythm.
* **Settings Pages:** a centred column capped at `max-w-4xl` (`gap-6`): a one-line page description, underline tabs on a hairline (active tab: foreground text and a 2px foreground bar), then section rows separated by hairlines (`py-8`). A row puts its title (`text-sm font-semibold`) and description (`text-sm text-muted-foreground`) in a `16rem` left column and its cards on the right once the column is 48rem wide (container query), stacked below that. Cards inside carry no title of their own; inner headings are `text-sm font-medium` with an `text-xs` description. Card actions sit right-aligned in a footer bar under a hairline, in the card colour (no lighter fill); option lists are rows divided by hairlines; destructive actions are outline buttons with destructive text inside a card with a `border-destructive/40` border.
* **Analytics Page Spacing:** 
  * Mobile view uses a uniform `gap-y-4` (16px) spacing.
  * Desktop layout grid uses `gap-x-5` (20px) and `md:gap-y-6` (24px) for cards, with a `md:mt-2` to offset.

### Border Radius Hierarchy
* **Small (`rounded-sm`):** `calc(var(--radius) - 4px)` (approx. `4px`) — used for inline tags or very small elements.
* **Medium (`rounded-md`):** `calc(var(--radius) - 2px)` (approx. `6px`) — standard input fields, badges, buttons.
* **Large (`rounded-xl`):** `calc(var(--radius) + 4px)` (approx. `12px`) — main cards (link cards, tag cards, settings panels), sidebar menu buttons, the Mock Dashboard container, and size-16 icon wrappers (e.g. 404 page icon); `rounded-lg` is the 8px step below it.
* **Extra Large (`rounded-2xl`):** `calc(var(--radius) + 8px)` (approx. `16px`) — modals and `DialogContent` desktop containers (there is no `AlertDialog` component).

### Shadows
* **Soft Shadow:** `shadow-soft` custom utility (`0 2px 12px -2px rgba(0, 0, 0, 0.04)`) used for layout widgets.
* **Elevated Shadow:** `shadow-lg` used for overlay sheets, drop-downs, and popovers.

---

## 4. UI Elements & Components

### Buttons & Focus Outlines
All buttons must use the custom `Button` component inside `src/components/ui/button.tsx` rather than raw HTML `<button>` elements to inherit:
* Varied theme configurations (Primary, Destructive, Outline, Secondary, Ghost, Link).
* Smooth transition-all timing.
* Unified focus ring behavior:
  ```css
  focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]
  ```

### Inputs & Fields
All standard text inputs should render via `<Input>` in `src/components/ui/input.tsx` to preserve border accents, background color scales (`dark:bg-input/30`), and highlight selection text styles.

### Badges & Tag Colors
The Tag model defines standard badge mappings inside `src/components/ui/badge.tsx` with light/dark properties:
* **Gray:** Zinc-based borders & fills.
* **Colors (Red, Yellow, Lime, Green, Blue, Cyan, Purple):** Palette mappings defined using clean semi-transparent fills with solid colored labels.

### Glowing Effect (Intentional Rainbow Exception)
The `GlowingEffect` component in [`url-shortener-ui/src/components/ui/glowing-effect.tsx`](url-shortener-ui/src/components/ui/glowing-effect.tsx) uses a **deliberate rainbow color palette** — not derived from the terracotta brand colors.

The gradient sweep uses: pink (`#dd7bbb`), gold (`#d79f1e`), lime (`#5a922c`), and blue (`#4c7894`) to create a multicolor conic sweep effect that is visually striking on hover/focus of dashboard cards. This is an intentional design choice to add visual delight and should **not** be refactored to match the brand palette.

### Analytics Chart Colors (Intentional High-Contrast Exception)
The analytics visualizations (located in `src/app/globals.css` and [`url-shortener-ui/src/lib/constants.ts`](url-shortener-ui/src/lib/constants.ts)) use a **distinct, high-contrast color palette** instead of the core terracotta brand palette.

Colors like emerald green, yellow/gold, bright cyan, pink, and indigo/purple are intentionally selected to provide clear visual categorization and separation for different data dimensions (e.g. locations, devices, OS, referrers) in Recharts rendering. This is a deliberate choice for readability and data parsing reliability and should **not** be refactored to matching brand tones.

**Exception within the exception:** `--chart-clicks` (the Total clicks time series) **does follow the active color palette** — each palette maps it to its primary color, and custom themes derive it from the picked primary. Only the categorical series colors stay fixed across palettes.

### QR Code Contrast (Scan Reliability Exception)
The `QrCodeModal` generation settings in [`url-shortener-ui/src/components/links/QrCodeModal.tsx`](url-shortener-ui/src/components/links/QrCodeModal.tsx) hardcode the dot color to black (`#000000`) and the background options color to white (`"white"`). This is a deliberate design requirement to guarantee maximum scanning contrast for device readers and paper prints under any UI theme (light/dark) and should **not** be refactored to theme-based dynamic variables.

---

## 5. Drawer / Bottom Sheet — Safe Area

- `DrawerContent` (`src/components/ui/drawer.tsx`) is the sole owner of bottom safe-area spacing. It wraps `{children}` with `DRAWER_CONTENT_SAFE_AREA_BOTTOM_CLASS` (`pb-[calc(1.5rem+env(safe-area-inset-bottom,0))]`) or `DRAWER_CONTENT_SAFE_AREA_BOTTOM_MOBILE_MENU_CLASS` (`pb-[calc(2.25rem+env(safe-area-inset-bottom,0))]`) when `mobileMenuSpacing` is set — both exported from `src/lib/constants.ts`.
- Never add manual `env(safe-area-inset-bottom)` or `pb-[calc(...)]` on outer `DrawerContent` (`className="px-6 pb-6"` → use `px-6`) or on inner content (`px-6 pb-6` → `px-6` / `pt-6`). Inner forms should use `px-6` / `gap-*` / `mt-4` for layout; bottom inset comes only from the wrapper.
- Button order in a drawer: the primary (filled) action first, then the secondary ones, with `Cancel` (ghost) last, so the last row next to the home indicator is a text button. Dialogs keep the row order (secondary left, primary right).
- Minimum spacing bottom ↔ last button is the wrapper's `1.5rem` + iPhone safe area (≈24px + 34px on home-indicator devices). For menu drawers use `mobileMenuSpacing`.
- New drawers must import the constants above, never hardcode `1.5rem` / `2.25rem` / `0.75rem` literals.

---

## 6. Motion & Micro-animations

### Library Choice
* **CSS first** (`tw-animate-css` `animate-in` / `animate-out`, Tailwind `transition-*`) for fades, slides and enter/exit swaps (`BillingPrice` cross-fades with CSS).
* **`framer-motion` only for what CSS cannot do** (layout animation, springs, motion values, the imperative `animate()` used by `GlowingEffect`), and never in a layout shell, a shared `components/ui` primitive or a settings page; code in a page's first load uses `LazyMotion` + `m.*` (`PageToolbar`). It is already a dependency — do not introduce new animation libraries.
* **Tailwind `transition-*` utilities for simple state changes** (hover, active, disabled, open/close styling).

### Timing Scale
* **`0.15–0.2s` — micro feedback:** fades, form field reveals, success states, switch toggles (`duration-200 ease-in-out`).
* **`0.3s` — layout motion:** height-auto reveals (`CreateLinkModal`), chart layout shifts.
* **`0.4s` — data entrances:** chart initial renders.
* **Springs for physical motion:** stiff `stiffness: 400, damping: 25` (dropzone lift) vs. laggy `stiffness: 300, damping: 20` (cursor magnetism that trails behind). Ease `easeInOut` for reveals.

### What May Animate
* **Transform and opacity only** — never layout properties (width, height, margin). Motion layers must be `pointer-events-none` + `aria-hidden` and must not shift siblings.
* **Hover/active:** `transition-colors` by default; `transition-all` only where size or transform intentionally changes (buttons, cards). Press feedback: `active:scale-95` on primary actions.
* **Mount/unmount transitions:** CSS `animate-in` / `animate-out` where a fade or slide is enough (keep the leaving element until `onAnimationEnd`); `AnimatePresence` only when the exit needs layout or spring motion. Rapidly toggling states (e.g. drag-over) bind `animate` directly to avoid flicker. Every animation honours reduced motion (`motion-reduce:` / `motion-safe:`).
* **High-frequency updates** (e.g. cursor tracking during file drag) must use motion values + springs, never `setState` per event.

### Loader Conventions
* **Spinners:** Use the shared `Spinner` for content areas and `ButtonSpinner` (`LoaderIcon` with `animate-spin`) inside buttons. A few inline icon spinners still use `Loader2`; new code should prefer the shared components.
* **Skeletons:** `animate-pulse` blocks.

### Gotchas
* **Always pair `duration-*` with an explicit `transition-*` scope.** A bare `duration-200` activates transitions on *all* properties (CSS initial `transition-property: all`) — this once animated a dialog's width swap and reflowed its text mid-transition. Size-changing surfaces get `transition-none`; open/close keyframe animations (`animate-in` / `animate-out`) are unaffected by it.
* **Looping / infinite animations must respect `prefers-reduced-motion`.** The global rule in `src/app/globals.css` ends CSS animations and transitions under `prefers-reduced-motion: reduce` (except `.animate-spin`), and framer-motion users wrap themselves in `MotionConfig reducedMotion="user"`; keep new motion inside that contract.
