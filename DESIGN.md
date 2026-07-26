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
* **Mono Font (for URL short keys, codes, tables):** Geist Mono (`--font-geist-mono`).

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
* **Header Height Alignment:** The `PageToolbar` and `PeriodSelector` containers must use `min-h-10 items-center` (40px) to guarantee that the first content card on every page aligns to the exact same vertical position.
* **Card List Gaps:** Link lists, tag lists, and their loading skeleton rows must use `gap-3` (12px) grid gap spacing for a consistent rhythm.
* **Analytics Page Spacing:** 
  * Mobile view uses a uniform `gap-y-4` (16px) spacing.
  * Desktop layout grid uses `gap-x-5` (20px) and `md:gap-y-6` (24px) for cards, with a `md:mt-2` to offset.

### Border Radius Hierarchy
* **Small (`rounded-sm`):** `calc(var(--radius) - 4px)` (approx. `4px`) — used for inline tags or very small elements.
* **Medium (`rounded-md`):** `calc(var(--radius) - 2px)` (approx. `6px`) — standard input fields, badges, buttons.
* **Large (`rounded-xl`):** `var(--radius)` (approx. `8px`) — main cards (link cards, tag cards, settings panels), sidebar menu buttons, the Mock Dashboard container, and size-16 icon wrappers (e.g. 404 page icon).
* **Extra Large (`rounded-2xl`):** `calc(var(--radius) + 8px)` (approx. `16px`) — modals, `DialogContent`, and `AlertDialogContent` desktop containers.

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
The `GlowingEffect` component in [`src/components/ui/glowing-effect.tsx`](file:///Users/igorsyrbu/IdeaProjects/url-shortener/urlshortener-ui/url-shortener-ui/src/components/ui/glowing-effect.tsx) uses a **deliberate rainbow color palette** — not derived from the terracotta brand colors.

The gradient sweep uses: pink (`#dd7bbb`), gold (`#d79f1e`), lime (`#5a922c`), and blue (`#4c7894`) to create a multicolor conic sweep effect that is visually striking on hover/focus of dashboard cards. This is an intentional design choice to add visual delight and should **not** be refactored to match the brand palette.

### Analytics Chart Colors (Intentional High-Contrast Exception)
The analytics visualizations (located in `src/app/globals.css` and [`src/lib/constants.ts`](file:///Users/igorsyrbu/IdeaProjects/url-shortener/urlshortener-ui/url-shortener-ui/src/lib/constants.ts)) use a **distinct, high-contrast color palette** instead of the core terracotta brand palette.

Colors like emerald green, yellow/gold, bright cyan, pink, and indigo/purple are intentionally selected to provide clear visual categorization and separation for different data dimensions (e.g. locations, devices, OS, referrers) in Recharts rendering. This is a deliberate choice for readability and data parsing reliability and should **not** be refactored to matching brand tones.

**Exception within the exception:** `--chart-clicks` (the Total clicks time series) **does follow the active color palette** — each palette maps it to its primary color, and custom themes derive it from the picked primary. Only the categorical series colors stay fixed across palettes.

### QR Code Contrast (Scan Reliability Exception)
The `QrCodeModal` generation settings in [`src/components/links/QrCodeModal.tsx`](file:///Users/igorsyrbu/IdeaProjects/url-shortener/urlshortener-ui/url-shortener-ui/src/components/links/QrCodeModal.tsx) hardcode the dot color to black (`#000000`) and the background options color to white (`"white"`). This is a deliberate design requirement to guarantee maximum scanning contrast for device readers and paper prints under any UI theme (light/dark) and should **not** be refactored to theme-based dynamic variables.
