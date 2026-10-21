import {act, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import TagsPage from "./page";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, SEARCH_DEBOUNCE_MS, TAGS_LOAD_COPY, TRY_AGAIN_LABEL} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";
import {useUIStore} from "@/lib/store/ui";
import {TAG_DELETE_FAILED_MESSAGE} from "@/lib/tag-constants";
import {createPage} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));

const SEARCH_PLACEHOLDER = "Search...";

function mockTagsResponse(tags = [createTag()]): void {
    vi.mocked(fetchWithAuth).mockImplementation(async () => Response.json(createPage(tags)));
}

function requestedUrls(): string[] {
    return vi.mocked(fetchWithAuth).mock.calls.map(([url]) => String(url));
}

describe("tags page", () => {
    beforeEach(() => {
        vi.useFakeTimers({shouldAdvanceTime: true});
    });

    afterEach(() => {
        vi.useRealTimers();
        useTagStoreWithCount.setState({tags: [], loading: false, error: null, searchQuery: ""});
        useTagStoreWithoutCount.setState({tags: [], error: null});
        useUIStore.setState({isCreateTagModalOpen: false});
    });

    it("lists the tags returned by the API with their link counts", async () => {
        mockTagsResponse([
            createTag({id: "tag-1", name: "Marketing", linkCount: 3}),
            createTag({id: "tag-2", name: "Sales", linkCount: 1}),
        ]);

        render(<TagsPage/>);

        expect(await screen.findByText("Marketing")).toBeInTheDocument();
        expect(screen.getByText("Sales")).toBeInTheDocument();
        expect(screen.getByText("3 links")).toBeInTheDocument();
        expect(screen.getByText("1 link")).toBeInTheDocument();
    });

    it("requests tags together with their link counts", async () => {
        mockTagsResponse();

        render(<TagsPage/>);

        await screen.findByText("Marketing");
        expect(requestedUrls()[0]).toBe(`${API_ENDPOINTS.TAGS}?withLinksCount=true&size=100`);
    });

    it("shows the empty state when the user has no tags", async () => {
        mockTagsResponse([]);

        render(<TagsPage/>);

        expect(await screen.findByText("Your tags will live here")).toBeInTheDocument();
    });

    it("opens the create tag modal from the empty state", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockTagsResponse([]);
        render(<TagsPage/>);

        await user.click(await screen.findByRole("button", {name: "Create Tag"}));

        expect(useUIStore.getState().isCreateTagModalOpen).toBe(true);
    });

    it("searches the API only after the typing pause", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockTagsResponse();
        render(<TagsPage/>);
        await screen.findByText("Marketing");
        vi.mocked(fetchWithAuth).mockClear();

        await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "  mark  ");
        expect(fetchWithAuth).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
        });

        await waitFor(() => expect(requestedUrls()).toEqual([`${API_ENDPOINTS.TAGS}?withLinksCount=true&size=100&search=mark`]));
    });

    it("searches at once when Enter is pressed", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockTagsResponse();
        render(<TagsPage/>);
        await screen.findByText("Marketing");
        vi.mocked(fetchWithAuth).mockClear();

        await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "mark{Enter}");

        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.TAGS}?withLinksCount=true&size=100&search=mark`]);
    });

    it("starts a new visit unfiltered after leaving the page with a search", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockTagsResponse();
        const {unmount} = render(<TagsPage/>);
        await screen.findByText("Marketing");
        await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "mark{Enter}");
        unmount();
        vi.mocked(fetchWithAuth).mockClear();

        render(<TagsPage/>);
        await screen.findByText("Marketing");
        act(() => {
            vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
        });

        expect(requestedUrls()).toEqual([`${API_ENDPOINTS.TAGS}?withLinksCount=true&size=100`]);
        expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toHaveValue("");
    });

    it("shows the no results state when a search matches no tags", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockTagsResponse();
        render(<TagsPage/>);
        await screen.findByText("Marketing");
        mockTagsResponse([]);

        await user.type(screen.getByPlaceholderText(SEARCH_PLACEHOLDER), "zzz");
        act(() => {
            vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
        });

        expect(await screen.findByText("No tags found")).toBeInTheDocument();
        expect(screen.queryByText("Your tags will live here")).not.toBeInTheDocument();
    });

    it("shows an error with a retry, and keeps the search field, when the first load fails", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 500}));

        render(<TagsPage/>);

        expect(await screen.findByRole("alert")).toHaveTextContent(TAGS_LOAD_COPY.LOAD_FAILED);
        expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    });

    it("loads the tags again when the user retries after a failed first load", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 500}));
        render(<TagsPage/>);
        await screen.findByRole("alert");
        mockTagsResponse([createTag({name: "Marketing"})]);

        await user.click(screen.getByRole("button", {name: TRY_AGAIN_LABEL}));

        expect(await screen.findByText("Marketing")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps the tags and the toolbar when a refresh fails", async () => {
        mockTagsResponse([createTag({name: "Marketing"})]);
        render(<TagsPage/>);
        await screen.findByText("Marketing");
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 500}));

        await act(() => useTagStoreWithCount.getState().fetchTags());

        expect(screen.getByRole("alert")).toHaveTextContent(TAGS_LOAD_COPY.REFRESH_FAILED);
        expect(screen.getByText("Marketing")).toBeInTheDocument();
        expect(screen.getByPlaceholderText(SEARCH_PLACEHOLDER)).toBeInTheDocument();
    });

    it("deletes a tag after the user confirms its name", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockTagsResponse([createTag({id: "tag-1", name: "Marketing"}), createTag({id: "tag-2", name: "Sales"})]);
        render(<TagsPage/>);
        await screen.findByText("Marketing");
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 204}));

        await user.click(screen.getAllByRole("button", {name: "More actions for tag"})[0]);
        await user.click(await screen.findByRole("menuitem", {name: /Delete/}));
        await user.type(await screen.findByPlaceholderText("Type the tag name here"), "Marketing");
        await user.click(screen.getByRole("button", {name: "Delete tag"}));

        await waitFor(() => expect(screen.queryByText("Marketing")).not.toBeInTheDocument());
        expect(fetchWithAuth).toHaveBeenCalledWith(`${API_ENDPOINTS.TAGS}/tag-1`, {method: "DELETE"});
        expect(screen.getByText("Sales")).toBeInTheDocument();
    });

    it("keeps the tag list and shows a toast when deleting fails", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        const showError = vi.spyOn(toast, "error");
        mockTagsResponse([createTag({name: "Marketing"})]);
        render(<TagsPage/>);
        await screen.findByText("Marketing");
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: 500}));

        await user.click(screen.getByRole("button", {name: "More actions for tag"}));
        await user.click(await screen.findByRole("menuitem", {name: /Delete/}));
        await user.type(await screen.findByPlaceholderText("Type the tag name here"), "Marketing");
        await user.click(screen.getByRole("button", {name: "Delete tag"}));

        await waitFor(() => expect(showError).toHaveBeenCalledExactlyOnceWith(TAG_DELETE_FAILED_MESSAGE));
        expect(logger.error).toHaveBeenCalledWith("Failed to delete tag", expect.any(Error), {tagId: "tag-1"});
        // The delete dialog stays open on failure, so the page behind it is aria-hidden by Radix.
        expect(screen.getByRole("button", {name: "More actions for tag", hidden: true})).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Dismiss"})).not.toBeInTheDocument();
    });

    it("opens the edit form for the chosen tag", async () => {
        const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
        mockTagsResponse([createTag({name: "Marketing"})]);
        render(<TagsPage/>);
        await screen.findByText("Marketing");

        await user.click(screen.getByRole("button", {name: "More actions for tag"}));
        await user.click(await screen.findByRole("menuitem", {name: /Edit/}));

        expect(await screen.findByLabelText("Name")).toHaveValue("Marketing");
    });
});
