import {screen} from "@testing-library/react";

/** The options button is icon-only and has no accessible name, so it is the one button without an aria-label. */
export function getOptionsTrigger(): HTMLElement {
    const trigger = screen.getAllByRole("button").find((button) => !button.hasAttribute("aria-label"));
    if (!trigger) throw new Error("Options trigger not found");
    return trigger;
}
