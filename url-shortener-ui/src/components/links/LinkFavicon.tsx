"use client";

import {useState} from "react";
import Image from "next/image";
import {Link as LinkIcon} from "lucide-react";
import {getDomain} from "@/lib/url-utils";
import {FAVICON_SERVICE_URL, FAVICON_SIZE} from "@/lib/constants";

const REQUEST_SIZE = Math.max(FAVICON_SIZE, 32);
const MAX_PLACEHOLDER_SIZE = 16;

const failedDomains = new Set<string>();

const NON_PUBLIC_HOST = /^(.*\.local|.*\.internal|127\..*|10\..*|192\.168\..*|172\.(1[6-9]|2\d|3[01])\..*|169\.254\..*)$/i;

function getFaviconSource(longUrl: string) {
    try {
        const domain = getDomain(longUrl)?.trim().toLowerCase();
        if (!domain || !domain.includes(".") || NON_PUBLIC_HOST.test(domain)) {
            return null;
        }

        const params = new URLSearchParams({
            sz: String(REQUEST_SIZE),
            domain,
        });

        return {domain, url: `${FAVICON_SERVICE_URL}?${params.toString()}`};
    } catch {
        return null;
    }
}

interface LinkFaviconProps {
    longUrl: string;
}

export function LinkFavicon({longUrl}: LinkFaviconProps) {
    const source = getFaviconSource(longUrl);

    const [failedUrl, setFailedUrl] = useState<string | null>(null);

    if (!source || failedUrl === source.url || failedDomains.has(source.domain)) {
        return <LinkIcon className="size-4.5" aria-hidden="true"/>;
    }

    const markFailed = () => {
        failedDomains.add(source.domain);
        setFailedUrl(source.url);
    };

    return (
        <Image
            src={source.url}
            alt=""
            aria-hidden="true"
            width={36}
            height={36}
            unoptimized
            className="size-full object-cover rounded-full"
            onLoad={(e) => {
                // The globe placeholder (and blank 1x1 icons) come back tiny.
                if (e.currentTarget.naturalWidth <= MAX_PLACEHOLDER_SIZE) markFailed();
            }}
            onError={markFailed}
        />
    );
}