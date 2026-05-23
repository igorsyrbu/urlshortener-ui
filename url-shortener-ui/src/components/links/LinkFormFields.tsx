"use client";

import React, {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {DialogFooter} from "@/components/ui/dialog";
import {EnterKbd} from "@/components/ui/enter-kbd";
import {Input} from "@/components/ui/input";
import {fetchWithAuth} from "@/lib/api";
import {generateTitleFromHostname} from "@/lib/utils";
import {getDomain, isValidUrl, normalizeUrl} from "@/lib/url-utils";
import {API_ENDPOINTS, GLOW_FADE_DELAY_MS} from "@/lib/constants";
import {CreateLinkUrlField} from "@/components/links/CreateLinkUrlField";
import {CreateLinkTitleField} from "@/components/links/CreateLinkTitleField";
import {TagSelect} from "@/components/links/TagSelect";
import type {GlowState} from "@/components/links/create-link-types";

interface LinkFormFieldsProps {
    initialLongUrl?: string;
    initialTitle?: string;
    initialTagIds?: string[];
    onSubmit: (longUrl: string, title: string, tagIds: string[]) => Promise<void>;
    submitLabel: string;
    submittingLabel: string;
    onCancel: () => void;
    enableTitleSuggestion?: boolean;
}

const LONG_URL_FIELD_ID = "longUrl";
const TITLE_FIELD_ID = "title";
const EMPTY_TAG_IDS: string[] = [];

export function LinkFormFields({
    initialLongUrl = "",
    initialTitle = "",
    initialTagIds = EMPTY_TAG_IDS,
    onSubmit,
    submitLabel,
    submittingLabel,
    onCancel,
    enableTitleSuggestion = false,
}: LinkFormFieldsProps) {
    const [longUrl, setLongUrl] = useState(initialLongUrl);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [title, setTitle] = useState(initialTitle);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingTitle, setIsLoadingTitle] = useState(false);
    const [glowState, setGlowState] = useState<GlowState>("idle");

    useEffect(() => {
        setLongUrl(initialLongUrl);
        setTitle(initialTitle);
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
            setTitle(generateTitleFromHostname(hostname));
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
                const text = await res.text();
                if (text && text.trim()) {
                    setTitle(text);
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

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const normalized = normalizeUrl(longUrl);
        if (normalized !== longUrl) {
            setLongUrl(normalized);
        }
        if (!isValidUrl(normalized)) {
            setUrlError("Please enter a valid URL (e.g. https://example.com)");
            return;
        }
        setIsSubmitting(true);
        try {
            await onSubmit(normalized, title, selectedTagIds);
        } catch {
            setIsSubmitting(false);
        }
    };

    const canSuggestTitle = Boolean(longUrl) && !urlError;

    return (
        <form onSubmit={handleSubmit} className="grid gap-4">
            <CreateLinkUrlField
                inputId={LONG_URL_FIELD_ID}
                value={longUrl}
                urlError={urlError}
                onChange={handleUrlChange}
                onBlur={handleUrlBlur}
            />
            {enableTitleSuggestion ? (
                <CreateLinkTitleField
                    inputId={TITLE_FIELD_ID}
                    value={title}
                    glowState={glowState}
                    isLoadingTitle={isLoadingTitle}
                    canSuggestTitle={canSuggestTitle}
                    onChange={setTitle}
                    onSuggestTitle={fetchTitle}
                />
            ) : (
                <div className="grid gap-2">
                    <label htmlFor={TITLE_FIELD_ID} className="text-sm font-medium">
                        Title
                    </label>
                    <Input
                        id={TITLE_FIELD_ID}
                        placeholder="e.g. Marketing Campaign Q4"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>
            )}
            <div className="grid gap-2">
                <label className="text-sm font-medium">Tags</label>
                <TagSelect
                    selectedTagIds={selectedTagIds}
                    onChange={setSelectedTagIds}
                />
            </div>
            <DialogFooter className="pt-2 gap-2 sm:gap-2">
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={isSubmitting || !longUrl.trim()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isSubmitting ? submittingLabel : (
                        <>
                            {submitLabel}
                            <EnterKbd />
                        </>
                    )}
                </Button>
            </DialogFooter>
        </form>
    );
}
