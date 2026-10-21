import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {SettingsSection} from "@/components/settings/SettingsSection";

describe("SettingsSection", () => {
    it("is a region named by its heading, with the description and the content", () => {
        render(<SettingsSection title="Profile" description="Update your personal information."><button>Save</button></SettingsSection>);

        const section = screen.getByRole("region", {name: "Profile"});
        expect(section).toContainElement(screen.getByRole("heading", {level: 2, name: "Profile"}));
        expect(section).toHaveTextContent("Update your personal information.");
        expect(section).toContainElement(screen.getByRole("button", {name: "Save"}));
    });

    it("gives every section its own heading id", () => {
        render(<>
            <SettingsSection title="One" description="First.">a</SettingsSection>
            <SettingsSection title="Two" description="Second.">b</SettingsSection>
        </>);

        expect(screen.getByRole("region", {name: "One"})).not.toBe(screen.getByRole("region", {name: "Two"}));
    });
});
