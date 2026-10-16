import {renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";
import {createTag} from "@/test/tag-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));

const initialPlainState = useTagStoreWithoutCount.getInitialState();
const initialCountState = useTagStoreWithCount.getInitialState();
const stores = [useTagStoreWithoutCount, useTagStoreWithCount];

function seedTags(...tags: ReturnType<typeof createTag>[]): void {
    stores.forEach((store) => store.setState({tags}));
}

function sentRequest(): {url: string; method: string | undefined; body: unknown} {
    const [url, options] = vi.mocked(fetchWithAuth).mock.calls[0];
    return {url, method: options?.method, body: options?.body ? JSON.parse(String(options.body)) : undefined};
}

describe("useTagMutations", () => {
    afterEach(() => {
        useTagStoreWithoutCount.setState(initialPlainState, true);
        useTagStoreWithCount.setState(initialCountState, true);
    });

    describe("createTag", () => {
        it("posts the trimmed name with the color", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createTag()));
            const {result} = renderHook(() => useTagMutations());

            await result.current.createTag("  Marketing  ", "blue");

            expect(sentRequest()).toEqual({url: API_ENDPOINTS.TAGS, method: "POST", body: {name: "Marketing", color: "blue"}});
        });

        it("returns the created tag and prepends it to both stores", async () => {
            const existing = createTag({id: "tag-0", name: "Existing"});
            const created = createTag({id: "tag-1"});
            seedTags(existing);
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(created));
            const {result} = renderHook(() => useTagMutations());

            const returned = await result.current.createTag("Marketing", "blue");

            expect(returned).toEqual(created);
            stores.forEach((store) => expect(store.getState().tags).toEqual([created, existing]));
        });

        it("uses the response body as the error message when the server rejects the tag", async () => {
            seedTags(createTag());
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response("Tag already exists", {status: 409}));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.createTag("Marketing", "blue")).rejects.toThrow("Tag already exists");

            stores.forEach((store) => expect(store.getState().tags).toHaveLength(1));
        });

        it("reads the message from a JSON error body", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({error: "Invalid tag data or duplicate name"}, {status: 400}));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.createTag("Marketing", "blue")).rejects.toThrow(/^Invalid tag data or duplicate name$/);
        });

        it("leaves the list error of both stores untouched when it fails", async () => {
            stores.forEach((store) => store.setState({error: null}));
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response("Tag already exists", {status: 409}));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.createTag("Marketing", "blue")).rejects.toThrow();

            stores.forEach((store) => expect(store.getState().error).toBeNull());
        });

        it("falls back to the HTTP status when the error body is empty", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.createTag("Marketing", "blue")).rejects.toThrow("Failed to create tag: 500");
        });

        it("rethrows a network failure without touching the stores", async () => {
            seedTags(createTag());
            vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.createTag("Marketing", "blue")).rejects.toThrow("offline");

            stores.forEach((store) => expect(store.getState().tags).toHaveLength(1));
        });
    });

    describe("updateTag", () => {
        it("puts the id with the trimmed name and color", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(createTag()));
            const {result} = renderHook(() => useTagMutations());

            await result.current.updateTag("tag-1", " Sales ", "green");

            expect(sentRequest()).toEqual({url: API_ENDPOINTS.TAGS, method: "PUT", body: {id: "tag-1", name: "Sales", color: "green"}});
        });

        it("replaces only the updated tag in both stores", async () => {
            const untouched = createTag({id: "tag-2", name: "Other"});
            const updated = createTag({id: "tag-1", name: "Sales", color: "green"});
            seedTags(createTag({id: "tag-1"}), untouched);
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(updated));
            const {result} = renderHook(() => useTagMutations());

            await result.current.updateTag("tag-1", "Sales", "green");

            stores.forEach((store) => expect(store.getState().tags).toEqual([updated, untouched]));
        });

        it("exposes the server message and keeps the tags when the update fails", async () => {
            const original = createTag();
            seedTags(original);
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response("Name taken", {status: 409}));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.updateTag("tag-1", "Sales", "green")).rejects.toThrow("Name taken");

            stores.forEach((store) => {
                expect(store.getState().error).toBeNull();
                expect(store.getState().tags).toEqual([original]);
            });
        });

        it("falls back to the HTTP status when the error body is empty", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 404}));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.updateTag("tag-1", "Sales", "green")).rejects.toThrow("Failed to update tag: 404");
        });
    });

    describe("deleteTag", () => {
        it("sends a DELETE for the tag id", async () => {
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 204}));
            const {result} = renderHook(() => useTagMutations());

            await result.current.deleteTag("tag-1");

            expect(sentRequest()).toEqual({url: `${API_ENDPOINTS.TAGS}/tag-1`, method: "DELETE", body: undefined});
        });

        it("removes the tag from both stores", async () => {
            const kept = createTag({id: "tag-2", name: "Kept"});
            seedTags(createTag({id: "tag-1"}), kept);
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 204}));
            const {result} = renderHook(() => useTagMutations());

            await result.current.deleteTag("tag-1");

            stores.forEach((store) => expect(store.getState().tags).toEqual([kept]));
        });

        it("keeps the tag and exposes the status when deletion fails", async () => {
            seedTags(createTag({id: "tag-1"}));
            vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 403}));
            const {result} = renderHook(() => useTagMutations());

            await expect(result.current.deleteTag("tag-1")).rejects.toThrow("Failed to delete tag: 403");

            stores.forEach((store) => {
                expect(store.getState().error).toBeNull();
                expect(store.getState().tags).toHaveLength(1);
            });
        });
    });
});
