import {
  BILLING_SCENARIOS, PORTAL_EXPIRY_MODES, type BillingScenario, type PortalExpiryMode,
} from "./services/billing-constants";

export type CookieSameSite = "lax" | "strict" | "none";

const COOKIE_SAME_SITE_VALUES: readonly CookieSameSite[] = ["lax", "strict", "none"];
const BOOLEAN_VALUES = ["true", "false"] as const;

export interface BillingDefaults {
  scenario: BillingScenario;
  portalExpiry: PortalExpiryMode;
}

export interface MockConfig {
  port: number;
  frontendUrl: string;
  /** Origin used in hosted billing session links; without it they use the request's own origin. */
  publicUrl?: string;
  delayMs: number;
  randomAnalytics: boolean;
  cookie: { sameSite: CookieSameSite; secure: boolean };
  magicLinkCooldown: { enabled: boolean; seconds: number };
  billing: BillingDefaults & { trace: boolean };
}

export const DEFAULT_MOCK_CONFIG: MockConfig = {
  port: 8080,
  frontendUrl: "http://localhost:3000",
  delayMs: 0,
  randomAnalytics: false,
  cookie: { sameSite: "lax", secure: false },
  magicLinkCooldown: { enabled: true, seconds: 60 },
  billing: { scenario: "free", portalExpiry: "reported", trace: false },
};

type Warn = (message: string) => void;

function isUnset(raw: string | undefined): raw is undefined | "" {
  return raw === undefined || raw.trim() === "";
}

function readEnum<T extends string>(name: string, raw: string | undefined, allowed: readonly T[], fallback: T, warn: Warn): T {
  if (isUnset(raw)) return fallback;
  const match = allowed.find((value) => value === raw.trim());
  if (match) return match;
  warn(`${name}="${raw}" is not one of ${allowed.join(", ")}; using "${fallback}".`);
  return fallback;
}

function readBoolean(name: string, raw: string | undefined, fallback: boolean, warn: Warn): boolean {
  const fallbackValue = fallback ? "true" : "false";
  return readEnum(name, raw, BOOLEAN_VALUES, fallbackValue, warn) === "true";
}

function readNonNegativeInteger(name: string, raw: string | undefined, fallback: number, warn: Warn): number {
  if (isUnset(raw)) return fallback;
  const value = Number(raw.trim());
  if (Number.isInteger(value) && value >= 0) return value;
  warn(`${name}="${raw}" is not a whole number of 0 or more; using ${fallback}.`);
  return fallback;
}

function isHttpUrl(value: string): boolean {
  const protocol = URL.parse(value)?.protocol;
  return protocol === "http:" || protocol === "https:";
}

function readUrl(name: string, raw: string | undefined, warn: Warn): string | undefined {
  if (isUnset(raw)) return undefined;
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (isHttpUrl(trimmed)) return trimmed;
  warn(`${name}="${raw}" is not an http(s) URL; ignoring it.`);
  return undefined;
}

function warnToConsole(message: string): void {
  console.warn(`[mock config] ${message}`);
}

/** Every environment variable the mock reads, parsed and checked once; an invalid value logs a warning and falls back. */
export function readMockConfig(env: NodeJS.ProcessEnv = process.env, warn: Warn = warnToConsole): MockConfig {
  const defaults = DEFAULT_MOCK_CONFIG;
  return {
    port: readNonNegativeInteger("PORT", env.PORT, defaults.port, warn),
    frontendUrl: readUrl("FRONTEND_URL", env.FRONTEND_URL, warn) ?? defaults.frontendUrl,
    publicUrl: readUrl("MOCK_PUBLIC_URL", env.MOCK_PUBLIC_URL, warn),
    delayMs: readNonNegativeInteger("MOCK_DELAY", env.MOCK_DELAY, defaults.delayMs, warn),
    randomAnalytics: readBoolean("RANDOM_ANALYTICS_DATA", env.RANDOM_ANALYTICS_DATA, defaults.randomAnalytics, warn),
    cookie: {
      sameSite: readEnum("MOCK_COOKIE_SAMESITE", env.MOCK_COOKIE_SAMESITE, COOKIE_SAME_SITE_VALUES, defaults.cookie.sameSite, warn),
      secure: readBoolean("MOCK_COOKIE_SECURE", env.MOCK_COOKIE_SECURE, defaults.cookie.secure, warn),
    },
    magicLinkCooldown: {
      enabled: readBoolean("MOCK_COOLDOWN_ENABLED", env.MOCK_COOLDOWN_ENABLED, defaults.magicLinkCooldown.enabled, warn),
      seconds: readNonNegativeInteger("MOCK_COOLDOWN_SECONDS", env.MOCK_COOLDOWN_SECONDS, defaults.magicLinkCooldown.seconds, warn),
    },
    billing: {
      scenario: readEnum("MOCK_BILLING_SCENARIO", env.MOCK_BILLING_SCENARIO, BILLING_SCENARIOS, defaults.billing.scenario, warn),
      portalExpiry: readEnum("MOCK_BILLING_PORTAL_EXPIRY", env.MOCK_BILLING_PORTAL_EXPIRY, PORTAL_EXPIRY_MODES, defaults.billing.portalExpiry, warn),
      trace: readBoolean("MOCK_BILLING_TRACE", env.MOCK_BILLING_TRACE, defaults.billing.trace, warn),
    },
  };
}
