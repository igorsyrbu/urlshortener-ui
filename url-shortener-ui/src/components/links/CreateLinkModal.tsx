"use client";

import {useState} from "react";
import {Dialog, DialogContent} from "@/components/ui/dialog";
import {useLinkStore} from "@/lib/store/links";
import {AnimatePresence, motion} from "framer-motion";
import confetti from "canvas-confetti";
import {CreateLinkForm} from "@/components/links/CreateLinkForm";
import {CreateLinkSuccess} from "@/components/links/CreateLinkSuccess";
import {CreateLinkModalLoading} from "@/components/links/CreateLinkModalLoading";
import type {ShortLinkData} from "@/components/links/create-link-types";
import {CONFETTI_PARTICLE_COUNT, CONFETTI_SPREAD} from "@/lib/constants";

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

    const handleSubmitSuccess = (data: ShortLinkData) => {
        setShortLink(data);
        setViewState("success");

        confetti({
            particleCount: CONFETTI_PARTICLE_COUNT,
            spread: CONFETTI_SPREAD,
            origin: {y: CONFETTI_ORIGIN_Y},
        });

        fetchLinks();
    };

    const handleSubmitError = () => {
        setViewState("form");
    };

    return (
        <motion.div animate={{height: "auto"}} transition={{duration: 0.3, ease: "easeInOut"}}>
            <AnimatePresence mode="wait">
                {viewState === "form" ? (
                    <CreateLinkForm
                        onSubmitSuccess={handleSubmitSuccess}
                        onSubmitError={handleSubmitError}
                        onLoadingStart={() => setViewState("loading")}
                    />
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
                className="gap-0 overflow-hidden border-border bg-background/95 p-0 backdrop-blur-md sm:max-w-[425px] sm:rounded-2xl">
                {open ? <CreateLinkModalBody onOpenChange={onOpenChange}/> : null}
            </DialogContent>
        </Dialog>
    );
}
