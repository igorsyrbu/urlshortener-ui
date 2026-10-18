# AGENTS.md

Rules for AI agents and contributors. Details, explanations and examples live in [`aidocs/`](aidocs/README.md).

## Project facts

- `url-shortener-ui/`: Next.js 16 App Router, React 19 with the React Compiler, TypeScript (strict), Zustand 5,
  Tailwind CSS v4 + shadcn/Radix, Vitest 4 + React Testing Library. Client-rendered against an external REST API.
- `url-shortener-mock-server/`: Express 4 + TypeScript stand-in for that API, tested with `node:test`.
- pnpm workspace, Node >= 24 (`.node-version` at the root). There is no CI workflow; every check runs locally.

## Verify commands (repository root)

| Purpose | Command |
|---|---|
| **Before every commit** (lint, type-check, all tests, render budgets, compiler check; ~40 s) | `pnpm check` |
| **Before a commit touching imports, layouts, pages or lazy boundaries** (`check` + compiled tests + bundle budgets; ~75 s) | `pnpm check:full` |
| **After a change to loading states, skeletons, layouts or images** (Lighthouse on 8 pages, fails on layout shift; ~4 min, downloads `@lhci/cli` on first use; run `pnpm build` afterwards) | `pnpm perf:lighthouse` |
| Install | `pnpm install` |
| Dev (UI on :3000 + mock on :8080) | `pnpm dev` |
| Build | `pnpm build` |
| Tests (UI + mock server) | `pnpm test` |
| Compiled tests, render budgets | `pnpm --filter=url-shortener-ui test:compiled && pnpm --filter=url-shortener-ui test:perf` |
| Type-check (UI app and tests, mock server) | `pnpm type-check` |
| Bundle budgets (after touching imports, layouts, pages or lazy boundaries) | `pnpm check:bundle-budgets` |
| Lint | `pnpm lint` (green; 14 pre-existing `react-hooks` errors are recorded in `url-shortener-ui/eslint-suppressions.json`. Never add to that file; after fixing one, run `pnpm --filter=url-shortener-ui exec eslint --prune-suppressions`) |
| React Compiler check (no component or hook skipped) | `pnpm --filter=url-shortener-ui check:compiler-bailouts` |

## Required reading

Read [aidocs/README.md](aidocs/README.md), then the guides for your task before changing code.

| Task | Read |
|---|---|
| Any change (first time) | [architecture](aidocs/architecture.md), [coding-patterns](aidocs/coding-patterns.md) |
| Feature / UI work | [coding-patterns](aidocs/coding-patterns.md), [styling-and-theming](aidocs/styling-and-theming.md), the feature guide below |
| Pages, links, redirects, shortcuts | [routing-and-navigation](aidocs/routing-and-navigation.md) |
| Stores, persisted state | [state-management](aidocs/state-management.md) |
| API integration, new endpoint | [api-layer](aidocs/api-layer.md), [mock-server](aidocs/mock-server.md) |
| Styling, theming, long user text | [styling-and-theming](aidocs/styling-and-theming.md), [`DESIGN.md`](DESIGN.md) |
| Env vars, build config, scripts, dependencies | [configuration](aidocs/configuration.md) |
| Tests (every logic or behaviour change) | [testing](aidocs/testing.md) |
| Mock server | [mock-server](aidocs/mock-server.md), [testing](aidocs/testing.md) |
| Login, sessions | [features/auth](aidocs/features/auth.md) |
| Links, tags, import/export, inspect, report abuse | [features/links-and-tags](aidocs/features/links-and-tags.md) |
| Analytics | [features/analytics](aidocs/features/analytics.md) |
| Settings, billing | [features/billing-and-settings](aidocs/features/billing-and-settings.md) |

## Mandatory rules

1. The UI is client-rendered: no SSR, no server-side data fetching, no new API routes or server actions. The few
   existing server-side files are listed exceptions in [architecture](aidocs/architecture.md#rendering-model).
2. Data flows component -> hook / store / `lib/*-api.ts` -> `fetchWithAuth` (`@/lib/api`). Authenticated requests
   never use raw `fetch`; endpoint paths come from `API_ENDPOINTS`. `lib/` never imports from `app/` or `components/`.
3. Every API change on the UI side is mirrored in the mock server (and its tests) in the same change.
4. No new design tokens and no hardcoded colours or sizes: use the existing tokens and utilities. Every surface works
   in light and dark mode and in every palette.
5. Reuse `components/ui` and `components/layout` before creating a component. One exported component per file, with
   an explicit `Props` interface.
6. User-provided text never breaks layout: `truncate` + `title` (and `min-w-0` on every flex/grid ancestor), or
   `break-all` where the full value must stay visible.
7. No `any`. Type assertions only when unavoidable, with a comment saying why.
8. Naming: event handlers `handle*`, booleans `is*` / `has*` / `can*`, intention-revealing names. Functions stay
   under ~40 lines, use guard clauses, and contain no magic values; a string used twice becomes a constant.
9. Log only through `logger` from `@/lib/logger`; never `console.*`.
10. Internal navigation uses `next/link` or the router, never a raw `<a>`. No route-level `loading.tsx`. Images use
    `next/image`, fonts use `next/font`.
11. Every change to logic or user-facing behaviour ships with tests that follow [testing](aidocs/testing.md):
    behaviour over implementation, mocks only at boundaries, `vi.mocked`, no snapshots. Render counts only in
    `*.perf.test.tsx`.
12. Code listed under "Known limitations and existing exceptions" in a guide is not a template. Do not copy it and do
    not change it as a drive-by.
13. Components and hooks must compile with the React Compiler (the build fails otherwise): no `try/finally`,
    `throw` or `?.`/`&&`/`??` inside `try` in them; use module-level async functions, `withPending`, `attempt`.
14. Keep the docs true: when a change alters behaviour or a pattern described in `aidocs/`, update the owning guide in
    the same commit. Comments explain why, never what.
