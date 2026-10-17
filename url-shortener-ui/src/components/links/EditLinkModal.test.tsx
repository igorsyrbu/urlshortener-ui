import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {EditLinkModal} from "@/components/links/EditLinkModal";
import {API_ENDPOINTS, SHORT_KEY_TAKEN_MESSAGE} from "@/lib/constants";
import type {LinkItem} from "@/lib/types";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {getRequestsTo, parseRequestBody, routeFetchWithAuth} from "@/test/link-form-utils";
import {createLinkItem} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

interface RenderedModal {
    onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>;
    onSuccess: ReturnType<typeof vi.fn<(savedLink: LinkItem) => void>>;
}

function renderModal(link: LinkItem | null = createLinkItem({title: "My article", tagIds: ["tag-1"]})): RenderedModal {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onSuccess = vi.fn<(savedLink: LinkItem) => void>();
    render(<EditLinkModal open onOpenChange={onOpenChange} link={link} onSuccess={onSuccess}/>);
    return {onOpenChange, onSuccess};
}

function mockUpdateEndpoint(respond: () => Response): void {
    routeFetchWithAuth({[API_ENDPOINTS.SHORTLINKS]: respond});
}

describe("EditLinkModal", () => {
    beforeEach(() => {
        media.isDesktop = true;
        useTagStoreWithoutCount.setState({tags: [createTag({id: "tag-1", name: "Marketing"})], loading: false, error: null});
    });

    it.each([true, false])("prefills the form with the link being edited (desktop=%s)", async (isDesktop) => {
        media.isDesktop = isDesktop;
        const link = createLinkItem({title: "My article", key: "abc123", longUrl: "https://example.com/article"});

        renderModal(link);

        expect(await screen.findByLabelText("Destination URL")).toHaveValue(link.longUrl);
        expect(screen.getByLabelText("Short Link")).toHaveValue(link.key);
        expect(screen.getByLabelText("Title")).toHaveValue(link.title);
        expect(screen.getByRole("dialog", {name: "Edit Link"})).toBeInTheDocument();
    });

    it("falls back to the last path segment of the short URL when the link has no key", async () => {
        renderModal(createLinkItem({key: undefined, shortUrl: "https://sho.rt/from-url/"}));

        expect(await screen.findByLabelText("Short Link")).toHaveValue("from-url");
    });

    it("reports the saved link with its short URL following a changed key", async () => {
        const user = userEvent.setup();
        mockUpdateEndpoint(() => Response.json({}));
        const link = createLinkItem({id: "link-42", key: "old-key", shortUrl: "https://sho.rt/old-key"});
        const {onSuccess} = renderModal(link);

        await user.clear(await screen.findByLabelText("Short Link"));
        await user.type(screen.getByLabelText("Short Link"), "new-key");
        await user.click(screen.getByRole("button", {name: "Save"}));

        await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
        expect(onSuccess.mock.calls[0][0]).toMatchObject({id: "link-42", key: "new-key", shortUrl: "https://sho.rt/new-key"});
    });

    it("saves the edited link keeping its id and archived state, then closes", async () => {
        const user = userEvent.setup();
        mockUpdateEndpoint(() => Response.json({}));
        const link = createLinkItem({id: "link-42", isActive: false, title: "Old", tagIds: ["tag-1"]});
        const {onSuccess, onOpenChange} = renderModal(link);

        await user.clear(await screen.findByLabelText("Title"));
        await user.type(screen.getByLabelText("Title"), "New title");
        await user.click(screen.getByRole("button", {name: "Save"}));

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
        expect(onSuccess).toHaveBeenCalledExactlyOnceWith({...link, title: "New title", tagIds: ["tag-1"]});
        const [request] = getRequestsTo(API_ENDPOINTS.SHORTLINKS, "PUT");
        expect(parseRequestBody(request)).toEqual({
            id: "link-42", longUrl: link.longUrl, title: "New title", key: link.key, isActive: false, tagIds: ["tag-1"],
        });
    });

    it("keeps the dialog open and reports a taken key on conflict", async () => {
        const user = userEvent.setup();
        mockUpdateEndpoint(() => new Response(null, {status: 409}));
        const {onSuccess, onOpenChange} = renderModal();

        await user.click(await screen.findByRole("button", {name: "Save"}));

        expect(await screen.findByText(SHORT_KEY_TAKEN_MESSAGE)).toBeInTheDocument();
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("keeps the dialog open and re-enables saving when the server fails", async () => {
        const user = userEvent.setup();
        mockUpdateEndpoint(() => new Response(null, {status: 500}));
        const {onSuccess, onOpenChange} = renderModal();

        await user.click(await screen.findByRole("button", {name: "Save"}));

        await waitFor(() => expect(screen.getByRole("button", {name: "Save"})).toBeEnabled());
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("closes without saving when cancelled", async () => {
        const user = userEvent.setup();
        const {onOpenChange} = renderModal();

        await user.click(await screen.findByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(getRequestsTo(API_ENDPOINTS.SHORTLINKS, "PUT")).toHaveLength(0);
    });
});
