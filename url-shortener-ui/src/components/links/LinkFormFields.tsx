"use client";

import React, {useEffect, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {fetchWithAuth} from "@/lib/api";
import {generateTitleFromHostname} from "@/lib/utils";
import {getDomain, isValidUrl, normalizeUrl} from "@/lib/url-utils";
import {API_ENDPOINTS, GLOW_FADE_DELAY_MS} from "@/lib/constants";
import type {LongUrlTitleResponse} from "@/lib/api-types";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import type {GlowState} from "@/components/links/create-link-types";
import {FormScreenContent} from "@/components/links/LinkFormMainScreen";
import {TagsScreenContent} from "@/components/links/LinkFormTagsScreen";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";

interface LinkFormFieldsProps {
    title: string;
    initialLongUrl?: string;
    initialTitle?: string;
    initialTagIds?: string[];
    onSubmit: (longUrl: string, title: string, tagIds: string[]) => Promise<void>;
    submitLabel: string;
    submittingLabel: string;
    onCancel: () => void;
    enableTitleSuggestion?: boolean;
}

const EMPTY_TAG_IDS: string[] = [];

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? "100%" : "-100%",
        opacity: 0
    }),
    center: {
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        x: direction < 0 ? "100%" : "-100%",
        opacity: 0
    })
};

export function LinkFormFields({
                                   title,
                                   initialLongUrl = "",
                                   initialTitle = "",
                                   initialTagIds = EMPTY_TAG_IDS,
                                   onSubmit,
                                   submitLabel,
                                   submittingLabel,
                                   onCancel,
                                   enableTitleSuggestion = false,
                               }: LinkFormFieldsProps) {
    const isDesktop = useIsDesktop();
    const [activeScreen, setActiveScreen] = useState<"form" | "tags">("form");
    const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

    const [longUrl, setLongUrl] = useState(initialLongUrl);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [titleText, setTitleText] = useState(initialTitle);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTitle, setIsLoadingTitle] = useState(false);
    const [glowState, setGlowState] = useState<GlowState>("idle");

    // Tag list operations
    const {tags, loading: tagsLoading} = useTagStoreWithoutCount();
    const {createTag} = useTagMutations();
    const [tagSearch, setTagSearch] = useState("");
    const [createTagLoading, setCreateTagLoading] = useState(false);
    const [tagError, setTagError] = useState<string | null>(null);

    const filteredTags = tags
        .filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const hasExactMatch = tags.some(
        (t) => t.name.toLowerCase() === tagSearch.trim().toLowerCase()
    );

    const showCreateOption = tagSearch.trim() !== "" && !hasExactMatch;

    useEffect(() => {
        setLongUrl(initialLongUrl);
        setTitleText(initialTitle);
        setSelectedTagIds(initialTagIds);
        setUrlError(null);
    }, [initialLongUrl, initialTitle, initialTagIds]);

    const handleUrlChange = (value: string) => {
        setLongUrl(value);
        if (urlError) setUrlError(null);
    };

    const handleUrlBlur = () => {
        if (!longUrl) {
            setUrlError(null);
            return;
        }
        const normalized = normalizeUrl(longUrl);
        if (normalized !== longUrl) {
            setLongUrl(normalized);
        }
        if (!isValidUrl(normalized)) {
            setUrlError("Please enter a valid URL (e.g. https://example.com)");
        } else {
            setUrlError(null);
        }
    };

    const applyGlowFeedback = () => {
        setGlowState("filled");
        setTimeout(() => setGlowState("idle"), GLOW_FADE_DELAY_MS);
    };

    const setTitleFromHostname = (url: string) => {
        try {
            const hostname = getDomain(url);
            setTitleText(generateTitleFromHostname(hostname));
            applyGlowFeedback();
        } catch {
            setGlowState("idle");
        }
    };

    const fetchTitle = async () => {
        if (!longUrl) return;
        setIsLoadingTitle(true);
        setGlowState("loading");
        try {
            const res = await fetchWithAuth(`${API_ENDPOINTS.LONG_URL_TITLE}?url=${encodeURIComponent(longUrl)}`);
            if (res.ok) {
                const data: LongUrlTitleResponse = await res.json();
                if (data.title?.trim()) {
                    setTitleText(data.title.trim());
                    applyGlowFeedback();
                } else {
                    setTitleFromHostname(longUrl);
                }
            } else {
                setTitleFromHostname(longUrl);
            }
        } catch {
            setTitleFromHostname(longUrl);
        } finally {
            setIsLoadingTitle(false);
        }
    };

    const handleSubmit = async (e?: React.SyntheticEvent) => {
        if (e) e.preventDefault();
        const normalized = normalizeUrl(longUrl);
        if (normalized !== longUrl) {
            setLongUrl(normalized);
        }
        if (!isValidUrl(normalized)) {
            setUrlError("Please enter a valid URL (e.g. https://example.com)");
            setSlideDirection(-1);
            setActiveScreen("form");
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(normalized, titleText, selectedTagIds);
        } catch {
            setIsSubmitting(false);
        }
    };

    const handleCreateTag = async () => {
        if (!tagSearch.trim() || createTagLoading) return;
        setCreateTagLoading(true);
        setTagError(null);
        try {
            const randomColor = ALLOWED_TAG_COLORS[Math.floor(Math.random() * ALLOWED_TAG_COLORS.length)];
            const newTag = await createTag(tagSearch.trim(), randomColor);
            setSelectedTagIds((prev) => [...prev, newTag.id]);
            setTagSearch("");
        } catch {
            setTagError("Failed to create tag");
        } finally {
            setCreateTagLoading(false);
        }
    };

    const handleToggleTag = (tagId: string) => {
        setSelectedTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
        );
    };

    const canSuggestTitle = Boolean(longUrl) && !urlError;

    return (
        <div className="overflow-hidden w-full relative">
            <AnimatePresence mode="wait" initial={false} custom={slideDirection}>
                {activeScreen === "form" ? (
                    <motion.div
                        key="form"
                        custom={slideDirection}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{duration: 0.2, ease: "easeInOut"}}
                        className="w-full"
                    >
                        <FormScreenContent
                            title={title}
                            isDesktop={isDesktop}
                            longUrl={longUrl}
                            urlError={urlError}
                            titleText={titleText}
                            glowState={glowState}
                            isLoadingTitle={isLoadingTitle}
                            canSuggestTitle={canSuggestTitle}
                            enableTitleSuggestion={enableTitleSuggestion}
                            selectedTagIds={selectedTagIds}
                            tags={tags}
                            isSubmitting={isSubmitting}
                            submitLabel={submitLabel}
                            submittingLabel={submittingLabel}
                            onCancel={onCancel}
                            onUrlChange={handleUrlChange}
                            onUrlBlur={handleUrlBlur}
                            onTitleChange={setTitleText}
                            onSuggestTitle={fetchTitle}
                            onOpenTagScreen={() => {
                                setSlideDirection(1);
                                setActiveScreen("tags");
                            }}
                            onTagChange={setSelectedTagIds}
                            onSubmit={handleSubmit}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="tags"
                        custom={slideDirection}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{duration: 0.2, ease: "easeInOut"}}
                        className="w-full"
                    >
                        <TagsScreenContent
                            tagSearch={tagSearch}
                            onTagSearchChange={setTagSearch}
                            onCreateTag={handleCreateTag}
                            createTagLoading={createTagLoading}
                            tags={tags}
                            tagsLoading={tagsLoading}
                            filteredTags={filteredTags}
                            showCreateOption={showCreateOption}
                            selectedTagIds={selectedTagIds}
                            onToggleTag={handleToggleTag}
                            tagError={tagError}
                            isSubmitting={isSubmitting}
                            longUrl={longUrl}
                            submitLabel={submitLabel}
                            submittingLabel={submittingLabel}
                            onBack={() => {
                                setSlideDirection(-1);
                                setActiveScreen("form");
                            }}
                            onSubmit={handleSubmit}
                            onCancel={onCancel}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
