// ---------------------------------------------------------------------------
// Route paths
// ---------------------------------------------------------------------------

export const ROUTES = {
    LOGIN: "/login",
    LINKS: "/links",
    DASHBOARD: "/dashboard",
    INSPECT: "/inspect",
    ANALYTICS: "/analytics",
    SETTINGS: "/settings",
    REPORT_ABUSE: "/report-abuse",
} as const;

// ---------------------------------------------------------------------------
// API endpoints
// ---------------------------------------------------------------------------

export const API_ENDPOINTS = {
    SHORTLINKS: "/shortlinks",
    SHORTLINKS_RANDOM: "/shortlinks/random",
    SHORTLINKS_EXISTS: (key: string) => `/shortlinks/${key}/exists`,
    SHORTLINKS_BY_IDS: "/shortlinks/byIds",
    SHORTLINKS_PREVIEW: (key: string) => `/public/preview/${key}`,
    TAGS: "/tags",
    ANALYTICS: "/analytics",
    LONG_URL_TITLE: "/longurl/title",
    URL_CLEANER: "/urlcleaner",
    USERS_ME: "/users/me",
    USERS_ME_NAME: "/users/me/name",
    USERS_SESSIONS: "/users/sessions",
    USERS_SESSIONS_CURRENT: "/users/sessions/current",
    USERS_SESSIONS_OTHER: "/users/sessions/other",
    USERS_PREFERENCES: "/users/preferences",
    TOKEN_REFRESH: "/token/refresh",
    OTT_GENERATE: "/ott/generate",
    OTT_LOGIN: "/ott/login",
    AUTH_CODE_EXCHANGE: "/auth/code/exchange",
    OAUTH2_GOOGLE: "/oauth2/authorization/google",
    ABUSE_REPORT: "/public/abuse/report",
} as const;

// ---------------------------------------------------------------------------
// UI timing constants (milliseconds)
// ---------------------------------------------------------------------------

export const COPY_FEEDBACK_DURATION_MS = 2000;
export const GLOW_FADE_DELAY_MS = 1000;
export const AUTH_REDIRECT_DELAY_MS = 1000;
export const KEY_AVAILABILITY_CHECK_DEBOUNCE_MS = 600;
export const URL_CLEANER_DEBOUNCE_MS = 500;
export const URL_CLEANER_SUCCESS_DURATION_MS = 3000;

export const URL_CLEANER_TOOLTIP = "Removes tracking parameters like UTMs, click IDs, affiliate tags, and referral tags. Double-check if you rely on any of these";

// ---------------------------------------------------------------------------
// Tracker-detection preferences
// ---------------------------------------------------------------------------

export const TRACKER_MODE = {
    DISABLED: "disabled",
    SUGGEST: "suggest",
    AUTO_CLEAN: "auto-clean",
} as const;

export type TrackerModeConstant = (typeof TRACKER_MODE)[keyof typeof TRACKER_MODE];

export const TRACKER_MODE_LABELS: Record<TrackerModeConstant, string> = {
    [TRACKER_MODE.DISABLED]: "Disable",
    [TRACKER_MODE.SUGGEST]: "Suggest",
    [TRACKER_MODE.AUTO_CLEAN]: "Auto-clean",
};

export const TRACKER_MODE_DESCRIPTIONS: Record<TrackerModeConstant, string> = {
    [TRACKER_MODE.DISABLED]: "Never check for trackers.",
    [TRACKER_MODE.SUGGEST]: "Detect trackers and show a suggestion to clean them.",
    [TRACKER_MODE.AUTO_CLEAN]: "Automatically remove trackers as you type.",
};

export const MAGIC_LINK_COOLDOWN_INTERVAL_MS = 1000;
export const MAGIC_LINK_COOLDOWN_STORAGE_KEY = "magicLinkCooldownByEmail";
export const SHOW_ARCHIVED_STORAGE_KEY = "showArchived";
export const THEME_PALETTE_STORAGE_KEY = "themePalette";

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
// Drawer / Bottom sheet — safe area
// ---------------------------------------------------------------------------

/** Default bottom padding for bottom sheets — includes iPhone home-indicator safe area. */
export const DRAWER_CONTENT_SAFE_AREA_BOTTOM_CLASS = "pb-[calc(1.5rem+env(safe-area-inset-bottom,0))]";

/** Larger bottom padding variant for drawers with extra chrome (e.g. mobile menu). */
export const DRAWER_CONTENT_SAFE_AREA_BOTTOM_MOBILE_MENU_CLASS =
    "pb-[calc(2.25rem+env(safe-area-inset-bottom,0))]";

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
export const SHORT_KEY_TAKEN_MESSAGE = "This short link is already taken.";

// ---------------------------------------------------------------------------
// Short link domain (mock-only, shown statically inside the create/edit forms)
// ---------------------------------------------------------------------------

export const MOCKED_SHORT_DOMAIN = "sho.rt";

// ---------------------------------------------------------------------------
// Chart colors — mirror the CSS custom properties so JS-only charts
// (e.g. Recharts `fill` prop) can reference a single source of truth.
// Distinct color choices are intentional for high-contrast visual categorization.
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

// ---------------------------------------------------------------------------
// Abuse report
// ---------------------------------------------------------------------------

export const ABUSE_REASONS = [
    "SPAM_OR_MISLEADING",
    "PHISHING_OR_MALWARE",
    "HARASSMENT_OR_THREATS",
    "ILLEGAL_CONTENT",
    "COPYRIGHT_OR_TRADEMARK",
    "IMPERSONATION",
    "OTHER",
] as const;

export type AbuseReason = (typeof ABUSE_REASONS)[number];

export const ABUSE_REASON_LABELS: Record<AbuseReason, string> = {
    SPAM_OR_MISLEADING: "Spam or misleading",
    PHISHING_OR_MALWARE: "Phishing or malware",
    HARASSMENT_OR_THREATS: "Harassment or threats",
    ILLEGAL_CONTENT: "Illegal content",
    COPYRIGHT_OR_TRADEMARK: "Copyright or trademark infringement",
    IMPERSONATION: "Impersonation",
    OTHER: "Other",
};

export const ABUSE_DESCRIPTION_MAX_LENGTH = 2000;
