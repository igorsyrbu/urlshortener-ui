# Testing

> How tests are written, run and configured in the UI (Vitest + React Testing Library) and in the mock server (`node:test`); read it before adding or changing any logic or user-facing behaviour. Paths are relative to `url-shortener-ui/` unless stated otherwise.

Related: [coding-patterns](coding-patterns.md) · [state-management](state-management.md) · [api-layer](api-layer.md) · [mock-server](mock-server.md) · [configuration](configuration.md)

## Policy

Every change to logic (stores, hooks, `lib/` utilities, API handling) or to user-facing behaviour must ship with tests. Tests follow the same clean-code, naming, TypeScript and no-magic-values rules as production code (see [coding-patterns](coding-patterns.md)). The mock server is covered by its own suite (see [Mock-server tests](#mock-server-tests)). There is no CI workflow; all checks run locally.

## Running

| Command | Where | Purpose |
|---|---|---|
| `pnpm test` | `url-shortener-ui/` | Vitest in watch mode |
| `pnpm test:run` | `url-shortener-ui/` | Single run (pre-push) |
| `pnpm test:coverage` | `url-shortener-ui/` | Coverage report (`coverage/index.html`) |
| `pnpm test:ui` | `url-shortener-ui/` | Vitest UI |
| `pnpm type-check` | `url-shortener-ui/` | `tsc --noEmit` for the app, then again with `tsconfig.test.json` (app **and** test files) |
| `pnpm test:compiled` | `url-shortener-ui/` | The whole unit suite with the React Compiler on (see below); run it after changing components or hooks |
| `pnpm test:perf` | `url-shortener-ui/` | Render-count thresholds (`*.perf.test.tsx`) with the React Compiler on |
| `pnpm test` | repository root | UI `test:run` followed by the mock-server suite, both once |
| `pnpm --filter=@url-shortener/url-shortener-mock-server test` | repository root | Mock-server suite only |

UI scripts set `NODE_OPTIONS=--no-deprecation` (see [`package.json`](../url-shortener-ui/package.json)).

Counts, measured on 2026-10-16 on Node 24 and 26: 136 UI test files (1,666 passed, none skipped) and 25 mock-server test files (400 passed). Treat these as a snapshot, not a contract. Do not add `it.skip`; fix the test or the code.

## React Compiler in tests

The unit suite runs **without** the React Compiler (`@vitejs/plugin-react` v6 has no `babel` option), while production compiles every component (`panicThreshold: "all_errors"`, see [configuration](configuration.md)). Compiled code can behave differently: a non-null assertion inside a callback became a render-time read and crashed `/settings/general` while every unit test passed. [`vitest.compiler.config.ts`](../url-shortener-ui/vitest.compiler.config.ts) adds the compiler (`@babel/core` + `babel-plugin-react-compiler`, server components under `src/app/inspect/` excluded) for two scripts:

- `pnpm test:compiled` runs every `*.test.ts(x)` compiled (`COMPILED_TEST_INCLUDE`). It caught that crash (17 failing settings tests on the unfixed page).
- `pnpm test:perf` runs `*.perf.test.tsx`, the **only** place where render counts may be asserted: count renders by wrapping the real component in a `vi.mock` (`LinkCard` in [`links/page.perf.test.tsx`](../url-shortener-ui/src/app/(dashboard)/links/page.perf.test.tsx)), assert thresholds (`0` for interactions that must not re-render, `<=` budgets for mounts), keep the router mock referentially stable, and mock `@/lib/api` with `importOriginal` so module-level constants stay real.

## Vitest configuration

Defined in [`vitest.config.ts`](../url-shortener-ui/vitest.config.ts):

- Environment `jsdom`, `globals: true` (every existing test file nevertheless imports what it uses from `vitest` explicitly), plugin `@vitejs/plugin-react`, alias `@` to `src`.
- `include`: `src/**/*.{test,spec}.{ts,tsx}`, `exclude`: `src/**/*.perf.test.tsx`. Setup file: [`src/test/setup.ts`](../url-shortener-ui/src/test/setup.ts).
- Auto-reset flags: `clearMocks`, `restoreMocks`, `unstubGlobals`, `unstubEnvs` are all `true`. Do not repeat that cleanup by hand.
- Coverage: provider `v8`, reporters `text`, `json`, `html`. Thresholds: statements 90, branches 85, functions 88, lines 90. Excluded: `src/test/**`, test files, `src/components/ui/**`, `**/*.d.ts`.

[`tsconfig.test.json`](../url-shortener-ui/tsconfig.test.json) extends `tsconfig.json`, disables `incremental`, adds the global types `vitest/globals` and `@testing-library/jest-dom`, and includes `src/**/*.ts(x)` plus `vitest.config.ts`. `pnpm type-check` runs it, so type errors in tests fail the check.

## Global setup (`src/test/setup.ts`)

- Registers `@testing-library/jest-dom/vitest` matchers.
- `afterEach`: RTL `cleanup()`, then `localStorage.clear()` and `sessionStorage.clear()`.
- Globally mocks `next/navigation` with a referentially stable router (`push`, `replace`, `back`, `forward`, `refresh`, `prefetch` as `vi.fn()`), `usePathname` returning `/` and `useSearchParams` returning empty params.
- Defines `window.matchMedia` (always `matches: false`).
- Always replaces `localStorage`/`sessionStorage` with an in-memory `Storage` (`InMemoryStorage`). Node 25+ shadows jsdom's storage with an experimental global, and jsdom's own `Storage` cannot be spied on per instance, so without this the same test behaves differently per Node version.
- Polyfills `ResizeObserver`, `IntersectionObserver`, pointer-capture methods, `scrollIntoView` and `document.elementFromPoint` (needed by `input-otp`).

Add new global polyfills here, never inside individual tests.

## Location and naming

- Co-locate tests with the code under test: `Foo.tsx` to `Foo.test.tsx`, `url-utils.ts` to `url-utils.test.ts`.
- `src/test/` holds only shared infrastructure: `setup.ts` and `*-utils.ts(x)` factories/helpers (for example `createImportJob()` in `import-utils.ts`). Create a factory there as soon as a fixture is needed by more than one test file; never copy fixtures between files.
- `describe` names the unit or behaviour area (`"LinksPagination"`, `"import session lifecycle"`).
- `it` states the observable behaviour in plain present tense, without a `should` prefix: `it("disables the submit button while the request is pending")`.
- Mock-server tests live next to the service/middleware/route they cover and use `node:test` + `node:assert/strict`.

## What to test

- **Behaviour, not implementation.** Assert on what the user sees (text, roles, enabled/disabled state) or on the public contract (store state, hook return value, request sent). Never assert on internal state, private helpers, CSS classes used purely for styling, or the number of renders (render-count budgets live only in `*.perf.test.tsx`, see [React Compiler in tests](#react-compiler-in-tests)).
- Cover the **happy path, every error/empty branch, and boundaries** (0, 1, max, invalid input, long strings; see the truncation rules in [styling-and-theming](styling-and-theming.md)).
- **One behaviour per test.** Several `expect`s are fine when they describe the same outcome.
- Do not test third-party libraries or thin shadcn wrappers in `components/ui/` unless the project added logic to them.
- No snapshot tests: they are brittle and do not express intent.

## Writing tests

- Structure every test as **Arrange, Act, Assert**, separated by blank lines when the test is longer than a few lines.
- Query elements the way users find them, in this priority: `getByRole` (with `name`), `getByLabelText`, `getByPlaceholderText`, `getByText`, `getByTestId`. `container.querySelector` is a last resort.
- Use `userEvent.setup()` for interactions; use `fireEvent` only for events `user-event` cannot produce.
- Use `findBy*` / `waitFor` for async UI; never `setTimeout`-based sleeps.
- Use `vi.useFakeTimers()` for debounce/cooldown/polling logic and restore real timers in `afterEach`.
- After a failed form submit, wait for focus to reach the first invalid field (`await waitFor(() => expect(field).toHaveFocus())`) before typing into another field. `focusElementById` moves focus one frame later, and under load that can happen between `user.type`'s click and its keystrokes, so the text lands in the wrong field.
- Import labels, messages, endpoints and enums from the source constants instead of re-typing string literals.
- Keep tests readable: extract repeated arrange steps into named helpers with explicit return types (`renderLinksToolbar()`, `mockAcceptedJob()`).

## Mocking

- Mock at the **boundary** only: `@/lib/api` (`fetchWithAuth`, see [api-layer](api-layer.md)), `next/navigation`, browser APIs, timers. Do not mock the module under test or its own pure helpers.
- Use `vi.mocked(fn)` for typed access to mocks; never `as ReturnType<typeof vi.fn>` or `as any`.
- Declare mock functions shared between `vi.mock` factories and tests with `vi.hoisted`.
- Build `Response` objects with `Response.json(body, init)` / `new Response(...)` instead of hand-rolled objects.
- Reset Zustand stores between tests (`useStore.setState(initialState)` or an exported `reset...ForTests()` helper such as `resetImportTrackerForTests()` in [`src/lib/store/import.ts`](../url-shortener-ui/src/lib/store/import.ts)) so tests never depend on execution order. Store design: [state-management](state-management.md).
- Mocks, spies, stubbed globals/envs, `localStorage` and `sessionStorage` are reset automatically after each test (config + setup file above).
- Web Storage is an in-memory instance, so spy on the instance (`vi.spyOn(localStorage, "setItem")`), not on `Storage.prototype`. A test that simulates a failure through a spy also asserts the spy was called (`expect(setItem).toHaveBeenCalled()`); otherwise it passes even when the failure path never runs (see `billing-portal-return.test.ts`).
- The global `next/navigation` mock returns a referentially stable router. Override it per file with `vi.mock` + `vi.hoisted` when a test needs to assert on navigation or control `useSearchParams`/`usePathname`.
- Desktop vs. mobile (Dialog vs. Drawer, see [coding-patterns](coding-patterns.md)): call `stubDesktopViewport()` / `stubMobileViewport()` (and `stubReducedMotion()` for `prefers-reduced-motion`) from [`src/test/viewport-utils.ts`](../url-shortener-ui/src/test/viewport-utils.ts) so the real `useMediaQuery` hooks run. Mock `@/lib/hooks/useMediaQuery` instead only when a test must flip the layout within a single render. Cover both layouts with `describe.each` when behaviour differs.
- Tests that exercise error paths should `vi.mock("@/lib/logger")` and assert on `logger.error` where the log is part of the contract, so expected failures do not pollute the test output.
- Reuse the helpers below before writing new ones.

## Helpers catalogue (`src/test/`)

| File | Main exports | Use for |
|---|---|---|
| [`setup.ts`](../url-shortener-ui/src/test/setup.ts) | (side effects only) | Global setup described above |
| [`link-utils.ts`](../url-shortener-ui/src/test/link-utils.ts) | `createShortLink`, `createLinkItem`, `createPage<T>` | Link DTO / UI item / paged response fixtures |
| [`tag-utils.ts`](../url-shortener-ui/src/test/tag-utils.ts) | `createTag` | Tag fixtures |
| [`import-utils.ts`](../url-shortener-ui/src/test/import-utils.ts) | `createImportJob` | CSV import job DTO fixture |
| [`csv-utils.ts`](../url-shortener-ui/src/test/csv-utils.ts) | `createCsvFile` | `File` objects for dropzone/import tests |
| [`link-form-utils.ts`](../url-shortener-ui/src/test/link-form-utils.ts) | `routeFetchWithAuth`, `getRequestsTo`, `parseRequestBody`, `getQueriesOfRequestsTo`, type `RouteHandler` | Route a mocked `fetchWithAuth` by endpoint (unrouted endpoints return 404) and inspect the requests sent |
| [`turnstile-utils.tsx`](../url-shortener-ui/src/test/turnstile-utils.tsx) | `turnstileModuleMock`, `getTurnstileProps`, `resetTurnstileMock`, `TurnstileCallbacks` | Fake Cloudflare Turnstile widget and its callbacks |
| [`next-themes-utils.ts`](../url-shortener-ui/src/test/next-themes-utils.ts) | `nextThemesMock`, `setResolvedTheme`, `resetResolvedTheme` | Mock `next-themes` and switch the resolved theme |
| [`animation-utils.ts`](../url-shortener-ui/src/test/animation-utils.ts) | `fireAnimationEnd` | Ending a CSS animation for a React `onAnimationEnd` handler: jsdom has no `AnimationEvent`, so React listens for `webkitAnimationEnd` there and `fireEvent.animationEnd` never reaches it (`BillingPrice`) |
| [`palette-utils.tsx`](../url-shortener-ui/src/test/palette-utils.tsx) | `renderWithPalette`, `storeCustomTheme`, `readStoredSelection`, `resetDocumentTheme` | Palette/custom-theme tests (see [styling-and-theming](styling-and-theming.md)) |
| [`analytics-utils.tsx`](../url-shortener-ui/src/test/analytics-utils.tsx) | `MockHorizontalBarChart`, `createGroupedClick` | Replace the chart component and build grouped-click fixtures |
| [`user-session-utils.ts`](../url-shortener-ui/src/test/user-session-utils.ts) | `createUserSession` | Session list fixtures |
| [`billing-utils.ts`](../url-shortener-ui/src/test/billing-utils.ts) | `createBillingSubscriptionDto`, `allowTestBillingOrigins`, `TEST_BILLING_ORIGINS`, `createFakeBillingTab` | Billing subscription DTO fixture; puts the test origins on the billing allowlist; a fake `window.open` tab with spies on `location.replace` and `close` |
| [`page-toolbar-utils.ts`](../url-shortener-ui/src/test/page-toolbar-utils.ts) | `getOptionsTrigger` | Locate the toolbar options trigger |
| [`time-zone-utils.ts`](../url-shortener-ui/src/test/time-zone-utils.ts) | `FAR_FROM_UTC_TIME_ZONES` | Run date logic under UTC+14 and UTC-7/-8 with `describe.each` + `vi.stubEnv("TZ", timeZone)` (Node applies it immediately; vitest restores it). Every test of code that turns dates into strings or back uses it |
| [`viewport-utils.ts`](../url-shortener-ui/src/test/viewport-utils.ts) | `stubDesktopViewport`, `stubMobileViewport` | Stub `matchMedia` by viewport width (derived from `MOBILE_BREAKPOINT_PX`) |

Shared fixtures should be extended here when a second test file needs them.

## Mock-server tests

The mock server has its own suite; run it with `pnpm --filter=@url-shortener/url-shortener-mock-server test` (script: `node --import tsx --test 'src/**/*.test.ts'`). Architecture and endpoints: [mock-server](mock-server.md).

- Runner and assertions: `node:test` (`describe`, `it`, `before`, `after`, `beforeEach`) and `node:assert/strict`. No Vitest, no Express mocking library.
- Test files sit next to the unit under test: `middleware/*.test.ts`, `routes/*.test.ts` (HTTP-level), `services/*.test.ts` (unit-level).
- [`src/test-utils.ts`](../url-shortener-mock-server/src/test-utils.ts) (mock server) provides:
  - `createTestApp()` builds the same middleware chain and routers as `src/index.ts` (without `/health` and without `listen`); `startTestServer(app?)` listens on `127.0.0.1` with a random port and returns `{ baseUrl, close }`.
  - `requestJson(server, method, path, { authorization, body, headers })` returns `{ status, body }` (parsed JSON or text, `redirect: "manual"`).
  - `createTestUser()` registers a fresh sandbox UUID in `memoryStore` and returns `{ uuid, state, authorization }` with a valid Bearer token; `createTestUserWithoutLinks()` empties its links and tag associations; `createUnregisteredAuthorization()` returns a well-formed token for a UUID that was never registered (expects 401).
- Route tests start one server in `before`, close it in `after`, and create a new test user per test so sandboxes never collide.
- Middleware that depends on time or output has factory forms for testing: `createBillingRateLimit(now)` and `createBillingTrace(isEnabled, writeTrace)`; `BillingService` takes a `now` function in its constructor.
- Because `createTestApp()` duplicates the middleware chain from `src/index.ts`, a middleware or router added to `index.ts` must be added to `test-utils.ts` too.

## Known limitations and existing exceptions

- Observation: `createTestApp()` in the mock server is a copy of the setup in `src/index.ts`, not an import of it, so the two can drift. Existing exception — not a template; do not refactor as a drive-by.
- Observation: UI coverage thresholds are enforced only by `pnpm test:coverage`; `pnpm test:run` does not check them.
- Observation: about 1 in 8 full runs ends with "Vitest caught 1 unhandled error" (`ReferenceError: window is not defined`) from an `input-otp` timer that fires after `src/app/login/page.test.tsx` has torn down its environment. All tests pass, but the run exits with code 1.
