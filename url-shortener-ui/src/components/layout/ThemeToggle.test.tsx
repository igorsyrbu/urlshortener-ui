import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {ModeToggle} from "@/components/layout/ThemeToggle";

const theme = vi.hoisted(() => ({resolvedTheme: "light", setTheme: vi.fn()}));

vi.mock("next-themes", () => ({useTheme: () => theme}));

describe("ModeToggle", () => {
    it("switches from the light theme to dark", async () => {
        const user = userEvent.setup();
        theme.resolvedTheme = "light";
        render(<ModeToggle/>);

        await user.click(screen.getByRole("button", {name: "Toggle theme"}));

        expect(theme.setTheme).toHaveBeenCalledExactlyOnceWith("dark");
    });

    it("switches from the dark theme to light", async () => {
        const user = userEvent.setup();
        theme.resolvedTheme = "dark";
        render(<ModeToggle/>);

        await user.click(screen.getByRole("button", {name: "Toggle theme"}));

        expect(theme.setTheme).toHaveBeenCalledExactlyOnceWith("light");
    });
});
