import {afterEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const DEFAULT_TAGS_PAGE_SIZE = "20";

const storeCases = [
    {name: "tag store without counts", useStore: useTagStoreWithoutCount, withLinksCount: "false"},
    {name: "tag store with counts", useStore: useTagStoreWithCount, withLinksCount: "true"},
];

function requestedParams(callIndex = 0): URLSearchParams {
    const [url] = vi.mocked(fetchWithAuth).mock.calls[callIndex];
    expect(url.startsWith(`${API_ENDPOINTS.TAGS}?`)).toBe(true);
    return new URLSearchParams(url.split("?")[1]);
}

describe.each(storeCases)("$name", ({useStore, withLinksCount}) => {
    const initialState = useStore.getInitialState();

    afterEach(() => {
        useStore.setState(initialState, true);
    });

    it("loads tags with the default page size and the links count flag", async () => {
        const tags = [createTag()];
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({content: tags}));

        await useStore.getState().fetchTags();

        expect(useStore.getState().tags).toEqual(tags);
        expect(useStore.getState().loading).toBe(false);
        expect(useStore.getState().error).toBeNull();
        expect(requestedParams().get("size")).toBe(DEFAULT_TAGS_PAGE_SIZE);
        expect(requestedParams().get("withLinksCount")).toBe(withLinksCount);
        expect(requestedParams().has("search")).toBe(false);
    });

    it("honours a custom page size", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json([]));

        await useStore.getState().fetchTags({size: 5});

        expect(requestedParams().get("size")).toBe("5");
    });

    it("sends the search query when one is set", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json([]));
        useStore.getState().setSearchQuery("mark");

        await useStore.getState().fetchTags();

        expect(requestedParams().get("search")).toBe("mark");
    });

    it("keeps loading true while the request is pending", async () => {
        let respond: (response: Response) => void = () => undefined;
        vi.mocked(fetchWithAuth).mockReturnValueOnce(new Promise<Response>((resolve) => { respond = resolve; }));

        const pending = useStore.getState().fetchTags();
        expect(useStore.getState().loading).toBe(true);
        respond(Response.json([]));
        await pending;

        expect(useStore.getState().loading).toBe(false);
    });

    it("ignores a fetch request while another one is in flight", async () => {
        let respond: (response: Response) => void = () => undefined;
        vi.mocked(fetchWithAuth).mockReturnValueOnce(new Promise<Response>((resolve) => { respond = resolve; }));

        const first = useStore.getState().fetchTags();
        await useStore.getState().fetchTags();
        respond(Response.json([]));
        await first;

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("exposes the HTTP status when the response is an error", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        await useStore.getState().fetchTags();

        expect(useStore.getState().error).toBe("Failed to fetch tags: 500");
        expect(useStore.getState().loading).toBe(false);
    });

    it("exposes the error message when the network request rejects", async () => {
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));

        await useStore.getState().fetchTags();

        expect(useStore.getState().error).toBe("offline");
        expect(useStore.getState().loading).toBe(false);
    });

    it("falls back to a generic message when a non-Error value is thrown", async () => {
        vi.mocked(fetchWithAuth).mockRejectedValueOnce("boom");

        await useStore.getState().fetchTags();

        expect(useStore.getState().error).toBe("Unknown error occurred");
    });

    it("clears a previous error when fetching again", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
        await useStore.getState().fetchTags();
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json([]));

        await useStore.getState().fetchTags();

        expect(useStore.getState().error).toBeNull();
    });
});

describe("tag store with counts", () => {
    const initialState = useTagStoreWithCount.getInitialState();

    afterEach(() => {
        useTagStoreWithCount.setState(initialState, true);
    });

    it("clears the error on demand", () => {
        useTagStoreWithCount.setState({error: "Failed to fetch tags: 500"});

        useTagStoreWithCount.getState().clearError();

        expect(useTagStoreWithCount.getState().error).toBeNull();
    });
});
