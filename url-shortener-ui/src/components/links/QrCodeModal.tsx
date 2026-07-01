"use client";

import React, {useCallback, useEffect, useRef, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {Button} from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Check, Copy, Download, Loader2} from "lucide-react";
import {LinkItem} from "@/lib/types";
import {COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import type QRCodeStylingType from "qr-code-styling";
import {logger} from "@/lib/logger";

// ---------------------------------------------------------------------------
// Module-level import cache — the dynamic import promise is resolved only once
// across the entire lifetime of the page, regardless of how many times the
// modal is opened or how many download/copy actions are triggered.
// ---------------------------------------------------------------------------
let cachedQRCodeStylingLib: (typeof import("qr-code-styling"))["default"] | null = null;

const getQRCodeStylingLib = async (): Promise<(typeof import("qr-code-styling"))["default"]> => {
    if (!cachedQRCodeStylingLib) {
        cachedQRCodeStylingLib = (await import("qr-code-styling")).default;
    }
    return cachedQRCodeStylingLib;
};

// Intentional Design Choice: Dots are hardcoded to black (#000000) and the background
// to white ("white") to guarantee maximum contrast and reliable physical device scanning
// (especially for paper prints and dark mode screens). These values must not be refactored
// to use theme-based variables.
const QR_BASE_OPTIONS = {
    dotsOptions: {color: "#000000", type: "rounded"} as const,
    backgroundOptions: {color: "white"} as const,
    cornersSquareOptions: {type: "rounded"} as const,
};

const QR_LOW_RES_SIZE = 500;
const QR_HIGH_RES_SIZE = 2048;

const extractShortKey = (shortUrl: string): string =>
    shortUrl.split("/").filter(Boolean).pop() ?? "link";

type QrFileExtension = "svg" | "png";

async function writeToClipboard(ext: QrFileExtension, blob: Blob): Promise<void> {
    if (ext === "png") {
        await navigator.clipboard.write([new ClipboardItem({"image/png": blob})]);
    } else {
        const text = await blob.text();
        await navigator.clipboard.writeText(text);
    }
}

interface QrCodeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    link: LinkItem | null;
}

export function QrCodeModal({open, onOpenChange, link}: QrCodeModalProps) {
    const qrRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [isDownloadOpen, setIsDownloadOpen] = useState(false);
    const [isCopyOpen, setIsCopyOpen] = useState(false);
    const [isQrLoading, setIsQrLoading] = useState(false);

    const lastRenderedLinkId = useRef<string | null>(null);
    const lowResQrInstance = useRef<QRCodeStylingType | null>(null);
    const highResQrInstance = useRef<QRCodeStylingType | null>(null);

    const buildQrCode = useCallback(
        async (width: number, height: number, margin?: number): Promise<QRCodeStylingType | null> => {
            if (!link) return null;
            const QRCodeStyling = await getQRCodeStylingLib();
            return new QRCodeStyling({
                ...QR_BASE_OPTIONS,
                data: link.shortUrl,
                width,
                height,
                ...(margin !== undefined ? {margin} : {}),
            });
        },
        [link],
    );

    useEffect(() => {
        if (!open || !link) return;

        const isSameLink = lastRenderedLinkId.current === link.id;
        if (isSameLink && lowResQrInstance.current) return;

        const renderPreview = async () => {
            setIsQrLoading(true);
            try {
                const qr = await buildQrCode(QR_LOW_RES_SIZE, QR_LOW_RES_SIZE, 0);
                if (!qr || !qrRef.current) return;

                if (lowResQrInstance.current) {
                    lowResQrInstance.current.update({data: link.shortUrl});
                } else {
                    qrRef.current.innerHTML = "";
                    qr.append(qrRef.current);
                    lowResQrInstance.current = qr;
                }

                highResQrInstance.current = null;
                lastRenderedLinkId.current = link.id;
            } finally {
                setIsQrLoading(false);
            }
        };

        renderPreview();
    }, [open, link, buildQrCode]);

    useEffect(() => {
        if (open) return;
        lowResQrInstance.current = null;
        highResQrInstance.current = null;
        lastRenderedLinkId.current = null;
    }, [open]);

    const getOrBuildHighResQr = useCallback(async (): Promise<QRCodeStylingType | null> => {
        if (!link) return null;
        if (!highResQrInstance.current) {
            highResQrInstance.current = await buildQrCode(QR_HIGH_RES_SIZE, QR_HIGH_RES_SIZE);
        }
        return highResQrInstance.current;
    }, [link, buildQrCode]);

    const handleDownload = async (ext: QrFileExtension): Promise<void> => {
        const qr = await getOrBuildHighResQr();
        if (!qr || !link) return;
        await qr.download({extension: ext, name: `${extractShortKey(link.shortUrl)}-qrcode`});
        setIsDownloadOpen(false);
    };

    const handleCopy = async (ext: QrFileExtension): Promise<void> => {
        try {
            const qr = await getOrBuildHighResQr();
            if (!qr) return;

            const blob = await qr.getRawData(ext);
            if (!blob) return;

            await writeToClipboard(ext, blob as Blob);
            setCopied(ext);
            setTimeout(() => setCopied(null), COPY_FEEDBACK_DURATION_MS);
        } catch (e) {
            logger.error(`Failed to copy ${ext}`, e);
        }
        setIsCopyOpen(false);
    };

    const handleDownloadMenuOpenChange = (isOpen: boolean): void => {
        setIsDownloadOpen(isOpen);
        if (isOpen) setIsCopyOpen(false);
    };

    const handleCopyMenuOpenChange = (isOpen: boolean): void => {
        setIsCopyOpen(isOpen);
        if (isOpen) setIsDownloadOpen(false);
    };

    const isDesktop = useIsDesktop();

    const bodyContent = (
        <div className="flex flex-col gap-3 -mt-2">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground truncate mr-4"
                   title={link?.title}>{link?.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                    <DropdownMenu open={isDownloadOpen} onOpenChange={handleDownloadMenuOpenChange}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <Download className="h-4 w-4"/>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-0">
                            <DropdownMenuItem onClick={() => handleDownload("png")}>
                                Download PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownload("svg")}>
                                Download SVG
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu open={isCopyOpen} onOpenChange={handleCopyMenuOpenChange}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                {copied ? <Check className="h-4 w-4 text-success"/> :
                                    <Copy className="h-4 w-4"/>}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-0">
                            <DropdownMenuItem onClick={() => handleCopy("png")}>
                                Copy PNG
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopy("svg")}>
                                Copy SVG
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
            <div
                className="relative border border-border rounded-xl p-4 sm:p-8 bg-muted/30 flex items-center justify-center min-h-62.5 sm:min-h-75">
                {isQrLoading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground"/>
                    </div>
                )}
                <div ref={qrRef}
                     className="bg-white p-2 rounded-xl shadow-sm flex items-center justify-center max-w-full [&>svg]:max-w-full [&>svg]:h-auto [&>canvas]:max-w-full [&>canvas]:h-auto"/>
            </div>
        </div>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md backdrop-blur-md bg-background/95 border-border"
                               showCloseButton={false}
                               onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogTitle className="sr-only">QR Code</DialogTitle>
                    <DialogDescription className="sr-only">View and download QR code for this link</DialogDescription>
                    <DialogHeader className="text-left">
                        <h2 className="text-lg font-semibold leading-none">QR Code</h2>
                    </DialogHeader>

                    {bodyContent}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent className="outline-hidden px-6 pb-6 gap-4">
                <DrawerTitle className="sr-only">QR Code</DrawerTitle>
                <DrawerDescription className="sr-only">View and download QR code for this link</DrawerDescription>
                <DrawerHeader className="p-0 text-center">
                    <h2 className="text-lg font-semibold leading-none">QR Code</h2>
                </DrawerHeader>

                {bodyContent}

                <DrawerFooter className="p-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                        Close
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    );
}
