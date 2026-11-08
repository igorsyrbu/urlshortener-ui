import Link from "next/link";
import {ArrowRight, Flag, ScanSearch, UserRound} from "lucide-react";
import {InspectLinkForm} from "@/components/landing/InspectLinkForm";
import {InspectResultIllustration} from "@/components/landing/InspectResultIllustration";
import {LandingCard} from "@/components/landing/LandingCard";
import {LANDING_COPY} from "@/components/landing/landing-copy";
import {Button} from "@/components/ui/button";
import {DASHBOARD_CONTENT_SHELL_CLASS, ROUTES} from "@/lib/constants";
import {cn} from "@/lib/utils";

/** The public entry points as a bento grid: the inspect form gets the wide card, the two links share the column beside it. */
export function LandingEntryPoints() {
    return (
        <section aria-labelledby="landing-entry-title" className={cn(DASHBOARD_CONTENT_SHELL_CLASS, "flex flex-col gap-8 py-20 md:py-24")}>
            <div className="flex flex-col items-center gap-2 text-center">
                <h2 id="landing-entry-title" className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                    {LANDING_COPY.ENTRY_TITLE}
                </h2>
                <p className="text-base text-muted-foreground">{LANDING_COPY.ENTRY_DESCRIPTION}</p>
            </div>

            <div className="grid min-w-0 gap-4 lg:grid-cols-3">
                <LandingCard icon={ScanSearch} title={LANDING_COPY.INSPECT_TITLE} description={LANDING_COPY.INSPECT_DESCRIPTION}
                             className="lg:col-span-2 lg:row-span-2 lg:justify-center lg:p-10">
                    <div className="grid min-w-0 items-center gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <InspectLinkForm/>
                        <div className="max-md:hidden">
                            <InspectResultIllustration/>
                        </div>
                    </div>
                </LandingCard>
                <LandingCard icon={Flag} title={LANDING_COPY.REPORT_TITLE} description={LANDING_COPY.REPORT_DESCRIPTION}>
                    <Button asChild variant="outline" className="group/action w-full">
                        <Link href={ROUTES.REPORT_ABUSE}>
                            {LANDING_COPY.REPORT_ACTION}
                            <ArrowRight className="size-4 transition-transform group-hover/action:translate-x-0.5" aria-hidden="true"/>
                        </Link>
                    </Button>
                </LandingCard>
                <LandingCard icon={UserRound} title={LANDING_COPY.ACCOUNT_TITLE} description={LANDING_COPY.ACCOUNT_DESCRIPTION}>
                    <Button asChild className="group/action w-full">
                        <Link href={ROUTES.LINKS}>
                            {LANDING_COPY.OPEN_APP}
                            <ArrowRight className="size-4 transition-transform group-hover/action:translate-x-0.5" aria-hidden="true"/>
                        </Link>
                    </Button>
                </LandingCard>
            </div>
        </section>
    );
}
