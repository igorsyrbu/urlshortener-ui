import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {LinksSelectModeButton} from "@/components/links/LinksSelectModeButton";
import {LINK_SELECTION_COPY} from "@/lib/constants";

function renderButton(isSelectMode: boolean) {
    const onStart = vi.fn();
    const onCancel = vi.fn();
    render(<LinksSelectModeButton isSelectMode={isSelectMode} onStart={onStart} onCancel={onCancel}/>);
    return {onStart, onCancel};
}

describe("LinksSelectModeButton", () => {
    it("starts select mode", async () => {
        const user = userEvent.setup();
        const {onStart, onCancel} = renderButton(false);

        await user.click(screen.getByRole("button", {name: LINK_SELECTION_COPY.START}));

        expect(onStart).toHaveBeenCalledOnce();
        expect(onCancel).not.toHaveBeenCalled();
    });

    it("turns into a cross that cancels select mode", async () => {
        const user = userEvent.setup();
        const {onStart, onCancel} = renderButton(true);

        await user.click(screen.getByRole("button", {name: LINK_SELECTION_COPY.CANCEL}));

        expect(onCancel).toHaveBeenCalledOnce();
        expect(onStart).not.toHaveBeenCalled();
    });
});
