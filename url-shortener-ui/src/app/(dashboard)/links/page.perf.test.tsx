import {act, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import LinksPage from "@/app/(dashboard)/links/page";
import {API_ENDPOINTS, DEFAULT_PAGE_SIZE} from "@/lib/constants";
import {resetImportTrackerForTests} from "@/lib/store/import";
import {useLinkStore} from "@/lib/store/links";
import {allTagsQueryOptions} from "@/lib/query/tag-queries";
import {queryKeys} from "@/lib/query/query-keys";
import type {QueryClient} from "@tanstack/react-query";
import {routeFetchWithAuth} from "@/test/link-form-utils";
import {renderWithQuery} from "@/test/query-utils";
import {createPage, createShortLink} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";
import {stubDesktopViewport} from "@/test/viewport-utils";

// Render counts are allowed only in *.perf.test.tsx (run by `pnpm test:perf` with the React Compiler on).
const renders = vi.hoisted(() => ({card: 0, page: 0, router: {push: () => undefined, replace: () => undefined}}));

vi.mock("@/lib/api", async (importOriginal) => ({...await importOriginal<typeof import("@/lib/api")>(), fetchWithAuth: vi.fn()}));
vi.mock("next/navigation", () => ({
    useRouter: () => renders.router,
    usePathname: () => "/links",
    // The links page reads its search params exactly once per render.
    useSearchParams: () => {
        renders.page++;
        return new URLSearchParams();
    },
}));
vi.mock("@/components/links/LinkCard", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/components/links/LinkCard")>();
    return {
        LinkCard: (props: Parameters<typeof actual.LinkCard>[0]) => {
            renders.card++;
            return actual.LinkCard(props);
        },
    };
});

const HOVERED_CARD_COUNT = 10;
const SEARCH_TEXT = "abcdefgh";
const MAX_CARD_RENDERS_ON_MOUNT = DEFAULT_PAGE_SIZE;

async function hoverAcrossCards(): Promise<void> {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-link-id]")).slice(0, HOVERED_CARD_COUNT);
    const user = userEvent.setup();
    for (const card of cards) await user.hover(card);
    await user.unhover(cards[cards.length - 1]);
}

function countKeydownRegistrations(addListenerCalls: ReadonlyArray<readonly unknown[]>): number {
    return addListenerCalls.filter(([type]) => type === "keydown").length;
}

async function waitForTags(queryClient: QueryClient): Promise<void> {
    await waitFor(() => expect(queryClient.getQueryState(allTagsQueryOptions.queryKey)?.status).toBe("success"));
}

async function renderLinksPage(): Promise<QueryClient> {
    const links = Array.from({length: DEFAULT_PAGE_SIZE}, (_, index) =>
        createShortLink({id: `link-${index}`, title: `Link ${index}`, key: `k${index}`, shortUrl: `https://sho.rt/k${index}`}));
    routeFetchWithAuth({
        [API_ENDPOINTS.SHORTLINKS]: () => Response.json(createPage(links, {
            page: {totalPages: 1, totalElements: DEFAULT_PAGE_SIZE, size: DEFAULT_PAGE_SIZE, number: 0},
        })),
        [API_ENDPOINTS.TAGS]: () => Response.json([]),
        [API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES]: () => new Response("", {headers: {"Content-Type": "text/event-stream"}}),
    });
    const {queryClient} = renderWithQuery(<LinksPage/>);
    await screen.findByRole("heading", {name: "Link 0"});
    return queryClient;
}

describe("links page render counts", () => {
    beforeEach(() => {
        stubDesktopViewport();
        useLinkStore.setState(useLinkStore.getInitialState(), true);
        resetImportTrackerForTests();
        renders.card = 0;
        renders.page = 0;
    });

    it("renders each card once while the page mounts", async () => {
        await renderLinksPage();

        expect(renders.card).toBeLessThanOrEqual(MAX_CARD_RENDERS_ON_MOUNT);
    });

    it("re-renders each card at most once when the shared tags arrive", async () => {
        const queryClient = await renderLinksPage();
        renders.card = 0;

        await waitForTags(queryClient);

        expect(renders.card).toBeLessThanOrEqual(MAX_CARD_RENDERS_ON_MOUNT);
    });

    it("does not re-render the page or its cards while the pointer moves across them", async () => {
        await waitForTags(await renderLinksPage());
        renders.card = 0;
        renders.page = 0;

        await hoverAcrossCards();

        expect(renders.card).toBe(0);
        expect(renders.page).toBe(0);
    });

    it("keeps the keyboard shortcut listeners registered while the pointer moves across cards", async () => {
        await waitForTags(await renderLinksPage());
        const addListener = vi.spyOn(document, "addEventListener");

        await hoverAcrossCards();

        expect(countKeydownRegistrations(addListener.mock.calls)).toBe(0);
    });

    it("does not re-render cards while the user types a search", async () => {
        await waitForTags(await renderLinksPage());
        const user = userEvent.setup();
        renders.card = 0;

        await user.type(screen.getByPlaceholderText("Search by URL or title"), SEARCH_TEXT);

        expect(renders.card).toBe(0);
    });

    it("does not re-render the page when the tags the cards read change", async () => {
        const queryClient = await renderLinksPage();
        await waitForTags(queryClient);
        renders.page = 0;

        act(() => queryClient.setQueryData(allTagsQueryOptions.queryKey, [createTag({id: "late", name: "Late"})]));

        expect(renders.page).toBe(0);
    });

    it("does not re-render cards when an unrelated query changes", async () => {
        const queryClient = await renderLinksPage();
        await waitForTags(queryClient);
        renders.card = 0;

        act(() => queryClient.setQueryData(queryKeys.tags.list({withLinksCount: true, search: "zzz"}), []));

        expect(renders.card).toBe(0);
    });
});
