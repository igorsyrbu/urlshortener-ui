const SETTINGS_GENERAL_ROUTE = "/settings/general";

export const SETTINGS_ROUTES = {
    GENERAL: SETTINGS_GENERAL_ROUTE,
    BILLING: "/settings/billing",
    /** Where links to "Settings" go directly; `/settings` itself only redirects here. */
    DEFAULT: SETTINGS_GENERAL_ROUTE,
} as const;

export const SETTINGS_LABELS = {GENERAL: "General", BILLING: "Billing", NAVIGATION: "Settings sections"};

export const SETTINGS_SECTIONS = [
    {href: SETTINGS_ROUTES.GENERAL, label: SETTINGS_LABELS.GENERAL},
    {href: SETTINGS_ROUTES.BILLING, label: SETTINGS_LABELS.BILLING},
];

export const THEME_COPY_FAILED_MESSAGE = "Failed to copy theme";
