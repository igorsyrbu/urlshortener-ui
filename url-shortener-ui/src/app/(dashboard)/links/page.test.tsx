import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import LinksPage from "./page";
import {
    DROPZONE_HINT,
    EXPORT_MODAL_TITLE,
    IMPORT_FROM_CSV_LABEL,
    IMPORT_PROCESSED_TITLE,
} from "@/components/links/import-export-constants";
import {API_ENDPOINTS, DEFAULT_PAGE_SIZE, ROUTES, SHOW_ARCHIVED_STORAGE_KEY} from "@/lib/constants";
import {useLinkStore} from "@/lib/store/links";
import {IMPORT_TRACKING_STATUS, resetImportTrackerForTests, useImportTracker} from "@/lib/store/import";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useUIStore} from "@/lib/store/ui";
import {createImportJob} from "@/test/import-utils";
import {getQueriesOfRequestsTo, getRequestsTo, parseRequestBody, routeFetchWithAuth} from "@/test/link-form-utils";
import {createPage, createShortLink} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";
import type {ShortLinkDTO} from "@/lib/api-types";

const mocks = vi.hoisted(() => ({
    routerPush: vi.fn(),
    searchParams: new URLSearchParams(),
}));

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));
vi.mock("next/navigation", () => ({
    useRouter: () => ({push: mocks.routerPush}),
    usePathname: () => ROUTES.LINKS,
    useSearchParams: () => mocks.searchParams,
}));
vi.mock("qr-code-styling", () => ({
    default: class QRCodeStylingStub {
        append = vi.fn();
        update = vi.fn();
        download = vi.fn();
        getRawData = vi.fn();
    },
}));

const HTTP_SERVER_ERROR = 500;
const SEARCH_DEBOUNCE_TIMEOUT_MS = 2000;
const SEARCH_PLACEHOLDER = "Search by URL or title";

interface ApiScenario {
    links: ShortLinkDTO[];
    totalElements?: number;
    linksStatus?: number;
    deleteStatus?: number;
}

function createLinks(count: number): ShortLinkDTO[] {
    return Array.from({length: count}, (_, index) => createShortLink({
        id: `link-${index}`, title: `Link ${index}`, key: `key${index}`, shortUrl: `https://sho.rt/key${index}`,
    }));
}

function mockApi({links, totalElements = links.length, linksStatus, deleteStatus}: ApiScenario): void {
    const routes = {
        [API_ENDPOINTS.SHORTLINKS]: (init: RequestInit | undefined) => {
            if (init?.method === "PUT") return Response.json({});
            if (linksStatus) return new Response(null, {status: linksStatus});
            return Response.json(createPage(links, {page: {totalPages: Math.ceil(totalElements / DEFAULT_PAGE_SIZE), totalElements, size: DEFAULT_PAGE_SIZE, number: 0}}));
        },
        [API_ENDPOINTS.TAGS]: () => Response.json([]),
        [API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES]: () => new Response("", {headers: {"Content-Type": "text/event-stream"}}),
        ...Object.fromEntries(links.map((link) => [
            `${API_ENDPOINTS.SHORTLINKS}/${link.id}`,
            () => new Response(null, {status: deleteStatus ?? 204}),
        ])),
    };
    routeFetchWithAuth(routes);
}

function openUpdatesStream(): void {
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const stream = new ReadableStream<Uint8Array>({start(controller): void { streamController = controller; }});
    vi.mocked(fetchWithAuth).mockImplementationOnce(async (_endpoint, options) => {
        options?.signal?.addEventListener("abort", () => { streamController?.error(new DOMException("Aborted", "AbortError")); }, {once: true});
        return new Response(stream, {headers: {"Content-Type": "text/event-stream"}});
    });
}

function getOptionsTrigger(): HTMLElement {
    const trigger = screen.getAllByRole("button").find((button) => !button.hasAttribute("aria-label"));
    if (!trigger) throw new Error("Options trigger not found");
    return trigger;
}

async function openLinkActions(user: ReturnType<typeof userEvent.setup>, linkIndex: number): Promise<void> {
    await screen.findByRole("heading", {name: `Link ${linkIndex}`});
    await user.click(screen.getAllByRole("button", {name: "More actions for link"})[linkIndex]);
}

describe("links page", () => {
    beforeEach(() => {
        mocks.searchParams = new URLSearchParams();
        useLinkStore.setState({
            links: [], loading: false, error: null, showArchived: false, searchQuery: "",
            currentPage: 0, totalElements: 0, totalPages: 0,
        });
        useTagStoreWithoutCount.setState({tags: [], loading: false, error: null, searchQuery: ""});
        useUIStore.setState({isCreateModalOpen: false});
        resetImportTrackerForTests();
        mockApi({links: []});
    });

    describe("listing", () => {
        it("loads the first page of links and shows each link", async () => {
            mockApi({links: createLinks(3)});

            render(<LinksPage/>);

            expect(await screen.findByRole("heading", {name: "Link 0"})).toBeInTheDocument();
            expect(screen.getByRole("heading", {name: "Link 2"})).toBeInTheDocument();
            expect(getQueriesOfRequestsTo(API_ENDPOINTS.SHORTLINKS)[0].get("page")).toBe("0");
        });

        it("shows tags resolved from the tag list on their links", async () => {
            routeFetchWithAuth({
                [API_ENDPOINTS.SHORTLINKS]: () => Response.json(createPage([createShortLink({id: "l1", title: "Tagged", tagIds: ["tag-1"]})])),
                [API_ENDPOINTS.TAGS]: () => Response.json([createTag({id: "tag-1", name: "Marketing"})]),
                [API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES]: () => new Response("", {headers: {"Content-Type": "text/event-stream"}}),
            });

            render(<LinksPage/>);

            expect(await screen.findByText("Marketing")).toBeInTheDocument();
        });

        it("invites the user to create a first link when there are none", async () => {
            render(<LinksPage/>);

            expect(await screen.findByRole("heading", {name: "Your links will live here"})).toBeInTheDocument();
        });

        it("loads the page requested in the URL", async () => {
            mocks.searchParams = new URLSearchParams({page: "3"});
            mockApi({links: createLinks(2), totalElements: 45});

            render(<LinksPage/>);

            await screen.findByRole("heading", {name: "Link 0"});
            expect(getQueriesOfRequestsTo(API_ENDPOINTS.SHORTLINKS)[0].get("page")).toBe("2");
        });

        it("shows the error banner when links cannot be loaded and lets the user dismiss it", async () => {
            const user = userEvent.setup();
            mockApi({links: [], linksStatus: HTTP_SERVER_ERROR});

            render(<LinksPage/>);

            expect(await screen.findByText(`Failed to fetch links: ${HTTP_SERVER_ERROR}`)).toBeInTheDocument();
            await user.click(screen.getByRole("button", {name: "Dismiss"}));
            expect(screen.queryByText(/Failed to fetch links/)).not.toBeInTheDocument();
        });
    });

    describe("search", () => {
        it("searches by the trimmed text typed into the search field", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(2)});
            render(<LinksPage/>);
            await screen.findByRole("heading", {name: "Link 0"});

            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "  promo ");

            await waitFor(() => expect(getQueriesOfRequestsTo(API_ENDPOINTS.SHORTLINKS).some((query) => query.get("search") === "promo")).toBe(true),
                {timeout: SEARCH_DEBOUNCE_TIMEOUT_MS});
        });

        it("says nothing matched when a search returns no links", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(1)});
            render(<LinksPage/>);
            await screen.findByRole("heading", {name: "Link 0"});
            mockApi({links: []});

            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "zzz");

            expect(await screen.findByText("No links found", {}, {timeout: SEARCH_DEBOUNCE_TIMEOUT_MS})).toBeInTheDocument();
        });
    });

    describe("pagination", () => {
        it("shows the range label and moves to the next page", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(DEFAULT_PAGE_SIZE), totalElements: 45});
            render(<LinksPage/>);
            expect(await screen.findByText("1-20 of 45 links")).toBeInTheDocument();

            await user.click(screen.getByRole("button", {name: "Go to next page"}));

            await waitFor(() => expect(getQueriesOfRequestsTo(API_ENDPOINTS.SHORTLINKS).some((query) => query.get("page") === "1")).toBe(true));
            expect(mocks.routerPush).toHaveBeenCalledWith(`${ROUTES.LINKS}?page=2`, {scroll: false});
        });

        it("hides pagination when there are no links", async () => {
            render(<LinksPage/>);
            await screen.findByRole("heading", {name: "Your links will live here"});

            expect(screen.queryByRole("navigation", {name: "Links pagination"})).not.toBeInTheDocument();
        });
    });

    describe("link actions", () => {
        it("deletes a link after the user types its handle and closes the dialog", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(2)});
            render(<LinksPage/>);
            await openLinkActions(user, 1);

            await user.click(await screen.findByRole("menuitem", {name: /Delete/}));
            await user.type(await screen.findByPlaceholderText("Type the short link handle here"), "key1");
            await user.click(screen.getByRole("button", {name: "Delete link"}));

            await waitFor(() => expect(getRequestsTo(`${API_ENDPOINTS.SHORTLINKS}/link-1`, "DELETE")).toHaveLength(1));
            await waitFor(() => expect(screen.queryByText("Delete this link?")).not.toBeInTheDocument());
        });

        it("keeps the delete dialog open when the server refuses to delete", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(1), deleteStatus: HTTP_SERVER_ERROR});
            render(<LinksPage/>);
            await openLinkActions(user, 0);

            await user.click(await screen.findByRole("menuitem", {name: /Delete/}));
            await user.type(await screen.findByPlaceholderText("Type the short link handle here"), "key0");
            await user.click(screen.getByRole("button", {name: "Delete link"}));

            await waitFor(() => expect(getRequestsTo(`${API_ENDPOINTS.SHORTLINKS}/link-0`, "DELETE")).toHaveLength(1));
            await waitFor(() => expect(screen.getByRole("button", {name: "Delete link"})).toBeEnabled());
            expect(screen.getByText("Delete this link?")).toBeInTheDocument();
        });

        it("archives a link after confirmation", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(1)});
            render(<LinksPage/>);
            await openLinkActions(user, 0);

            await user.click(await screen.findByRole("menuitem", {name: /Archive/}));
            await user.click(await screen.findByRole("button", {name: "Archive link"}));

            await waitFor(() => expect(getRequestsTo(API_ENDPOINTS.SHORTLINKS, "PUT")).toHaveLength(1));
            expect(parseRequestBody(getRequestsTo(API_ENDPOINTS.SHORTLINKS, "PUT")[0])).toMatchObject({id: "link-0", isActive: false});
        });

        it("opens the edit form prefilled with the link", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(1)});
            render(<LinksPage/>);
            await openLinkActions(user, 0);

            await user.click(await screen.findByRole("menuitem", {name: /Edit/}));

            expect(await screen.findByRole("dialog", {name: "Edit Link"})).toBeInTheDocument();
            expect(screen.getByLabelText("Short Link")).toHaveValue("key0");
        });

        it("opens the QR code dialog for the link", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(1)});
            render(<LinksPage/>);
            await openLinkActions(user, 0);

            await user.click(await screen.findByRole("menuitem", {name: /QR Code/}));

            expect(await screen.findByRole("dialog", {name: "QR Code"})).toBeInTheDocument();
        });
    });

    describe("archived links shortcut", () => {
        it("toggles archived links with the a key and remembers the choice", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(1)});
            render(<LinksPage/>);
            await screen.findByRole("heading", {name: "Link 0"});

            await user.keyboard("a");

            await waitFor(() => expect(getQueriesOfRequestsTo(API_ENDPOINTS.SHORTLINKS).some((query) => query.get("showArchived") === "true")).toBe(true));
            expect(localStorage.getItem(SHOW_ARCHIVED_STORAGE_KEY)).toBe("true");
        });

        it("ignores the a key while typing in the search field", async () => {
            const user = userEvent.setup();
            mockApi({links: createLinks(1)});
            render(<LinksPage/>);
            await screen.findByRole("heading", {name: "Link 0"});

            await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "a");

            expect(useLinkStore.getState().showArchived).toBe(false);
        });
    });

    describe("export", () => {
        it("opens the export dialog from the options menu", async () => {
            const user = userEvent.setup();
            render(<LinksPage/>);
            await screen.findByRole("heading", {name: "Your links will live here"});

            await user.click(getOptionsTrigger());
            await user.click(await screen.findByRole("menuitem", {name: "Export links as CSV"}));

            expect(await screen.findByRole("dialog", {name: EXPORT_MODAL_TITLE})).toBeInTheDocument();
        });
    });

    describe("import entry", () => {
        it("opens a fresh import form instead of the previous completion screen", async () => {
            const user = userEvent.setup();
            useImportTracker.setState({
                status: IMPORT_TRACKING_STATUS.COMPLETED,
                progress: {processedRows: 10, totalRows: 10},
                job: {...createImportJob(), status: "COMPLETED", processedRows: 10},
            });
            render(<LinksPage/>);

            await user.click(getOptionsTrigger());
            await user.click(await screen.findByRole("menuitem", {name: IMPORT_FROM_CSV_LABEL}));

            expect(await screen.findByText(DROPZONE_HINT)).toBeInTheDocument();
            expect(screen.queryByText(IMPORT_PROCESSED_TITLE)).not.toBeInTheDocument();
            expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE);
        });

        it("closes the import stream when navigating away from links", () => {
            openUpdatesStream();
            act(() => { useImportTracker.getState().trackSubmission(createImportJob()); });
            const signal = vi.mocked(fetchWithAuth).mock.calls.at(-1)?.[1]?.signal;
            const {unmount} = render(<LinksPage/>);
            expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.ACTIVE);

            unmount();

            expect(signal?.aborted).toBe(true);
            expect(useImportTracker.getState().status).toBe(IMPORT_TRACKING_STATUS.IDLE);
            expect(useImportTracker.getState().progress).toBeNull();
        });
    });
});
