import {ArrowDown, Copy, LinkIcon, Sparkles} from "lucide-react";
import {LANDING_PREVIEW} from "@/components/landing/landing-copy";

/**
 * An illustration of what the app does (a long tracked link becomes a short clean one). Example values only, so it is
 * hidden from assistive technology; the headline and tagline carry the message.
 */
export function LinkShorteningPreview() {
    return (
        <div aria-hidden="true" className="relative mx-auto w-full max-w-xl select-none">
            <div className="rounded-2xl border border-border bg-card/80 p-2 shadow-lg backdrop-blur-sm">
                <div className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-muted/60 px-4 py-3">
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{LANDING_PREVIEW.LONG_LABEL}</span>
                    <span className="truncate font-mono text-sm text-muted-foreground">{LANDING_PREVIEW.LONG_URL}</span>
                </div>

                <div className="flex justify-center py-1.5">
                    <span className="flex size-7 items-center justify-center rounded-full border border-border bg-card text-primary">
                        <ArrowDown className="size-3.5"/>
                    </span>
                </div>

                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <LinkIcon className="size-4"/>
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{LANDING_PREVIEW.SHORT_LABEL}</span>
                        <span className="truncate font-mono text-base font-semibold text-foreground">{LANDING_PREVIEW.SHORT_URL}</span>
                    </div>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground">
                        <Copy className="size-3.5"/>
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-2 pt-3 pb-1">
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                        <Sparkles className="size-3"/>
                        {LANDING_PREVIEW.CLEANED}
                    </span>
                    {LANDING_PREVIEW.TAGS.map((tag) => (
                        <span key={tag} className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
