"use client";

import {type SyntheticEvent, useCallback, useState} from "react";
import {AlertCircle, LinkIcon} from "lucide-react";

import {SERVER_API_BASE_URL} from "@/lib/api";
import {ABUSE_DESCRIPTION_MAX_LENGTH, type AbuseReason, API_ENDPOINTS} from "@/lib/constants";
import {isValidUrl} from "@/lib/url-utils";
import {logger} from "@/lib/logger";
import {parseRetryAfter} from "./report-abuse-utils";
import {ReasonSelect} from "./ReasonSelect";
import {ReportAbuseSuccess} from "./ReportAbuseSuccess";
import {TurnstileWidget} from "@/components/auth/TurnstileWidget";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";

interface ReportAbuseFormProps {
    turnstileEnabled: boolean;
    turnstileSiteKey: string;
    initialShortUrl?: string;
}

interface SubmittedReport {
    id: string;
}

export function ReportAbuseForm({turnstileEnabled, turnstileSiteKey, initialShortUrl}: ReportAbuseFormProps) {
    const [shortUrl, setShortUrl] = useState(initialShortUrl ?? "");
    const [reason, setReason] = useState<AbuseReason | "">("");
    const [reporterEmail, setReporterEmail] = useState("");
    const [description, setDescription] = useState("");
    const [turnstileToken, setTurnstileToken] = useState("");
    const [loading, setLoading] = useState(false);
    const [submittedReport, setSubmittedReport] = useState<SubmittedReport | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [urlError, setUrlError] = useState<string | null>(null);
    const [reasonError, setReasonError] = useState<string | null>(null);
    const [emailError, setEmailError] = useState<string | null>(null);

    const handleTurnstileSuccess = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileError = useCallback(() => {
        setErrorMessage("Captcha verification failed. Please try again.");
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken("");
    }, []);

    const handleReset = useCallback(() => {
        setShortUrl(initialShortUrl ?? "");
        setReason("");
        setReporterEmail("");
        setDescription("");
        setTurnstileToken("");
        setLoading(false);
        setSubmittedReport(null);
        setErrorMessage(null);
        setUrlError(null);
        setReasonError(null);
        setEmailError(null);
    }, [initialShortUrl]);

    const handleSubmit = useCallback(async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        setUrlError(null);
        setReasonError(null);
        setEmailError(null);

        let hasError = false;

        if (!isValidUrl(shortUrl)) {
            setUrlError("Please enter a valid URL starting with http:// or https://");
            hasError = true;
        }

        if (!reason) {
            setReasonError("Please select a reason");
            hasError = true;
        }

        if (!reporterEmail) {
            setEmailError("Please enter your email address");
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);

        try {
            const body = new URLSearchParams();
            body.set("shortUrl", shortUrl);
            body.set("reason", reason);
            if (reporterEmail) body.set("reporterEmail", reporterEmail);
            if (description) body.set("description", description);
            if (turnstileToken) body.set("cf-turnstile-response", turnstileToken);

            const response = await fetch(`${SERVER_API_BASE_URL}${API_ENDPOINTS.ABUSE_REPORT}`, {
                method: "POST",
                headers: {"Content-Type": "application/x-www-form-urlencoded"},
                body: body.toString(),
            });

            if (response.status === 429) {
                const retryAfter = parseRetryAfter(response.headers);
                if (retryAfter) {
                    setErrorMessage(`Too many requests. Please try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`);
                } else {
                    setErrorMessage("Too many requests. Please try again later.");
                }
                return;
            }

            if (response.status === 422) {
                const data = await response.json();
                setErrorMessage(data.message || data.error || "Invalid input. Please check your entries.");
                return;
            }

            if (!response.ok) {
                setErrorMessage("An unexpected error occurred. Please try again later.");
                return;
            }

            if (response.status === 201) {
                const data = await response.json();
                setSubmittedReport({id: data.id});
            }
        } catch (error) {
            logger.error("Failed to submit abuse report", error);
            setErrorMessage("Network error. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, [shortUrl, reason, reporterEmail, description, turnstileToken]);

    if (submittedReport) {
        return (
            <ReportAbuseSuccess
                reportId={submittedReport.id}
                shortUrl={shortUrl}
                onReset={handleReset}
            />
        );
    }

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="shortUrl">Link to report</Label>
                    <div className="relative">
                        <LinkIcon
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                        <Input
                            id="shortUrl"
                            type="url"
                            value={shortUrl}
                            onChange={(e) => setShortUrl(e.target.value)}
                            placeholder="https://short.url/abc123"
                            className="pl-9"
                            disabled={loading}
                            aria-invalid={!!urlError}
                        />
                    </div>
                    {urlError && (
                        <p className="flex items-center gap-1 text-sm text-destructive">
                            <AlertCircle className="size-3.5"/>
                            {urlError}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <ReasonSelect
                        value={reason}
                        onChange={setReason}
                        error={!!reasonError}
                    />
                    {reasonError && (
                        <p className="flex items-center gap-1 text-sm text-destructive">
                            <AlertCircle className="size-3.5"/>
                            {reasonError}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="reporterEmail">Your email</Label>
                    <Input
                        id="reporterEmail"
                        type="email"
                        value={reporterEmail}
                        onChange={(e) => {
                            setReporterEmail(e.target.value);
                            if (emailError) setEmailError(null);
                        }}
                        placeholder="you@example.com"
                        disabled={loading}
                        aria-invalid={!!emailError}
                    />
                    {emailError && (
                        <p className="flex items-center gap-1 text-sm text-destructive">
                            <AlertCircle className="size-3.5"/>
                            {emailError}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="description">
                            Description{" "}
                            <span className="text-muted-foreground font-normal">(optional)</span>
                        </Label>
                        <span className="text-xs text-muted-foreground">
                            {description.length}/{ABUSE_DESCRIPTION_MAX_LENGTH}
                        </span>
                    </div>
                    <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => {
                            if (e.target.value.length <= ABUSE_DESCRIPTION_MAX_LENGTH) {
                                setDescription(e.target.value);
                            }
                        }}
                        placeholder="Provide additional details..."
                        rows={4}
                        className="min-h-[100px] md:min-h-[144px]"
                        disabled={loading}
                    />
                </div>

                {errorMessage && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="size-3.5 shrink-0"/>
                        {errorMessage}
                    </p>
                )}

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto"
                >
                    {loading ? "Submitting..." : "Submit report"}
                </Button>
            </form>

            {turnstileEnabled && (
                <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    onSuccess={handleTurnstileSuccess}
                    onError={handleTurnstileError}
                    onExpire={handleTurnstileExpire}
                />
            )}
        </div>
    );
}
