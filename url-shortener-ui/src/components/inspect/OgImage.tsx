"use client";

import {useEffect, useRef, useState} from "react";
import {ImageIcon} from "lucide-react";

interface OgImageProps {
    src?: string | null;
    alt: string;
}

const IMAGE_LOAD_TIMEOUT_MS = 2000;
const PROXY_BASE = "https://wsrv.nl";

function getProxyUrl(url: string): string {
    return `${PROXY_BASE}/?url=${encodeURIComponent(url)}`;
}

export function OgImage({src, alt}: OgImageProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(() => (src ? getProxyUrl(src) : null));
    const [status, setStatus] = useState<"loading" | "success" | "error">(() => (src ? "loading" : "error"));
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        setImageSrc(src ? getProxyUrl(src) : null);
        setStatus(src ? "loading" : "error");
    }, [src]);

    useEffect(() => {
        const img = imgRef.current;
        if (img && img.complete && img.naturalWidth > 0) {
            setStatus("success");
        }
    }, [imageSrc]);

    useEffect(() => {
        if (status !== "loading" || !imageSrc) return;

        const timer = setTimeout(() => {
            const img = imgRef.current;
            const seemsBroken = !img || !img.complete || img.naturalWidth === 0;

            if (!seemsBroken) {
                setStatus("success");
                return;
            }

            if (src && imageSrc !== src) {
                setImageSrc(src);
            } else {
                setStatus("error");
            }
        }, IMAGE_LOAD_TIMEOUT_MS);

        return () => clearTimeout(timer);
    }, [imageSrc, src, status]);

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
            {status === "loading" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-card">
                    <ImageIcon className="size-10 text-muted-foreground/40"/>
                    <span className="text-xs text-muted-foreground/50">Loading preview...</span>
                </div>
            )}
            <img
                ref={imgRef}
                src={imageSrc}
                alt={alt}
                referrerPolicy="no-referrer"
                className="size-full object-cover"
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
}
