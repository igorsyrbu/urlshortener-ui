"use client";

import {use} from "react";
import {UnlockLinkView} from "@/components/unlock/UnlockLinkView";

interface UnlockPageProps {
    params: Promise<{key: string}>;
}

/** Public: the backend redirects a protected short link here, with the visitor's query string kept on the URL. */
export default function UnlockPage({params}: UnlockPageProps) {
    const {key} = use(params);
    const turnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === "true";
    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

    if (turnstileEnabled && !turnstileSiteKey) {
        throw new Error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when Turnstile is enabled");
    }

    return <UnlockLinkView linkKey={key} turnstileEnabled={turnstileEnabled} turnstileSiteKey={turnstileSiteKey}/>;
}
