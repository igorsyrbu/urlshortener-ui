"use client";

import {lazyDialog} from "@/lib/lazy-dialog";

function loadQrCodeModal() {
    return import("@/components/links/QrCodeModal").then((modalModule) => modalModule.QrCodeModal);
}

export const LazyQrCodeModal = lazyDialog(loadQrCodeModal);

/** Starts the QR dialog and its QR library downloading when a link's action menu opens, before "QR Code" is chosen. */
export function preloadQrCodeModal(): void {
    void LazyQrCodeModal.preload();
    void import("qr-code-styling");
}
