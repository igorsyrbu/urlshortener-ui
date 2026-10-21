import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {AppearanceCard} from "@/components/settings/AppearanceCard";

const mocks = vi.hoisted(() => ({setTheme: vi.fn()}));
vi.mock("next-themes", () => ({useTheme: () => ({theme: "system", setTheme: mocks.setTheme})}));

describe("AppearanceCard", () => {
    it("marks the stored mode as selected", () => {
        render(<AppearanceCard/>);

        expect(screen.getByRole("button", {name: "System"})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", {name: "Light"})).toHaveAttribute("aria-pressed", "false");
    });

    it.each([["Light", "light"], ["Dark", "dark"], ["System", "system"]])(
        "switches to the %s theme",
        async (label, theme) => {
            const user = userEvent.setup();
            render(<AppearanceCard/>);

            await user.click(screen.getByRole("button", {name: label}));

            expect(mocks.setTheme).toHaveBeenCalledExactlyOnceWith(theme);
        },
    );
});
