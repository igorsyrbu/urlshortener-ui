import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {ImportThemeDialog} from "@/components/settings/ImportThemeDialog";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";

const INVALID_THEME_MESSAGE = "Invalid theme. Expected four comma-separated hex colors.";

interface DialogOptions {
    open?: boolean;
    value?: string;
    hasError?: boolean;
}

interface RenderedDialog {
    user: ReturnType<typeof userEvent.setup>;
    onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>;
    onValueChange: ReturnType<typeof vi.fn<(value: string) => void>>;
    onImport: ReturnType<typeof vi.fn<() => void>>;
}

function renderDialog({open = true, value = "", hasError = false}: DialogOptions = {}): RenderedDialog {
    const handlers = {
        onOpenChange: vi.fn<(open: boolean) => void>(),
        onValueChange: vi.fn<(value: string) => void>(),
        onImport: vi.fn<() => void>(),
    };
    render(<ImportThemeDialog open={open} value={value} hasError={hasError} {...handlers}/>);
    return {user: userEvent.setup(), ...handlers};
}

describe.each([
    ["desktop dialog", stubDesktopViewport],
    ["mobile drawer", stubMobileViewport],
])("ImportThemeDialog as a %s", (_name, useViewport) => {
    it("stays closed when open is false", () => {
        useViewport();

        renderDialog({open: false});

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("explains the expected format and shows the current value", async () => {
        useViewport();

        renderDialog({value: "#111111,#222222,#333333,#444444"});

        expect(await screen.findByText(/four comma-separated hex colors: background, cards, accent, danger/)).toBeInTheDocument();
        expect(screen.getByRole("textbox")).toHaveValue("#111111,#222222,#333333,#444444");
    });

    it("reports what the user types", async () => {
        useViewport();
        const {user, onValueChange} = renderDialog();

        await user.type(await screen.findByRole("textbox"), "#");

        expect(onValueChange).toHaveBeenCalledExactlyOnceWith("#");
    });

    it("shows the validation message only when there is an error", async () => {
        useViewport();
        renderDialog({hasError: true});

        expect(await screen.findByText(INVALID_THEME_MESSAGE)).toBeInTheDocument();
        expect(screen.getByRole("textbox")).toBeInvalid();
    });

    it("hides the validation message without an error", async () => {
        useViewport();
        renderDialog();

        await screen.findByRole("dialog");

        expect(screen.queryByText(INVALID_THEME_MESSAGE)).not.toBeInTheDocument();
    });

    it("imports with the Import button", async () => {
        useViewport();
        const {user, onImport} = renderDialog();

        await user.click(await screen.findByRole("button", {name: "Import"}));

        expect(onImport).toHaveBeenCalledOnce();
    });

    it("imports when Enter is pressed in the field", async () => {
        useViewport();
        const {user, onImport} = renderDialog();

        await user.type(await screen.findByRole("textbox"), "{Enter}");

        expect(onImport).toHaveBeenCalledOnce();
    });

    it("closes with Cancel without importing", async () => {
        useViewport();
        const {user, onImport, onOpenChange} = renderDialog();

        await user.click(await screen.findByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
        expect(onImport).not.toHaveBeenCalled();
    });
});
