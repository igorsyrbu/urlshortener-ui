"use client";

import {useState} from "react";
import {attempt, withPending} from "@/lib/async-utils";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {pickRandomTagColor, TAG_CREATE_FAILED_MESSAGE} from "@/lib/tag-constants";

interface UseCreateTagFromSearchResult {
    isCreatingTag: boolean;
    createTagError: string | null;
    clearCreateTagError: () => void;
    /**
     * Creates a tag named by the trimmed search, in a random colour, and resolves with its id; null when the search is
     * empty, a creation is already running, or it failed (then `createTagError` says so).
     */
    createTagFromSearch: (search: string) => Promise<string | null>;
}

export function useCreateTagFromSearch(): UseCreateTagFromSearchResult {
    const {createTag} = useTagMutations();
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [createTagError, setCreateTagError] = useState<string | null>(null);

    const createTagFromSearch = async (search: string): Promise<string | null> => {
        const tagName = search.trim();
        if (!tagName || isCreatingTag) return null;
        setCreateTagError(null);
        let createdTagId: string | null = null;
        await withPending(setIsCreatingTag, async () => {
            const result = await attempt(() => createTag(tagName, pickRandomTagColor()));
            if (!result.isSuccess) {
                setCreateTagError(TAG_CREATE_FAILED_MESSAGE);
                return;
            }
            createdTagId = result.value.id;
        });
        return createdTagId;
    };

    return {
        isCreatingTag,
        createTagError,
        clearCreateTagError: () => setCreateTagError(null),
        createTagFromSearch,
    };
}
