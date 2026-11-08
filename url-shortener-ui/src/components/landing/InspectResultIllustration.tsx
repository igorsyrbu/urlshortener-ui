import {Globe, ShieldCheck} from "lucide-react";
import {LANDING_INSPECT_EXAMPLE} from "@/components/landing/landing-copy";

/** What an inspection shows (title, description, destination), drawn with example values; decorative only. */
export function InspectResultIllustration() {
    return (
        <div aria-hidden="true" className="flex min-w-0 select-none flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <div className="aspect-video w-full rounded-lg bg-linear-to-br from-primary/25 via-primary/10 to-secondary"/>
            <div className="flex min-w-0 flex-col gap-1">
                <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="size-3 shrink-0"/>
                    <span className="truncate">{LANDING_INSPECT_EXAMPLE.DOMAIN}</span>
                </span>
                <span className="truncate text-sm font-semibold text-foreground">{LANDING_INSPECT_EXAMPLE.TITLE}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{LANDING_INSPECT_EXAMPLE.DESCRIPTION}</span>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                <ShieldCheck className="size-3"/>
                {LANDING_INSPECT_EXAMPLE.STATUS}
            </span>
        </div>
    );
}
