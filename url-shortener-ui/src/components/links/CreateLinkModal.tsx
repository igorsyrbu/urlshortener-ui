"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useQueryClient} from "@tanstack/react-query";
import {refreshAfter} from "@/lib/query/invalidation";
import {AnimatePresence, MotionConfig, motion} from "framer-motion";
import {LinkFormFields} from "@/components/links/LinkFormFields";
import {CreateLinkSuccess} from "@/components/links/CreateLinkSuccess";
import {CONFETTI_PARTICLE_COUNT, CONFETTI_SPREAD, ROUTES} from "@/lib/constants";
import {createShortLink, ShortKeyConflictError, type ShortLinkData} from "@/lib/links-api";
import type {LinkFormSubmit} from "@/components/links/create-link-types";
import {logger} from "@/lib/logger";
import {cn} from "@/lib/utils";

type ViewState = "form" | "success";

interface CreateLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface CreateLinkModalBodyProps {
    onOpenChange: (open: boolean) => void;
}

const CONFETTI_ORIGIN_Y = 0.6;

function loadConfetti() {
    return import("canvas-confetti").then((confettiModule) => confettiModule.default);
}

async function celebrateCreatedLink(): Promise<void> {
    const confetti = await loadConfetti();
    // The default instance draws in a blob: Web Worker, which the Content-Security-Policy blocks (it has no worker-src),
    // so no confetti appeared. This one draws on the main thread and needs no policy change.
    const fireOnMainThread = confetti.create(undefined, {resize: true, useWorker: false});
    void fireOnMainThread({
        particleCount: CONFETTI_PARTICLE_COUNT,
        spread: CONFETTI_SPREAD,
        origin: {y: CONFETTI_ORIGIN_Y},
        disableForReducedMotion: true,
    });
}

/** Rejects with `ShortKeyConflictError` for a taken key and with the failure otherwise; `LinkFormFields` shows both. */
async function submitNewLink(longUrl: string, title: string, key: string, tagIds: string[], password: string | null): Promise<ShortLinkData> {
    try {
        return await createShortLink({longUrl, title, key, tagIds, password});
    } catch (error) {
        if (!(error instanceof ShortKeyConflictError)) logger.error("Error creating link", error);
        throw error;
    }
}

function CreateLinkModalBody({onOpenChange}: CreateLinkModalBodyProps) {
    const isDesktop = useIsDesktop();
    const router = useRouter();
    const [viewState, setViewState] = useState<ViewState>("form");
    const [shortLink, setShortLink] = useState<ShortLinkData | null>(null);
    const queryClient = useQueryClient();

    const handleFormSubmit: LinkFormSubmit = async (longUrl, title, key, tagIds, password) => {
        const createdLink = await submitNewLink(longUrl, title, key, tagIds, password);
        setShortLink(createdLink);
        setViewState("success");
        // The confetti chunk downloads on the first link; the list refresh must not wait for it.
        void celebrateCreatedLink();
        router.push(ROUTES.LINKS, {scroll: false});
        void refreshAfter(queryClient, "linkCreated");
    };

    return (
        <MotionConfig reducedMotion="user">
        <motion.div animate={{height: "auto"}} transition={{duration: 0.3, ease: "easeInOut"}}>
            <AnimatePresence mode="wait">
                {viewState === "form" ? (
                    <motion.div
                        key="form"
                        exit={{opacity: 0, scale: 0.95}}
                        transition={{duration: 0.2}}
                        className={cn(isDesktop ? "p-6" : "px-6 pt-6")}
                    >
                        {isDesktop && (
                            <DialogHeader className="mb-4">
                                <h2 className="text-lg font-semibold leading-none">Create link</h2>
                            </DialogHeader>
                        )}
                        <LinkFormFields
                            title="Create link"
                            autoGenerateKey
                            onSubmit={handleFormSubmit}
                            submitLabel="Create"
                            submittingLabel="Creating..."
                            onCancel={() => onOpenChange(false)}
                            enableTitleSuggestion
                            enableUrlCleaner
                        />
                    </motion.div>
                ) : null}

                {viewState === "success" && shortLink ? (
                    <CreateLinkSuccess shortUrl={shortLink.shortUrl} onClose={() => onOpenChange(false)}/>
                ) : null}
            </AnimatePresence>
        </motion.div>
        </MotionConfig>
    );
}

export function CreateLinkModal({open, onOpenChange}: CreateLinkModalProps) {
    const isDesktop = useIsDesktop();

    // Download the confetti while the form is filled in, so it fires the moment the link is created.
    useEffect(() => {
        if (!open) return;
        void loadConfetti();
    }, [open]);

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className="gap-0 border-border p-0 sm:max-w-106.25"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogTitle className="sr-only">Create link</DialogTitle>
                    <DialogDescription className="sr-only">Create a new short link to share</DialogDescription>
                    {open ? <CreateLinkModalBody onOpenChange={onOpenChange}/> : null}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="p-0 outline-hidden">
                <DrawerTitle className="sr-only">Create link</DrawerTitle>
                <DrawerDescription className="sr-only">Create a new short link to share</DrawerDescription>
                {open ? <CreateLinkModalBody onOpenChange={onOpenChange}/> : null}
            </DrawerContent>
        </Drawer>
    );
}
