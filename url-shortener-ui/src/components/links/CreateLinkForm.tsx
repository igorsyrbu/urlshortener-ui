"use client";

import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {motion} from "framer-motion";
import {fetchWithAuth} from "@/lib/api";
import {generateTitleFromHostname} from "@/lib/utils";
import {getDomain, isValidUrl, normalizeUrl} from "@/lib/url-utils";
import {API_ENDPOINTS, GLOW_FADE_DELAY_MS} from "@/lib/constants";
import {CreateLinkUrlField} from "@/components/links/CreateLinkUrlField";
import {CreateLinkTitleField} from "@/components/links/CreateLinkTitleField";
import type {GlowState, ShortLinkData} from "@/components/links/create-link-types";


interface CreateLinkFormProps {
    onSubmitSuccess: (data: ShortLinkData) => void;
    onSubmitError: () => void;
    onLoadingStart: () => void;
}

const LONG_URL_FIELD_ID = "longUrl";
const TITLE_FIELD_ID = "title";

export function CreateLinkForm({onSubmitSuccess, onSubmitError, onLoadingStart}: CreateLinkFormProps) {
    const [longUrl, setLongUrl] = useState("");
    const [urlError, setUrlError] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [isLoadingTitle, setIsLoadingTitle] = useState(false);
    const [glowState, setGlowState] = useState<GlowState>("idle");

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

        onLoadingStart();

        try {
            const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
                method: "POST",
                body: JSON.stringify({longUrl: normalized, title, shortUrl: null}),
            });

            if (res.ok) {
                const data = await res.json();
                onSubmitSuccess(data);
            } else {
                console.error("Failed to create link");
                onSubmitError();
            }
        } catch (err) {
            console.error("Error creating link", err);
            onSubmitError();
        }
    };

    const canSuggestTitle = Boolean(longUrl) && !urlError;

    return (
        <motion.div
            key="form"
            initial={{opacity: 0, y: 10}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, scale: 0.95}}
            transition={{duration: 0.2}}
            className="p-6"
        >
            <DialogHeader className="mb-4">
                <DialogTitle>Create New Short Link</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
                <CreateLinkUrlField
                    inputId={LONG_URL_FIELD_ID}
                    value={longUrl}
                    urlError={urlError}
                    onChange={handleUrlChange}
                    onBlur={handleUrlBlur}
                />
                <CreateLinkTitleField
                    inputId={TITLE_FIELD_ID}
                    value={title}
                    glowState={glowState}
                    isLoadingTitle={isLoadingTitle}
                    canSuggestTitle={canSuggestTitle}
                    onChange={setTitle}
                    onSuggestTitle={fetchTitle}
                />
                <DialogFooter className="mt-2">
                    <Button
                        type="submit"
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                    >
                        Create Link
                    </Button>
                </DialogFooter>
            </form>
        </motion.div>
    );
}
