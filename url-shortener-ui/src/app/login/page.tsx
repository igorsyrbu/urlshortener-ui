"use client";

import React, {useCallback, useState} from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, CardDescription, CardHeader} from "@/components/ui/card";
import {Link as LinkIcon} from "lucide-react";
import {API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {LoginMagicLinkForm} from "@/components/auth/LoginMagicLinkForm";
import {OttLoginForm} from "@/components/auth/OttLoginForm";
import {TurnstileWidget} from "@/components/auth/TurnstileWidget";
import {MagicLinkCooldownMessage} from "@/components/auth/MagicLinkCooldownMessage";
import type {LoginMessage} from "@/components/auth/LoginStatusMessage";
import {LoginStatusMessage} from "@/components/auth/LoginStatusMessage";
import {LoginOAuthDivider} from "@/components/auth/LoginOAuthDivider";
import {LoginGoogleSignInButton} from "@/components/auth/LoginGoogleSignInButton";
import {useMagicLinkCooldown} from "@/lib/hooks/useMagicLinkCooldown";
import {logger} from "@/lib/logger";
import {parseRetryAfterSeconds} from "@/lib/retry-after";
import {withPending} from "@/lib/async-utils";
import {describeHttpFailure, describeRequestError} from "@/lib/errors";

const OTP_CODE_LENGTH = 6;

function loadLoginOtpForm() {
    return import("@/components/auth/LoginOtpForm").then((formModule) => formModule.LoginOtpForm);
}

const LoginOtpForm = dynamic(loadLoginOtpForm, {ssr: false});
const HTTP_TOO_MANY_REQUESTS = 429;

type MagicLinkRequestResult =
    | {kind: "sent"}
    | {kind: "rate-limited"; retryAfterSeconds: number | null}
    | {kind: "failed"; message: string};

async function requestMagicLink(email: string, turnstileToken: string | null): Promise<MagicLinkRequestResult> {
    const bodyParams = new URLSearchParams({username: email});
    if (turnstileToken !== null) bodyParams.set("cf-turnstile-response", turnstileToken);
    try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.OTT_GENERATE}`, {
            method: "POST",
            headers: {"Content-Type": "application/x-www-form-urlencoded"},
            body: bodyParams.toString(),
        });
        if (response.status === HTTP_TOO_MANY_REQUESTS) {
            return {kind: "rate-limited", retryAfterSeconds: parseRetryAfterSeconds(response.headers)};
        }
        if (!response.ok) return {kind: "failed", message: describeHttpFailure(response.status)};
        return {kind: "sent"};
    } catch (error) {
        return {kind: "failed", message: describeRequestError(error)};
    }
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [submittedCode, setSubmittedCode] = useState<string | null>(null);
    const [showOtpForm, setShowOtpForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<LoginMessage | null>(null);
    const [manuallyLocked, setManuallyLocked] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState("");
    const {remainingSeconds, isCooldownActive, startCooldown} = useMagicLinkCooldown(email);
    const turnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === "true";
    const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

    if (turnstileEnabled && !turnstileSiteKey) {
        throw new Error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is required when Turnstile is enabled");
    }

    const isLocked = manuallyLocked && isCooldownActive;

    const handleTurnstileSuccess = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileError = useCallback((errorCode: string) => {
        logger.error("Turnstile error code", undefined, {errorCode});
        setTurnstileToken("");
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken("");
    }, []);

    const handleEmailChange = (newEmail: string) => {
        setEmail(newEmail);
        if (manuallyLocked) setManuallyLocked(false);
    };

    const handleCodeChange = (newCode: string) => {
        setCode(newCode);
    };

    const handleChangeEmail = () => {
        setShowOtpForm(false);
        setCode("");
        setEmail("");
        setMessage(null);
    };

    const handleMagicLinkSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage(null);

        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            setMessage({type: "error", text: "Please enter your email address"});
            return;
        }

        if (isCooldownActive) {
            setManuallyLocked(true);
            return;
        }

        if (turnstileEnabled && !turnstileToken) {
            setMessage({type: "error", text: "Please complete the CAPTCHA"});
            return;
        }

        void loadLoginOtpForm();
        await withPending(setLoading, async () => {
            const result = await requestMagicLink(trimmedEmail, turnstileEnabled ? turnstileToken : null);
            if (result.kind === "sent") {
                setShowOtpForm(true);
                setTurnstileToken("");
                return;
            }
            if (result.kind === "failed") {
                setMessage({type: "error", text: result.message});
                return;
            }
            if (result.retryAfterSeconds !== null) {
                startCooldown(result.retryAfterSeconds);
                setManuallyLocked(true);
                return;
            }
            setMessage({type: "error", text: "Too many attempts. Please try again later."});
        });
    };

    const handleSubmitCode = (submittedCode?: string) => {
        setMessage(null);

        const trimmedEmail = email.trim();
        const trimmedCode = (submittedCode ?? code).trim();

        if (!trimmedEmail) {
            setMessage({type: "error", text: "Please enter your email address"});
            return;
        }

        if (trimmedCode.length !== OTP_CODE_LENGTH) {
            setMessage({type: "error", text: "Please enter the verification code"});
            return;
        }

        setLoading(true);
        setSubmittedCode(trimmedCode);
    };

    const handleGoogleSignIn = () => {
        // A full page load on purpose: /api is proxied to the backend, which starts the OAuth redirect chain.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
    };

    return (
        <>
            {submittedCode && (
                <OttLoginForm loginType="otp" email={email} code={submittedCode}/>
            )}
            <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
                <div className="w-full max-w-md">
                    <Card className="border-border shadow-lg">
                        <CardHeader className="space-y-2 pb-1 text-center">
                            <div className="flex justify-center">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <LinkIcon className="h-6 w-6"/>
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
                            <CardDescription className="text-base -mt-2">Sign in to your account to
                                continue</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {showOtpForm ? (
                                <LoginOtpForm
                                    email={email}
                                    code={code}
                                    loading={loading}
                                    onCodeChange={handleCodeChange}
                                    onSubmit={handleSubmitCode}
                                    onChangeEmail={handleChangeEmail}
                                />
                            ) : (
                                <LoginMagicLinkForm
                                    email={email}
                                    loading={loading}
                                    inputDisabled={isLocked}
                                    buttonDisabled={isLocked}
                                    turnstileEnabled={turnstileEnabled}
                                    turnstileSolved={!!turnstileToken}
                                    onEmailChange={handleEmailChange}
                                    onSubmit={handleMagicLinkSubmit}
                                />
                            )}

                            {isLocked ? (
                                <MagicLinkCooldownMessage remainingSeconds={remainingSeconds}/>
                            ) : (
                                <LoginStatusMessage message={message}/>
                            )}

                            <LoginOAuthDivider/>

                            <LoginGoogleSignInButton onClick={handleGoogleSignIn}/>
                        </CardContent>
                    </Card>

                    {turnstileEnabled && !showOtpForm && (
                        <div className="mt-4 flex justify-center">
                            <TurnstileWidget
                                siteKey={turnstileSiteKey}
                                onSuccess={handleTurnstileSuccess}
                                onError={handleTurnstileError}
                                onExpire={handleTurnstileExpire}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
