import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";
import {EditTagModal} from "@/components/tags/EditTagModal";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

function renderEditModal(tag = createTag({name: "Marketing", color: "blue"})): Mock {
    const onOpenChange = vi.fn();
    render(<EditTagModal open onOpenChange={onOpenChange} tag={tag}/>);
    return onOpenChange;
}

describe("EditTagModal", () => {
    afterEach(() => {
        useTagStoreWithoutCount.setState({tags: [], error: null});
    });

    it("prefills the form with the tag being edited", () => {
        renderEditModal(createTag({name: "Marketing"}));

        expect(screen.getByLabelText("Name")).toHaveValue("Marketing");
        expect(screen.getByRole("button", {name: /^Save/})).toBeEnabled();
    });

    it("sends the edited tag to the API and closes", async () => {
        const user = userEvent.setup();
        const tag = createTag({id: "tag-7", name: "Marketing"});
        const updatedTag = createTag({id: "tag-7", name: "Sales", color: "green"});
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(updatedTag));
        const onOpenChange = renderEditModal(tag);

        await user.clear(screen.getByLabelText("Name"));
        await user.type(screen.getByLabelText("Name"), "Sales");
        await user.click(screen.getByRole("button", {name: "Green"}));
        await user.click(screen.getByRole("button", {name: /^Save/}));

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.TAGS, {
            method: "PUT",
            body: JSON.stringify({id: "tag-7", name: "Sales", color: "green"}),
        });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("stays open and keeps the form editable when the API rejects the update", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response("Tag name already exists", {status: 409}));
        const onOpenChange = renderEditModal();

        await user.type(screen.getByLabelText("Name"), "x");
        await user.click(screen.getByRole("button", {name: /^Save/}));

        expect(await screen.findByRole("alert")).toHaveTextContent("Tag name already exists");
        expect(screen.getByRole("button", {name: /^Save/})).toBeEnabled();
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(useTagStoreWithoutCount.getState().error).toBeNull();
    });

    it("does not call the API when there is no tag to edit", async () => {
        const user = userEvent.setup();
        render(<EditTagModal open onOpenChange={vi.fn()} tag={null}/>);

        await user.type(screen.getByLabelText("Name"), "Orphan");
        await user.click(screen.getByRole("button", {name: /^Save/}));

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });
});
