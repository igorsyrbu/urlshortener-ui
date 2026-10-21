import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it} from "vitest";
import {ShortcutsCard} from "@/components/settings/ShortcutsCard";
import {useShortcutsStore} from "@/lib/store/shortcuts";
import {useUIStore} from "@/lib/store/ui";

describe("ShortcutsCard", () => {
    afterEach(() => {
        useShortcutsStore.setState({isEnabled: true});
        useUIStore.setState({isShortcutsDialogOpen: false});
        localStorage.clear();
    });

    it("turns keyboard shortcuts off with a labelled switch", async () => {
        const user = userEvent.setup();
        render(<ShortcutsCard/>);

        const toggle = screen.getByRole("switch", {name: "Keyboard shortcuts"});
        await user.click(toggle);

        expect(toggle).toHaveAttribute("aria-checked", "false");
        expect(toggle).toHaveAccessibleDescription(/screen reader/);
        expect(useShortcutsStore.getState().isEnabled).toBe(false);
    });

    it("opens the list of shortcuts", async () => {
        const user = userEvent.setup();
        render(<ShortcutsCard/>);

        await user.click(screen.getByRole("button", {name: "View shortcuts"}));

        expect(useUIStore.getState().isShortcutsDialogOpen).toBe(true);
    });
});
