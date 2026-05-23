import {TagItem} from "@/lib/types";
import {API_ENDPOINTS} from "@/lib/constants";

interface TagStoreSet {
    tags?: TagItem[];
    error?: string | null;
}

export async function fetchTagsResponse(
    query: URLSearchParams,
    set: (partial: TagStoreSet) => void,
    fetchWithAuth: (url: string) => Promise<Response>
): Promise<void> {
    const res = await fetchWithAuth(`${API_ENDPOINTS.TAGS}?${query}`);

    if (res.ok) {
        const data = await res.json();
        const tags: TagItem[] = data.content ?? data;
        set({tags});
    } else {
        set({error: `Failed to fetch tags: ${res.status}`});
    }
}
