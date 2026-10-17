"use client";

import {type SyntheticEvent, useCallback, useState} from "react";
import {AlertCircle, LinkIcon} from "lucide-react";

import {API_BASE_URL} from "@/lib/api";
import {ABUSE_DESCRIPTION_MAX_LENGTH, type AbuseReason, API_ENDPOINTS, CAPTCHA_VERIFYING_LABEL} from "@/lib/constants";
import {isValidUrl} from "@/lib/url-utils";
import {logger} from "@/lib/logger";
import {parseRetryAfterSeconds} from "@/lib/retry-after";
import {ReasonSelect} from "./ReasonSelect";
import {ReportAbuseSuccess} from "./ReportAbuseSuccess";
import {TurnstileWidget} from "@/components/auth/TurnstileWidget";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {FieldError} from "@/components/ui/field-error";
import {focusElementById} from "@/lib/utils";
import {withPending} from "@/lib/async-utils";

const ABUSE_FIELD_IDS = {SHORT_URL: "shortUrl", REASON: "reason", REPORTER_EMAIL: "reporterEmail"} as const;
const ABUSE_FIELD_ERROR_IDS = {
    SHORT_URL: `${ABUSE_FIELD_IDS.SHORT_URL}-error`,
    REASON: `${ABUSE_FIELD_IDS.REASON}-error`,
    REPORTER_EMAIL: `${ABUSE_FIELD_IDS.REPORTER_EMAIL}-error`,
} as const;
const ABUSE_FORM_ERROR_ID = "abuse-report-error";
const FIELD_ERROR_WITH_ICON_CLASS = "flex items-center gap-1";

const HTTP_CREATED = 201;
const HTTP_UNPROCESSABLE_ENTITY = 422;
const HTTP_TOO_MANY_REQUESTS = 429;

interface AbuseReportInput {
    shortUrl: string;
    reason: string;
    reporterEmail: string;
    description: string;
    turnstileToken: string;
}

type AbuseReportResult =
    | {kind: "submitted"; reportId: string}
    | {kind: "failed"; message: string}
    | {kind: "unanswered"};

function buildAbuseReportBody(input: AbuseReportInput): URLSearchParams {
    const body = new URLSearchParams();
    body.set("shortUrl", input.shortUrl);
    body.set("reason", input.reason);
    if (input.reporterEmail) body.set("reporterEmail", input.reporterEmail);
    if (input.description) body.set("description", input.description);
    if (input.turnstileToken) body.set("cf-turnstile-response", input.turnstileToken);
    return body;
}

function buildRateLimitedMessage(retryAfter: number | null): string {
    if (!retryAfter) return "Too many requests. Please try again later.";
    return `Too many requests. Please try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`;
}

async function readAbuseReportResponse(response: Response): Promise<AbuseReportResult> {
    if (response.status === HTTP_TOO_MANY_REQUESTS) {
        return {kind: "failed", message: buildRateLimitedMessage(parseRetryAfterSeconds(response.headers))};
    }
    if (response.status === HTTP_UNPROCESSABLE_ENTITY) {
        const data = await response.json();
        return {kind: "failed", message: data.message || data.error || "Invalid input. Please check your entries."};
    }
    if (!response.ok) return {kind: "failed", message: "An unexpected error occurred. Please try again later."};
    if (response.status !== HTTP_CREATED) return {kind: "unanswered"};
    const data = await response.json();
    return {kind: "submitted", reportId: data.id};
}

async function submitAbuseReport(input: AbuseReportInput): Promise<AbuseReportResult> {
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ABUSE_REPORT}`, {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: buildAbuseReportBody(input).toString(),
        });
        return await readAbuseReportResponse(response);
    } catch (error) {
        logger.error("Failed to submit abuse report", error);
        return {kind: "failed", message: "Network error. Please check your connection and try again."};
    }
}

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

        const invalidFieldIds: string[] = [];

        if (!isValidUrl(shortUrl)) {
            setUrlError("Please enter a valid URL starting with http:// or https://");
            invalidFieldIds.push(ABUSE_FIELD_IDS.SHORT_URL);
        }

        if (!reason) {
            setReasonError("Please select a reason");
            invalidFieldIds.push(ABUSE_FIELD_IDS.REASON);
        }

        if (!reporterEmail) {
            setEmailError("Please enter your email address");
            invalidFieldIds.push(ABUSE_FIELD_IDS.REPORTER_EMAIL);
        }

        if (invalidFieldIds.length > 0) {
            focusElementById(invalidFieldIds[0]);
            return;
        }

        await withPending(setLoading, async () => {
            const result = await submitAbuseReport({shortUrl, reason, reporterEmail, description, turnstileToken});
            if (result.kind === "failed") setErrorMessage(result.message);
            if (result.kind === "submitted") setSubmittedReport({id: result.reportId});
        });
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

    const isTurnstileVerifying = turnstileEnabled && !turnstileToken;
    const submitLabel = loading ? "Submitting..." : isTurnstileVerifying ? CAPTCHA_VERIFYING_LABEL : "Submit report";

    return (
        <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor={ABUSE_FIELD_IDS.SHORT_URL}>Link to report</Label>
                    <div className="relative">
                        <LinkIcon
                            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/>
                        <Input
                            id={ABUSE_FIELD_IDS.SHORT_URL}
                            type="url"
                            value={shortUrl}
                            onChange={(e) => setShortUrl(e.target.value)}
                            placeholder="https://short.url/abc123"
                            className="pl-9"
                            disabled={loading}
                            aria-invalid={!!urlError}
                            aria-describedby={urlError ? ABUSE_FIELD_ERROR_IDS.SHORT_URL : undefined}
                        />
                    </div>
                    {urlError && (
                        <FieldError id={ABUSE_FIELD_ERROR_IDS.SHORT_URL} className={FIELD_ERROR_WITH_ICON_CLASS}>
                            <AlertCircle className="size-3.5"/>
                            {urlError}
                        </FieldError>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor={ABUSE_FIELD_IDS.REASON}>Reason</Label>
                    <ReasonSelect
                        id={ABUSE_FIELD_IDS.REASON}
                        value={reason}
                        onChange={setReason}
                        error={!!reasonError}
                        errorId={ABUSE_FIELD_ERROR_IDS.REASON}
                    />
                    {reasonError && (
                        <FieldError id={ABUSE_FIELD_ERROR_IDS.REASON} className={FIELD_ERROR_WITH_ICON_CLASS}>
                            <AlertCircle className="size-3.5"/>
                            {reasonError}
                        </FieldError>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor={ABUSE_FIELD_IDS.REPORTER_EMAIL}>Your email</Label>
                    <Input
                        id={ABUSE_FIELD_IDS.REPORTER_EMAIL}
                        type="email"
                        value={reporterEmail}
                        onChange={(e) => {
                            setReporterEmail(e.target.value);
                            if (emailError) setEmailError(null);
                        }}
                        placeholder="you@example.com"
                        disabled={loading}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? ABUSE_FIELD_ERROR_IDS.REPORTER_EMAIL : undefined}
                    />
                    {emailError && (
                        <FieldError id={ABUSE_FIELD_ERROR_IDS.REPORTER_EMAIL} className={FIELD_ERROR_WITH_ICON_CLASS}>
                            <AlertCircle className="size-3.5"/>
                            {emailError}
                        </FieldError>
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
                    <FieldError id={ABUSE_FORM_ERROR_ID} className={FIELD_ERROR_WITH_ICON_CLASS}>
                        <AlertCircle className="size-3.5 shrink-0"/>
                        {errorMessage}
                    </FieldError>
                )}

                <Button
                    type="submit"
                    disabled={loading || isTurnstileVerifying}
                    className="w-full sm:w-auto"
                >
                    {submitLabel}
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
