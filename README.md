# URL Shortener UI Workspace

This project is a Next.js frontend for a modern and minimalistic URL shortener with focus on UX. <br>

This repository contains the open-sourced frontend user interface and a lightweight mock backend server for a
high-performance URL Shortener SaaS.

---

## Features

- **Link Management** — Create, organize, and manage short links from a clean, intuitive interface
- **Tag Management** — Create, edit, and delete color-coded tags to organize and filter your short links
- **Analytics Dashboard** — Track link performance with detailed charts, date range presets, and breakdowns by location,
  referrer, and device
- **Authentication** — Sign in securely via Magic Links or Google OAuth
- **Session Management** — View and revoke active login sessions from a dedicated screen
- **Minimalistic UI** — Built with Next.js, focused on UX, with full dark mode support

---

## Tech Stack

- **Frontend** — [Next.js](https://nextjs.org/)
- **Mock Server** — [Express](https://expressjs.com/)
- **Package Management** — pnpm Workspaces

---

## Getting Started

### Prerequisites

- **Node.js** `>= 24.0.0`
- **pnpm** `>= 9.0.0`

### Installation

This project uses [pnpm workspaces](https://pnpm.io/workspaces). Run the install command once from the root directory to
install dependencies for both the UI and the mock server:

```bash
pnpm install
```

### Running the Applications

To start both the UI and the mock server concurrently, run the following command from the root directory:

```bash
pnpm run dev
```

This will trigger:

- `url-shortener-ui` starting on `http://localhost:3000`
- `url-shortener-mock-server` starting on `http://localhost:8080`

The Next.js frontend is configured to point its API requests to `http://localhost:8080` by default via the
`NEXT_PUBLIC_API_BASE_URL` env var, meaning everything works out of the box with zero extra configuration.

### Authentication (Mock Mode & Sandbox Isolation)

When running the project with the mock server, the platform supports robust **Google Sign-In Sandbox Isolation**
alongside Magic Links.

Clicking **"Sign in with Google"** on the login screen launches an isolated sandbox portal served by the mock server:

- **Generate Session** — Instantly generates a new, randomized unique User UUID. You can copy this UUID to your
  clipboard for future access and start a completely fresh sandbox environment.
- **Resume Session** — Paste a pre-existing User UUID to instantly pick up right where you left off.

##### Magic Link & OTP Login

Both magic-link **tokens** and **OTP codes** are submitted through the same `POST /ott/login` endpoint via a shared
hidden auto-submit form.

To log in with an OTP code:

1. Enter any email (e.g. `test@example.com`) and click **Send magic link**.
2. A 6-digit `InputOTP` field appears. Enter any 6 digits (e.g. `123456`).
3. The code auto-submits to `POST /ott/login` with `loginType=otp`, `email`, and `code`. The mock server accepts every
   request and redirects to `/auth/exchange` with a valid code, creating a fresh sandboxed session.

You can also log in directly with a **magic link token** by navigating to
`/auth/ott?token=<any-token>&email=<your-email>` — the mock server accepts every token.

#### How State Isolation Works:

To enable comprehensive sandbox testing, the mock server strictly isolates all in-memory database states per UUID:

1. **Isolated Data Snapshots** — When a user logs in with a specific UUID, their short links, tag definitions, profile
   display name, and active sessions are initialized to a default starter dataset.
2. **Zero Cross-Contamination** — If User A deletes or creates a short link or tag, these changes are immediately
   reflected in their dashboard and top links analytics, but User B's environment remains completely untouched and
   unaffected.
3. **Strict Session Policies** — The sandbox UUID is encoded in both the `access_token` and `refresh_token` cookies. If
   the UUID is missing or invalid in any API request, the server automatically wipes the `refresh_token` cookies and
   triggers a `401 Unauthorized` response to redirect the browser to the login screen.

### Cleaning Build Cache

To remove the Next.js build cache (`.next/`) and start fresh, run:

```bash
pnpm run clean
```

This helps resolve issues caused by stale cached artifacts or excessive RAM consumption during development.

---

## Project Structure

This repository is divided into two main pnpm workspaces:

### 1. `url-shortener-ui`

The frontend application built using **Next.js**. It provides the full user interface for the URL shortener platform,
including dashboards for managing short links, viewing detailed analytics, and handling user settings and session
management. It consumes the REST API endpoints.

#### Environment Variables

Copy `.env.example` to `.env` in the `url-shortener-ui` directory to customize:

| Variable                         | Example                    | Description                                                   |
|----------------------------------|----------------------------|---------------------------------------------------------------|
| `NEXT_PUBLIC_API_BASE_URL`       | `http://localhost:8080`    | Base URL of the backend API                                   |
| `NEXT_PUBLIC_ENABLE_TURNSTILE`   | `true`                     | Enables or disables Cloudflare Turnstile CAPTCHA verification |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` | Site key used for Cloudflare Turnstile CAPTCHA                |
| `CSP_ENFORCE`                    | `false`                    | Enforce the Content-Security-Policy instead of Report-Only    |

#### API Reference

**Auth**

| Method | Path                           | Query / Body Params                                                                                       | Description                                                |
|--------|--------------------------------|-----------------------------------------------------------------------------------------------------------|------------------------------------------------------------|
| POST   | `/ott/generate`                | Body: `{ email }`                                                                                         | Generate magic link                                        |
| POST   | `/ott/login`                   | Body (token): `loginType=token&token=<uuid>`<br/>Body (OTP): `loginType=otp&email=<email>&code=<6-digit>` | Verify OTT token or OTP code (returns tokens/redirect URL) |
| GET    | `/auth/code/exchange`          | Query: `code` (required)                                                                                  | Exchange authorization code for access/refresh token       |
| POST   | `/token/refresh`               | (Uses `refresh_token` cookie)                                                                             | Refresh access token                                       |
| GET    | `/oauth2/authorization/google` | -                                                                                                         | Start Google OAuth2 flow                                   |

**Users**

| Method | Path                      | Query / Body Params | Description                         |
|--------|---------------------------|---------------------|-------------------------------------|
| GET    | `/users/me`               | -                   | Get current user profile            |
| PUT    | `/users/me/name`          | Body: `{ name }`    | Update user display name            |
| GET    | `/users/sessions`         | -                   | List active login sessions          |
| DELETE | `/users/sessions/current` | -                   | Terminate the current session       |
| DELETE | `/users/sessions/other`   | -                   | Terminate all other active sessions |
| DELETE | `/users/sessions/:id`     | Path variable: `id` | Terminate a specific active session |

**Billing**

All four billing endpoints require the signed-in user's bearer token. Billing state is isolated by sandbox UUID.

| Method | Path                            | Query / Body Params                         | Description |
|--------|---------------------------------|---------------------------------------------|-------------|
| GET    | `/billing/subscription`          | -                                           | Current plan, subscription status, renewal/cancellation date, and pending yearly switch |
| POST   | `/billing/checkout`              | Body: `{ billingPeriod: "MONTHLY" \| "YEARLY" }` | Create a hosted mock checkout URL; payment completion activates Pro |
| POST   | `/billing/portal`                | No body                                     | Create a hosted mock customer portal URL with optional `expiresInSeconds` |
| POST   | `/billing/subscription/upgrade`  | No body                                     | Schedule monthly-to-yearly billing at the current renewal date |

Checkout returns `{ url }`; portal returns `{ url, expiresInSeconds? }`; scheduling returns
`{ status: "scheduled", effectiveDate? }`. Subscription reads return `plan` (`FREE`/`PRO`),
`cancelAtPeriodEnd`, and optional `status`, `currentPeriodEnd`, `pendingBillingPeriod`, and `pendingAppliesAt`.
Portal and checkout URLs contain temporary session tokens, never the user's bearer token. Creating a URL does not
change the subscription; checkout completion and portal actions simulate the provider updates.

The mock returns 400 for an invalid checkout period, 409 for checkout while already Pro, 404 for a portal without
billing history or an upgrade without a subscription, 409 for an upgrade that is already yearly/pending/canceling,
and 422 for an inactive upgrade. The existing `x-mock-error: true` header simulates 500 failures. Subscription reads
allow 60 requests per minute; each billing POST allows 10 requests per minute. Mock quotas use separate fixed windows
per sandbox user and endpoint; the real backend uses IP-based buckets with continuous refill. A 429 exposes
`X-Rate-Limit-Retry-After-Seconds` and `Retry-After` to browser clients.

**Short Links**

| Method | Path                | Query / Body Params                                       | Description                                |
|--------|---------------------|-----------------------------------------------------------|--------------------------------------------|
| GET    | `/shortlinks`       | Query: `page`, `size`, `showArchived` (boolean), `search` | Paginated & filterable list of short links |
| GET    | `/shortlinks/byIds` | Query: `ids` (comma-separated, required)                  | Bulk lookup short links by IDs             |
| POST   | `/shortlinks`       | Body: `{ longUrl, title, tagIds, isActive }`              | Create a new short link                    |
| PUT    | `/shortlinks`       | Body: `{ id, longUrl, title, tagIds, isActive }`          | Update an existing short link              |
| DELETE | `/shortlinks/:id`   | Path variable: `id`                                       | Delete a short link                        |
| GET    | `/longurl/title`    | Query: `url` (required)                                   | Extract page title from target URL         |

**Tags**

| Method | Path        | Query / Body Params                                         | Description                         |
|--------|-------------|-------------------------------------------------------------|-------------------------------------|
| GET    | `/tags`     | Query: `page`, `size`, `withLinksCount` (boolean), `search` | Paginated & filterable list of tags |
| POST   | `/tags`     | Body: `{ name, color }`                                     | Create a new tag                    |
| PUT    | `/tags`     | Body: `{ id, name, color }`                                 | Update an existing tag              |
| DELETE | `/tags/:id` | Path variable: `id`                                         | Delete a tag                        |

**Analytics**

| Method | Path         | Query / Body Params                                   | Description                                      |
|--------|--------------|-------------------------------------------------------|--------------------------------------------------|
| GET    | `/analytics` | Query: `period` (`P7D`/`P30D`/`P90D`), `start`, `end` | Total clicks (number) for a period or date range |
| GET    | `/analytics` | Query: `period`/`start`/`end`, `groupBy=date`         | Daily clicks time series                         |
| GET    | `/analytics` | Query: `period`/`start`/`end`, `groupBy=country`      | Country breakdown                                |
| GET    | `/analytics` | Query: `period`/`start`/`end`, `groupBy=continent`    | Continent breakdown                              |
| GET    | `/analytics` | Query: `period`/`start`/`end`, `groupBy=device`       | Device breakdown                                 |
| GET    | `/analytics` | Query: `period`/`start`/`end`, `groupBy=os`           | Operating system breakdown                       |
| GET    | `/analytics` | Query: `period`/`start`/`end`, `groupBy=referrer`     | Referrer source breakdown                        |
| GET    | `/analytics` | Query: `period`/`start`/`end`, `groupBy=top_link`     | Top links breakdown by clicks                    |

### 2. `url-shortener-mock-server`

A standalone **Express** backend that acts as a mock server. Since the actual backend remains a closed-source private
repository, this mock server mirrors every API endpoint required by the Next.js frontend, providing realistic responses,
in-memory state, and fake data. This makes it easy to work on the UI without the need to connect to a real server or
spin up a database.

#### Features of the Mock Server:

- **Full API coverage** — every route used by the frontend is mocked with realistic fake data.
- **In-memory CRUD** — create, update, and delete operations persist for the lifetime of the server process.
- **Artificial latency** — optionally configure a response delay (via `MOCK_DELAY` env var) to simulate real-world
  network conditions.
- **Error simulation** — you can optionally add the header `x-mock-error: true` to any request to test how the UI
  handles 500 errors.

#### Environment Variables

Copy `.env.example` to `.env` in the `url-shortener-mock-server` directory to customize:

| Variable               | Example                 | Description                                  |
|------------------------|-------------------------|----------------------------------------------|
| `PORT`                 | `8080`                  | Port the mock server listens on              |
| `FRONTEND_URL`         | `http://localhost:3000` | URL the UI is served from                    |
| `MOCK_DELAY`           | `0`                     | Artificial response delay (ms)               |
| `MOCK_COOKIE_SAMESITE` | `lax`                   | `SameSite` for the `refresh_token` cookie    |
| `MOCK_COOKIE_SECURE`   | `false`                 | Marks the `refresh_token` cookie as `Secure` |
| `MOCK_BILLING_SCENARIO` | `free`                 | Initial billing scenario for each sandbox user |
| `MOCK_BILLING_PORTAL_EXPIRY` | `reported`         | Portal expiry payload: `reported`, `omitted`, `invalid`, or `expired` |
| `MOCK_BILLING_TRACE`   | `false`                 | Log billing API method, path, and status for return-refresh debugging |
| `MOCK_PUBLIC_URL`      | `http://localhost:8080` | Optional public mock-server origin for hosted billing URLs |

#### Mock Billing and Portal-Return Reproduction

Run `pnpm dev` from the repository root to start the UI and mock server together. Open
`http://localhost:3000`, sign in through the mock Google flow, and save the generated sandbox UUID. **Resume Session**
with the same UUID reuses its in-memory billing state. A different UUID starts independently; restarting the mock
server clears all billing state and hosted sessions.

The default scenario is `free`. Visit `/settings/billing`, choose a billing cycle, click **Upgrade to Pro**, and click
**Complete checkout** on the hosted mock page. This simulates payment and subscription activation, then redirects
back to billing. No payment details are collected. For an immediate monthly Pro starting point, restart both apps with:

```bash
MOCK_BILLING_SCENARIO=pro-monthly pnpm dev
```

Available initial scenarios are `free`, `pro-monthly`, `pro-yearly`, `pro-pending`, `pro-canceling`, `trialing`,
`past-due`, `canceled`, and `expired`. The last three resolve to Free but retain billing history. The **Manage
subscription** button is shown only while the frontend resolves the account to Pro.

To reset one signed-in sandbox without restarting the server, send the mock-only authenticated endpoint:

```bash
curl -X POST http://localhost:8080/mock/billing/scenario \
  -H 'Authorization: Bearer <access-token-from-an-authenticated-Network-request>' \
  -H 'Content-Type: application/json' \
  --data '{"scenario":"pro-monthly","portalExpiryMode":"reported"}'
```

The response is the new subscription DTO. Reload the app after seeding to establish fresh frontend state. Seeding
invalidates that user's previous hosted links. The endpoint accepts the scenarios above and an optional
`portalExpiryMode`; it uses the bearer token's UUID, never a user ID supplied in the body. An existing portal also
offers **Mock billing scenarios** with **Set scenario and return to billing** for changing its own sandbox.

Click **Manage subscription** to create a fresh portal session and open it in a new tab. The hosted portal offers
**Cancel yearly switch** when a change is pending, **Cancel subscription at renewal**, **Resume subscription** when
canceling, and **End subscription immediately**. Actions update the mock state immediately; return to the original
app tab or use **Close portal and return to app** to trigger the frontend's focus/visibility refresh. The **Return to
billing** link navigates the portal tab to the app and creates fresh frontend state, so use the original tab when
reproducing a stale return refresh.

Hosted checkout and portal sessions normally expire after one hour. Checkout completion consumes its session.
`expiresInSeconds` reports the remaining whole seconds, rounded down and clamped to zero, matching the backend's
current countdown contract. `MOCK_BILLING_PORTAL_EXPIRY=omitted` removes the field; `invalid` returns a nonnumeric
value; both exercise the UI's 10-minute return-flag fallback while the hosted portal remains valid for one hour.
`expired` creates an expired portal session, returns zero seconds, and makes the hosted page respond with 410.
All these modes can also be set
with `portalExpiryMode` on the scenario endpoint. `MOCK_PUBLIC_URL` overrides the origin of generated hosted links
when the mock server is behind a proxy or reachable at a different address.

Use these regression checks to verify portal return refreshes and scheduled-switch cancellation:

1. **Cancellation refresh in dev/Strict Mode.** Start with `pro-monthly`, reload billing, and open the
   browser Network panel before clicking Manage. In the portal, cancel the subscription at renewal and return to the
   original tab. Verify `POST /api/billing/portal` succeeds and a fresh `GET /api/billing/subscription` returns
   `cancelAtPeriodEnd: true`. The original tab must change from **Renews on** to **Cancels on** without a full reload.
   Previously Strict Mode effect cleanup left the mounted ref false, so the successful refresh was discarded.
   Network paths have the `/api` prefix because Next.js proxies them to the mock server's unprefixed endpoints.
2. **Clear a locally scheduled yearly switch after portal cancellation.** Start with `pro-monthly` and fresh frontend
   state. Select **Yearly**, click **Switch to yearly**, and confirm. Open Manage, click **Cancel yearly switch**, and
   return to the original tab. The next subscription response must omit the pending fields, the scheduled note must
   disappear, and **Switch to yearly** must become available again without a reload. Previously the frontend retained
   the local scheduling result after the backend cleared it. To also check production mode, stop `pnpm dev`, start
   `MOCK_BILLING_SCENARIO=pro-monthly pnpm dev:mock` in one terminal, run `pnpm build` in another, then start the UI
   with `pnpm --filter=url-shortener-ui start`; sign in and repeat the same steps.

Use a single app tab for these reproductions. The return flag
`localStorage["urlshortener:billing:portal-return"]` is shared by same-origin tabs and consumed by the first eligible
focus/visibility event. Reading `null` after returning is expected and does not prove the flag was never written.
The decisive evidence is the portal POST followed by the subscription GET and its response versus the visible text.
Set `MOCK_BILLING_TRACE=true` before starting the mock server to also see these API requests in its terminal output;
the trace excludes query strings, credentials, and hosted session URLs.

#### Cross-Domain Deployment

When the UI and mock server are on **different domains**, `SameSite=Lax` (the default) blocks the `refresh_token` cookie
on cross-site POST requests, logging users out on every refresh. Fix it with:

```bash
MOCK_COOKIE_SAMESITE=none
MOCK_COOKIE_SECURE=true
```

`SameSite=None` allows cross-site cookies, but browsers **require** `Secure=true` alongside it — so the mock server must
be served over **HTTPS**. For local development on `localhost`, the defaults work as-is.

#### Simulating Errors

To simulate an 500 Internal Server Error, you can send the `x-mock-error: true` header with any outgoing request:

```bash
curl -H "x-mock-error: true" http://localhost:8080/users/me
# → 500 { "error": "Simulated server error", ... }
```

---

## Why Open Source?

I've decided to open source the frontend of this SaaS with two main goals:

1. **Real-world experience** — Contribute to an actual product and gain open-source experience you can showcase on your
   resume or CV.
2. **Community driven** — Your contributions directly shape the direction and features of this product.

Whether you're fixing a bug or proposing a new feature, every contribution matters. 🙌

---

## Core Philosophy

The foundational philosophy of the project is to keep the application **minimalistic** and distraction-free. Bulky,
cluttered, or confusing elements should be intentionally avoided. Every change and new feature must intuitively enhance
the User Experience (UX), focusing squarely on simplicity, clarity, and ease of use.

---

## Contributing

Contributions are welcome and appreciated — this is an actively maintained open-source project and your work will
directly shape its direction.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to submit changes.

One thing to keep in mind: **keep it minimalistic**. Every change should enhance UX through simplicity, clarity, and
ease of use — not add noise or complexity.

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
