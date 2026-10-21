import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {SettingsCallout} from "@/components/settings/SettingsCallout";

describe("SettingsCallout", () => {
    it("announces an alert", () => {
        render(<SettingsCallout tone="destructive" isAlert>Something failed</SettingsCallout>);

        expect(screen.getByRole("alert")).toHaveTextContent("Something failed");
    });

    it("stays quiet for an informational note", () => {
        render(<SettingsCallout tone="info">Switches at renewal</SettingsCallout>);

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByText("Switches at renewal")).toBeInTheDocument();
    });
});
