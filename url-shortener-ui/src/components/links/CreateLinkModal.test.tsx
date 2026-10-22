import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {CreateLinkModal} from "@/components/links/CreateLinkModal";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, DEFAULT_LINK_TITLE, ROUTES, SHORT_KEY_TAKEN_MESSAGE} from "@/lib/constants";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {getRequestsTo, parseRequestBody, routeFetchWithAuth} from "@/test/link-form-utils";
import {createShortLink} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";

const mocks = vi.hoisted(() => ({
    isDesktop: true,
    routerPush: vi.fn(),
    confetti: vi.fn(),
}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => mocks.isDesktop,
    useIsMobile: () => !mocks.isDesktop,
}));
vi.mock("next/navigation", () => ({
    useRouter: () => ({push: mocks.routerPush}),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
}));
vi.mock("canvas-confetti", () => ({default: mocks.confetti}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const GENERATED_KEY = "gen-key";
const LONG_URL = "https://example.com/article";

function mockCreateEndpoint(respond: () => Response): void {
    routeFetchWithAuth({
        [API_ENDPOINTS.SHORTLINKS_RANDOM]: () => Response.json({key: GENERATED_KEY}),
        [API_ENDPOINTS.SHORTLINKS]: respond,
    });
}

function renderModal(): {onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>} {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    render(<CreateLinkModal open onOpenChange={onOpenChange}/>);
    return {onOpenChange};
}

async function submitLink(user: ReturnType<typeof userEvent.setup>, url: string): Promise<void> {
    await user.type(screen.getByLabelText("Destination URL"), url);
    await waitFor(() => expect(screen.getByLabelText("Short Link")).toHaveValue(GENERATED_KEY));
    await user.click(screen.getByRole("button", {name: /^Create/}));
}

describe("CreateLinkModal", () => {
    const fetchLinks = vi.fn<(page?: number) => Promise<void>>();

    beforeEach(() => {
        mocks.isDesktop = true;
        fetchLinks.mockResolvedValue(undefined);
        useLinkStore.setState({fetchLinks});
        useTagStoreWithoutCount.setState({tags: [], loading: false, error: null, hasLoaded: false});
    });

    it("loads the tags for its picker when it opens outside the links page", async () => {
        const tag = createTag({id: "tag-1", name: "Campaign"});
        routeFetchWithAuth({
            [API_ENDPOINTS.SHORTLINKS_RANDOM]: () => Response.json({key: GENERATED_KEY}),
            [API_ENDPOINTS.TAGS]: () => Response.json({content: [tag]}),
        });

        renderModal();

        await waitFor(() => expect(useTagStoreWithoutCount.getState().tags).toEqual([tag]));
    });

    it("reuses tags that are already loaded instead of asking again", async () => {
        useTagStoreWithoutCount.setState({tags: [createTag()], hasLoaded: true});
        mockCreateEndpoint(() => Response.json(createShortLink()));

        renderModal();

        await screen.findByLabelText("Destination URL");
        expect(vi.mocked(fetchWithAuth).mock.calls.some(([url]) => String(url).startsWith(API_ENDPOINTS.TAGS))).toBe(false);
    });

    it("renders nothing of the form while closed", () => {
        render(<CreateLinkModal open={false} onOpenChange={vi.fn()}/>);

        expect(screen.queryByLabelText("Destination URL")).not.toBeInTheDocument();
    });

    it.each([true, false])("shows the create form with a generated key (desktop=%s)", async (isDesktop) => {
        mocks.isDesktop = isDesktop;
        mockCreateEndpoint(() => Response.json(createShortLink()));

        renderModal();

        expect(await screen.findByLabelText("Destination URL")).toBeInTheDocument();
        await waitFor(() => expect(screen.getByLabelText("Short Link")).toHaveValue(GENERATED_KEY));
        expect(screen.getByRole("dialog", {name: "Create link"})).toBeInTheDocument();
    });

    it("posts the new link and shows the created short URL", async () => {
        const user = userEvent.setup();
        const created = createShortLink({shortUrl: "https://sho.rt/gen-key", longUrl: LONG_URL});
        mockCreateEndpoint(() => Response.json(created));
        renderModal();

        await submitLink(user, LONG_URL);

        expect(await screen.findByText("Link Created!")).toBeInTheDocument();
        expect(screen.getByDisplayValue(created.shortUrl)).toHaveAttribute("readonly");
        const [request] = getRequestsTo(API_ENDPOINTS.SHORTLINKS, "POST");
        expect(parseRequestBody(request)).toEqual({longUrl: LONG_URL, title: DEFAULT_LINK_TITLE, key: GENERATED_KEY, isActive: true});
    });

    it("celebrates, returns to the first page of links and refreshes the list after creation", async () => {
        const user = userEvent.setup();
        mockCreateEndpoint(() => Response.json(createShortLink()));
        renderModal();

        await submitLink(user, LONG_URL);

        await waitFor(() => expect(fetchLinks).toHaveBeenCalledExactlyOnceWith(0));
        expect(mocks.confetti).toHaveBeenCalledOnce();
        expect(mocks.routerPush).toHaveBeenCalledWith(ROUTES.LINKS, {scroll: false});
    });

    it("leaves the confetti out for people who ask for reduced motion", async () => {
        const user = userEvent.setup();
        mockCreateEndpoint(() => Response.json(createShortLink()));
        renderModal();

        await submitLink(user, LONG_URL);

        await waitFor(() => expect(mocks.confetti).toHaveBeenCalledWith(expect.objectContaining({disableForReducedMotion: true})));
    });

    it("sends the selected tags with the new link", async () => {
        const user = userEvent.setup();
        const tag = createTag({id: "tag-7", name: "Launch"});
        useTagStoreWithoutCount.setState({tags: [tag]});
        mockCreateEndpoint(() => Response.json(createShortLink()));
        renderModal();

        await user.click(await screen.findByRole("button", {name: "Select tags"}));
        await user.click(await screen.findByRole("option", {name: tag.name}));
        await submitLink(user, LONG_URL);

        await screen.findByText("Link Created!");
        const [request] = getRequestsTo(API_ENDPOINTS.SHORTLINKS, "POST");
        expect(parseRequestBody(request).tagIds).toEqual([tag.id]);
    });

    it("tells the user when the short key is already taken and stays on the form", async () => {
        const user = userEvent.setup();
        mockCreateEndpoint(() => new Response(null, {status: 409}));
        renderModal();

        await submitLink(user, LONG_URL);

        expect(await screen.findByText(SHORT_KEY_TAKEN_MESSAGE)).toBeInTheDocument();
        expect(screen.queryByText("Link Created!")).not.toBeInTheDocument();
        expect(mocks.confetti).not.toHaveBeenCalled();
    });

    it("stays on the form without celebrating when the server fails", async () => {
        const user = userEvent.setup();
        mockCreateEndpoint(() => new Response(null, {status: 500}));
        renderModal();

        await submitLink(user, LONG_URL);

        await waitFor(() => expect(screen.getByRole("button", {name: /^Create/})).toBeEnabled());
        expect(screen.queryByText("Link Created!")).not.toBeInTheDocument();
        expect(fetchLinks).not.toHaveBeenCalled();
        expect(vi.mocked(fetchWithAuth)).toHaveBeenCalledWith(API_ENDPOINTS.SHORTLINKS, expect.objectContaining({method: "POST"}));
    });

    it("closes from the success screen", async () => {
        const user = userEvent.setup();
        mockCreateEndpoint(() => Response.json(createShortLink()));
        const {onOpenChange} = renderModal();
        await submitLink(user, LONG_URL);

        await user.click(await screen.findByRole("button", {name: "Done"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("closes through the cancel button", async () => {
        const user = userEvent.setup();
        mockCreateEndpoint(() => Response.json(createShortLink()));
        const {onOpenChange} = renderModal();

        await user.click(await screen.findByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
