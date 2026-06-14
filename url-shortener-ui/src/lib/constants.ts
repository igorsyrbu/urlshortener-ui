// ---------------------------------------------------------------------------
// Route paths
// ---------------------------------------------------------------------------

export const ROUTES = {
    LOGIN: "/login",
    LINKS: "/links",
    DASHBOARD: "/dashboard",
    ANALYTICS: "/analytics",
    SETTINGS: "/settings",
} as const;

// ---------------------------------------------------------------------------
// API endpoints
// ---------------------------------------------------------------------------

export const API_ENDPOINTS = {
    SHORTLINKS: "/shortlinks",
    SHORTLINKS_BY_IDS: "/shortlinks/byIds",
    TAGS: "/tags",
    ANALYTICS: "/analytics",
    LONG_URL_TITLE: "/longurl/title",
    USERS_ME: "/users/me",
    USERS_ME_NAME: "/users/me/name",
    USERS_SESSIONS: "/users/sessions",
    USERS_SESSIONS_CURRENT: "/users/sessions/current",
    USERS_SESSIONS_OTHER: "/users/sessions/other",
    TOKEN_REFRESH: "/token/refresh",
    OTT_GENERATE: "/ott/generate",
    OTT_LOGIN: "/ott/login",
    AUTH_CODE_EXCHANGE: "/auth/code/exchange",
    OAUTH2_GOOGLE: "/oauth2/authorization/google",
} as const;

// ---------------------------------------------------------------------------
// UI timing constants (milliseconds)
// ---------------------------------------------------------------------------

export const COPY_FEEDBACK_DURATION_MS = 2000;
export const GLOW_FADE_DELAY_MS = 1000;
export const AUTH_REDIRECT_DELAY_MS = 1000;

// ---------------------------------------------------------------------------
// Layout breakpoints (pixels) — align with Tailwind `lg` (1024px)
// ---------------------------------------------------------------------------

export const LARGE_SCREEN_MIN_WIDTH_PX = 1024;

/** Below this width the mobile layout (drawer/bottom-sheet) is shown. Aligns with Tailwind `sm` (640px). */
export const MOBILE_BREAKPOINT_PX = 640;

/** Shared by dashboard header + scroll region so controls align with page cards. */
export const DASHBOARD_CONTENT_SHELL_CLASS =
    "mx-auto w-full max-w-7xl px-4 md:px-8 lg:px-10";

// ---------------------------------------------------------------------------
// Scroll behaviour thresholds (pixels)
// ---------------------------------------------------------------------------

export const SCROLL_TOP_THRESHOLD = 10;
export const SCROLL_DELTA_THRESHOLD = 8;

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

export const CONFETTI_PARTICLE_COUNT = 30;
export const CONFETTI_SPREAD = 50;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const DEFAULT_PERIOD_DAYS = 30;

export const ALLOWED_YEARS = [2026] as const;

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

/** Shared class for shortcut-keybd indicators inside dropdown menus. */
export const SHORTCUT_KEY_CLASS = "ml-auto hidden sm:inline-flex min-w-5 max-w-5";

/** Shared class for the three-dots "more actions" trigger button on link/tag cards. */
export const MORE_ACTIONS_BUTTON_CLASS =
    "p-1 px-1.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none -mr-1";

// ---------------------------------------------------------------------------
// Default / fallback labels
// ---------------------------------------------------------------------------

export const DEFAULT_LINK_TITLE = "Untitled Link";
export const DEFAULT_JWT_TTL_DISPLAY = "1 hour";

// ---------------------------------------------------------------------------
// Chart colors — mirror the CSS custom properties so JS-only charts
// (e.g. Recharts `fill` prop) can reference a single source of truth.
// ---------------------------------------------------------------------------

export const CHART_COLORS = {
    LOCATIONS: "#34d399",
    DEVICES: "#facc15",
    OS: "#22d3ee",
    REFERRERS: "#f472b6",
    TOP_LINKS: "#818cf8",
} as const;

// ---------------------------------------------------------------------------
// Favicon service
// ---------------------------------------------------------------------------

export const FAVICON_SERVICE_URL = "https://www.google.com/s2/favicons";
export const FAVICON_SIZE = 64;

// ---------------------------------------------------------------------------
// Country flag service
// ---------------------------------------------------------------------------

export const FLAG_SERVICE_URL = "https://hatscripts.github.io/circle-flags/flags";
