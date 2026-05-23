import {fetchWithAuth} from "@/lib/api";
import {TagItem} from "@/lib/types";
import {BadgeVariant} from "@/components/ui/badge";
import {API_ENDPOINTS} from "@/lib/constants";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";

export function useTagMutations() {
    const createTag = async (name: string, color: BadgeVariant): Promise<TagItem> => {
        useTagStoreWithoutCount.setState({error: null});
        useTagStoreWithCount.setState({error: null});

        const res = await fetchWithAuth(API_ENDPOINTS.TAGS, {
            method: "POST",
            body: JSON.stringify({name: name.trim(), color}),
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            const message = errBody || `Failed to create tag: ${res.status}`;
            useTagStoreWithoutCount.setState({error: message});
            useTagStoreWithCount.setState({error: message});
            throw new Error(message);
        }

        const newTag: TagItem = await res.json();
        const addToState = (state: {tags: TagItem[]}) => ({tags: [newTag, ...state.tags]});
        useTagStoreWithoutCount.setState(addToState);
        useTagStoreWithCount.setState(addToState);
        return newTag;
    };

    const updateTag = async (id: string, name: string, color: BadgeVariant): Promise<void> => {
        useTagStoreWithoutCount.setState({error: null});
        useTagStoreWithCount.setState({error: null});

        const res = await fetchWithAuth(API_ENDPOINTS.TAGS, {
            method: "PUT",
            body: JSON.stringify({id, name: name.trim(), color}),
        });

        if (!res.ok) {
            const errBody = await res.text().catch(() => "");
            const message = errBody || `Failed to update tag: ${res.status}`;
            useTagStoreWithoutCount.setState({error: message});
            useTagStoreWithCount.setState({error: message});
            throw new Error(message);
        }

        const updated: TagItem = await res.json();
        const replaceInState = (state: {tags: TagItem[]}) => ({
            tags: state.tags.map((tag) => (tag.id === id ? updated : tag)),
        });
        useTagStoreWithoutCount.setState(replaceInState);
        useTagStoreWithCount.setState(replaceInState);
    };

    const deleteTag = async (id: string): Promise<void> => {
        useTagStoreWithoutCount.setState({error: null});
        useTagStoreWithCount.setState({error: null});

        const res = await fetchWithAuth(`${API_ENDPOINTS.TAGS}/${id}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const message = `Failed to delete tag: ${res.status}`;
            useTagStoreWithoutCount.setState({error: message});
            useTagStoreWithCount.setState({error: message});
            throw new Error(message);
        }

        const removeFromState = (state: {tags: TagItem[]}) => ({
            tags: state.tags.filter((tag) => tag.id !== id),
        });
        useTagStoreWithoutCount.setState(removeFromState);
        useTagStoreWithCount.setState(removeFromState);
    };

    return {createTag, updateTag, deleteTag};
}
