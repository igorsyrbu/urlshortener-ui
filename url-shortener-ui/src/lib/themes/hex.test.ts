import {describe, expect, it} from "vitest";
import {isValidHex, normalizeHex} from "@/lib/themes/hex";

describe("isValidHex", () => {
    it.each(["#fff", "#FFF", "#a1b2c3", "#A1B2C3", "  #fff  "])("accepts %j", (value) => {
        expect(isValidHex(value)).toBe(true);
    });

    it.each(["", "fff", "#ff", "#ffff", "#fffff", "#fffffff", "#ggg", "rgb(0,0,0)", "#12 345"])("rejects %j", (value) => {
        expect(isValidHex(value)).toBe(false);
    });
});

describe("normalizeHex", () => {
    it.each([
        ["#FFF", "#ffffff"],
        ["#a1b", "#aa11bb"],
        ["#A1B2C3", "#a1b2c3"],
        ["  #abc  ", "#aabbcc"],
    ])("normalizes %j to %s", (value, expected) => {
        expect(normalizeHex(value)).toBe(expected);
    });

    it.each(["", "abc", "#abcd", "red"])("returns null for %j", (value) => {
        expect(normalizeHex(value)).toBeNull();
    });
});
