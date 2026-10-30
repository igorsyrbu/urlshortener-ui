import {screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {DangerZoneCard} from "@/components/settings/DangerZoneCard";
import {fetchWithAuth} from "@/lib/api";
import {currentUserQueryOptions} from "@/lib/query/user-queries";
import {createTestQueryClient, renderWithQuery} from "@/test/query-utils";
import {stubDesktopViewport, stubMobileViewport} from "@/test/viewport-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const EMAIL = "Ada@Example.com";
const CONFIRM_LABEL = "Please type in your email to confirm.";

interface RenderedCard {
    user: ReturnType<typeof userEvent.setup>;
    onOpenDeleteDialog: ReturnType<typeof vi.fn<() => void>>;
    onCloseDeleteDialog: ReturnType<typeof vi.fn<() => void>>;
    onConfirmDelete: ReturnType<typeof vi.fn<() => void>>;
    rerenderWith: (isDeleteDialogOpen: boolean) => void;
}

function renderCard(isDeleteDialogOpen: boolean, hasProfile = true): RenderedCard {
    const queryClient = createTestQueryClient();
    if (hasProfile) queryClient.setQueryData(currentUserQueryOptions.queryKey, {email: EMAIL, name: "Ada"});
    const handlers = {
        onOpenDeleteDialog: vi.fn<() => void>(),
        onCloseDeleteDialog: vi.fn<() => void>(),
        onConfirmDelete: vi.fn<() => void>(),
    };
    const buildCard = (isOpen: boolean) => <DangerZoneCard isDeleteDialogOpen={isOpen} {...handlers}/>;
    const {rerender} = renderWithQuery(buildCard(isDeleteDialogOpen), queryClient);
    return {user: userEvent.setup(), ...handlers, rerenderWith: (isOpen) => rerender(buildCard(isOpen))};
}

describe("DangerZoneCard", () => {
    beforeEach(() => {
        vi.mocked(fetchWithAuth).mockReset();
    });

    it("asks to open the delete dialog from the Delete Account button", async () => {
        stubDesktopViewport();
        const {user, onOpenDeleteDialog} = renderCard(false);

        await user.click(screen.getByRole("button", {name: "Delete Account"}));

        expect(onOpenDeleteDialog).toHaveBeenCalledOnce();
    });

    it("keeps the confirmation closed until requested", () => {
        stubDesktopViewport();

        renderCard(false);

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
});

describe.each([
    ["desktop dialog", stubDesktopViewport],
    ["mobile drawer", stubMobileViewport],
])("DangerZoneCard confirmation as a %s", (_name, useViewport) => {
    beforeEach(() => {
        vi.mocked(fetchWithAuth).mockReset();
        useViewport();
    });

    it("disables the final delete button until the email is typed", async () => {
        renderCard(true);

        expect(await screen.findByRole("button", {name: "Yes, Delete Account"})).toBeDisabled();
    });

    it("enables the final delete button when the typed email matches ignoring case and whitespace", async () => {
        const {user} = renderCard(true);

        await user.type(await screen.findByLabelText(CONFIRM_LABEL), "  ada@example.COM ");

        expect(screen.getByRole("button", {name: "Yes, Delete Account"})).toBeEnabled();
    });

    it("keeps the final delete button disabled while the profile has not loaded", async () => {
        vi.mocked(fetchWithAuth).mockReturnValueOnce(new Promise(() => undefined));

        renderCard(true, false);

        expect(await screen.findByRole("button", {name: "Yes, Delete Account"})).toBeDisabled();
    });

    it("keeps the final delete button disabled for a different email", async () => {
        const {user} = renderCard(true);

        await user.type(await screen.findByLabelText(CONFIRM_LABEL), "grace@example.com");

        expect(screen.getByRole("button", {name: "Yes, Delete Account"})).toBeDisabled();
    });

    it("keeps the final delete button disabled for a partial email", async () => {
        const {user} = renderCard(true);

        await user.type(await screen.findByLabelText(CONFIRM_LABEL), "ada@example.co");

        expect(screen.getByRole("button", {name: "Yes, Delete Account"})).toBeDisabled();
    });

    it("hints the expected email as the placeholder", async () => {
        renderCard(true);

        expect(await screen.findByLabelText(CONFIRM_LABEL)).toHaveAttribute("placeholder", EMAIL);
    });

    it("confirms deletion once the email matches", async () => {
        const {user, onConfirmDelete} = renderCard(true);
        await user.type(await screen.findByLabelText(CONFIRM_LABEL), EMAIL);

        await user.click(screen.getByRole("button", {name: "Yes, Delete Account"}));

        expect(onConfirmDelete).toHaveBeenCalledOnce();
    });

    it("closes with Cancel without confirming", async () => {
        const {user, onCloseDeleteDialog, onConfirmDelete} = renderCard(true);

        await user.click(await screen.findByRole("button", {name: "Cancel"}));

        expect(onCloseDeleteDialog).toHaveBeenCalledOnce();
        expect(onConfirmDelete).not.toHaveBeenCalled();
    });

    it("clears the typed email after the dialog is closed", async () => {
        const {user, rerenderWith} = renderCard(true);
        await user.type(await screen.findByLabelText(CONFIRM_LABEL), EMAIL);

        rerenderWith(false);
        rerenderWith(true);

        expect(await screen.findByLabelText(CONFIRM_LABEL)).toHaveValue("");
        expect(screen.getByRole("button", {name: "Yes, Delete Account"})).toBeDisabled();
    });
});
