import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {LANDING_COPY} from "@/components/landing/landing-copy";
import {LinkShorteningPreview} from "@/components/landing/LinkShorteningPreview";
import {Button} from "@/components/ui/button";
import {DASHBOARD_CONTENT_SHELL_CLASS, ROUTES} from "@/lib/constants";
import {cn} from "@/lib/utils";

const FADE_UP_CLASS = "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-500 motion-safe:fill-mode-backwards";

export function LandingHero() {
    return (
        <section className="relative isolate overflow-hidden">
            {/* A glow in the palette's primary colour behind the headline; tokens only, so every palette tints it. */}
            <div aria-hidden="true"
                 className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-144 bg-radial-[ellipse_at_top] from-primary/20 via-primary/5 to-transparent"/>
            <div aria-hidden="true"
                 className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[3rem_3rem] opacity-40 mask-[radial-gradient(ellipse_at_top,black,transparent_70%)]"/>

            <div className={cn(DASHBOARD_CONTENT_SHELL_CLASS, "flex flex-col items-center gap-12 pt-16 pb-20 md:pt-24 md:pb-28")}>
                <div className={cn("flex max-w-3xl flex-col items-center gap-6 text-center", FADE_UP_CLASS)}>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur-sm">
                        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true"/>
                        {LANDING_COPY.BADGE}
                    </span>
                    <h1 className="bg-linear-to-b from-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-balance text-transparent md:text-7xl">
                        {LANDING_COPY.HEADLINE}
                    </h1>
                    <p className="max-w-xl text-base text-pretty text-muted-foreground md:text-lg">{LANDING_COPY.TAGLINE}</p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <Button asChild size="lg" className="group shadow-soft active:scale-95">
                            <Link href={ROUTES.LOGIN}>
                                {LANDING_COPY.SIGN_IN}
                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true"/>
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="bg-card/70 backdrop-blur-sm">
                            <Link href={ROUTES.LINKS}>{LANDING_COPY.OPEN_APP}</Link>
                        </Button>
                    </div>
                </div>

                <div className={cn("w-full motion-safe:delay-150", FADE_UP_CLASS)}>
                    <LinkShorteningPreview/>
                </div>
            </div>
        </section>
    );
}
