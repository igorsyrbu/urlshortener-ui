import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";
import {CreateTagModal} from "@/components/tags/CreateTagModal";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

function renderCreateModal(): Mock {
    const onOpenChange = vi.fn();
    render(<CreateTagModal open onOpenChange={onOpenChange}/>);
    return onOpenChange;
}

describe("CreateTagModal", () => {
    afterEach(() => {
        useTagStoreWithoutCount.setState({tags: [], error: null});
        useTagStoreWithCount.setState({tags: [], error: null});
    });

    it("starts with an empty form and a disabled submit", () => {
        renderCreateModal();

        expect(screen.getByLabelText("Name")).toHaveValue("");
        expect(screen.getByRole("button", {name: /^Create/})).toBeDisabled();
    });

    it("creates the tag, adds it to both tag stores and closes", async () => {
        const user = userEvent.setup();
        const createdTag = createTag({id: "tag-9", name: "Sales", color: "purple"});
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json(createdTag, {status: 201}));
        const onOpenChange = renderCreateModal();

        await user.type(screen.getByLabelText("Name"), "Sales");
        await user.click(screen.getByRole("radio", {name: "Purple"}));
        await user.click(screen.getByRole("button", {name: /^Create/}));

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.TAGS, {
            method: "POST",
            body: JSON.stringify({name: "Sales", color: "purple"}),
        });
        expect(useTagStoreWithoutCount.getState().tags).toEqual([createdTag]);
        expect(useTagStoreWithCount.getState().tags).toEqual([createdTag]);
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("stays open and surfaces the server message when creation fails", async () => {
        const user = userEvent.setup();
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response("Tag already exists", {status: 409}));
        const onOpenChange = renderCreateModal();

        await user.type(screen.getByLabelText("Name"), "Sales");
        await user.click(screen.getByRole("button", {name: /^Create/}));

        expect(await screen.findByRole("alert")).toHaveTextContent("Tag already exists");
        expect(screen.getByRole("button", {name: /^Create/})).toBeEnabled();
        expect(onOpenChange).not.toHaveBeenCalled();
        expect(useTagStoreWithCount.getState().error).toBeNull();
    });
});
