import type {ReactNode} from "react";
import {renderHook, waitFor} from "@testing-library/react";
import {QueryClientProvider, type QueryClient} from "@tanstack/react-query";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {DEFAULT_PAGE_SIZE} from "@/lib/constants";
import {useLinksPage} from "@/lib/hooks/useLinksPage";
import {fetchLinksPage, type LinksPage, type LinksPageParams} from "@/lib/links-api";
import {createLinkItem} from "@/test/link-utils";
import {createTestQueryClient} from "@/test/query-utils";

vi.mock("@/lib/links-api", () => ({fetchLinksPage: vi.fn()}));

const FIRST_PAGE: LinksPageParams = {page: 0, showArchived: false, search: ""};

function linksPage(page: number, totalElements: number): LinksPage {
    return {links: [createLinkItem({id: `link-${page}`})], page, totalElements, totalPages: Math.ceil(totalElements / DEFAULT_PAGE_SIZE)};
}

let queryClient: QueryClient;

function renderLinksPage(initialParams: LinksPageParams, isEnabled = true) {
    const wrapper = ({children}: {children: ReactNode}) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(({params, enabled}) => useLinksPage(params, enabled), {wrapper, initialProps: {params: initialParams, enabled: isEnabled}});
}

function requestedPages(): number[] {
    return vi.mocked(fetchLinksPage).mock.calls.map(([params]) => params.page);
}

describe("useLinksPage", () => {
    beforeEach(() => {
        queryClient = createTestQueryClient();
        vi.mocked(fetchLinksPage).mockImplementation(async ({page}) => linksPage(page, DEFAULT_PAGE_SIZE * 3));
    });

    it("waits until it is enabled", async () => {
        const {result, rerender} = renderLinksPage(FIRST_PAGE, false);

        expect(fetchLinksPage).not.toHaveBeenCalled();
        rerender({params: FIRST_PAGE, enabled: true});

        await waitFor(() => expect(result.current.data?.page).toBe(0));
    });

    it("fetches the next page ahead once a page has loaded", async () => {
        renderLinksPage(FIRST_PAGE);

        await waitFor(() => expect(requestedPages()).toEqual([0, 1]));
    });

    it("does not fetch past the last page", async () => {
        vi.mocked(fetchLinksPage).mockResolvedValue(linksPage(0, DEFAULT_PAGE_SIZE));
        const {result} = renderLinksPage(FIRST_PAGE);

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestedPages()).toEqual([0]);
    });

    it("keeps the previous page on screen while another one loads", async () => {
        const {result, rerender} = renderLinksPage(FIRST_PAGE);
        await waitFor(() => expect(result.current.data?.page).toBe(0));
        vi.mocked(fetchLinksPage).mockReturnValue(new Promise<LinksPage>(() => undefined));

        rerender({params: {...FIRST_PAGE, search: "docs"}, enabled: true});

        expect(result.current.isPlaceholderData).toBe(true);
        expect(result.current.data?.page).toBe(0);
    });

    it("shows a page it has already loaded at once when the user comes back to it", async () => {
        const {result, rerender} = renderLinksPage(FIRST_PAGE);
        await waitFor(() => expect(requestedPages()).toEqual([0, 1]));

        rerender({params: {...FIRST_PAGE, page: 1}, enabled: true});

        expect(result.current.isPlaceholderData).toBe(false);
        expect(result.current.data?.page).toBe(1);
    });

    it("reports a failed load", async () => {
        vi.mocked(fetchLinksPage).mockRejectedValue(new Error("offline"));
        const {result} = renderLinksPage(FIRST_PAGE);

        await waitFor(() => expect(result.current.isError).toBe(true));
    });
});
