import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import LinksPage from "@/app/(dashboard)/links/page";
import {API_ENDPOINTS, DEFAULT_PAGE_SIZE} from "@/lib/constants";
import {resetImportTrackerForTests} from "@/lib/store/import";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {routeFetchWithAuth} from "@/test/link-form-utils";
import {createPage, createShortLink} from "@/test/link-utils";
import {stubDesktopViewport} from "@/test/viewport-utils";

// Render counts are allowed only in *.perf.test.tsx (run by `pnpm test:perf` with the React Compiler on).
const renders = vi.hoisted(() => ({card: 0, router: {push: () => undefined, replace: () => undefined}}));

vi.mock("@/lib/api", async (importOriginal) => ({...await importOriginal<typeof import("@/lib/api")>(), fetchWithAuth: vi.fn()}));
vi.mock("next/navigation", () => ({
    useRouter: () => renders.router,
    usePathname: () => "/links",
    useSearchParams: () => new URLSearchParams(),
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
const MAX_CARD_RENDERS_ON_MOUNT = 2 * DEFAULT_PAGE_SIZE;

async function renderLinksPage(): Promise<void> {
    const links = Array.from({length: DEFAULT_PAGE_SIZE}, (_, index) =>
        createShortLink({id: `link-${index}`, title: `Link ${index}`, key: `k${index}`, shortUrl: `https://sho.rt/k${index}`}));
    routeFetchWithAuth({
        [API_ENDPOINTS.SHORTLINKS]: () => Response.json(createPage(links, {
            page: {totalPages: 1, totalElements: DEFAULT_PAGE_SIZE, size: DEFAULT_PAGE_SIZE, number: 0},
        })),
        [API_ENDPOINTS.TAGS]: () => Response.json([]),
        [API_ENDPOINTS.SHORTLINKS_IMPORT_UPDATES]: () => new Response("", {headers: {"Content-Type": "text/event-stream"}}),
    });
    render(<LinksPage/>);
    await screen.findByRole("heading", {name: "Link 0"});
}

describe("links page render counts", () => {
    beforeEach(() => {
        stubDesktopViewport();
        useLinkStore.setState(useLinkStore.getInitialState(), true);
        useTagStoreWithoutCount.setState(useTagStoreWithoutCount.getInitialState(), true);
        resetImportTrackerForTests();
        renders.card = 0;
    });

    it("renders each card at most twice while the page mounts", async () => {
        await renderLinksPage();

        expect(renders.card).toBeLessThanOrEqual(MAX_CARD_RENDERS_ON_MOUNT);
    });

    it("does not re-render cards while the pointer moves across them", async () => {
        await renderLinksPage();
        const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-link-id]")).slice(0, HOVERED_CARD_COUNT);
        const user = userEvent.setup();
        renders.card = 0;

        for (const card of cards) await user.hover(card);
        await user.unhover(cards[cards.length - 1]);

        expect(renders.card).toBe(0);
    });

    it("does not re-render cards while the user types a search", async () => {
        await renderLinksPage();
        const user = userEvent.setup();
        renders.card = 0;

        await user.type(screen.getByPlaceholderText("Search by URL or title"), SEARCH_TEXT);

        expect(renders.card).toBe(0);
    });

    it("does not re-render cards when an unrelated store changes", async () => {
        await renderLinksPage();
        renders.card = 0;

        act(() => useTagStoreWithoutCount.getState().setSearchQuery("zzz"));

        expect(renders.card).toBe(0);
    });
});
