import {Lock} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {INSPECT_PROTECTED_COPY} from "@/lib/constants";

interface InspectProtectedNoticeProps {
    shortUrl: string;
}

/** Stands in for the destination of a protected link, which the inspector must never reveal. */
export function InspectProtectedNotice({shortUrl}: InspectProtectedNoticeProps) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Lock className="size-6"/>
                </div>
                <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold">{INSPECT_PROTECTED_COPY.TITLE}</h2>
                    <p className="text-sm text-muted-foreground">{INSPECT_PROTECTED_COPY.DESCRIPTION}</p>
                </div>
                <p className="max-w-full text-sm font-medium break-all">{shortUrl}</p>
                <Button asChild>
                    {/* The short URL is the backend's redirect, an external address that leads to the unlock page. */}
                    <a href={shortUrl} rel="noopener">{INSPECT_PROTECTED_COPY.OPEN_LINK}</a>
                </Button>
            </CardContent>
        </Card>
    );
}
