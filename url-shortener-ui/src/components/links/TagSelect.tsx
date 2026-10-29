"use client";

import React, {useEffect, useId, useRef, useState} from "react";
import {Check, ChevronDown, Loader2, Plus, Tag} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {BadgeVariant} from "@/components/ui/badge";
import {TagBadge} from "@/components/tags/TagBadge";
import {useAllTags} from "@/lib/hooks/useAllTags";
import {TagItem} from "@/lib/types";
import {useCreateTagFromSearch} from "@/lib/hooks/useCreateTagFromSearch";
import {useTagSelectKeyboard} from "@/lib/hooks/useTagSelectKeyboard";
import {TagSelectSearch} from "@/components/links/TagSelectSearch";
import {cn} from "@/lib/utils";
import {FieldError} from "@/components/ui/field-error";

interface TagSelectProps {
    selectedTagIds: string[];
    onChange: (tagIds: string[]) => void;
    disabled?: boolean;
}

function iconColorForTag(color: BadgeVariant): string {
    switch (color) {
        case "red":
            return "text-red-500";
        case "yellow":
            return "text-yellow-500";
        case "lime":
            return "text-lime-500";
        case "green":
            return "text-green-500";
        case "blue":
            return "text-blue-500";
        case "cyan":
            return "text-cyan-500";
        case "purple":
            return "text-purple-500";
        case "gray":
            return "text-zinc-500";
        default:
            return "text-foreground";
    }
}

export function TagSelect({selectedTagIds, onChange, disabled}: TagSelectProps) {
    const {tags, isLoading: loading} = useAllTags();
    const [open, setOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();

    const {isCreatingTag, createTagError, clearCreateTagError, createTagFromSearch} = useCreateTagFromSearch();

    const handleCreate = async () => {
        const createdTagId = await createTagFromSearch(search);
        if (createdTagId === null) return;
        onChange([...selectedTagIds, createdTagId]);
        setSearch("");
    };

    const {
        activeIndex,
        setActiveIndex,
        search,
        setSearch,
        handleSearchChange,
        filteredTags,
        showCreateOption,
        handleKeyDown,
    } = useTagSelectKeyboard({
        tags,
        selectedTagIds,
        onChange,
        handleCreate,
        closePopover: () => setOpen(false),
    });

    useEffect(() => {
        if (open && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [open]);

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            setSearch("");
            setActiveIndex(-1);
            clearCreateTagError();
        }
        setOpen(value);
    };

    const selectedTags = selectedTagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter((t): t is TagItem => t !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild disabled={disabled}>
                <button
                    type="button"
                    className={cn(
                        "relative flex w-full items-center gap-2 rounded-lg border-[0.5px] border-border bg-background px-3 py-2 text-sm text-left transition-colors",
                        "hover:border-muted-foreground/30",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        disabled && "cursor-not-allowed opacity-50",
                    )}
                >
                    <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                        {selectedTags.length === 0 ? (
                            <span className="text-muted-foreground">Select tags</span>
                        ) : (
                            selectedTags.slice(0, 4).map((t) => (
                                <TagBadge key={t.id} tag={t} showIcon={false}/>
                            ))
                        )}
                        {selectedTags.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                                +{selectedTags.length - 4}
                            </span>
                        )}
                    </div>
                    <ChevronDown
                        className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            open && "rotate-180",
                        )}
                    />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                side="bottom"
                avoidCollisions={true}
                portalled={false}
                className="w-(--radix-popover-trigger-width) p-0"
                sideOffset={4}
                onKeyDown={handleKeyDown}
            >
                <TagSelectSearch
                    value={search}
                    onChange={handleSearchChange}
                    inputRef={searchInputRef}
                    listboxId={listboxId}
                    activeOptionId={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
                />

                <div id={listboxId} role="listbox" aria-label="Tags" aria-multiselectable="true"
                     className="max-h-48 overflow-y-auto p-1" style={{WebkitOverflowScrolling: 'touch'}}>
                    {loading && tags.length === 0 ? (
                        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin"/>
                            Loading tags...
                        </div>
                    ) : filteredTags.length === 0 && !showCreateOption ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            {search ? "No tags found" : "No tags available"}
                        </p>
                    ) : (
                        filteredTags.map((t, index) => {
                            const isSelected = selectedTagIds.includes(t.id);
                            const isActive = activeIndex === index;
                            return (
                                <button
                                    key={t.id}
                                    id={`${listboxId}-option-${index}`}
                                    tabIndex={-1}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={() => {
                                        if (isSelected) {
                                            onChange(selectedTagIds.filter((id) => id !== t.id));
                                        } else {
                                            onChange([...selectedTagIds, t.id]);
                                        }
                                    }}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left transition-colors min-w-0",
                                        isActive ? "bg-muted" : "hover:bg-muted/50",
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[0.5px] transition-colors",
                                            isSelected
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border",
                                        )}
                                    >
                                        {isSelected && <Check className="size-3"/>}
                                    </div>
                                    <Tag
                                        className={cn(
                                            "size-4 shrink-0",
                                            iconColorForTag(t.color),
                                        )}
                                    />
                                    <span className="truncate" title={t.name}>{t.name}</span>
                                </button>
                            );
                        })
                    )}

                    {showCreateOption && (
                        <button
                            id={`${listboxId}-option-${filteredTags.length}`}
                            tabIndex={-1}
                            type="button"
                            role="option"
                            aria-selected={false}
                            onMouseEnter={() => setActiveIndex(filteredTags.length)}
                            onClick={handleCreate}
                            disabled={isCreatingTag}
                            className={cn(
                                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-left transition-colors min-w-0",
                                activeIndex === filteredTags.length ? "bg-muted" : "hover:bg-muted/50",
                                isCreatingTag && "cursor-not-allowed opacity-50",
                            )}
                        >
                            {isCreatingTag ? (
                                <Loader2 className="size-4 animate-spin text-muted-foreground shrink-0"/>
                            ) : (
                                <Plus className="size-4 text-muted-foreground shrink-0"/>
                            )}
                            <span className="truncate" title={search}>
                                Create <span className="font-medium">&quot;{search}&quot;</span>
                            </span>
                        </button>
                    )}
                </div>

                {createTagError && (
                    <FieldError id="tag-select-error" className="px-3 pb-2 text-xs">{createTagError}</FieldError>
                )}
            </PopoverContent>
        </Popover>
    );
}
