import React, {useCallback, useMemo, useState} from "react";
import {TagItem} from "@/lib/types";

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
    totalItems: number;
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
    const [activeIndex, setActiveIndex] = useState(-1);

    const filteredTags = useMemo(
        () => tags
            .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name)),
        [tags, search],
    );

    const exactMatch = filteredTags.some(
        (t) => t.name.toLowerCase() === search.toLowerCase(),
    );
    const showCreateOption = search.trim().length > 0 && !exactMatch;
    const totalItems = filteredTags.length + (showCreateOption ? 1 : 0);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        const nextFiltered = tags
            .filter((t) => t.name.toLowerCase().includes(value.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
        const nextExactMatch = nextFiltered.some(
            (t) => t.name.toLowerCase() === value.toLowerCase(),
        );
        const nextShowCreate = value.trim().length > 0 && !nextExactMatch;
        setActiveIndex(nextShowCreate ? nextFiltered.length : -1);
    }, [tags]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((prev) => {
                    if (prev >= totalItems - 1) return 0;
                    return prev + 1;
                });
                break;

            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((prev) => {
                    if (prev <= 0) return totalItems - 1;
                    return prev - 1;
                });
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
        totalItems,
        handleKeyDown,
    };
}
