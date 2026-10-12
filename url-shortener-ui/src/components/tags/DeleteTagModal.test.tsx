import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi, type Mock} from "vitest";
import {DeleteTagModal} from "@/components/tags/DeleteTagModal";

vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

interface RenderedModal {
    onConfirm: Mock;
}

function renderModal(tagName?: string): RenderedModal {
    const onConfirm = vi.fn();
    render(
        <DeleteTagModal open onOpenChange={vi.fn()} onConfirm={onConfirm} loading={false} tagName={tagName}
                        tagColor="blue"/>,
    );
    return {onConfirm};
}

describe("DeleteTagModal", () => {
    it("warns that deleting removes the tag from all links", () => {
        renderModal("Marketing");

        expect(screen.getByText("Delete this tag?")).toBeInTheDocument();
        expect(screen.getByText(/remove it from all associated links/)).toBeInTheDocument();
    });

    it("previews the tag being deleted", () => {
        renderModal("Marketing");

        expect(screen.getByTitle("Marketing")).toHaveTextContent("Marketing");
    });

    it("requires typing the tag name before deleting", async () => {
        const user = userEvent.setup();
        const {onConfirm} = renderModal("Marketing");

        expect(screen.getByRole("button", {name: "Delete tag"})).toBeDisabled();
        await user.type(screen.getByPlaceholderText("Type the tag name here"), "Marketing");
        await user.click(screen.getByRole("button", {name: "Delete tag"}));

        expect(onConfirm).toHaveBeenCalledOnce();
    });

    it("skips the preview and the name check when no tag is selected", () => {
        renderModal(undefined);

        expect(screen.queryByPlaceholderText("Type the tag name here")).not.toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Delete tag"})).toBeEnabled();
    });
});
