import Link from "next/link";
import {LinkIcon} from "lucide-react";
import {LANDING_COPY} from "@/components/landing/landing-copy";
import {ModeToggle} from "@/components/layout/ThemeToggle";
import {Button} from "@/components/ui/button";
import {APP_NAME, DASHBOARD_CONTENT_SHELL_CLASS, ROUTES} from "@/lib/constants";
import {cn} from "@/lib/utils";

/** Sticky, translucent bar: the content scrolls under it, a hairline separates them. */
export function LandingHeader() {
    return (
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur-md">
            <div className={cn(DASHBOARD_CONTENT_SHELL_CLASS, "flex h-16 items-center justify-between gap-3")}>
                <Link href={ROUTES.HOME} className="flex min-w-0 items-center gap-2.5 rounded-md">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft">
                        <LinkIcon className="size-4" aria-hidden="true"/>
                    </span>
                    <span className="truncate text-base font-extrabold tracking-tight text-foreground">{APP_NAME}</span>
                </Link>
                <div className="flex shrink-0 items-center gap-1.5">
                    <ModeToggle/>
                    <Button asChild size="sm">
                        <Link href={ROUTES.LOGIN}>{LANDING_COPY.SIGN_IN}</Link>
                    </Button>
                </div>
            </div>
        </header>
    );
}
