import React, {useCallback, useMemo, useState} from "react";
import {TagItem} from "@/lib/types";
import {searchTags} from "@/lib/tag-search";

interface UseTagSelectKeyboardOptions {
    tags: TagItem[];
    selectedTagIds: string[];
    onChange: (tagIds: string[]) => void;
    handleCreate: () => void;
    closePopover: () => void;
}

interface UseTagSelectKeyboardReturn {
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    search: string;
    setSearch: (value: string) => void;
    handleSearchChange: (value: string) => void;
    filteredTags: TagItem[];
    showCreateOption: boolean;
    handleKeyDown: (e: React.KeyboardEvent) => void;
}

export function useTagSelectKeyboard({
    tags,
    selectedTagIds,
    onChange,
    handleCreate,
    closePopover,
}: UseTagSelectKeyboardOptions): UseTagSelectKeyboardReturn {
    const [search, setSearch] = useState("");
    // null until the user moves the highlight; then the highlight follows the search result (the "Create" row, if any).
    const [pickedIndex, setPickedIndex] = useState<number | null>(null);

    const {matchingTags: filteredTags, canCreateTag: showCreateOption} = useMemo(() => searchTags(tags, search), [tags, search]);
    const totalItems = filteredTags.length + (showCreateOption ? 1 : 0);
    const activeIndex = pickedIndex ?? (showCreateOption ? filteredTags.length : -1);

    const setActiveIndex = useCallback((index: number) => setPickedIndex(index), []);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        setPickedIndex(null);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setPickedIndex(activeIndex >= totalItems - 1 ? 0 : activeIndex + 1);
                break;

            case "ArrowUp":
                e.preventDefault();
                setPickedIndex(activeIndex <= 0 ? totalItems - 1 : activeIndex - 1);
                break;

            case "Enter": {
                if (activeIndex < 0 || activeIndex >= totalItems) return;
                e.preventDefault();
                if (showCreateOption && activeIndex === filteredTags.length) {
                    handleCreate();
                } else {
                    const tagId = filteredTags[activeIndex].id;
                    if (selectedTagIds.includes(tagId)) {
                        onChange(selectedTagIds.filter((id) => id !== tagId));
                    } else {
                        onChange([...selectedTagIds, tagId]);
                    }
                }
                break;
            }

            case "Escape":
                closePopover();
                break;
        }
    }, [activeIndex, totalItems, showCreateOption, filteredTags, selectedTagIds, onChange, handleCreate, closePopover]);

    return {
        activeIndex,
        setActiveIndex,
        search,
        setSearch,
        handleSearchChange,
        filteredTags,
        showCreateOption,
        handleKeyDown,
    };
}
