import {afterEach, describe, expect, it} from "vitest";
import {SHORTCUTS_ENABLED_STORAGE_KEY} from "@/lib/constants";
import {useShortcutsStore} from "@/lib/store/shortcuts";

describe("shortcuts preference", () => {
    afterEach(() => {
        localStorage.clear();
        useShortcutsStore.setState({isEnabled: true});
    });

    it("is on by default", () => {
        useShortcutsStore.getState().hydrate();

        expect(useShortcutsStore.getState().isEnabled).toBe(true);
    });

    it("remembers turning shortcuts off across visits", () => {
        useShortcutsStore.getState().setEnabled(false);
        useShortcutsStore.setState({isEnabled: true});

        useShortcutsStore.getState().hydrate();

        expect(localStorage.getItem(SHORTCUTS_ENABLED_STORAGE_KEY)).toBe("false");
        expect(useShortcutsStore.getState().isEnabled).toBe(false);
    });
});
