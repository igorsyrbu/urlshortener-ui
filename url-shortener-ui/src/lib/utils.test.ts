import {describe, expect, it} from "vitest";
import {cn, generateTitleFromHostname, getJwtTTL, isModalOpen} from "@/lib/utils";

const ISSUED_AT = 1_700_000_000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

function minutes(count: number): number {
    return count * SECONDS_PER_MINUTE;
}

function buildJwt(payload: Record<string, unknown>): string {
    return `header.${btoa(JSON.stringify(payload))}.signature`;
}

function buildBase64UrlJwt(payload: Record<string, unknown>): string {
    const base64Url = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `header.${base64Url}.signature`;
}

function buildJwtLasting(durationMinutes: number): string {
    return buildJwt({iat: ISSUED_AT, exp: ISSUED_AT + minutes(durationMinutes)});
}

describe("cn", () => {
    it("joins class names", () => {
        expect(cn("text-red-500", "bg-blue-500")).toBe("text-red-500 bg-blue-500");
    });

    it("lets the last conflicting Tailwind class win", () => {
        expect(cn("p-4", "p-8")).toBe("p-8");
    });

    it("drops falsy conditional values", () => {
        expect(cn("base", false, undefined, null, "visible")).toBe("base visible");
    });

    it("supports object and array inputs", () => {
        expect(cn(["a", {b: true, c: false}])).toBe("a b");
    });
});

describe("getJwtTTL", () => {
    it.each([
        ["minutes only", 45, "45 minutes"],
        ["less than a minute", 0.5, "0 minutes"],
        ["exactly one hour", MINUTES_PER_HOUR, "1 hours 0 minutes"],
        ["hours and minutes", 3 * MINUTES_PER_HOUR + 5, "3 hours 5 minutes"],
        ["exactly one day", MINUTES_PER_DAY, "1 days 0 hours 0 minutes"],
        ["days, hours and minutes", 2 * MINUTES_PER_DAY + 3 * MINUTES_PER_HOUR + 30, "2 days 3 hours 30 minutes"],
        ["more than a month", 40 * MINUTES_PER_DAY, "40 days 0 hours 0 minutes"],
    ])("formats a lifetime of %s", (_name, durationMinutes, expected) => {
        expect(getJwtTTL(buildJwtLasting(durationMinutes))).toBe(expected);
    });

    it("ignores seconds beyond whole minutes", () => {
        const token = buildJwt({iat: ISSUED_AT, exp: ISSUED_AT + minutes(10) + 59});

        expect(getJwtTTL(token)).toBe("10 minutes");
    });

    it("decodes a base64url payload that contains - or _ and has no padding", () => {
        const token = buildBase64UrlJwt({iat: ISSUED_AT, exp: ISSUED_AT + minutes(90), sub: "~~~?"});

        expect(token).toMatch(/[-_]/);
        expect(getJwtTTL(token)).toBe("1 hours 30 minutes");
    });

    it("accepts a token issued at the epoch (iat 0)", () => {
        expect(getJwtTTL(buildJwt({iat: 0, exp: minutes(30)}))).toBe("30 minutes");
    });

    it.each([
        ["a token without a payload segment", "invalid"],
        ["a payload that is not base64", "header.%%%.signature"],
        ["a payload that is not JSON", `header.${btoa("not json")}.signature`],
        ["a payload without claims", buildJwt({sub: "123"})],
        ["a payload without exp", buildJwt({iat: ISSUED_AT})],
        ["a payload without iat", buildJwt({exp: ISSUED_AT})],
        ["an empty token", ""],
    ])("returns null for %s", (_name, token) => {
        expect(getJwtTTL(token)).toBeNull();
    });
});

describe("generateTitleFromHostname", () => {
    it.each([
        ["a plain domain", "example.com", "Example"],
        ["a www prefix", "www.example.com", "Example"],
        ["a single subdomain", "blog.example.com", "Blog"],
        ["a port", "example.com:8080", "Example"],
        ["hyphens", "my-awesome-site.com", "My Awesome Site"],
        ["repeated separators", "my--cool__site.com", "My Cool Site"],
        ["underscores", "my_site.com", "My Site"],
        ["camelCase", "myAwesomeSite.com", "My Awesome Site"],
        ["multiple subdomains", "api.staging.example.co.uk", "Api Staging Example"],
        ["upper case", "EXAMPLE.COM", "Example"],
        ["a single label", "localhost", "Localhost"],
        ["a single label with a port", "localhost:3000", "Localhost"],
        ["a percent-encoded label", "%41bc.com", "Abc"],
        ["a malformed percent sequence", "100%.com", "100"],
        ["a www prefix on a two-label host", "www.com", "Com"],
    ])("handles %s", (_name, hostname, expected) => {
        expect(generateTitleFromHostname(hostname)).toBe(expected);
    });

    it.each([
        ["an IPv4 address", "192.168.1.1", "192.168.1.1"],
        ["an IPv4 address with a port", "192.168.1.1:8080", "192.168.1.1"],
        ["a bracketed IPv6 address", "[2001:db8::1]", "2001:db8::1"],
        ["a bracketed IPv6 address with a port", "[2001:db8::1]:8080", "2001:db8::1"],
        ["a bare IPv6 address", "2001:db8::1", "2001:db8::1"],
    ])("keeps %s as is", (_name, hostname, expected) => {
        expect(generateTitleFromHostname(hostname)).toBe(expected);
    });

    it("falls back to the host without its port when nothing readable remains", () => {
        expect(generateTitleFromHostname("--.com:80")).toBe("--.com");
    });
});

describe("isModalOpen", () => {
    it("is false when the page has no dialog", () => {
        expect(isModalOpen()).toBe(false);
    });

    it.each([
        ["a dialog role", '<div role="dialog"></div>'],
        ["an alertdialog role", '<div role="alertdialog"></div>'],
        ["a dialog content slot", '<div data-slot="dialog-content"></div>'],
        ["an alert dialog content slot", '<div data-slot="alert-dialog-content"></div>'],
    ])("is true for %s", (_name, markup) => {
        document.body.innerHTML = markup;

        expect(isModalOpen()).toBe(true);

        document.body.innerHTML = "";
    });
});
