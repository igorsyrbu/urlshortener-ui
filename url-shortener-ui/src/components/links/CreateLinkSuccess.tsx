"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Check, Copy} from "lucide-react";
import {motion} from "framer-motion";
import {useCopyToClipboard} from "@/lib/hooks/useCopyToClipboard";
import {ICON_BUTTON_LABELS} from "@/lib/constants";

interface CreateLinkSuccessProps {
    shortUrl: string;
    onClose: () => void;
}

export function CreateLinkSuccess({shortUrl, onClose}: CreateLinkSuccessProps) {
    const {isCopied, copy} = useCopyToClipboard();

    const handleCopy = () => copy(shortUrl);

    return (
        <motion.div
            key="success"
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.95}}
            transition={{duration: 0.2}}
            className="p-6 text-center"
        >
            <div
                className="mx-auto w-12 h-12 bg-success/10 text-success rounded-full flex items-center justify-center mb-4">
                <Check className="h-6 w-6"/>
            </div>
            <h3 className="text-xl font-semibold mb-6">Link Created!</h3>

            <div className="flex items-center gap-2 mb-6">
                <Input
                    readOnly
                    value={shortUrl}
                    className="text-base font-medium text-center focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/50"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 transition-colors"
                    onClick={handleCopy}
                    aria-label={ICON_BUTTON_LABELS.COPY_SHORT_LINK}
                    title={ICON_BUTTON_LABELS.COPY_SHORT_LINK}
                >
                    {isCopied ? <Check className="h-4 w-4 text-success"/> : <Copy className="h-4 w-4"/>}
                </Button>
            </div>

            <Button className="w-full" onClick={onClose}>
                Done
            </Button>
        </motion.div>
    );
}
