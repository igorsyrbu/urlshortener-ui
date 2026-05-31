# URL Shortener UI Workspace

This project is a Next.js frontend for a modern and minimalistic URL shortener with focus on UX. <br>

This repository contains the open-sourced frontend user interface and a lightweight mock backend server for a
high-performance URL Shortener SaaS.

## Core Philosophy

The foundational philosophy of the project is to keep the application **minimalistic** and distraction-free. Bulky,
cluttered, or confusing elements should be intentionally avoided. Every change and new feature must intuitively enhance
the User Experience (UX), focusing squarely on simplicity, clarity, and ease of use.

---

## Features

- **Link Management** — Create, organize, and manage short links from a clean, intuitive interface
- **Tag Management** — Create, edit, and delete color-coded tags to organize and filter your short links
- **Analytics Dashboard** — Track link performance with detailed charts, date range presets, and breakdowns by location,
  referrer, and device
- **Authentication** — Sign in securely via Magic Links or Google OAuth
- **Session Management** — View and revoke active login sessions from a dedicated screen
- **Minimalistic UI** — Built with Next.js, focused on UX, with full dark mode support

## Tech Stack

- **Frontend** — [Next.js](https://nextjs.org/)
- **Mock Server** — [Express](https://expressjs.com/)
- **Package Management** — pnpm Workspaces

## Prerequisites

- **Node.js** `>= 22.0.0`
- **pnpm** `>= 9.0.0`

## Getting Started

### Installation

This project uses [pnpm workspaces](https://pnpm.io/workspaces). Run the install command once from the root directory
to install dependencies for both the UI and the mock server:

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

When running the project with the mock server, the platform supports robust **Google Sign-In Sandbox Isolation** alongside Magic Links. 

Clicking **"Sign in with Google"** on the login screen launches an isolated sandbox portal served by the mock server:
- **Generate Session** — Instantly generates a new, randomized unique User UUID. You can copy this UUID to your clipboard for future access and start a completely fresh sandbox environment.
- **Resume Session** — Paste a pre-existing User UUID to instantly pick up right where you left off.

#### How State Isolation Works:
To enable comprehensive sandbox testing, the mock server strictly isolates all in-memory database states per UUID:
1. **Isolated Data Snapshots** — When a user logs in with a specific UUID, their short links, tag definitions, profile display name, and active sessions are initialized to a default starter dataset.
2. **Zero Cross-Contamination** — If User A deletes or creates a short link or tag, these changes are immediately reflected in their dashboard and top links analytics, but User B's environment remains completely untouched and unaffected.
3. **Strict Session Policies** — The sandbox UUID is encoded in both the `access_token` and `refresh_token` cookies. If the UUID is missing or invalid in any API request, the server automatically wipes the `refresh_token` cookies and triggers a `401 Unauthorized` response to redirect the browser to the login screen.


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
- **CORS ready** — pre-configured to accept cross-origin requests from `http://localhost:3000`.

#### Environment Variables (Mock Server)

If you need to customize the mock server, you can copy the `.env.example` file to `.env` inside the
`url-shortener-mock-server` directory.

| Variable     | Default | Description                               |
|--------------|---------|-------------------------------------------|
| `PORT`       | `8080`  | Port the mock server listens on           |
| `MOCK_DELAY` | `0`     | Artificial response delay in milliseconds |

#### Simulating Errors

To simulate an 500 Internal Server Error, you can send the `x-mock-error: true` header with any outgoing request:

```bash
curl -H "x-mock-error: true" http://localhost:8080/users/me
# → 500 { "error": "Simulated server error", ... }
```

#### API Reference

**Auth**

| Method | Path                           | Description                  |
|--------|--------------------------------|------------------------------|
| POST   | `/ott/generate`                | Generate magic link          |
| POST   | `/ott/login`                   | Verify OTT token (redirects) |
| GET    | `/auth/code/exchange?code=`    | Exchange auth code for token |
| POST   | `/token/refresh`               | Refresh access token         |
| GET    | `/oauth2/authorization/google` | Start Google OAuth2 flow     |

**Users**

| Method | Path                      | Description                  |
|--------|---------------------------|------------------------------|
| GET    | `/users/me`               | Get current user profile     |
| PUT    | `/users/me/name`          | Update user display name     |
| GET    | `/users/sessions`         | List active sessions         |
| DELETE | `/users/sessions/current` | Terminate current session    |
| DELETE | `/users/sessions/other`   | Terminate all other sessions |
| DELETE | `/users/sessions/:id`     | Terminate a specific session |

**Short Links**

| Method | Path                      | Description                   |
|--------|---------------------------|-------------------------------|
| GET    | `/shortlinks?page=&size=` | Paginated list of links       |
| GET    | `/shortlinks/byIds?ids=`  | Bulk lookup by IDs            |
| POST   | `/shortlinks`             | Create a new short link       |
| PUT    | `/shortlinks`             | Update an existing short link |
| DELETE | `/shortlinks/:id`         | Delete a short link           |
| GET    | `/longurl/title?url=`     | Extract page title from URL   |

**Tags**

| Method | Path                                 | Description                    |
|--------|--------------------------------------|--------------------------------|
| GET    | `/tags?page=&size=&withLinksCount=`  | Paginated list of tags         |
| POST   | `/tags`                              | Create a new tag               |
| PUT    | `/tags`                              | Update an existing tag         |
| DELETE | `/tags/:id`                          | Delete a tag                   |

**Analytics**

| Method | Path                               | Description           |
|--------|------------------------------------|-----------------------|
| GET    | `/analytics?period=`               | Total clicks (number) |
| GET    | `/analytics?period=&groupBy=date`  | Daily time series     |
| GET    | `/analytics?...&groupBy=country`   | Country breakdown     |
| GET    | `/analytics?...&groupBy=continent` | Continent breakdown   |
| GET    | `/analytics?...&groupBy=device`    | Device breakdown      |
| GET    | `/analytics?...&groupBy=os`        | OS breakdown          |
| GET    | `/analytics?...&groupBy=referrer`  | Referrer breakdown    |
| GET    | `/analytics?...&groupBy=top_link`  | Top links by clicks   |

---

## Contributing

Contributions are welcome and appreciated — this is an actively maintained open-source project and your work will
directly shape its direction.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to submit changes.

One thing to keep in mind: **keep it minimalistic**. Every change should enhance UX through simplicity, clarity, and
ease of use — not add noise or complexity.

## Why Open Source?

I've decided to open source the frontend of this SaaS with two main goals:

1. **Real-world experience** — Contribute to an actual product and gain open-source experience you can showcase on your
   resume or CV.
2. **Community driven** — Your contributions directly shape the direction and features of this product.

Whether you're fixing a bug or proposing a new feature, every contribution matters. 🙌

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.
