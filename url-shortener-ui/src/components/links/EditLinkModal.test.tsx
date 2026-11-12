import {screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {EditLinkModal} from "@/components/links/EditLinkModal";
import type {ShortLinkDTO} from "@/lib/api-types";
import {API_ENDPOINTS, LINK_PASSWORD_COPY, SHORT_KEY_TAKEN_MESSAGE, TRY_AGAIN_LABEL} from "@/lib/constants";
import {HTTP_CONFLICT, HTTP_INTERNAL_SERVER_ERROR} from "@/lib/http-status";
import type {LinkItem} from "@/lib/types";
import {allTagsQueryOptions} from "@/lib/query/tag-queries";
import {createTestQueryClient, renderWithQuery} from "@/test/query-utils";
import {getRequestsTo, parseRequestBody, routeFetchWithAuth, type RouteHandler} from "@/test/link-form-utils";
import {createLinkItem, createProtectedShortLink, createShortLink} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";

const media = vi.hoisted(() => ({isDesktop: true}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn()}}));

const PASSWORD = "secret-pass";
const LIST_ITEM = createLinkItem({title: "My article", tagIds: ["tag-1"]});

interface RenderedModal {
    onOpenChange: ReturnType<typeof vi.fn<(open: boolean) => void>>;
    onSuccess: ReturnType<typeof vi.fn<(savedLink: LinkItem) => void>>;
}

function renderModal(link: LinkItem | null = LIST_ITEM): RenderedModal {
    const onOpenChange = vi.fn<(open: boolean) => void>();
    const onSuccess = vi.fn<(savedLink: LinkItem) => void>();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(allTagsQueryOptions.queryKey, [createTag({id: "tag-1", name: "Marketing"})]);
    renderWithQuery(<EditLinkModal open onOpenChange={onOpenChange} link={link} onSuccess={onSuccess}/>, queryClient);
    return {onOpenChange, onSuccess};
}

function mockServer(storedLink: ShortLinkDTO, respondToUpdate: RouteHandler = () => Response.json({})): void {
    routeFetchWithAuth({
        [API_ENDPOINTS.SHORTLINK_BY_ID(storedLink.id)]: () => Response.json(storedLink),
        [API_ENDPOINTS.SHORTLINKS]: respondToUpdate,
    });
}

function sentUpdate(): Record<string, unknown> {
    return parseRequestBody(getRequestsTo(API_ENDPOINTS.SHORTLINKS, "PUT")[0]);
}

describe("EditLinkModal", () => {
    beforeEach(() => {
        media.isDesktop = true;
    });

    it.each([true, false])("prefills the form with the link as the server has it (desktop=%s)", async (isDesktop) => {
        media.isDesktop = isDesktop;
        const stored = createShortLink({title: "Stored title", key: "stored", longUrl: "https://example.com/stored"});
        mockServer(stored);

        renderModal(createLinkItem({title: "Stale title"}));

        expect(await screen.findByLabelText("Destination URL")).toHaveValue(stored.longUrl);
        expect(screen.getByLabelText("Short Link")).toHaveValue("stored");
        expect(screen.getByLabelText("Title")).toHaveValue("Stored title");
        expect(screen.getByRole("dialog", {name: "Edit Link"})).toBeInTheDocument();
    });

    it("shows a loading state until the link arrives", async () => {
        routeFetchWithAuth({[API_ENDPOINTS.SHORTLINK_BY_ID(LIST_ITEM.id)]: () => new Promise<Response>(() => undefined)});

        renderModal();

        expect(await screen.findByText(LINK_PASSWORD_COPY.LOADING)).toBeInTheDocument();
        expect(screen.queryByLabelText("Destination URL")).not.toBeInTheDocument();
    });

    it("offers a retry when the link cannot be loaded, and shows the form once it loads", async () => {
        const user = userEvent.setup();
        let attempts = 0;
        routeFetchWithAuth({
            [API_ENDPOINTS.SHORTLINK_BY_ID(LIST_ITEM.id)]: () => {
                attempts += 1;
                return attempts === 1 ? new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}) : Response.json(createShortLink());
            },
        });
        renderModal();

        expect(await screen.findByText(LINK_PASSWORD_COPY.LOAD_FAILED)).toBeInTheDocument();
        await user.click(screen.getByRole("button", {name: TRY_AGAIN_LABEL}));

        expect(await screen.findByLabelText("Destination URL")).toBeInTheDocument();
    });

    it("prefills the password protection of a protected link", async () => {
        mockServer(createProtectedShortLink(PASSWORD));

        renderModal();

        expect(await screen.findByRole("switch", {name: LINK_PASSWORD_COPY.TOGGLE_LABEL})).toHaveAttribute("aria-checked", "true");
        expect(screen.getByLabelText(LINK_PASSWORD_COPY.INPUT_LABEL)).toHaveValue(PASSWORD);
        expect(screen.getByLabelText(LINK_PASSWORD_COPY.INPUT_LABEL)).toHaveAttribute("type", "password");
    });

    it("keeps the password when other fields are edited", async () => {
        const user = userEvent.setup();
        mockServer(createProtectedShortLink(PASSWORD));
        const {onSuccess} = renderModal();

        await user.clear(await screen.findByLabelText("Title"));
        await user.type(screen.getByLabelText("Title"), "Renamed");
        await user.click(screen.getByRole("button", {name: "Save"}));

        await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
        expect(sentUpdate()).toMatchObject({title: "Renamed", password: PASSWORD});
        expect(onSuccess.mock.calls[0][0]).toMatchObject({isPasswordProtected: true});
    });

    it("removes the protection when the switch is turned off", async () => {
        const user = userEvent.setup();
        mockServer(createProtectedShortLink(PASSWORD));
        const {onSuccess} = renderModal();

        await user.click(await screen.findByRole("switch", {name: LINK_PASSWORD_COPY.TOGGLE_LABEL}));
        await user.click(screen.getByRole("button", {name: "Save"}));

        await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
        expect(sentUpdate()).toHaveProperty("password", null);
        expect(onSuccess.mock.calls[0][0]).toMatchObject({isPasswordProtected: false});
    });

    it("reports the saved link with its short URL following a changed key", async () => {
        const user = userEvent.setup();
        mockServer(createShortLink({id: "link-42", key: "old-key", shortUrl: "https://sho.rt/old-key"}));
        const {onSuccess} = renderModal(createLinkItem({id: "link-42"}));

        await user.clear(await screen.findByLabelText("Short Link"));
        await user.type(screen.getByLabelText("Short Link"), "new-key");
        await user.click(screen.getByRole("button", {name: "Save"}));

        await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
        expect(onSuccess.mock.calls[0][0]).toMatchObject({id: "link-42", key: "new-key", shortUrl: "https://sho.rt/new-key"});
    });

    it("saves the edited link keeping its id and archived state, then closes", async () => {
        const user = userEvent.setup();
        const stored = createShortLink({id: "link-42", isActive: false, title: "Old", tagIds: ["tag-1"]});
        mockServer(stored);
        const {onSuccess, onOpenChange} = renderModal(createLinkItem({id: "link-42"}));

        await user.clear(await screen.findByLabelText("Title"));
        await user.type(screen.getByLabelText("Title"), "New title");
        await user.click(screen.getByRole("button", {name: "Save"}));

        await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
        expect(onSuccess).toHaveBeenCalledExactlyOnceWith({
            id: "link-42", isActive: false, isPasswordProtected: false, title: "New title", key: stored.key,
            shortUrl: stored.shortUrl, longUrl: stored.longUrl, tagIds: ["tag-1"],
        });
        expect(sentUpdate()).toEqual({
            id: "link-42", longUrl: stored.longUrl, title: "New title", key: stored.key, isActive: false, password: null, tagIds: ["tag-1"],
        });
    });

    it("keeps the dialog open and reports a taken key on conflict", async () => {
        const user = userEvent.setup();
        mockServer(createShortLink(), () => new Response(null, {status: HTTP_CONFLICT}));
        const {onSuccess, onOpenChange} = renderModal();

        await user.click(await screen.findByRole("button", {name: "Save"}));

        expect(await screen.findByText(SHORT_KEY_TAKEN_MESSAGE)).toBeInTheDocument();
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("keeps the dialog open and re-enables saving when the server fails", async () => {
        const user = userEvent.setup();
        mockServer(createShortLink(), () => new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));
        const {onSuccess, onOpenChange} = renderModal();

        await user.click(await screen.findByRole("button", {name: "Save"}));

        await waitFor(() => expect(screen.getByRole("button", {name: "Save"})).toBeEnabled());
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("closes without saving when cancelled", async () => {
        const user = userEvent.setup();
        mockServer(createShortLink());
        const {onOpenChange} = renderModal();

        await user.click(await screen.findByRole("button", {name: "Cancel"}));

        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(getRequestsTo(API_ENDPOINTS.SHORTLINKS, "PUT")).toHaveLength(0);
    });
});
