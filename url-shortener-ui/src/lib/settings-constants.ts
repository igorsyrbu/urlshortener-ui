export const SETTINGS_ROUTES = {
    GENERAL: "/settings/general",
    BILLING: "/settings/billing",
};

export const SETTINGS_LABELS = {GENERAL: "General", BILLING: "Billing", NAVIGATION: "Settings sections"};

export const SETTINGS_SECTIONS = [
    {href: SETTINGS_ROUTES.GENERAL, label: SETTINGS_LABELS.GENERAL},
    {href: SETTINGS_ROUTES.BILLING, label: SETTINGS_LABELS.BILLING},
];
