import {isPathWithin} from "@/lib/route-match";

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

/**
 * The section a settings path belongs to: its own route or anything under it. `/settings` and `/settings/` (seen for
 * a moment during the redirect) count as the default section, so exactly one tab is always current.
 */
export function getActiveSettingsSectionHref(pathname: string): string {
    return SETTINGS_SECTIONS.find((section) => isPathWithin(pathname, section.href))?.href ?? SETTINGS_ROUTES.DEFAULT;
}

export const SETTINGS_PAGE_COPY = {
    DESCRIPTION: "Manage your account, appearance and subscription.",
};

/** Section headings on the settings tabs; skeletons render the same text so nothing moves when content arrives. */
export const SETTINGS_SECTION_COPY = {
    PROFILE: {title: "Profile", description: "Update your personal information."},
    APPEARANCE: {title: "Appearance", description: "Customize how the application looks on your device."},
    PREFERENCES: {title: "Preferences", description: "Manage how tracking parameters are handled and which keyboard shortcuts are on."},
    SESSIONS: {title: "Sessions", description: "Devices where you are signed in to your account."},
    DANGER_ZONE: {title: "Danger zone", description: "Irreversible actions for your account."},
    CURRENT_PLAN: {title: "Current plan", description: "Your subscription status and renewal details."},
} as const;

export const THEME_COPY_FAILED_MESSAGE = "Failed to copy theme";

export const PROFILE_FIELD_LABELS = {EMAIL: "Email", NAME: "Name"} as const;
