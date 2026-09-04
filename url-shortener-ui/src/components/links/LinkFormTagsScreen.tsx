"use client";

import {ArrowLeft, Check, Loader2, Plus, Search} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {Input} from "@/components/ui/input";
import {TagBadge} from "@/components/tags/TagBadge";
import {TagItem} from "@/lib/types";
import {cn} from "@/lib/utils";
import React from "react";

interface TagsScreenContentProps {
    tagSearch: string;
    onTagSearchChange: (value: string) => void;
    onCreateTag: () => void;
    createTagLoading: boolean;
    tags: TagItem[];
    tagsLoading: boolean;
    filteredTags: TagItem[];
    showCreateOption: boolean;
    selectedTagIds: string[];
    onToggleTag: (tagId: string) => void;
    tagError: string | null;
    isSubmitting: boolean;
    hasKeyError: boolean;
    longUrl: string;
    submitLabel: string;
    submittingLabel: string;
    onBack: () => void;
    onSubmit: (e?: React.SyntheticEvent) => void;
    onCancel: () => void;
}

export function TagsScreenContent({
                                      tagSearch,
                                      onTagSearchChange,
                                      onCreateTag,
                                      createTagLoading,
                                      tags,
                                      tagsLoading,
                                      filteredTags,
                                      showCreateOption,
                                      selectedTagIds,
                                      onToggleTag,
                                      tagError,
                                      isSubmitting,
                                      hasKeyError,
                                      longUrl,
                                      submitLabel,
                                      submittingLabel,
                                      onBack,
                                      onSubmit,
                                      onCancel,
                                  }: TagsScreenContentProps) {
    return (
        <>
            <div className="relative flex items-center justify-center mb-4 h-8 w-full">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    aria-label="Back to form"
                    className="absolute left-0 h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4"/>
                </Button>
                <h2 className="text-lg font-semibold text-foreground text-center">Select tags</h2>
            </div>

            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                <Input
                    placeholder="Search or create tags..."
                    value={tagSearch}
                    onChange={(e) => onTagSearchChange(e.target.value)}
                    className="pl-9 h-10 text-sm"
                />
            </div>

            <div
                className="max-h-64 overflow-y-auto pr-1 grid gap-1.5 scrollbar-thin"
                style={{WebkitOverflowScrolling: 'touch'}}
            >
                {tagsLoading && tags.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin"/>
                        Loading tags...
                    </div>
                ) : filteredTags.length === 0 && !showCreateOption ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {tagSearch ? "No tags found" : "No tags available"}
                    </p>
                ) : (
                    filteredTags.map((t) => {
                        const isSelected = selectedTagIds.includes(t.id);
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => onToggleTag(t.id)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-xl border border-border/50 bg-muted/5 px-3 py-2.5 text-sm text-left transition-all hover:bg-muted/10",
                                    isSelected && "border-primary/30 bg-primary/5"
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                        isSelected
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border bg-background",
                                    )}
                                >
                                    {isSelected && <Check className="size-3 stroke-[3]"/>}
                                </div>
                                <TagBadge tag={t} showIcon={false}/>
                            </button>
                        );
                    })
                )}

                {showCreateOption && (
                    <button
                        type="button"
                        onClick={onCreateTag}
                        disabled={createTagLoading}
                        className={cn(
                            "flex w-full items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted/10",
                            createTagLoading && "cursor-not-allowed opacity-50",
                        )}
                    >
                        {createTagLoading ? (
                            <Loader2 className="size-4.5 animate-spin text-muted-foreground shrink-0"/>
                        ) : (
                            <Plus className="size-4.5 text-muted-foreground shrink-0"/>
                        )}
                        <span className="truncate text-foreground text-sm">
                            Create tag <span className="font-semibold text-primary">&quot;{tagSearch}&quot;</span>
                        </span>
                    </button>
                )}
            </div>

            {tagError && (
                <p className="mt-2 text-xs text-destructive">{tagError}</p>
            )}

            <div className="mt-4 flex flex-col gap-2">
                <Button
                    type="button"
                    onClick={() => onSubmit()}
                    disabled={isSubmitting || !longUrl.trim() || hasKeyError}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isSubmitting ? (
                        <>
                            <ButtonSpinner className="text-primary-foreground"/>
                            {submittingLabel}
                        </>
                    ) : submitLabel}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="w-full"
                >
                    Cancel
                </Button>
            </div>
        </>
    );
}
