import {Flag} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader} from "@/components/ui/card";
import {ReportAbuseForm} from "@/components/abuse/ReportAbuseForm";

interface ReportAbusePageProps {
    searchParams: Promise<{ shortUrl?: string }>;
}

export default async function ReportAbusePage({searchParams}: ReportAbusePageProps) {
    const {shortUrl} = await searchParams;
    const turnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === "true";
    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

    if (turnstileEnabled && !turnstileSiteKey) {
        throw new Error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when Turnstile is enabled");
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-md">
                <Card className="border-border shadow-lg">
                    <CardHeader className="space-y-2 pb-1 text-center">
                        <div className="flex justify-center">
                            <div
                                className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Flag className="h-6 w-6"/>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Report a link</h1>
                        <CardDescription className="text-base -mt-2">
                            If you believe a short link is harmful or violates our terms, please let us know.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ReportAbuseForm
                            turnstileEnabled={turnstileEnabled}
                            turnstileSiteKey={turnstileSiteKey}
                            initialShortUrl={shortUrl}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
