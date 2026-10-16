import {screen} from "@testing-library/react";
import {ICON_BUTTON_LABELS} from "@/lib/constants";

export function getOptionsTrigger(): HTMLElement {
    return screen.getByRole("button", {name: ICON_BUTTON_LABELS.OPTIONS_MENU});
}
