import Link from "next/link";
import {Flag, LinkIcon, ScanSearch, UserRound} from "lucide-react";
import {InspectLinkForm} from "@/components/landing/InspectLinkForm";
import {LandingCard} from "@/components/landing/LandingCard";
import {LANDING_COPY} from "@/components/landing/landing-copy";
import {ModeToggle} from "@/components/layout/ThemeToggle";
import {Button} from "@/components/ui/button";
import {APP_NAME, DASHBOARD_CONTENT_SHELL_CLASS, ROUTES} from "@/lib/constants";

/** Development landing page: the public entry points of the app, with no product copy. */
export default function Home() {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            <header className={`${DASHBOARD_CONTENT_SHELL_CLASS} flex items-center justify-between gap-3 py-4`}>
                <Link href={ROUTES.HOME} className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <LinkIcon className="size-5" aria-hidden="true"/>
                    </span>
                    <span className="truncate text-lg font-extrabold tracking-tight">{APP_NAME}</span>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                    <ModeToggle/>
                    <Button asChild size="sm">
                        <Link href={ROUTES.LOGIN}>{LANDING_COPY.SIGN_IN}</Link>
                    </Button>
                </div>
            </header>

            <main className={`${DASHBOARD_CONTENT_SHELL_CLASS} flex flex-1 flex-col gap-10 pb-12`}>
                <section className="mx-auto flex max-w-2xl flex-col items-center gap-4 pt-10 text-center md:pt-16">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">{LANDING_COPY.HEADLINE}</h1>
                    <p className="text-base text-muted-foreground">{LANDING_COPY.TAGLINE}</p>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <Button asChild size="lg">
                            <Link href={ROUTES.LOGIN}>{LANDING_COPY.SIGN_IN}</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href={ROUTES.LINKS}>{LANDING_COPY.OPEN_APP}</Link>
                        </Button>
                    </div>
                </section>

                <div className="grid min-w-0 gap-4 md:grid-cols-3">
                    <LandingCard icon={ScanSearch} title={LANDING_COPY.INSPECT_TITLE} description={LANDING_COPY.INSPECT_DESCRIPTION}>
                        <InspectLinkForm/>
                    </LandingCard>
                    <LandingCard icon={Flag} title={LANDING_COPY.REPORT_TITLE} description={LANDING_COPY.REPORT_DESCRIPTION}>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={ROUTES.REPORT_ABUSE}>{LANDING_COPY.REPORT_ACTION}</Link>
                        </Button>
                    </LandingCard>
                    <LandingCard icon={UserRound} title={LANDING_COPY.ACCOUNT_TITLE} description={LANDING_COPY.ACCOUNT_DESCRIPTION}>
                        <Button asChild variant="outline" className="w-full">
                            <Link href={ROUTES.LINKS}>{LANDING_COPY.OPEN_APP}</Link>
                        </Button>
                    </LandingCard>
                </div>
            </main>

            <footer className={`${DASHBOARD_CONTENT_SHELL_CLASS} py-6 text-center text-xs text-muted-foreground`}>
                {LANDING_COPY.FOOTER_NOTE}
            </footer>
        </div>
    );
}
