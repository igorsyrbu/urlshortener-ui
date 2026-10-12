import {HelpCircle, Laptop, Monitor, Smartphone} from "lucide-react";
import {describe, expect, it} from "vitest";
import {formatDeviceText, formatLocation, getIconForDevice, UserSession} from "@/lib/session-utils";

function createSession(overrides: Partial<UserSession> = {}): UserSession {
    return {
        id: "session-1",
        city: "Montreal",
        region: "Quebec",
        country: "Canada",
        device: "Mac",
        os: "macOS",
        current: false,
        ...overrides,
    };
}

describe("getIconForDevice", () => {
    it.each([
        ["Mac", "macOS"],
        ["PC", "Linux"],
        ["Desktop", ""],
        ["Windows Laptop", "Windows"],
    ])("uses the monitor icon for %s", (device, os) => {
        expect(getIconForDevice(device, os)).toBe(Monitor);
    });

    it.each([
        ["iPhone", "iOS"],
        ["Mobile", "Android"],
        ["Android Phone", ""],
    ])("uses the smartphone icon for %s", (device, os) => {
        expect(getIconForDevice(device, os)).toBe(Smartphone);
    });

    it.each([
        ["unknown", "unknown"],
        ["UNKNOWN", "Unknown"],
        ["", ""],
    ])("uses the help icon when device %j and os %j are both unknown", (device, os) => {
        expect(getIconForDevice(device, os)).toBe(HelpCircle);
    });

    it.each([
        ["Chromebook", "ChromeOS"],
        ["unknown", "Linux"],
        ["", "Linux"],
    ])("falls back to the laptop icon for %j with os %j", (device, os) => {
        expect(getIconForDevice(device, os)).toBe(Laptop);
    });

    it("matches device keywords case-insensitively", () => {
        expect(getIconForDevice("IPHONE", "ios")).toBe(Smartphone);
    });
});

describe("formatLocation", () => {
    it("joins city, region and country", () => {
        expect(formatLocation(createSession())).toBe("Montreal, Quebec, Canada");
    });

    it.each([
        ["city", {city: ""}, "Quebec, Canada"],
        ["region", {region: "   "}, "Montreal, Canada"],
        ["country", {country: "Unknown"}, "Montreal, Quebec"],
        ["city marked unknown location", {city: "Unknown Location"}, "Quebec, Canada"],
        ["city marked unknown in lower case", {city: "unknown"}, "Quebec, Canada"],
    ])("skips an empty or unknown %s", (_name, overrides, expected) => {
        expect(formatLocation(createSession(overrides))).toBe(expected);
    });

    it("falls back to a placeholder when every part is unknown", () => {
        const session = createSession({city: "", region: "unknown", country: "Unknown Location"});

        expect(formatLocation(session)).toBe("Unknown Location");
    });
});

describe("formatDeviceText", () => {
    it("shows the device with its operating system", () => {
        expect(formatDeviceText(createSession())).toBe("Mac (macOS)");
    });

    it.each([
        ["an unknown device", {device: "unknown"}, "macOS"],
        ["an empty device", {device: ""}, "macOS"],
        ["an unknown os", {os: "Unknown"}, "Mac"],
        ["an empty os", {os: ""}, "Mac"],
    ])("shows only the known part for %s", (_name, overrides, expected) => {
        expect(formatDeviceText(createSession(overrides))).toBe(expected);
    });

    it.each([
        {device: "unknown", os: "unknown"},
        {device: "", os: ""},
        {device: "Unknown", os: ""},
    ])("shows a placeholder when nothing is known: %o", (overrides) => {
        expect(formatDeviceText(createSession(overrides))).toBe("Unknown Device");
    });
});
