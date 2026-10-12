import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {PencilLine, Trash2} from "lucide-react";
import {describe, expect, it, vi, type Mock} from "vitest";
import {ActionDrawer, type ActionItem} from "@/components/ui/action-drawer";

interface RenderedDrawer {
    onEdit: Mock;
    onDelete: Mock;
    onOpenChange: Mock;
}

function renderDrawer(open = true, extraActions: ActionItem[] = []): RenderedDrawer {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onOpenChange = vi.fn();
    render(
        <ActionDrawer
            open={open}
            onOpenChange={onOpenChange}
            actions={[
                {label: "Edit", icon: PencilLine, onClick: onEdit},
                {label: "Delete", icon: Trash2, onClick: onDelete, variant: "destructive", hasSeparator: true},
                ...extraActions,
            ]}
        />,
    );
    return {onEdit, onDelete, onOpenChange};
}

describe("ActionDrawer", () => {
    it("lists every action", () => {
        renderDrawer();

        expect(screen.getByRole("button", {name: "Edit"})).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Delete"})).toBeInTheDocument();
    });

    it("renders nothing while closed", () => {
        renderDrawer(false);

        expect(screen.queryByRole("button", {name: "Edit"})).not.toBeInTheDocument();
    });

    it("runs only the chosen action and then closes the drawer", async () => {
        const user = userEvent.setup();
        const {onEdit, onDelete, onOpenChange} = renderDrawer();

        await user.click(screen.getByRole("button", {name: "Delete"}));

        expect(onDelete).toHaveBeenCalledOnce();
        expect(onEdit).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("is announced to assistive technology with the default title", () => {
        renderDrawer();

        expect(screen.getByRole("dialog", {name: "Actions"})).toBeInTheDocument();
    });

    it("uses a custom title when one is given", () => {
        render(<ActionDrawer open onOpenChange={vi.fn()} title="Link actions" actions={[]}/>);

        expect(screen.getByRole("dialog", {name: "Link actions"})).toBeInTheDocument();
    });
});
