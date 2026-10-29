"use client";

import {useQueryClient} from "@tanstack/react-query";
import type {BadgeVariant} from "@/components/ui/badge";
import {queryKeys} from "@/lib/query/query-keys";
import {createTagRequest, deleteTagRequest, updateTagRequest} from "@/lib/tags-api";
import type {TagItem} from "@/lib/types";

interface TagMutations {
    createTag: (name: string, color: BadgeVariant) => Promise<TagItem>;
    updateTag: (id: string, name: string, color: BadgeVariant) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
}

/**
 * Tag create/update/delete. Success edits every cached tag list in place (badges, picker, tags page, any search), so
 * nothing refetches. Failures reject with an `ApiError` whose message is user-facing and leave the cache untouched;
 * callers show it where the action happened.
 */
export function useTagMutations(): TagMutations {
    const queryClient = useQueryClient();

    const editCachedTagLists = (edit: (tags: TagItem[]) => TagItem[]): void => {
        queryClient.setQueriesData<TagItem[]>({queryKey: queryKeys.tags.all}, (tags) => tags && edit(tags));
    };

    const createTag = async (name: string, color: BadgeVariant): Promise<TagItem> => {
        const newTag = await createTagRequest(name, color);
        editCachedTagLists((tags) => [newTag, ...tags]);
        return newTag;
    };

    const updateTag = async (id: string, name: string, color: BadgeVariant): Promise<void> => {
        const updatedTag = await updateTagRequest(id, name, color);
        editCachedTagLists((tags) => tags.map((tag) => (tag.id === id ? {...tag, ...updatedTag} : tag)));
    };

    const deleteTag = async (id: string): Promise<void> => {
        await deleteTagRequest(id);
        editCachedTagLists((tags) => tags.filter((tag) => tag.id !== id));
    };

    return {createTag, updateTag, deleteTag};
}
