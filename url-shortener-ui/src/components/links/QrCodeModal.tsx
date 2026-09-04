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
    DrawerHeader,
    DrawerTitle
} from "@/components/ui/drawer";
import {useIsDesktop} from "@/lib/hooks/useMediaQuery";
import {Button} from "@/components/ui/button";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "@/components/ui/dropdown-menu";
import {Check, Copy, Download, FileImage, FileType, Loader2} from "lucide-react";
import {LinkItem} from "@/lib/types";
import {COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import type QRCodeStylingType from "qr-code-styling";
import {logger} from "@/lib/logger";
import {ActionDrawer} from "@/components/ui/action-drawer";

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

const IS_CLIPBOARD_ITEM_SUPPORTED = typeof ClipboardItem !== "undefined";

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

    // iOS Safari revokes user-activation after any `await` that precedes a
    // clipboard call, so we must call `navigator.clipboard.write()` with zero
    // awaits before it.  ClipboardItem accepts a Promise<Blob>, which lets us
    // pass the async work as the *value* of the item — Safari captures the
    // activation at call time, before the promise resolves.
    //
    // NOTE: this bug is not unit-testable because it depends on Safari's
    // real user-activation timing; it can only be verified on a real iOS device.
    const handleCopy = (ext: QrFileExtension): void => {
        const mime = ext === "png" ? "image/png" : "text/plain";

        const blobPromise: Promise<Blob> = (async () => {
            const qr = await getOrBuildHighResQr();
            if (!qr) throw new Error("QR instance not ready");
            const raw = await qr.getRawData(ext);
            if (!raw) throw new Error("No data returned from getRawData");
            if (ext === "svg") {
                const text = await (raw as Blob).text();
                return new Blob([text], {type: "text/plain"});
            }
            return raw as Blob;
        })();

        if (!IS_CLIPBOARD_ITEM_SUPPORTED) {
            // Fallback for browsers without ClipboardItem (old Safari/WebKit).
            // These browsers don't enforce strict user-activation on writeText,
            // so calling it asynchronously after blob resolution is safe.
            blobPromise
                .then(async (blob) => {
                    const text = await blob.text();
                    await navigator.clipboard.writeText(text);
                    setCopied(ext);
                    setTimeout(() => setCopied(null), COPY_FEEDBACK_DURATION_MS);
                })
                .catch((e) => logger.error(`Failed to copy ${ext} (fallback)`, e))
                .finally(() => setIsCopyOpen(false));
            return;
        }

        navigator.clipboard
            .write([new ClipboardItem({[mime]: blobPromise})])
            .then(() => {
                setCopied(ext);
                setTimeout(() => setCopied(null), COPY_FEEDBACK_DURATION_MS);
            })
            .catch((e) => {
                // Some older WebKit builds reject ClipboardItem for "text/plain".
                // Fall back to writeText — these browsers don't enforce strict
                // user-activation, so async usage is safe here.
                if (ext === "svg") {
                    blobPromise
                        .then(async (blob) => {
                            const text = await blob.text();
                            await navigator.clipboard.writeText(text);
                            setCopied(ext);
                            setTimeout(() => setCopied(null), COPY_FEEDBACK_DURATION_MS);
                        })
                        .catch((inner) => logger.error(`Failed to copy ${ext} (writeText fallback)`, inner));
                } else {
                    logger.error(`Failed to copy ${ext}`, e);
                }
            })
            .finally(() => setIsCopyOpen(false));
    };

    const isDesktop = useIsDesktop();

    // Shared QR image area — used by both the desktop Dialog and mobile Drawer.
    const qrPreviewContent = (
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
    );

    if (isDesktop) {
        const handleDownloadMenuOpenChange = (isOpen: boolean): void => {
            setIsDownloadOpen(isOpen);
            if (isOpen) setIsCopyOpen(false);
        };

        const handleCopyMenuOpenChange = (isOpen: boolean): void => {
            setIsCopyOpen(isOpen);
            if (isOpen) setIsDownloadOpen(false);
        };

        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-md border-border"
                               showCloseButton={false}
                               onOpenAutoFocus={(e) => e.preventDefault()}>
                    <DialogTitle className="sr-only">QR Code</DialogTitle>
                    <DialogDescription className="sr-only">View and download QR code for this link</DialogDescription>
                    <DialogHeader className="text-left">
                        <h2 className="text-lg font-semibold leading-none">QR Code</h2>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 mt-3 sm:-mt-2">
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
                        {qrPreviewContent}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile: nested ActionDrawers slide up on top of the QR drawer.
    // No cancel button — users dismiss by swiping or tapping the overlay.
    return (
        <>
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="outline-hidden px-6 gap-4">
                    <DrawerTitle className="sr-only">QR Code</DrawerTitle>
                    <DrawerDescription className="sr-only">View and download QR code for this link</DrawerDescription>
                    <DrawerHeader className="p-0 text-center">
                        <h2 className="text-lg font-semibold leading-none">QR Code</h2>
                    </DrawerHeader>

                    <div className="flex flex-col gap-3 mt-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground truncate mr-4"
                               title={link?.title}>{link?.title}</p>
                            <div className="flex items-center gap-2 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsDownloadOpen(true)}
                                    aria-label="Download QR code"
                                >
                                    <Download className="h-4 w-4"/>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsCopyOpen(true)}
                                    aria-label="Copy QR code"
                                >
                                    {copied ? <Check className="h-4 w-4 text-success"/> : <Copy className="h-4 w-4"/>}
                                </Button>
                            </div>
                        </div>
                        {qrPreviewContent}
                    </div>
                </DrawerContent>
            </Drawer>

            <ActionDrawer
                open={isDownloadOpen}
                onOpenChange={setIsDownloadOpen}
                title="Download QR code"
                align="center"
                overlayClassName="backdrop-blur-lg"
                actions={[
                    {
                        label: "Download as PNG",
                        icon: FileImage,
                        onClick: () => handleDownload("png"),
                    },
                    {
                        label: "Download as SVG",
                        icon: FileType,
                        onClick: () => handleDownload("svg"),
                    },
                ]}
            />

            <ActionDrawer
                open={isCopyOpen}
                onOpenChange={setIsCopyOpen}
                title="Copy QR code"
                align="center"
                overlayClassName="backdrop-blur-lg"
                actions={[
                    {
                        label: "Copy as PNG",
                        icon: FileImage,
                        onClick: () => handleCopy("png"),
                    },
                    {
                        label: "Copy as SVG",
                        icon: FileType,
                        onClick: () => handleCopy("svg"),
                    },
                ]}
            />
        </>
    );
}
