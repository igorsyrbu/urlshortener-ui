import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {getCountryName, LocationIcon} from "@/components/analytics/LocationIcon";

function flagReference(label: string): string | null | undefined {
    return screen.getByRole("img", {name: label}).querySelector("use")?.getAttribute("href");
}

describe("LocationIcon", () => {
    it("draws the country's flag from the local sprite", () => {
        render(<LocationIcon label="CA" isCountry/>);

        expect(flagReference("CA")).toMatch(/circle-flags\.svg#ca$/);
    });

    it("shows a pin instead of a flag for continents", () => {
        render(<LocationIcon label="EU" isCountry={false}/>);

        expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });

    it.each(["USA", "", "X", "ZZ", "../x", "U1"])("shows a pin when the label %j is not a known country code", (label) => {
        render(<LocationIcon label={label} isCountry/>);

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
