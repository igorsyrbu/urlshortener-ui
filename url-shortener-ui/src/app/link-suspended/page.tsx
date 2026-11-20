import type {Metadata} from "next";
import Link from "next/link";
import {CirclePause} from "lucide-react";
import {Button} from "@/components/ui/button";
import {PublicPageFooter} from "@/components/layout/PublicPageFooter";
import {LINK_SUSPENDED_COPY, PAGE_TITLES, PUBLIC_PAGE_SHELL_CLASS, ROUTES} from "@/lib/constants";

export const metadata: Metadata = {title: PAGE_TITLES.LINK_SUSPENDED};

/** Public: the backend redirects a suspended short link here instead of to its destination. */
export default function LinkSuspendedPage() {
    return (
        <div className={PUBLIC_PAGE_SHELL_CLASS}>
            <span aria-hidden="true"/>
            <main className="flex flex-col items-center gap-6 text-center">
                <div className="flex size-16 items-center justify-center rounded-xl border-[0.5px] border-border bg-muted">
                    <CirclePause className="size-7 text-muted-foreground"/>
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="text-lg font-medium text-foreground">{LINK_SUSPENDED_COPY.PAGE_HEADING}</h1>
                    <p className="max-w-sm text-sm text-muted-foreground">{LINK_SUSPENDED_COPY.PAGE_DESCRIPTION}</p>
                </div>
                <Button asChild variant="outline">
                    <Link href={ROUTES.HOME}>{LINK_SUSPENDED_COPY.HOME}</Link>
                </Button>
            </main>
            <PublicPageFooter/>
        </div>
    );
}
