"use client";

import {useState} from "react";
import Image from "next/image";
import {Link as LinkIcon} from "lucide-react";
import {getDomain} from "@/lib/url-utils";
import {FAVICON_SERVICE_URL, FAVICON_SIZE} from "@/lib/constants";

interface LinkFaviconProps {
    longUrl: string;
}

export function LinkFavicon({longUrl}: LinkFaviconProps) {
    const [hasError, setHasError] = useState(false);

    let faviconUrl = null;
    try {
        const domain = getDomain(longUrl);
        faviconUrl = `${FAVICON_SERVICE_URL}?sz=${FAVICON_SIZE}&domain=${domain}`;
    } catch {
        // Fallback to generic icon handled by the guard below
    }

    if (hasError || !faviconUrl) {
        return <LinkIcon className="size-4.5"/>;
    }

    return (
        <Image
            src={faviconUrl}
            alt="Favicon"
            width={36}
            height={36}
            className="size-full object-cover"
            onError={() => setHasError(true)}
        />
    );
}
