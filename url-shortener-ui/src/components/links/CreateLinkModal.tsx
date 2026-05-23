"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {useLinkStore} from "@/lib/store/links";
import {AnimatePresence, motion} from "framer-motion";
import {LinkFormFields} from "@/components/links/LinkFormFields";
import {CreateLinkSuccess} from "@/components/links/CreateLinkSuccess";
import {CreateLinkModalLoading} from "@/components/links/CreateLinkModalLoading";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, CONFETTI_PARTICLE_COUNT, CONFETTI_SPREAD} from "@/lib/constants";
import type {ShortLinkData} from "@/components/links/create-link-types";

type ViewState = "form" | "loading" | "success";

interface CreateLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface CreateLinkModalBodyProps {
    onOpenChange: (open: boolean) => void;
}

const CONFETTI_ORIGIN_Y = 0.6;

function CreateLinkModalBody({onOpenChange}: CreateLinkModalBodyProps) {
    const [viewState, setViewState] = useState<ViewState>("form");
    const [shortLink, setShortLink] = useState<ShortLinkData | null>(null);
    const {fetchLinks} = useLinkStore();

    const handleSubmitSuccess = async (data: ShortLinkData) => {
        setShortLink(data);
        setViewState("success");

        const confetti = (await import("canvas-confetti")).default;
        confetti({
            particleCount: CONFETTI_PARTICLE_COUNT,
            spread: CONFETTI_SPREAD,
            origin: {y: CONFETTI_ORIGIN_Y},
        });

        fetchLinks();
    };

    const handleFormSubmit = async (longUrl: string, title: string, tagIds: string[]) => {
        setViewState("loading");
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
                method: "POST",
                body: JSON.stringify({
                    longUrl,
                    title,
                    shortUrl: null,
                    tagIds: tagIds.length > 0 ? [...tagIds] : undefined,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                await handleSubmitSuccess(data);
            } else {
                console.error("Failed to create link");
                setViewState("form");
                throw new Error("Failed to create link");
            }
        } catch (err) {
            console.error("Error creating link", err);
            setViewState("form");
            throw err;
        }
    };

    return (
        <motion.div animate={{height: "auto"}} transition={{duration: 0.3, ease: "easeInOut"}}>
            <AnimatePresence mode="wait">
                {viewState === "form" ? (
                    <motion.div
                        key="form"
                        initial={{opacity: 0, y: 10}}
                        animate={{opacity: 1, y: 0}}
                        exit={{opacity: 0, scale: 0.95}}
                        transition={{duration: 0.2}}
                        className="p-6"
                    >
                        <DialogHeader className="mb-4">
                            <DialogTitle>Create link</DialogTitle>
                        </DialogHeader>
                        <LinkFormFields
                            onSubmit={handleFormSubmit}
                            submitLabel="Create"
                            submittingLabel="Creating..."
                            onCancel={() => onOpenChange(false)}
                            enableTitleSuggestion
                        />
                    </motion.div>
                ) : null}

                {viewState === "loading" ? <CreateLinkModalLoading/> : null}

                {viewState === "success" && shortLink ? (
                    <CreateLinkSuccess shortUrl={shortLink.shortUrl} onClose={() => onOpenChange(false)}/>
                ) : null}
            </AnimatePresence>
        </motion.div>
    );
}

export function CreateLinkModal({open, onOpenChange}: CreateLinkModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                aria-describedby={undefined}
                className="gap-0 border-border bg-background/95 p-0 backdrop-blur-md sm:max-w-106.25 sm:rounded-2xl">
                {open ? <CreateLinkModalBody onOpenChange={onOpenChange}/> : null}
            </DialogContent>
        </Dialog>
    );
}
