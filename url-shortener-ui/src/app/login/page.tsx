"use client";

import React, {useCallback, useState} from "react";
import {Card, CardContent, CardDescription, CardHeader} from "@/components/ui/card";
import {Link} from "lucide-react";
import {API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {LoginMagicLinkForm} from "@/components/auth/LoginMagicLinkForm";
import {TurnstileWidget} from "@/components/auth/TurnstileWidget";
import {MagicLinkCooldownMessage} from "@/components/auth/MagicLinkCooldownMessage";
import type {LoginMessage} from "@/components/auth/LoginStatusMessage";
import {LoginStatusMessage} from "@/components/auth/LoginStatusMessage";
import {LoginOAuthDivider} from "@/components/auth/LoginOAuthDivider";
import {LoginGoogleSignInButton} from "@/components/auth/LoginGoogleSignInButton";
import {useMagicLinkCooldown} from "@/lib/hooks/useMagicLinkCooldown";

function parseRetryAfter(headers: Headers): number | null {
    const value = headers.get("Retry-After");
    if (!value) return null;
    const seconds = parseInt(value, 10);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<LoginMessage | null>(null);
    const [manuallyLocked, setManuallyLocked] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState("");
    const {remainingSeconds, isCooldownActive, startCooldown} = useMagicLinkCooldown(email);
    const turnstileEnabled = process.env.NEXT_PUBLIC_ENABLE_TURNSTILE === "true";

    const isLocked = manuallyLocked && isCooldownActive;

    const handleTurnstileSuccess = useCallback((token: string) => {
        setTurnstileToken(token);
    }, []);

    const handleTurnstileError = useCallback((errorCode: string) => {
        console.error("Turnstile error code:", errorCode);
        setTurnstileToken("");
    }, []);

    const handleTurnstileExpire = useCallback(() => {
        setTurnstileToken("");
    }, []);

    const handleEmailChange = (newEmail: string) => {
        setEmail(newEmail);
        if (manuallyLocked) setManuallyLocked(false);
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

        try {
            setLoading(true);

            const bodyParams = new URLSearchParams({username: trimmedEmail});
            if (turnstileEnabled) {
                bodyParams.set("cf-turnstile-response", turnstileToken);
            }

            const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.OTT_GENERATE}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: bodyParams.toString(),
            });

            if (response.status === 429) {
                const retryAfterSeconds = parseRetryAfter(response.headers);
                if (retryAfterSeconds !== null) {
                    startCooldown(retryAfterSeconds);
                    setManuallyLocked(true);
                    return;
                }
                setMessage({
                    type: "error",
                    text: "Too many attempts. Please try again later.",
                });
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to generate magic link: ${response.status}`);
            }

            setMessage({
                type: "success",
                text: "Magic link sent! Check your email to continue.",
            });
            setEmail("");

            setTurnstileToken("");
        } catch (error) {
            setMessage({
                type: "error",
                text: error instanceof Error ? error.message : "Failed to send magic link",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
    };

    return (
        <>
            <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
                <div className="w-full max-w-md">
                    <Card className="border-border shadow-lg">
                        <CardHeader className="space-y-2 pb-1 text-center">
                            <div className="flex justify-center">
                                <div
                                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Link className="h-6 w-6"/>
                                </div>
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
                            <CardDescription className="text-base -mt-2">Sign in to your account to
                                continue</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
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

                            {isLocked ? (
                                <MagicLinkCooldownMessage remainingSeconds={remainingSeconds}/>
                            ) : (
                                <LoginStatusMessage message={message}/>
                            )}

                            <LoginOAuthDivider/>

                            <LoginGoogleSignInButton onClick={handleGoogleSignIn}/>
                        </CardContent>
                    </Card>

                    {turnstileEnabled && (
                        <div className="mt-4 flex justify-center">
                            <TurnstileWidget
                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
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
