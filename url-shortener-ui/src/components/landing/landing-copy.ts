/** Placeholder copy for the development landing page; the production landing page is a separate project. */
export const LANDING_COPY = {
    BADGE: "Open source · Local development",
    HEADLINE: "Short links, kept simple",
    TAGLINE: "Shorten, organise and track your links in one calm place. This page is a placeholder for local development.",
    SIGN_IN: "Sign in",
    OPEN_APP: "Open the app",
    FEATURES_LABEL: "What the app does",
    ENTRY_TITLE: "Jump in",
    ENTRY_DESCRIPTION: "Every public entry point of the app, in one place.",
    INSPECT_TITLE: "Inspect a short link",
    INSPECT_DESCRIPTION: "See where a short link leads before you open it.",
    REPORT_TITLE: "Report a link",
    REPORT_DESCRIPTION: "Tell us about a short link that is harmful or abusive.",
    REPORT_ACTION: "Report a link",
    ACCOUNT_TITLE: "Your links",
    ACCOUNT_DESCRIPTION: "Create, tag and track your short links.",
    FOOTER_NOTE: "Development landing page.",
} as const;

/** The decorative "long link in, short link out" card in the hero; example values only. */
export const LANDING_PREVIEW = {
    LONG_LABEL: "Long link",
    LONG_URL: "https://example.com/blog/2026/how-we-build-things?utm_source=newsletter&utm_campaign=launch",
    SHORT_LABEL: "Short link",
    SHORT_URL: "sho.rt/launch",
    CLEANED: "Trackers removed",
    TAGS: ["Marketing", "Launch"],
} as const;

/** The decorative inspection result beside the inspect form; example values only. */
export const LANDING_INSPECT_EXAMPLE = {
    DOMAIN: "example.com",
    TITLE: "An example article",
    DESCRIPTION: "The page title, description and preview image appear here before anyone opens the link.",
    STATUS: "Seen before you click",
} as const;

export const LANDING_FEATURES = [
    {key: "tags", title: "Tags", description: "Group links and find them fast."},
    {key: "analytics", title: "Analytics", description: "Clicks by day, country and device."},
    {key: "clean", title: "Clean URLs", description: "Strip trackers before you share."},
    {key: "transfer", title: "Import & export", description: "Move links in and out as CSV."},
] as const;

export type LandingFeatureKey = (typeof LANDING_FEATURES)[number]["key"];

export const INSPECT_FORM_COPY = {
    LABEL: "Short link or key",
    PLACEHOLDER: "https://sho.rt/abc123",
    SUBMIT: "Inspect",
    EMPTY: "Enter a short link or its key.",
    HINT: "A full short link or just its key both work.",
} as const;
