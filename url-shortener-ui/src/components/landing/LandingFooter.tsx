import {LinkIcon} from "lucide-react";
import {LANDING_COPY} from "@/components/landing/landing-copy";
import {APP_NAME, DASHBOARD_CONTENT_SHELL_CLASS} from "@/lib/constants";
import {cn} from "@/lib/utils";

export function LandingFooter() {
    return (
        <footer className="border-t border-border bg-sidebar">
            <div className={cn(DASHBOARD_CONTENT_SHELL_CLASS, "flex min-w-0 flex-col gap-2 py-10")}>
                <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <LinkIcon className="size-4 text-primary" aria-hidden="true"/>
                    {APP_NAME}
                </span>
                <p className="text-xs text-muted-foreground">{LANDING_COPY.FOOTER_NOTE}</p>
            </div>
        </footer>
    );
}
