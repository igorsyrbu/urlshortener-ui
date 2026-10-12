import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {LogoutTarget, SessionLogoutDialog} from "@/components/settings/SessionLogoutDialog";
import {DEFAULT_JWT_TTL_DISPLAY} from "@/lib/constants";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";

interface RenderedDialog {
    user: ReturnType<typeof userEvent.setup>;
    onClose: ReturnType<typeof vi.fn<() => void>>;
    onConfirm: ReturnType<typeof vi.fn<() => void>>;
}

function renderDialog(target: LogoutTarget, jwtTTL: string | null = "2 hours 0 minutes"): RenderedDialog {
    const onClose = vi.fn<() => void>();
    const onConfirm = vi.fn<() => void>();
    render(<SessionLogoutDialog target={target} jwtTTL={jwtTTL} onClose={onClose} onConfirm={onConfirm}/>);
    return {user: userEvent.setup(), onClose, onConfirm};
}

describe.each([
    ["desktop dialog", stubDesktopViewport],
    ["mobile drawer", stubMobileViewport],
])("SessionLogoutDialog as a %s", (_name, useViewport) => {
    it("stays closed without a target", () => {
        useViewport();

        renderDialog(null);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("warns that the current session ends immediately", async () => {
        useViewport();

        renderDialog({type: "single", id: "s1", isCurrent: true});

        expect(await screen.findByText("Do you want to terminate the current session?")).toBeInTheDocument();
        expect(screen.getByText(/signed out immediately/)).toBeInTheDocument();
    });

    it("mentions the token lifetime when terminating another session", async () => {
        useViewport();

        renderDialog({type: "single", id: "s2", isCurrent: false});

        expect(await screen.findByText("Do you want to terminate this session?")).toBeInTheDocument();
        expect(screen.getByText(/might take up to 2 hours 0 minutes to take effect on that device/)).toBeInTheDocument();
    });

    it("mentions the token lifetime when terminating all other sessions", async () => {
        useViewport();

        renderDialog({type: "other"});

        expect(await screen.findByText("Do you want to terminate all other sessions?")).toBeInTheDocument();
        expect(screen.getByText(/might take up to 2 hours 0 minutes to take effect across all systems/)).toBeInTheDocument();
    });

    it("falls back to the default lifetime when the token has none", async () => {
        useViewport();

        renderDialog({type: "other"}, null);

        expect(await screen.findByText(new RegExp(`up to ${DEFAULT_JWT_TTL_DISPLAY}`))).toBeInTheDocument();
    });

    it("confirms with Continue", async () => {
        useViewport();
        const {user, onConfirm, onClose} = renderDialog({type: "other"});

        await user.click(await screen.findByRole("button", {name: "Continue"}));

        expect(onConfirm).toHaveBeenCalledOnce();
        expect(onClose).not.toHaveBeenCalled();
    });

    it("closes with Cancel without confirming", async () => {
        useViewport();
        const {user, onConfirm, onClose} = renderDialog({type: "other"});

        await user.click(await screen.findByRole("button", {name: "Cancel"}));

        expect(onClose).toHaveBeenCalledOnce();
        expect(onConfirm).not.toHaveBeenCalled();
    });

    it("closes when escape is pressed", async () => {
        useViewport();
        const {user, onClose} = renderDialog({type: "other"});
        await screen.findByRole("dialog");

        await user.keyboard("{Escape}");

        expect(onClose).toHaveBeenCalledOnce();
    });
});
