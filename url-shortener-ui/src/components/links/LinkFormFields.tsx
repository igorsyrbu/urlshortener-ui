"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {AnimatePresence, motion} from "framer-motion";
import {fetchWithAuth} from "@/lib/api";
import {generateTitleFromHostname} from "@/lib/utils";
import {getDomain, getShortKeyValidationError, isValidUrl, normalizeUrl} from "@/lib/url-utils";
import {
    API_ENDPOINTS,
    GLOW_FADE_DELAY_MS,
    KEY_AVAILABILITY_CHECK_DEBOUNCE_MS,
    SHORT_KEY_TAKEN_MESSAGE,
    TRACKER_MODE,
    URL_CLEANER_SUCCESS_DURATION_MS,
} from "@/lib/constants";
import type {LongUrlTitleResponse, RandomKeyResponse} from "@/lib/api-types";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useDebounce} from "@/lib/hooks/useDebounce";
import {useUrlCleaner} from "@/lib/hooks/useUrlCleaner";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {usePreferencesStore} from "@/lib/store/preferences";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {type GlowState, ShortKeyConflictError} from "@/components/links/create-link-types";
import {FormScreenContent} from "@/components/links/LinkFormMainScreen";
import {TagsScreenContent} from "@/components/links/LinkFormTagsScreen";
import {TrackerReviewScreen} from "@/components/links/TrackerReviewScreen";
import {ALLOWED_TAG_COLORS} from "@/lib/tag-constants";
import {logger} from "@/lib/logger";
import {buildFinalUrl, buildTrackerEntries} from "@/lib/url-cleaner-utils";

interface LinkFormFieldsProps {
    title: string;
    initialLongUrl?: string;
    initialTitle?: string;
    initialTagIds?: string[];
    initialKey?: string;
    autoGenerateKey?: boolean;
    onSubmit: (longUrl: string, title: string, key: string, tagIds: string[]) => Promise<void>;
    submitLabel: string;
    submittingLabel: string;
    onCancel: () => void;
    enableTitleSuggestion?: boolean;
    enableUrlCleaner?: boolean;
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
                                   initialKey = "",
                                   autoGenerateKey = false,
                                   onSubmit,
                                   submitLabel,
                                   submittingLabel,
                                   onCancel,
                                   enableTitleSuggestion = false,
                                   enableUrlCleaner = false,
                               }: LinkFormFieldsProps) {
    const isDesktop = useIsDesktop();
    const [activeScreen, setActiveScreen] = useState<"form" | "tags" | "review">("form");
    const [slideDirection, setSlideDirection] = useState<1 | -1>(1);

    const [longUrl, setLongUrl] = useState(initialLongUrl);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [titleText, setTitleText] = useState(initialTitle);
    const [key, setKey] = useState(initialKey);
    const [keyError, setKeyError] = useState<string | null>(null);
    const [isKeyLoading, setIsKeyLoading] = useState(false);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTitle, setIsLoadingTitle] = useState(false);
    const [glowState, setGlowState] = useState<GlowState>("idle");

    const hasUserEditedKeyRef = useRef(false);
    const pendingKeyRequestRef = useRef<Promise<string | null> | null>(null);

    const {tags, loading: tagsLoading} = useTagStoreWithoutCount();
    const {createTag} = useTagMutations();
    const [tagSearch, setTagSearch] = useState("");
    const [createTagLoading, setCreateTagLoading] = useState(false);
    const [tagError, setTagError] = useState<string | null>(null);
    const [cleanedTrackerCount, setCleanedTrackerCount] = useState<number | null>(null);
    const [keptTrackers, setKeptTrackers] = useState<Set<string>>(new Set());
    const [appliedUrl, setAppliedUrl] = useState<string | null>(null);

    const trackerMode = usePreferencesStore((state) => state.trackerMode);

    useEffect(() => {
        void usePreferencesStore.getState().fetchPreferences();
    }, []);

    const shouldEnableCleaner =
        Boolean(enableUrlCleaner) &&
        (trackerMode === TRACKER_MODE.SUGGEST || trackerMode === TRACKER_MODE.AUTO_CLEAN) &&
        !urlError &&
        longUrl !== appliedUrl;
    const { result: cleanerResult } = useUrlCleaner({
        enabled: shouldEnableCleaner,
        url: longUrl,
    });

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
        setKeyError(null);
        setCleanedTrackerCount(null);
        setKeptTrackers(new Set());
        setAppliedUrl(null);
        setActiveScreen("form");
        setSlideDirection(-1);
        hasUserEditedKeyRef.current = false;
    }, [initialLongUrl, initialTitle, initialTagIds]);

    useEffect(() => {
        if (!hasUserEditedKeyRef.current) {
            setKey(initialKey);
            setKeyError(null);
        }
    }, [initialKey]);

    useEffect(() => {
        if (cleanedTrackerCount === null) return;
        const timer = setTimeout(() => setCleanedTrackerCount(null), URL_CLEANER_SUCCESS_DURATION_MS);
        return () => clearTimeout(timer);
    }, [cleanedTrackerCount]);

    const fetchRandomKey = useCallback(async (force: boolean): Promise<string | null> => {
        if (pendingKeyRequestRef.current) {
            return pendingKeyRequestRef.current;
        }

        const request = (async () => {
            try {
                const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS_RANDOM);
                if (!res.ok) {
                    throw new Error(`Failed to fetch random key: ${res.status}`);
                }

                const data = (await res.json()) as RandomKeyResponse;

                const shouldApplyKey = force || !hasUserEditedKeyRef.current;
                if (!shouldApplyKey) {
                    return null;
                }

                setKey(data.key);
                setKeyError(null);
                return data.key;
            } catch (err) {
                logger.error("Error fetching random key", err);
                if (!hasUserEditedKeyRef.current) {
                    setKeyError("Failed to generate a random key. Please type one manually.");
                }
                return null;
            }
        })();

        setIsKeyLoading(true);
        pendingKeyRequestRef.current = request;

        const result = await request;

        setIsKeyLoading(false);
        pendingKeyRequestRef.current = null;
        return result;
    }, []);

    useEffect(() => {
        if (autoGenerateKey) {
            void fetchRandomKey(false);
        }
    }, [autoGenerateKey, fetchRandomKey]);

    const debouncedKey = useDebounce(key, KEY_AVAILABILITY_CHECK_DEBOUNCE_MS);

    useEffect(() => {
        const trimmedKey = debouncedKey.trim();
        const trimmedInitialKey = initialKey.trim();
        const isExistingKey =
            trimmedInitialKey !== ""
            && trimmedKey.toLowerCase() === trimmedInitialKey.toLowerCase();

        const shouldSkipCheck =
            !hasUserEditedKeyRef.current ||
            trimmedKey === "" ||
            getShortKeyValidationError(trimmedKey) !== null ||
            isExistingKey;

        if (shouldSkipCheck) {
            return;
        }

        let cancelled = false;

        const checkAvailability = async () => {
            try {
                const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS_EXISTS(trimmedKey));
                if (cancelled) return;

                if (res.status === 200) {
                    setKeyError(SHORT_KEY_TAKEN_MESSAGE);
                } else if (res.status === 404) {
                    setKeyError(null);
                }
            } catch (err) {
                logger.error("Error checking short link key availability", err);
            }
        };

        void checkAvailability();

        return () => {
            cancelled = true;
        };
    }, [debouncedKey, initialKey]);

    const trackerEntries = React.useMemo(
        () => (cleanerResult ? buildTrackerEntries(longUrl, cleanerResult.removedParams) : []),
        [longUrl, cleanerResult],
    );

    const displayCleanerResult =
        trackerMode !== TRACKER_MODE.SUGGEST || (appliedUrl !== null && longUrl === appliedUrl) ? null : cleanerResult;

    useEffect(() => {
        if (trackerMode !== TRACKER_MODE.AUTO_CLEAN) return;
        if (!cleanerResult) return;
        if (appliedUrl !== null && longUrl === appliedUrl) return;
        if (cleanerResult.url === longUrl) return;
        const removedCount = cleanerResult.removedParams.length;
        if (removedCount === 0) return;

        setLongUrl(cleanerResult.url);
        setAppliedUrl(cleanerResult.url);
        setCleanedTrackerCount(removedCount);
        setUrlError(null);
        if (activeScreen === "review") {
            setSlideDirection(-1);
            setActiveScreen("form");
        }
    }, [cleanerResult, trackerMode, longUrl, appliedUrl, activeScreen]);

    const handleUrlChange = (value: string) => {
        setLongUrl(value);
        if (urlError) setUrlError(null);
        if (cleanedTrackerCount !== null) setCleanedTrackerCount(null);
        if (appliedUrl !== null) setAppliedUrl(null);
        if (activeScreen === "review") {
            setSlideDirection(-1);
            setActiveScreen("form");
        }
    };

    const handleCleanUrl = () => {
        if (!cleanerResult) return;
        const removedCount = cleanerResult.removedParams.length;
        setLongUrl(cleanerResult.url);
        setAppliedUrl(cleanerResult.url);
        setCleanedTrackerCount(removedCount);
        setUrlError(null);
    };

    const handleReviewUrl = () => {
        if (!cleanerResult) return;
        setKeptTrackers(new Set());
        setSlideDirection(1);
        setActiveScreen("review");
    };

    const handleToggleTracker = (key: string) => {
        setKeptTrackers((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleBackReview = () => {
        setSlideDirection(-1);
        setActiveScreen("form");
    };

    const handleApplyReview = () => {
        if (!cleanerResult) {
            setSlideDirection(-1);
            setActiveScreen("form");
            return;
        }
        const finalUrl = buildFinalUrl(longUrl, cleanerResult.url, trackerEntries, keptTrackers);
        const removedCount = trackerEntries.length - keptTrackers.size;
        setLongUrl(finalUrl);
        setAppliedUrl(finalUrl);
        if (removedCount > 0) {
            setCleanedTrackerCount(removedCount);
        } else {
            setCleanedTrackerCount(null);
        }
        setUrlError(null);
        setSlideDirection(-1);
        setActiveScreen("form");
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

    const handleKeyChange = (value: string) => {
        hasUserEditedKeyRef.current = true;
        setKey(value);
        setKeyError(getShortKeyValidationError(value));
    };

    const handleKeyBlur = () => {
        if (key.trim() !== "" || isKeyLoading || pendingKeyRequestRef.current) return;
        setKeyError(null);
        hasUserEditedKeyRef.current = false;
        void fetchRandomKey(true);
    };

    const handleRandomizeKey = () => {
        hasUserEditedKeyRef.current = false;
        void fetchRandomKey(true);
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

        let resolvedKey = key.trim();
        if (pendingKeyRequestRef.current) {
            setIsSubmitting(true);
            resolvedKey = (await pendingKeyRequestRef.current) ?? resolvedKey;
        }

        if (!resolvedKey) {
            setKeyError("Key is required.");
            setIsSubmitting(false);
            return;
        }

        const keyValidationError = getShortKeyValidationError(resolvedKey);
        if (keyValidationError) {
            setKeyError(keyValidationError);
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(normalized, titleText, resolvedKey, selectedTagIds);
        } catch (err) {
            if (err instanceof ShortKeyConflictError) {
                setKeyError(err.message);
                setSlideDirection(-1);
                setActiveScreen("form");
            }
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
                            cleanerResult={displayCleanerResult}
                            cleanedTrackerCount={cleanedTrackerCount}
                            titleText={titleText}
                            glowState={glowState}
                            isLoadingTitle={isLoadingTitle}
                            canSuggestTitle={canSuggestTitle}
                            enableTitleSuggestion={enableTitleSuggestion}
                            keyValue={key}
                            keyError={keyError}
                            isKeyLoading={isKeyLoading}
                            isKeyUnavailable={keyError === SHORT_KEY_TAKEN_MESSAGE}
                            selectedTagIds={selectedTagIds}
                            tags={tags}
                            isSubmitting={isSubmitting}
                            submitLabel={submitLabel}
                            submittingLabel={submittingLabel}
                            onCancel={onCancel}
                            onUrlChange={handleUrlChange}
                            onUrlBlur={handleUrlBlur}
                            onCleanUrl={handleCleanUrl}
                            onReviewUrl={handleReviewUrl}
                            onTitleChange={setTitleText}
                            onSuggestTitle={fetchTitle}
                            onKeyChange={handleKeyChange}
                            onKeyRandomize={handleRandomizeKey}
                            onKeyBlur={handleKeyBlur}
                            onOpenTagScreen={() => {
                                setSlideDirection(1);
                                setActiveScreen("tags");
                            }}
                            onTagChange={setSelectedTagIds}
                            onSubmit={handleSubmit}
                        />
                    </motion.div>
                ) : activeScreen === "tags" ? (
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
                            hasKeyError={!!keyError}
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
                ) : (
                    <motion.div
                        key="review"
                        custom={slideDirection}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{duration: 0.2, ease: "easeInOut"}}
                        className="w-full"
                    >
                        <TrackerReviewScreen
                            cleanedUrl={cleanerResult?.url ?? longUrl}
                            entries={trackerEntries}
                            kept={keptTrackers}
                            onToggle={handleToggleTracker}
                            onBack={handleBackReview}
                            onApply={handleApplyReview}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
