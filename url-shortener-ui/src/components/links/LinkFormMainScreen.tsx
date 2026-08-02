"use client";

import React from "react";
import {ChevronDown} from "lucide-react";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {DialogFooter} from "@/components/ui/dialog";
import {EnterKbd} from "@/components/ui/enter-kbd";
import {Input} from "@/components/ui/input";
import {CreateLinkUrlField} from "@/components/links/CreateLinkUrlField";
import {CreateLinkTitleField} from "@/components/links/CreateLinkTitleField";
import {ShortLinkKeyField} from "@/components/links/ShortLinkKeyField";
import {TagSelect} from "@/components/links/TagSelect";
import {TagBadge} from "@/components/tags/TagBadge";
import {TagItem} from "@/lib/types";
import type {GlowState} from "@/components/links/create-link-types";
import {cn} from "@/lib/utils";

const LONG_URL_FIELD_ID = "longUrl";
const TITLE_FIELD_ID = "title";
const SHORT_LINK_KEY_FIELD_ID = "shortLinkKey";

interface FormScreenContentProps {
    title: string;
    isDesktop: boolean;
    longUrl: string;
    urlError: string | null;
    titleText: string;
    glowState: GlowState;
    isLoadingTitle: boolean;
    canSuggestTitle: boolean;
    enableTitleSuggestion: boolean;
    keyValue: string;
    keyError: string | null;
    isKeyLoading: boolean;
    isKeyUnavailable: boolean;
    selectedTagIds: string[];
    tags: TagItem[];
    isSubmitting: boolean;
    submitLabel: string;
    submittingLabel: string;
    onCancel: () => void;
    onUrlChange: (value: string) => void;
    onUrlBlur: () => void;
    onTitleChange: (value: string) => void;
    onSuggestTitle: () => void;
    onKeyChange: (value: string) => void;
    onKeyRandomize: () => void;
    onKeyBlur: () => void;
    onOpenTagScreen: () => void;
    onTagChange: (tagIds: string[]) => void;
    onSubmit: (e?: React.SyntheticEvent) => void;
}

export function FormScreenContent({
                                      title,
                                      isDesktop,
                                      longUrl,
                                      urlError,
                                      titleText,
                                      glowState,
                                      isLoadingTitle,
                                      canSuggestTitle,
                                      enableTitleSuggestion,
                                      keyValue,
                                      keyError,
                                      isKeyLoading,
                                      isKeyUnavailable,
                                      selectedTagIds,
                                      tags,
                                      isSubmitting,
                                      submitLabel,
                                      submittingLabel,
                                      onCancel,
                                      onUrlChange,
                                      onUrlBlur,
                                      onTitleChange,
                                      onSuggestTitle,
                                      onKeyChange,
                                      onKeyRandomize,
                                      onKeyBlur,
                                      onOpenTagScreen,
                                      onTagChange,
                                      onSubmit,
                                  }: FormScreenContentProps) {
    return (
        <>
            {!isDesktop && (
                <h2 className="text-lg font-semibold mb-4 text-foreground text-center">{title}</h2>
            )}

            <form onSubmit={onSubmit} className="grid gap-4">
                <CreateLinkUrlField
                    inputId={LONG_URL_FIELD_ID}
                    value={longUrl}
                    urlError={urlError}
                    onChange={onUrlChange}
                    onBlur={onUrlBlur}
                />
                <ShortLinkKeyField
                    inputId={SHORT_LINK_KEY_FIELD_ID}
                    value={keyValue}
                    error={keyError}
                    isLoading={isKeyLoading}
                    onChange={onKeyChange}
                    onRandomize={onKeyRandomize}
                    onBlur={onKeyBlur}
                />
                {enableTitleSuggestion ? (
                    <CreateLinkTitleField
                        inputId={TITLE_FIELD_ID}
                        value={titleText}
                        glowState={glowState}
                        isLoadingTitle={isLoadingTitle}
                        canSuggestTitle={canSuggestTitle}
                        onChange={onTitleChange}
                        onSuggestTitle={onSuggestTitle}
                    />
                ) : (
                    <div className="grid gap-2">
                        <label htmlFor={TITLE_FIELD_ID} className="text-sm font-medium">Title</label>
                        <Input
                            id={TITLE_FIELD_ID}
                            placeholder="e.g. Marketing Campaign Q4"
                            value={titleText}
                            onChange={(e) => onTitleChange(e.target.value)}
                        />
                    </div>
                )}
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Tags</label>
                    {isDesktop ? (
                        <TagSelect
                            selectedTagIds={selectedTagIds}
                            onChange={onTagChange}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={onOpenTagScreen}
                            className={cn(
                                "relative flex w-full items-center gap-2 rounded-lg border-[0.5px] border-border bg-background px-3 py-2 text-sm text-left transition-colors",
                                "hover:border-muted-foreground/30",
                                "outline-hidden focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                            )}
                        >
                            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                                {selectedTagIds.length === 0 ? (
                                    <span className="text-muted-foreground">Select tags</span>
                                ) : (
                                    selectedTagIds
                                        .map((id) => tags.find((t) => t.id === id))
                                        .filter((t): t is TagItem => t !== undefined)
                                        .slice(0, 4)
                                        .map((t) => (
                                            <TagBadge key={t.id} tag={t} showIcon={false}/>
                                        ))
                                )}
                                {selectedTagIds.length > 4 && (
                                    <span className="text-xs text-muted-foreground">
                                        +{selectedTagIds.length - 4}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground"/>
                        </button>
                    )}
                </div>
                <DialogFooter className="pt-2 gap-2 sm:gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className={cn(!isDesktop && "w-full")}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting || !longUrl.trim() || isKeyUnavailable}
                        className={cn(
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                            !isDesktop && "w-full"
                        )}
                    >
                        {isSubmitting ? (
                            <>
                                <ButtonSpinner className="text-primary-foreground"/>
                                {submittingLabel}
                            </>
                        ) : (
                            <>
                                {submitLabel}
                                {isDesktop && <EnterKbd/>}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}
