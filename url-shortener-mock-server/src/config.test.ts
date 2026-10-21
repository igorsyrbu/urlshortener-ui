import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MOCK_CONFIG, readMockConfig } from "./config";

function readWith(env: NodeJS.ProcessEnv): { config: ReturnType<typeof readMockConfig>; warnings: string[] } {
  const warnings: string[] = [];
  const config = readMockConfig(env, (message) => { warnings.push(message); });
  return { config, warnings };
}

describe("readMockConfig", () => {
  it("uses the defaults without any variable and warns about nothing", () => {
    const { config, warnings } = readWith({});
    assert.deepEqual(config, { ...DEFAULT_MOCK_CONFIG, publicUrl: undefined });
    assert.deepEqual(warnings, []);
  });

  it("reads every valid value", () => {
    const { config, warnings } = readWith({
      PORT: "9090",
      FRONTEND_URL: "http://localhost:3005/",
      MOCK_PUBLIC_URL: "https://mock.example.test//",
      MOCK_DELAY: "800",
      RANDOM_ANALYTICS_DATA: "true",
      MOCK_COOKIE_SAMESITE: "none",
      MOCK_COOKIE_SECURE: "true",
      MOCK_COOLDOWN_ENABLED: "false",
      MOCK_COOLDOWN_SECONDS: "5",
      MOCK_BILLING_SCENARIO: "past-due",
      MOCK_BILLING_PORTAL_EXPIRY: "omitted",
      MOCK_BILLING_TRACE: "true",
    });
    assert.deepEqual(config, {
      port: 9090,
      frontendUrl: "http://localhost:3005",
      publicUrl: "https://mock.example.test",
      delayMs: 800,
      randomAnalytics: true,
      cookie: { sameSite: "none", secure: true },
      magicLinkCooldown: { enabled: false, seconds: 5 },
      billing: { scenario: "past-due", portalExpiry: "omitted", trace: true },
    });
    assert.deepEqual(warnings, []);
  });

  it("treats empty and blank values as unset", () => {
    const { config, warnings } = readWith({ MOCK_BILLING_SCENARIO: "", MOCK_DELAY: "  ", FRONTEND_URL: "" });
    assert.equal(config.billing.scenario, DEFAULT_MOCK_CONFIG.billing.scenario);
    assert.equal(config.delayMs, DEFAULT_MOCK_CONFIG.delayMs);
    assert.equal(config.frontendUrl, DEFAULT_MOCK_CONFIG.frontendUrl);
    assert.deepEqual(warnings, []);
  });

  const invalidValues: Array<[string, string, (config: ReturnType<typeof readMockConfig>) => unknown, unknown]> = [
    ["MOCK_BILLING_SCENARIO", "pro-montly", (config) => config.billing.scenario, "free"],
    ["MOCK_BILLING_PORTAL_EXPIRY", "later", (config) => config.billing.portalExpiry, "reported"],
    ["MOCK_COOKIE_SAMESITE", "relaxed", (config) => config.cookie.sameSite, "lax"],
    ["MOCK_COOLDOWN_ENABLED", "no", (config) => config.magicLinkCooldown.enabled, true],
    ["MOCK_DELAY", "fast", (config) => config.delayMs, 0],
    ["MOCK_DELAY", "-100", (config) => config.delayMs, 0],
    ["PORT", "80a", (config) => config.port, 8080],
    ["FRONTEND_URL", "localhost:3000", (config) => config.frontendUrl, "http://localhost:3000"],
  ];
  for (const [name, value, read, fallback] of invalidValues) {
    it(`warns about ${name}="${value}" and falls back`, () => {
      const { config, warnings } = readWith({ [name]: value });
      assert.equal(read(config), fallback);
      assert.equal(warnings.length, 1);
      assert.match(warnings[0], new RegExp(`^${name}="${value}"`));
    });
  }
});
