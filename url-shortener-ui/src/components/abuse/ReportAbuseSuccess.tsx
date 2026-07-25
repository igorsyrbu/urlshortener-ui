"use client";

import {useCallback, useState} from "react";
import {Check, CheckCircle2, Copy} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";

interface ReportAbuseSuccessProps {
    reportId: string;
    shortUrl: string;
    onReset: () => void;
}

const WHAT_HAPPENS_NEXT = [
    "Our team will review the report.",
    "We may take action against the reported link.",
    "Thank you for keeping the community safe.",
];

export function ReportAbuseSuccess({reportId, shortUrl, onReset}: ReportAbuseSuccessProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(reportId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [reportId]);

    return (
        <Card>
            <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
                <div
                    className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle2 className="size-6 text-green-600 dark:text-green-400"/>
                </div>

                <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Report received</h3>
                    <p className="text-sm text-muted-foreground">
                        Report has been submitted successfully.
                    </p>
                </div>

                <div className="w-full space-y-2 text-left">
                    <p className="text-sm font-medium">What happens next</p>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                        {WHAT_HAPPENS_NEXT.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-muted-foreground/40"/>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex flex-col items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="gap-1.5"
                    >
                        {copied ? (
                            <Check className="size-3.5 text-green-600"/>
                        ) : (
                            <Copy className="size-3.5"/>
                        )}
                        {copied ? "Copied" : "Copy report ID"}
                    </Button>
                    <span className="text-xs text-muted-foreground font-mono">{reportId} is a report id</span>
                </div>

                <Button variant="ghost" size="sm" onClick={onReset}>
                    Report another link
                </Button>
            </CardContent>
        </Card>
    );
}
