import {fetchWithAuth} from "@/lib/api";
import {TagItem} from "@/lib/types";
import {BadgeVariant} from "@/components/ui/badge";
import {API_ENDPOINTS} from "@/lib/constants";
import {parseProblemDetail} from "@/lib/problem-details";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";

type TagMutationAction = "create" | "update" | "delete";

async function readTagMutationError(response: Response, action: TagMutationAction): Promise<string> {
    const body = await response.text().catch(() => "");
    return body.trim() ? parseProblemDetail(body, response.status) : `Failed to ${action} tag: ${response.status}`;
}

/**
 * Tag create/update/delete. Failures reject with a user-facing message and leave both tag-list stores untouched:
 * the list `error` belongs to loading the list, and callers show mutation errors where the action happened.
 */
export function useTagMutations() {
    const createTag = async (name: string, color: BadgeVariant): Promise<TagItem> => {
        const res = await fetchWithAuth(API_ENDPOINTS.TAGS, {
            method: "POST",
            body: JSON.stringify({name: name.trim(), color}),
        });

        if (!res.ok) {
            throw new Error(await readTagMutationError(res, "create"));
        }

        const newTag: TagItem = await res.json();
        const addToState = (state: {tags: TagItem[]}) => ({tags: [newTag, ...state.tags]});
        useTagStoreWithoutCount.setState(addToState);
        useTagStoreWithCount.setState(addToState);
        return newTag;
    };

    const updateTag = async (id: string, name: string, color: BadgeVariant): Promise<void> => {
        const res = await fetchWithAuth(API_ENDPOINTS.TAGS, {
            method: "PUT",
            body: JSON.stringify({id, name: name.trim(), color}),
        });

        if (!res.ok) {
            throw new Error(await readTagMutationError(res, "update"));
        }

        const updated: TagItem = await res.json();
        const replaceInState = (state: {tags: TagItem[]}) => ({
            tags: state.tags.map((tag) => (tag.id === id ? updated : tag)),
        });
        useTagStoreWithoutCount.setState(replaceInState);
        useTagStoreWithCount.setState(replaceInState);
    };

    const deleteTag = async (id: string): Promise<void> => {
        const res = await fetchWithAuth(`${API_ENDPOINTS.TAGS}/${id}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            throw new Error(await readTagMutationError(res, "delete"));
        }

        const removeFromState = (state: {tags: TagItem[]}) => ({
            tags: state.tags.filter((tag) => tag.id !== id),
        });
        useTagStoreWithoutCount.setState(removeFromState);
        useTagStoreWithCount.setState(removeFromState);
    };

    return {createTag, updateTag, deleteTag};
}
