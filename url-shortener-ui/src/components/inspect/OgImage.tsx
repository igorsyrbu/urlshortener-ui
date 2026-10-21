"use client";

import {useEffect, useRef, useState} from "react";
import {ImageIcon} from "lucide-react";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";

interface OgImageProps {
    src?: string | null;
    alt: string;
}

type ImageStatus = "loading" | "success" | "error";

const IMAGE_GIVE_UP_TIMEOUT_MS = 8000;
const PROXY_BASE = "https://wsrv.nl";
// Twice the widest card (max-w-2xl, 672 px), enough for 2x screens.
const PREVIEW_MAX_WIDTH_PX = 1344;
const PREVIEW_QUALITY = 80;
const PREVIEW_WIDTH_ATTRIBUTE = 1200;
const PREVIEW_HEIGHT_ATTRIBUTE = 630;

function getProxyUrl(url: string): string {
    const params = new URLSearchParams({
        url,
        w: String(PREVIEW_MAX_WIDTH_PX),
        output: "webp",
        q: String(PREVIEW_QUALITY),
        we: "1",
    });
    return `${PROXY_BASE}/?${params.toString()}`;
}

function hasImageArrived(img: HTMLImageElement | null): boolean {
    return img !== null && img.complete && img.naturalWidth > 0;
}

export function OgImage({src, alt}: OgImageProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(() => (src ? getProxyUrl(src) : null));
    const [status, setStatus] = useState<ImageStatus>(() => (src ? "loading" : "error"));
    const imgRef = useRef<HTMLImageElement>(null);

    useOnValueChange(src, (nextSrc) => {
        setImageSrc(nextSrc ? getProxyUrl(nextSrc) : null);
        setStatus(nextSrc ? "loading" : "error");
    });

    useEffect(() => {
        // The prerendered image can finish before hydration, when React has not attached onLoad yet.
        if (hasImageArrived(imgRef.current)) setStatus("success");
    }, [imageSrc]);

    useEffect(() => {
        if (status !== "loading") return;
        const timer = setTimeout(() => {
            setStatus(hasImageArrived(imgRef.current) ? "success" : "error");
        }, IMAGE_GIVE_UP_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [imageSrc, status]);

    const handleLoad = () => {
        setStatus("success");
    };

    const handleError = () => {
        if (src && imageSrc !== src) {
            setImageSrc(src);
        } else {
            setStatus("error");
        }
    };

    if (status === "error" || !imageSrc) {
        return (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-t-xl bg-muted">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted-foreground/10">
                    <ImageIcon className="size-6 text-muted-foreground/50"/>
                </div>
                <span className="text-xs text-muted-foreground/50 font-medium">
                    Preview unavailable
                </span>
            </div>
        );
    }

    return (
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <ImageIcon className="size-10 text-muted-foreground/40"/>
            </div>
            <img
                ref={imgRef}
                src={imageSrc}
                alt={alt}
                width={PREVIEW_WIDTH_ATTRIBUTE}
                height={PREVIEW_HEIGHT_ATTRIBUTE}
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
                className="relative size-full object-cover"
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
}
