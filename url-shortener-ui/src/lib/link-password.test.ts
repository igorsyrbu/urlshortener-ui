import {describe, expect, it, vi} from "vitest";
import {
    GENERATED_LINK_PASSWORD_LENGTH,
    LINK_PASSWORD_COPY,
    LINK_PASSWORD_MAX_LENGTH,
    LINK_PASSWORD_MIN_LENGTH,
} from "@/lib/constants";
import {generateLinkPassword, getLinkPasswordError} from "@/lib/link-password";

const ALPHABET_LENGTH = 62;

describe("getLinkPasswordError", () => {
    it.each([
        ["one below the minimum", LINK_PASSWORD_MIN_LENGTH - 1, LINK_PASSWORD_COPY.LENGTH_ERROR],
        ["the minimum", LINK_PASSWORD_MIN_LENGTH, null],
        ["the maximum", LINK_PASSWORD_MAX_LENGTH, null],
        ["one above the maximum", LINK_PASSWORD_MAX_LENGTH + 1, LINK_PASSWORD_COPY.LENGTH_ERROR],
    ])("judges a password of %s length", (_case, length, expected) => {
        expect(getLinkPasswordError("x".repeat(length))).toBe(expected);
    });

    it("counts spaces, since the password is not trimmed", () => {
        expect(getLinkPasswordError("     ")).toBeNull();
    });
});

describe("generateLinkPassword", () => {
    it("builds a letters-and-digits password of the default length", () => {
        expect(generateLinkPassword()).toMatch(new RegExp(`^[A-Za-z0-9]{${GENERATED_LINK_PASSWORD_LENGTH}}$`));
    });

    it("passes its own length rule", () => {
        expect(getLinkPasswordError(generateLinkPassword())).toBeNull();
    });

    it("skips random bytes that would favour some characters, and draws again", () => {
        const biasedByte = 256 - (256 % ALPHABET_LENGTH);
        vi.spyOn(crypto, "getRandomValues")
            .mockImplementationOnce((array) => {
                (array as Uint8Array).set([biasedByte, 0]);
                return array;
            })
            .mockImplementationOnce((array) => {
                (array as Uint8Array).set([1, 2]);
                return array;
            });

        expect(generateLinkPassword(2)).toBe("AB");
        expect(crypto.getRandomValues).toHaveBeenCalledTimes(2);
    });
});
