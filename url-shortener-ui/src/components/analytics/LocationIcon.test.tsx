import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {getCountryName, LocationIcon} from "@/components/analytics/LocationIcon";
import {FLAG_SERVICE_URL} from "@/lib/constants";

describe("LocationIcon", () => {
    it("shows the lowercase country flag for a two-letter country code", () => {
        render(<LocationIcon label="CA" isCountry/>);

        expect(screen.getByRole("img", {name: "CA"})).toHaveAttribute("src", `${FLAG_SERVICE_URL}/ca.svg`);
    });

    it("shows a pin instead of a flag for continents", () => {
        render(<LocationIcon label="EU" isCountry={false}/>);

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it.each(["USA", "", "X"])("shows a pin when the label %j is not a country code", (label) => {
        render(<LocationIcon label={label} isCountry/>);

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it("falls back to a pin when the flag fails to load", () => {
        render(<LocationIcon label="CA" isCountry/>);

        fireEvent.error(screen.getByRole("img", {name: "CA"}));

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
});

describe("getCountryName", () => {
    it("translates a region code into its English name", () => {
        expect(getCountryName("CA")).toBe("Canada");
    });

    it("returns the input when it is not a valid region code", () => {
        expect(getCountryName("not-a-region")).toBe("not-a-region");
    });
});
