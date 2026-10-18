"use client";

import dynamic from "next/dynamic";

function loadQrCodeModal() {
    return import("@/components/links/QrCodeModal").then((modalModule) => modalModule.QrCodeModal);
}

/** Starts the QR dialog and its QR library downloading when a link's action menu opens, before "QR Code" is chosen. */
export function preloadQrCodeModal(): void {
    void loadQrCodeModal();
    void import("qr-code-styling");
}

export const LazyQrCodeModal = dynamic(loadQrCodeModal, {ssr: false});
