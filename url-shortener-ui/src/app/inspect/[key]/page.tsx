import {ShortLinkPreviewDTO} from "@/lib/api-types";
import {SERVER_API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS, DASHBOARD_CONTENT_SHELL_CLASS} from "@/lib/constants";
import {redirect} from "next/navigation";
import {logger} from "@/lib/logger";
import Link from "next/link";
import {LinkIcon, Flag} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {InspectLinkPreviewCard} from "@/components/inspect/InspectLinkPreviewCard";

interface InspectPageProps {
    params: Promise<{ key: string }>;
}

async function fetchPreview(key: string): Promise<ShortLinkPreviewDTO | null> {
    try {
        const res = await fetch(`${SERVER_API_BASE_URL}${API_ENDPOINTS.SHORTLINKS_PREVIEW(key)}`, {
            cache: "no-store",
        });
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`Preview fetch failed: ${res.status}`);
        return res.json();
    } catch (error) {
        logger.error("Failed to fetch link preview", error, {key});
        throw error;
    }
}

export default async function InspectPage({params}: InspectPageProps) {
    const {key} = await params;
    const preview = await fetchPreview(key);

    if (!preview) {
        redirect("/");
    }

    const reportUrl = `/report-abuse?shortUrl=${encodeURIComponent(preview.shortUrl)}`;

    return (
        <div className="min-h-dvh bg-background">
            <div className={DASHBOARD_CONTENT_SHELL_CLASS}>
                <header className="flex items-center justify-between py-4">
                    <Link href="/" className="flex items-center gap-3">
                        <div
                            className="bg-primary/10 flex aspect-square size-9 items-center justify-center rounded-full text-primary">
                            <LinkIcon className="size-5"/>
                        </div>
                        <span className="text-lg font-extrabold tracking-tight max-sm:hidden">
                            Short Links
                        </span>
                    </Link>
                    <Button asChild variant="ghost" size="sm">
                        <Link href={reportUrl}>
                            <Flag className="size-4 text-destructive"/>
                            <span className="max-sm:hidden">Report this link</span>
                        </Link>
                    </Button>
                </header>

                <main className="max-w-2xl mx-auto flex flex-col gap-6 pb-12">
                    <div className="flex flex-col gap-2 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground pt-5 md:pt-10">Link
                            Inspector</h1>
                        <p className="text-sm text-muted-foreground">
                            Inspect a short link to ensure it&apos;s safe to click. If you believe the link is
                            malicious, please report it.
                        </p>
                    </div>
                    <InspectLinkPreviewCard
                        title={preview.title}
                        description={preview.description}
                        ogImageUrl={preview.ogImageUrl}
                        longUrl={preview.longUrl}
                    />

                    <Card>
                        <CardContent className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    Destination URL
                                </span>
                                <div
                                    className="w-full overflow-y-auto rounded-md bg-transparent py-2 text-sm text-muted-foreground break-all cursor-text max-h-[4.75rem]">
                                    {preview.longUrl}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
