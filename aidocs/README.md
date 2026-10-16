# aidocs

Detailed, code-verified knowledge for AI agents and contributors working in this repository. [`AGENTS.md`](../AGENTS.md)
holds only the project facts, verify commands, required reading and mandatory rules; everything else lives here.

## Guides

| Guide | Covers | Read when |
|---|---|---|
| [architecture.md](architecture.md) | Workspace layout, UI module boundaries and dependency direction, app bootstrapping, rendering model and its server-side exceptions, main data flows | First time in the repo; deciding where code belongs; anything server-side |
| [routing-and-navigation.md](routing-and-navigation.md) | Route map, redirects, auth guarding, `error.tsx` / `not-found.tsx`, no `loading.tsx`, `<Link>`, URL state, keyboard shortcuts | Adding or changing a page, link, redirect or shortcut |
| [configuration.md](configuration.md) | UI and mock-server env vars, `next.config.ts`, TypeScript/alias, tooling config, feature flags, Node/pnpm, scripts | Touching env vars, build config, dependencies or scripts |
| [coding-patterns.md](coding-patterns.md) | File placement, naming, components and size limits, reusable primitives catalogue, Dialog-vs-Drawer pattern, forms, toasts, TypeScript, logging, comments, performance | Writing or changing any component, hook or utility |
| [styling-and-theming.md](styling-and-theming.md) | Tailwind v4 setup, token layers, palettes, custom theme builder, dark mode, fonts, `cn()`/cva, motion, text truncation and overflow | Touching classes, colours, `globals.css`, theme code or long user text |
| [state-management.md](state-management.md) | Every Zustand store, store patterns, persisted browser state, context providers, store reset in tests | Adding or changing a store, an action, or anything persisted |
| [api-layer.md](api-layer.md) | Data-fetching rule for the client-rendered app, `fetchWithAuth` and token refresh, DTOs, error conventions, pagination, SSE client, billing API module, adding an endpoint | Adding or changing any network call |
| [testing.md](testing.md) | Test policy, commands, Vitest config and setup, naming, what and how to test, mocking rules, helper catalogue, mock-server tests | Every logic or behaviour change (tests are mandatory) |
| [mock-server.md](mock-server.md) | Mock server layering, middleware, endpoints, sandbox auth, MemoryStore, billing simulation, keeping UI and mock in sync | Adding or changing an endpoint; a flow behaves differently against the mock |
| [features/auth.md](features/auth.md) | Magic link, OTP, Google OAuth, code exchange, session bootstrap, logout, sessions list | Login, `auth/*`, auth store, session cards |
| [features/links-and-tags.md](features/links-and-tags.md) | Links list, create/edit form and URL cleaner, archive/delete/QR, CSV import (SSE) and export, tags, `/inspect/[key]`, `/report-abuse` | Anything under `components/links`, `components/tags`, `components/inspect`, `components/abuse` |
| [features/analytics.md](features/analytics.md) | Analytics page, period and custom ranges, comparison badge, charts, breakdown tabs, analytics store | Anything under `components/analytics` or `lib/store/analytics.ts` |
| [features/billing-and-settings.md](features/billing-and-settings.md) | Settings shell and tabs, profile, appearance, theme, preferences, danger zone, billing plans, checkout, portal return, period switch | Anything under `components/settings`, `lib/billing-*`, `lib/hooks/useBilling*` |

Root documents that stay outside this folder: [`README.md`](../README.md) (setup and API reference),
[`DESIGN.md`](../DESIGN.md) (visual design system), [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Where the old AGENTS.md sections went

The previous single-file `AGENTS.md` was split on 2026-10-16. Every rule was kept and reworded to match the code.

| Old section | Now in |
|---|---|
| Scope, §2 Rendering strategy | [architecture.md](architecture.md#rendering-model) |
| §2 Data fetching (rewritten for the client-rendered app) | [api-layer.md](api-layer.md#data-fetching-rule-client-rendered-app), [state-management.md](state-management.md) |
| §2 Routing & navigation, `error.tsx`, no `loading.tsx` | [routing-and-navigation.md](routing-and-navigation.md) |
| §2 Performance, §2 File & folder structure, §3 Clean code, §4 TypeScript, §5 Logging | [coding-patterns.md](coding-patterns.md) |
| §1 Theme & styling, §6 Text truncation & overflow | [styling-and-theming.md](styling-and-theming.md) |
| §7 Testing | [testing.md](testing.md) |
| §8 What not to do | Mandatory rules in [`AGENTS.md`](../AGENTS.md) |

## Maintaining these docs

- Describe what the code does today, verified in the code. Plans and wishes do not belong here.
- Write each fact once, in the guide that owns the topic (see the table above); everywhere else, link to it.
- Reference source files by relative path (link text is the path inside the package) and name symbols; no line
  numbers, no pasted code beyond a short sketch.
- Code that breaks a rule is recorded under the guide's "Known limitations and existing exceptions" section as an
  observation. Observations are not templates and not permission to change behaviour as a drive-by.
- A change that alters documented behaviour, adds a pattern or removes an exception updates the owning guide in the
  same commit. New guides must be added to the table above and to the required-reading table in `AGENTS.md`.
