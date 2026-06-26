# AGENTS.md — Frontend Development Guidelines

This file defines the rules and expectations for AI agents contributing to this Next.js frontend project. All generated
or modified code must comply with these guidelines without exception.

---

## Scope

These rules apply **exclusively to the frontend** — the Next.js application. There is no Next.js backend in this
project. Do not generate API routes, server actions that act as a backend layer, or any server-side business logic
beyond what is strictly needed for rendering.

---

## Project Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Follow whatever CSS solution is already in use in the project (Tailwind, CSS Modules, styled-components,
  etc.)

---

## 1. Follow Existing Theme & Styling

- **Never introduce new design tokens.** Colors, spacing, font sizes, border radii, shadows, and breakpoints must come
  from the existing theme — whether that is a Tailwind config, a CSS variables file, a design system, or a theme
  provider.
- **Never hardcode visual values** (`color: #3b82f6`, `padding: 12px`, etc.). Always reference existing tokens or
  utility classes.
- **Match the component style already in the codebase.** If components use Tailwind utility classes, use Tailwind. If
  they use CSS Modules, use CSS Modules. Do not mix styling approaches.
- **Reuse existing UI components** before creating new ones. Check `components/` (or the project's equivalent) for
  buttons, inputs, modals, cards, etc., before building from scratch.
- **Respect dark mode / theming** if it is already set up. New components must support the same theme variants as
  existing ones.

---

## 2. Next.js Best Practices (Vercel / App Router)

### Rendering Strategy

- Default to **Server Components**. Only add `"use client"` when the component genuinely requires browser APIs, event
  listeners, or React state/effects.
- Keep `"use client"` boundaries as **small and deep** in the tree as possible — push interactivity to leaf components.
- Use **`loading.tsx`** and **`error.tsx`** files at appropriate route segments to handle loading and error states
  declaratively.
- Use **`Suspense`** boundaries around async components for granular loading states.

### Data Fetching

- Fetch data in **Server Components** using `async/await` directly — do not use `useEffect` + `fetch` for initial data
  loading.
- Use Next.js **`fetch` with caching options** (`cache: 'force-cache'`, `next: { revalidate: N }`) intentionally and
  explicitly.
- Avoid fetching the same data in multiple places; lift fetches to the highest relevant Server Component and pass data
  down as props.

### Routing & Navigation

- Use the **App Router** (`app/` directory) exclusively. Do not use the Pages Router.
- Use the `<Link>` component from `next/link` for all internal navigation — never raw `<a>` tags for internal routes.
- Use **Route Groups** `(group)/` to organise related routes without affecting the URL structure.
- Use **Dynamic Segments** (`[slug]`, `[id]`) and **`generateStaticParams`** for statically pre-rendered dynamic routes
  where applicable.

### Performance

- Use **`next/image`** for all images. Always provide `width`, `height`, and meaningful `alt` text.
- Use **`next/font`** to load fonts — never link to external font CDNs in markup.
- Lazy-load heavy client components with `dynamic(() => import(...), { ssr: false })` where appropriate.
- Avoid unnecessary re-renders: stabilise callbacks with `useCallback` and memoize expensive derived values with
  `useMemo` when there is a measurable reason to do so — not by default.

### File & Folder Structure

- Co-locate component-specific files (styles, tests, sub-components) alongside the component.
- Shared, reusable components live in `components/`. Page-specific components live inside their route folder.
- Utility functions live in `lib/` or `utils/`. Constants live in `constants/` or a dedicated file.
- Keep `app/` clean — only route segments, layouts, pages, loading, and error files belong there.

---

## 3. Clean Code Principles

### Function Size & Responsibility

- **Functions must do one thing.** If a function is doing multiple distinct things, split it.
- **Keep functions short** — aim for under 30 lines. If a function exceeds ~40 lines, it is a strong signal it needs to
  be broken down.
- **No deeply nested logic.** Use early returns (guard clauses) to flatten conditionals instead of nesting `if/else`
  blocks.

```ts
// ❌ Avoid
function processUser(user: User) {
    if (user) {
        if (user.isActive) {
            if (user.role === 'admin') {
                // ... 30 more lines
            }
        }
    }
}

// ✅ Prefer
function processUser(user: User) {
    if (!user || !user.isActive){
        return;
    }
    if (user.role !== 'admin') {
       return;
    }
    processAdminUser(user);
}
```

### Naming

- **Names must be intention-revealing.** A reader should understand what a variable, function, or component does without
  needing a comment.
- Boolean variables and props should read as questions: `isLoading`, `hasError`, `canSubmit`.
- Event handlers must be prefixed with `handle`: `handleSubmit`, `handleInputChange`.
- Avoid abbreviations and single-letter names outside of short loop counters or well-known conventions (`e` for event is
  acceptable, `x` for a user object is not).

### Components

- **One component per file.** Do not define multiple exported components in the same file.
- **Keep JSX readable.** If a JSX block grows beyond ~50 lines, extract logical sub-sections into named sub-components
  or helper render functions.
- **Props interfaces must be explicit.** Always define a typed `Props` interface — never use inline `{ prop: string }`
  typing on function arguments for components.

```ts
// ❌ Avoid
export function Card({title, count}: { title: string; count: number }) {
}

// ✅ Prefer
interface CardProps {
    title: string;
    count: number;
}

export function Card({title, count}: CardProps) {
}
```

### Comments

- **Do not comment what the code does — comment why** if the reasoning is not obvious.
- Remove commented-out code. Use version control for history.
- Avoid `// TODO` comments unless accompanied by issue reference.

### No Magic Values

- Never use unexplained literals in logic (`status === 3`, `timeout(5000)`). Extract them into named constants.

```ts
// ❌ Avoid
if (response.status === 429) { ...
}

// ✅ Prefer
const HTTP_TOO_MANY_REQUESTS = 429;
if (response.status === HTTP_TOO_MANY_REQUESTS) { ...
}
```

### DRY — Don't Repeat Yourself

- If the same logic or JSX pattern appears more than twice, extract it into a shared utility or component.
- Duplication in styling (repeated class name strings) should be extracted into a shared constant or a component
  variant.

---

## 4. TypeScript

- **`any` is forbidden.** Use `unknown` and narrow the type, or define a proper interface.
- All function parameters and return types must be explicitly typed unless the return type is trivially inferred (e.g.,
  a simple arrow function returning a primitive).
- Prefer `interface` for object shapes and `type` for unions, intersections, and aliases.
- Avoid type assertions (`as SomeType`) unless genuinely unavoidable, and add a comment explaining why.

---

## 5. Logging

- **Never use `console.log`, `console.error`, `console.warn`, or `console.info` directly.**
- Import the shared logger from `@/lib/logger`:
  ```ts
  import {logger} from "@/lib/logger";
  ```
- Use its typed methods: `logger.error(message, error?, context?)`, `logger.warn(message, context?)`, `logger.info(message, context?)`.
- The logger prints to the dev console in development and will route to an error monitoring service in production.

---

## 6. What Not to Do

| Do not                                                | Reason                                                      |
|-------------------------------------------------------|-------------------------------------------------------------|
| Add `"use client"` to every component                 | Defeats the purpose of the App Router and SSR benefits      |
| Fetch data inside `useEffect` for initial loads       | Server Components handle this more efficiently              |
| Create new colour or spacing values                   | Breaks design consistency                                   |
| Write functions longer than ~40 lines                 | Violates single responsibility; hard to test and understand |
| Use `any` in TypeScript                               | Undermines type safety                                      |
| Add a new UI component without checking if one exists | Leads to duplication and inconsistency                      |
| Use `<a>` for internal links                          | Bypasses Next.js client-side navigation                     |
| Hardcode strings that appear more than once           | Should be a constant or come from a translation/config file |
| Use `console.log` / `console.error` for logging       | Use the `logger` from `@/lib/logger` instead — it works in dev and will send to monitoring in production |
