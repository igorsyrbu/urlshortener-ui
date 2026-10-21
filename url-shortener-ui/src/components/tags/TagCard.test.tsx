import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi, type Mock} from "vitest";
import {TagCard} from "@/components/tags/TagCard";
import {createTag} from "@/test/tag-utils";

const mediaQuery = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => mediaQuery.isDesktop,
    useIsMobile: () => !mediaQuery.isDesktop,
}));

const MORE_ACTIONS_LABEL = "More actions for tag";

interface RenderedCard {
    onEdit: Mock;
    onDelete: Mock;
}

function renderCard(tag = createTag()): RenderedCard {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<TagCard tag={tag} onEdit={onEdit} onDelete={onDelete}/>);
    return {onEdit, onDelete};
}

describe("TagCard link count", () => {
    it("shows nothing when the tag has no links", () => {
        renderCard(createTag({linkCount: 0}));

        expect(screen.queryByText(/link/)).not.toBeInTheDocument();
    });

    it("shows nothing when the link count is unknown", () => {
        renderCard(createTag({linkCount: undefined}));

        expect(screen.queryByText(/link/)).not.toBeInTheDocument();
    });

    it("uses the singular for one link", () => {
        renderCard(createTag({linkCount: 1}));

        expect(screen.getByText("1 link")).toBeInTheDocument();
    });

    it("uses the plural for several links", () => {
        renderCard(createTag({linkCount: 12}));

        expect(screen.getByText("12 links")).toBeInTheDocument();
    });
});

describe("TagCard on desktop", () => {
    beforeEach(() => {
        mediaQuery.isDesktop = true;
    });

    it("shows the tag name", () => {
        renderCard(createTag({name: "Marketing"}));

        expect(screen.getByText("Marketing")).toBeInTheDocument();
    });

    it("edits the tag from the actions menu", async () => {
        const user = userEvent.setup();
        const tag = createTag();
        const {onEdit, onDelete} = renderCard(tag);

        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));
        await user.click(await screen.findByRole("menuitem", {name: /Edit/}));

        expect(onEdit).toHaveBeenCalledExactlyOnceWith(tag);
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("deletes the tag from the actions menu", async () => {
        const user = userEvent.setup();
        const tag = createTag();
        const {onEdit, onDelete} = renderCard(tag);

        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));
        await user.click(await screen.findByRole("menuitem", {name: /Delete/}));

        expect(onDelete).toHaveBeenCalledExactlyOnceWith(tag);
        expect(onEdit).not.toHaveBeenCalled();
    });

    it("edits the tag with the E shortcut while its menu is open", async () => {
        const user = userEvent.setup();
        const tag = createTag();
        const {onEdit} = renderCard(tag);

        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));
        await user.keyboard("e");

        expect(onEdit).toHaveBeenCalledExactlyOnceWith(tag);
    });

    it("deletes the tag with the D shortcut while its menu is open", async () => {
        const user = userEvent.setup();
        const tag = createTag();
        const {onDelete} = renderCard(tag);

        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));
        await user.keyboard("d");

        expect(onDelete).toHaveBeenCalledExactlyOnceWith(tag);
    });

    it("edits the tag with the E shortcut while the card has keyboard focus", async () => {
        const user = userEvent.setup();
        const tag = createTag();
        const {onEdit} = renderCard(tag);

        await user.tab();
        await user.keyboard("e");

        expect(onEdit).toHaveBeenCalledExactlyOnceWith(tag);
    });

    it("ignores shortcuts when the card is not active", async () => {
        const user = userEvent.setup();
        const {onEdit, onDelete} = renderCard();

        await user.keyboard("ed");

        expect(onEdit).not.toHaveBeenCalled();
        expect(onDelete).not.toHaveBeenCalled();
    });

    it("ignores shortcuts typed into a text field", async () => {
        const user = userEvent.setup();
        const {onEdit} = renderCard();
        render(<input aria-label="Notes"/>);
        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));

        fireEvent.keyDown(screen.getByLabelText("Notes"), {key: "e"});

        expect(onEdit).not.toHaveBeenCalled();
    });

    it("ignores shortcuts while a dialog is open", async () => {
        const user = userEvent.setup();
        const {onEdit} = renderCard();
        render(<div role="dialog" aria-label="Other dialog"/>);
        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));

        await user.keyboard("e");

        expect(onEdit).not.toHaveBeenCalled();
    });
});

describe("TagCard on mobile", () => {
    beforeEach(() => {
        mediaQuery.isDesktop = false;
    });

    it("edits the tag from the action drawer", async () => {
        const user = userEvent.setup();
        const tag = createTag();
        const {onEdit} = renderCard(tag);

        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));
        await user.click(await screen.findByRole("button", {name: "Edit"}));

        expect(onEdit).toHaveBeenCalledExactlyOnceWith(tag);
    });

    it("deletes the tag from the action drawer", async () => {
        const user = userEvent.setup();
        const tag = createTag();
        const {onDelete} = renderCard(tag);

        await user.click(screen.getByRole("button", {name: MORE_ACTIONS_LABEL}));
        await user.click(await screen.findByRole("button", {name: "Delete"}));

        expect(onDelete).toHaveBeenCalledExactlyOnceWith(tag);
    });
});
