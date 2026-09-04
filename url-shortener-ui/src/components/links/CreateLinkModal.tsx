"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Drawer, DrawerContent, DrawerDescription, DrawerTitle} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {useLinkStore} from "@/lib/store/links";
import {AnimatePresence, motion} from "framer-motion";
import {LinkFormFields} from "@/components/links/LinkFormFields";
import {CreateLinkSuccess} from "@/components/links/CreateLinkSuccess";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, CONFETTI_PARTICLE_COUNT, CONFETTI_SPREAD} from "@/lib/constants";
import {ShortKeyConflictError, type ShortLinkData} from "@/components/links/create-link-types";
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

function CreateLinkModalBody({onOpenChange}: CreateLinkModalBodyProps) {
    const isDesktop = useIsDesktop();
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

    const handleFormSubmit = async (longUrl: string, title: string, key: string, tagIds: string[]) => {
        try {
            const res = await fetchWithAuth(API_ENDPOINTS.SHORTLINKS, {
                method: "POST",
                body: JSON.stringify({
                    longUrl,
                    title,
                    key,
                    isActive: true,
                    tagIds: tagIds.length > 0 ? [...tagIds] : undefined,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                await handleSubmitSuccess(data);
            } else if (res.status === 409) {
                logger.error("Short link key conflict on create", undefined, {status: res.status});
                throw new ShortKeyConflictError();
            } else {
                logger.error("Failed to create link", undefined, { status: res.status });
                throw new Error("Failed to create link");
            }
        } catch (err) {
            logger.error("Error creating link", err);
            throw err;
        }
    };

    return (
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
    );
}

export function CreateLinkModal({open, onOpenChange}: CreateLinkModalProps) {
    const isDesktop = useIsDesktop();

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
