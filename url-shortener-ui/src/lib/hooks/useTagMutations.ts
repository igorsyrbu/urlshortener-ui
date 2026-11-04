"use client";

import {useQueryClient, type QueryClient, type QueryKey} from "@tanstack/react-query";
import type {BadgeVariant} from "@/components/ui/badge";
import {refreshAfter} from "@/lib/query/invalidation";
import {queryKeys} from "@/lib/query/query-keys";
import {createTagRequest, deleteTagRequest, updateTagRequest} from "@/lib/tags-api";
import type {TagItem} from "@/lib/types";

interface TagMutations {
    createTag: (name: string, color: BadgeVariant) => Promise<TagItem>;
    updateTag: (id: string, name: string, color: BadgeVariant) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
}

type TagListsSnapshot = Array<[QueryKey, TagItem[] | undefined]>;

function editCachedTagLists(queryClient: QueryClient, edit: (tags: TagItem[]) => TagItem[]): void {
    queryClient.setQueriesData<TagItem[]>({queryKey: queryKeys.tags.all}, (tags) => tags && edit(tags));
}

/** Snapshots every cached tag list, then applies `edit` to all of them before the server answers. */
async function editTagListsOptimistically(queryClient: QueryClient, edit: (tags: TagItem[]) => TagItem[]): Promise<TagListsSnapshot> {
    // A refetch still running would overwrite the edit with the lists from before it.
    await queryClient.cancelQueries({queryKey: queryKeys.tags.all});
    const snapshot = queryClient.getQueriesData<TagItem[]>({queryKey: queryKeys.tags.all});
    editCachedTagLists(queryClient, edit);
    return snapshot;
}

/** Runs the request; when it fails, puts every tag list back as it was and rejects with the request's error. */
async function requestOrRestore<T>(queryClient: QueryClient, snapshot: TagListsSnapshot, request: () => Promise<T>): Promise<T> {
    try {
        return await request();
    } catch (error) {
        for (const [queryKey, tags] of snapshot) queryClient.setQueryData(queryKey, tags);
        throw error;
    }
}

/**
 * Tag create/update/delete on every cached tag list (badges, picker, tags page, any search). Create adds the tag once
 * the server has given it an id; update and delete show at once and are undone if the server refuses. Failures reject
 * with an `ApiError` whose message is user-facing; callers show it where the action happened.
 */
export function useTagMutations(): TagMutations {
    const queryClient = useQueryClient();

    const createTag = async (name: string, color: BadgeVariant): Promise<TagItem> => {
        const newTag = await createTagRequest(name, color);
        editCachedTagLists(queryClient, (tags) => [newTag, ...tags]);
        return newTag;
    };

    const updateTag = async (id: string, name: string, color: BadgeVariant): Promise<void> => {
        const withEdit = (tags: TagItem[]) => tags.map((tag) => (tag.id === id ? {...tag, name: name.trim(), color} : tag));
        const snapshot = await editTagListsOptimistically(queryClient, withEdit);
        const updatedTag = await requestOrRestore(queryClient, snapshot, () => updateTagRequest(id, name, color));
        editCachedTagLists(queryClient, (tags) => tags.map((tag) => (tag.id === id ? {...tag, ...updatedTag} : tag)));
    };

    const deleteTag = async (id: string): Promise<void> => {
        const snapshot = await editTagListsOptimistically(queryClient, (tags) => tags.filter((tag) => tag.id !== id));
        await requestOrRestore(queryClient, snapshot, () => deleteTagRequest(id));
        void refreshAfter(queryClient, "tagDeleted");
    };

    return {createTag, updateTag, deleteTag};
}
