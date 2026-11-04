import type {ReactNode} from "react";
import {act, renderHook} from "@testing-library/react";
import {QueryClientProvider, type QueryClient} from "@tanstack/react-query";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {DEFAULT_LINK_TITLE} from "@/lib/constants";
import {useLinkListActions} from "@/lib/hooks/useLinkListActions";
import {deleteShortLink, saveArchiveStatus, type LinksPage, type LinksPageParams} from "@/lib/links-api";
import {queryKeys} from "@/lib/query/query-keys";
import {STALE_AFTER} from "@/lib/query/invalidation";
import {createLinkItem} from "@/test/link-utils";
import {createTestQueryClient} from "@/test/query-utils";

vi.mock("@/lib/links-api", () => ({saveArchiveStatus: vi.fn(), deleteShortLink: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const HIDING_ARCHIVED: LinksPageParams = {page: 0, showArchived: false, search: ""};
const SHOWING_ARCHIVED: LinksPageParams = {...HIDING_ARCHIVED, showArchived: true};
const LINK_A = createLinkItem({id: "a", title: "Old"});
const LINK_B = createLinkItem({id: "b", title: "Other"});
const PAGE: LinksPage = {links: [LINK_A, LINK_B], page: 0, totalElements: 2, totalPages: 1};

let queryClient: QueryClient;

function renderActions(params: LinksPageParams) {
    queryClient.setQueryData(queryKeys.links.page(params), PAGE);
    const wrapper = ({children}: {children: ReactNode}) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    return renderHook(() => useLinkListActions(params), {wrapper}).result;
}

function cachedPage(params: LinksPageParams): LinksPage | undefined {
    return queryClient.getQueryData<LinksPage>(queryKeys.links.page(params));
}

describe("useLinkListActions", () => {
    beforeEach(() => {
        queryClient = createTestQueryClient();
    });

    it("removes an archived link from the page before the server answers when archived links are hidden", async () => {
        const save = Promise.withResolvers<boolean>();
        vi.mocked(saveArchiveStatus).mockReturnValueOnce(save.promise);
        const actions = renderActions(HIDING_ARCHIVED);

        const archiving = act(() => actions.current.setLinkArchived(LINK_A, true));
        await vi.waitFor(() => expect(cachedPage(HIDING_ARCHIVED)?.links.map((link) => link.id)).toEqual(["b"]));
        expect(cachedPage(HIDING_ARCHIVED)?.totalElements).toBe(1);

        save.resolve(true);
        await archiving;
    });

    it("keeps an archived link on the page, marked archived, when archived links are shown", async () => {
        vi.mocked(saveArchiveStatus).mockResolvedValueOnce(true);
        const actions = renderActions(SHOWING_ARCHIVED);

        await act(() => actions.current.setLinkArchived(LINK_A, true));

        expect(cachedPage(SHOWING_ARCHIVED)?.links.map((link) => [link.id, link.isActive])).toEqual([["a", false], ["b", true]]);
    });

    it("refetches every links query once the server has answered an archive", async () => {
        vi.mocked(saveArchiveStatus).mockResolvedValueOnce(true);
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const actions = renderActions(HIDING_ARCHIVED);

        await act(() => actions.current.setLinkArchived(LINK_A, true));

        expect(invalidate.mock.calls).toEqual(STALE_AFTER.linkArchived.map((queryKey) => [{queryKey}]));
    });

    it("also refreshes the tags page's link counts after a delete", async () => {
        vi.mocked(deleteShortLink).mockResolvedValueOnce(true);
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const actions = renderActions(HIDING_ARCHIVED);

        await act(() => actions.current.deleteLink("a"));

        expect(invalidate.mock.calls).toEqual(STALE_AFTER.linkDeleted.map((queryKey) => [{queryKey}]));
        expect(STALE_AFTER.linkDeleted).toContainEqual(queryKeys.tags.withLinkCounts);
    });

    it("refuses without calling the API when the link has no key", async () => {
        const actions = renderActions(HIDING_ARCHIVED);

        await expect(act(() => actions.current.setLinkArchived({...LINK_A, key: undefined}, true))).resolves.toBe(false);

        expect(saveArchiveStatus).not.toHaveBeenCalled();
        expect(cachedPage(HIDING_ARCHIVED)).toEqual(PAGE);
    });

    it("restores the page and resolves false when archiving fails", async () => {
        vi.mocked(saveArchiveStatus).mockResolvedValueOnce(false);
        const actions = renderActions(HIDING_ARCHIVED);

        await expect(act(() => actions.current.setLinkArchived(LINK_A, true))).resolves.toBe(false);

        expect(cachedPage(HIDING_ARCHIVED)).toEqual(PAGE);
    });

    it("removes a deleted link before the server answers", async () => {
        const deletion = Promise.withResolvers<boolean>();
        vi.mocked(deleteShortLink).mockReturnValueOnce(deletion.promise);
        const actions = renderActions(HIDING_ARCHIVED);

        const deleting = act(() => actions.current.deleteLink("a"));
        await vi.waitFor(() => expect(cachedPage(HIDING_ARCHIVED)?.links.map((link) => link.id)).toEqual(["b"]));

        deletion.resolve(true);
        await expect(deleting).resolves.toBe(true);
        expect(deleteShortLink).toHaveBeenCalledWith("a");
    });

    it("puts the link back and resolves false when deleting fails", async () => {
        vi.mocked(deleteShortLink).mockResolvedValueOnce(false);
        const actions = renderActions(HIDING_ARCHIVED);

        await expect(act(() => actions.current.deleteLink("a"))).resolves.toBe(false);

        expect(cachedPage(HIDING_ARCHIVED)).toEqual(PAGE);
    });

    it("shows a saved link in place at once and refetches the links", () => {
        const invalidate = vi.spyOn(queryClient, "invalidateQueries");
        const actions = renderActions(HIDING_ARCHIVED);

        act(() => actions.current.applySavedLink({...LINK_A, title: "New", longUrl: "https://example.com/new"}));

        expect(cachedPage(HIDING_ARCHIVED)?.links.map((link) => [link.id, link.title, link.longUrl])).toEqual([
            ["a", "New", "https://example.com/new"],
            ["b", "Other", LINK_B.longUrl],
        ]);
        expect(invalidate.mock.calls).toEqual(STALE_AFTER.linkSaved.map((queryKey) => [{queryKey}]));
    });

    it("shows a saved link in every cached page that holds it, not only the one on screen", () => {
        const otherFilter: LinksPageParams = {...HIDING_ARCHIVED, search: "old"};
        queryClient.setQueryData(queryKeys.links.page(otherFilter), {...PAGE, links: [LINK_A]});
        const actions = renderActions(HIDING_ARCHIVED);

        act(() => actions.current.applySavedLink({...LINK_A, title: "New"}));

        expect(queryClient.getQueryData<LinksPage>(queryKeys.links.page(otherFilter))?.links[0].title).toBe("New");
    });

    it("shows the default title for a link saved without one", () => {
        const actions = renderActions(HIDING_ARCHIVED);

        act(() => actions.current.applySavedLink({...LINK_A, title: "  "}));

        expect(cachedPage(HIDING_ARCHIVED)?.links[0].title).toBe(DEFAULT_LINK_TITLE);
    });
});
