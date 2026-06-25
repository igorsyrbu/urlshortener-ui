# Contributing Guidelines

Thank you for your interest in contributing to this project! Your time and effort are highly valued. To ensure a smooth
process for everyone, please review the following guidelines before starting your work.

## Suggesting a New Feature

When proposing a new feature via an issue or pull request, please make sure you provide sufficient context:

- **Explain the need:** Why is this feature necessary? What specific problem does it solve for the user?
- **Describe what it does:** Provide a clear, high-level overview of the feature's functionality.
- **Ensure relevance:** Make sure the feature aligns with the core purpose of the project.

## Core Philosophy

The main design and development philosophy is to remain **minimalistic**.

- Do not add bulky, cluttered, or confusing UI components.
- Every new feature and UI change should ideally enhance the User Experience (UX), making the application intuitive and
  simple to use.

## Development Checklist

When you are ready to begin work, please follow this checklist to ensure your contribution aligns with the project
standards:

- [ ] **Follow Application Design:** Ensure the feature matches the established theme, styling, and existing design
  systems. If using AI agents, it is highly encouraged to use the `AGENTS.md` file. This file can also be helpful to
  become more familiar with the coding guidelines.
- [ ] **Minimalistic Approach:** Keep the implementation clean and straightforward, avoiding unnecessary complexity.
- [ ] **Manual Testing:** At a minimum, your feature must be tested manually to ensure it works properly across its
  intended use cases (unit tests are great but not strictly required).
- [ ] **Relevance Check:** Make sure the implemented feature actually matches the original scope and remains relevant to
  the project.

## Adding New API Calls on the Frontend

If your feature involves adding new API calls on the frontend, you must carefully navigate these steps:

### 1. Determine Endpoint Security & Scope

Before implementing the client-side API call, ask yourself:

* **Should it be a public call, or a call to access user resources?**
* **Should it be secured so it won't be abused?**

If the endpoint handles user-specific data or requires a level of protection, you **must** ensure it includes an *
*Authorization** request header with a JWT token.

### 2. Update the Mock Server

Any new endpoint added to the frontend **must** also be added and documented in the **mock server** (
`url-shortener-mock-server`). This ensures that frontend development, prototyping, and testing can continue seamlessly.

### 3. Follow REST API Standards

All endpoints must adhere to proper REST API standards. Be declarative and use the correct HTTP methods. Here are
examples of standard CRUD operations:

- **`GET /api/resources`** — Read a list of resources
- **`GET /api/resources/{id}`** — Read a specific resource
- **`POST /api/resources`** — Create a new resource
- **`PUT /api/resources/{id}`** — Update an existing resource
- **`DELETE /api/resources/{id}`** — Delete a resource

## Submitting a Pull Request

When your change is ready, open a pull request using the template in `.github/pull_request_template.md`.

### One Feature or Fix per PR

Each pull request must address **a single feature or a single fix**. Bundling unrelated changes makes review slower and
increases the risk of regressions.

Examples of a single, focused PR:

- Add a delete confirmation dialog to the tag management page
- Fix the analytics date-range preset not selecting the last 7 days
- Update the mock server to support the new `/tags` endpoint

Examples of what to split into separate PRs:

- A PR that both redesigns the login page and refactors the analytics API client
- A PR that fixes a bug in link creation and also adds dark-mode toggle animations

---

Your effort in helping improve the project is greatly appreciated. Happy coding!
