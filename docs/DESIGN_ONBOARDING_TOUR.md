# Feature Design: Interactive Onboarding Tour

> **Note:** This document is a pre-implementation reference for reviewing and approving the feature idea and its proposed code changes. It should be read and signed off before any implementation begins. If this repository is intended to remain strictly code-only, this file and the `docs/` folder should be removed.

## 1. The Need

New users who log in for the first time are dropped directly onto the `/links` page with no guidance. The application's minimalistic design — while ideal for experienced users — provides no contextual clues about where to begin. Users must independently discover the Create button, the analytics dashboard, and the settings page.

This creates two problems:

- **Activation risk:** A user who does not create their first link within the first session is unlikely to return. The single most important action — shortening a URL — needs to be surfaced immediately.
- **Feature blindness:** Analytics and profile management exist but are invisible to a first-time user who has no reason to explore the sidebar unprompted.

An onboarding guide solves this without compromising the product's minimalistic philosophy: it appears exactly once, for exactly as long as it is needed, then disappears permanently.

---

## 2. What It Does

A **3-step spotlight tour** activates automatically on a user's first login. It dims the surrounding UI and highlights one element at a time, with a small tooltip card guiding the user to take a specific action.

### Steps

| Step | Element highlighted | User action | Completion signal |
|------|--------------------|-----------|--------------------|
| 1 | **Create** button (header) | Click to open the create modal and shorten a URL | First link appears in the link list |
| 2 | **Analytics** item (sidebar) | Click to navigate to the analytics page | User arrives at `/analytics` |
| 3 | **Settings** item (sidebar) | Click to navigate to the settings page | User arrives at `/settings` |

### Behaviour

- The tour triggers **once** on first login. Completion is tracked in `localStorage`; it never reappears.
- The user can **skip at any time** by clicking a Skip link inside the tooltip or clicking the dimmed area.
- Each step **auto-completes** when the user performs the intended action — there is no manual "Next" requirement. The Next button on each tooltip is a convenience shortcut, not a gate.
- After the final step (or a skip), both the overlay and tooltip **unmount entirely** — zero residual UI in the application.
- On mobile viewports where the sidebar is hidden, steps 2 and 3 are skipped and the tour completes after step 1.

---

## 3. UX Rationale

This feature is designed around the project's core philosophy: **minimalistic, intuitive, and distraction-free**.

| Decision | Rationale |
|----------|-----------|
| Spotlight tour, not a floating checklist widget | A persistent widget adds visual clutter to every session. The tour appears once and leaves the UI exactly as designed. |
| No welcome modal before the tour | An introductory modal is a barrier between the user and the app. The tour itself is the introduction — contextual and immediate. |
| Auto-completion on user action | The user should not have to manage the tour. When they create a link, the tour advances on its own. |
| Skip always available | The user is never trapped. A power user who understands the product can exit immediately. |
| 3 steps maximum | More steps would feel like a chore. Three actions cover the entire core value of the product. |
| No animation flourish on completion | Silence is the correct end state. The UI returns to its designed appearance without ceremony. |

---

## 4. Visual Design

### Overlay

A full-screen semi-transparent layer (`bg-foreground/40`) with a `clip-path` polygon cutout that reveals the spotlighted element at its native position. The target element remains fully interactive through the cutout — it does not need to be cloned or repositioned.

```
┌─────────────────────────────────────────────────────────--┐
│  [dimmed]   [dimmed]   ┌────────────────┐   [dimmed]      │
│                        │  Create    [C] │                 │
│                        └────────────────┘                 │
│                              │                            │
│                        ┌─────▼──────────────────────-┐    │
│                        │ 1 of 3                      │    │
│                        │ Start here                  │    │
│                        │ Paste any URL to create     │    │
│                        │ your first short link.      │    │
│                        │                             │    │
│                        │ [Next →]           [Skip]   │    │
│                        └─────────────────────────────┘    │
│                                                    [Skip] │
└─────────────────────────────────────────────────────────--┘
```

### Tooltip card

A compact card (`w-64`) anchored adjacent to the spotlighted element. Placement defaults to **below** for the Create button (step 1) and **to the right** of sidebar items (steps 2–3), clamped to the viewport so it never clips off-screen.

Styling uses only existing design tokens: `bg-card`, `border-border`, `rounded-xl`, `shadow-lg`, `text-muted-foreground`.

---

## 5. Technical Overview

This feature is **entirely frontend** with no new API calls.

### New components

```
components/onboarding/
  OnboardingTour.tsx      — Orchestrator; owns measurement, step logic, and completion detection
  SpotlightOverlay.tsx    — Full-screen dim layer with clip-path cutout
  SpotlightTooltip.tsx    — Positioned tooltip card
```

### New supporting files

```
lib/store/onboarding.ts       — Zustand store: isActive, currentStep, actions
lib/onboarding-storage.ts     — localStorage read/write (isOnboardingCompleted, markOnboardingCompleted)
```

### Existing files modified

```
lib/constants.ts                      — 4 new onboarding constants
lib/store/index.ts                    — Re-export useOnboardingStore
components/layout/Header.tsx          — data-onboarding-target="create-button" on Create button
components/layout/sidebar-nav.tsx     — data-onboarding-target on Analytics and Settings links
app/(dashboard)/layout.tsx            — Render <OnboardingTour /> alongside existing modals
```

### Persistence

A single `localStorage` key (`sl_onboarding_completed`) is written when the tour ends (complete or skip). Its presence is the only signal needed — no step-progress persistence. If the key is absent, the tour runs. If `localStorage` is unavailable (e.g. incognito with storage blocked), the failure is caught and swallowed silently.

### Element targeting

Target elements are identified via `data-onboarding-target` attributes (`create-button`, `analytics-nav`, `settings-nav`). The tour reads element positions with `getBoundingClientRect()` and re-measures on window resize and scroll.

---

## 6. No New API Calls

This feature introduces no new API calls. All state is managed in-memory (Zustand) and persisted to `localStorage`. No mock server changes are required.

---

## 7. Out of Scope

- **Backend persistence of onboarding state** — `localStorage` is sufficient for a first-version UX feature. Cross-device sync is a future concern.
- **Step branching or conditional flows** — The tour is linear. All users follow the same 3-step path.
- **Re-triggering the tour** — There is no UI to replay the tour. A developer can clear `localStorage` to re-trigger it manually during testing.
- **Analytics on tour completion/skip rates** — Possible future addition once the analytics infrastructure supports frontend events.

---

## 8. Development Checklist

- [x] Aligns with application design (Tailwind tokens only, existing `Button`/`Dialog` primitives)
- [x] Minimalistic approach (zero residual UI, single-use, skippable)
- [x] No new API calls or mock server changes required
- [x] Relevant to the core product (surfaces the primary action — creating a link)
