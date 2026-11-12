"use client";

import {useState} from "react";
import {Lock} from "lucide-react";
import {PublicPageFooter} from "@/components/layout/PublicPageFooter";
import {UnlockLinkForm} from "@/components/unlock/UnlockLinkForm";
import {UnlockNotFound} from "@/components/unlock/UnlockNotFound";
import {PUBLIC_PAGE_SHELL_CLASS, UNLOCK_COPY} from "@/lib/constants";

interface UnlockLinkViewProps {
    linkKey: string;
    turnstileEnabled: boolean;
    turnstileSiteKey: string;
}

export function UnlockLinkView({linkKey, turnstileEnabled, turnstileSiteKey}: UnlockLinkViewProps) {
    const [isNotFound, setIsNotFound] = useState(false);

    if (isNotFound) return <UnlockNotFound/>;

    return (
        <div className={PUBLIC_PAGE_SHELL_CLASS}>
            <span aria-hidden="true"/>
            <main className="flex w-full max-w-lg flex-col items-center gap-6 text-center">
                <div className="flex size-20 items-center justify-center rounded-full border-[0.5px] border-border bg-muted text-foreground">
                    <Lock className="size-9" strokeWidth={1.5}/>
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{UNLOCK_COPY.TITLE}</h1>
                    <p className="text-sm text-muted-foreground">{UNLOCK_COPY.DESCRIPTION}</p>
                </div>
                <div className="w-full text-left">
                    <UnlockLinkForm
                        linkKey={linkKey}
                        turnstileEnabled={turnstileEnabled}
                        turnstileSiteKey={turnstileSiteKey}
                        onNotFound={() => setIsNotFound(true)}
                    />
                </div>
            </main>
            <PublicPageFooter/>
        </div>
    );
}
