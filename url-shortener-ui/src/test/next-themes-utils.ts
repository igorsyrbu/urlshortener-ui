import {vi} from "vitest";

const activeTheme: {resolvedTheme: "light" | "dark"} = {resolvedTheme: "light"};

/** Module factory for `vi.mock("next-themes", ...)`: vi.mock only takes effect inside the test file itself. */
export const nextThemesMock = {
    useTheme: () => ({resolvedTheme: activeTheme.resolvedTheme, theme: activeTheme.resolvedTheme, setTheme: vi.fn()}),
};

export function setResolvedTheme(theme: "light" | "dark"): void {
    activeTheme.resolvedTheme = theme;
}

export function resetResolvedTheme(): void {
    activeTheme.resolvedTheme = "light";
}
