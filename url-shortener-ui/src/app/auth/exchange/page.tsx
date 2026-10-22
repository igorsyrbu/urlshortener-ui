"use client";

import {useEffect, useRef, useState} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Suspense} from "react";
import {API_BASE_URL} from "@/lib/api";
import {useAuthStore} from "@/lib/store/auth";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {setSessionHint} from "@/lib/session-hint";
import {clearQueryString} from "@/lib/url-utils";
import {describeHttpFailure, describeRequestError} from "@/lib/errors";
import {HTTP_BAD_REQUEST, HTTP_GONE, HTTP_NOT_FOUND, HTTP_UNAUTHORIZED} from "@/lib/http-status";

const REJECTED_CODE_STATUSES: ReadonlySet<number> = new Set([HTTP_BAD_REQUEST, HTTP_UNAUTHORIZED, HTTP_NOT_FOUND, HTTP_GONE]);
export const REJECTED_CODE_MESSAGE = "This sign-in link has expired or was already used. Request a new one from the sign-in page.";

interface AccessTokenContainer {
    accessToken: string
}

type ExchangeResult = {accessToken: string} | {errorMessage: string}

async function exchangeAuthorizationCode(code: string): Promise<ExchangeResult> {
    try {
        const response = await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.AUTH_CODE_EXCHANGE}?code=${encodeURIComponent(code)}`,
            {credentials: "include"},
        );
        if (!response.ok) {
            return {errorMessage: REJECTED_CODE_STATUSES.has(response.status) ? REJECTED_CODE_MESSAGE : describeHttpFailure(response.status)};
        }
        const data: AccessTokenContainer = await response.json();
        return {accessToken: data.accessToken};
    } catch (err) {
        return {errorMessage: describeRequestError(err)};
    }
}

function ExchangeProcessor() {
    const searchParams = useSearchParams()
    const router = useRouter()
    // Read once: clearing the address bar updates the search params, and the page must keep the code it was opened with.
    const [code] = useState(() => searchParams.get("code"))
    const [error, setError] = useState<string | null>(null)
    const exchangedCodeRef = useRef<string | null>(null)

    useEffect(() => {
        if (!code) return
        // The code is single-use: a re-run of this effect (StrictMode, new router identity) must not send it again.
        if (exchangedCodeRef.current === code) {
            return
        }
        exchangedCodeRef.current = code
        clearQueryString()

        void exchangeAuthorizationCode(code).then((result) => {
            if ("errorMessage" in result) {
                setError(result.errorMessage)
                return
            }
            useAuthStore.getState().setAccessToken(result.accessToken)
            setSessionHint()
            // Replace, not push: Back must not return here and resend the spent single-use code.
            router.replace(ROUTES.LINKS)
            setError(null)
        })
    }, [code, router])

    if (!code) {
        return (
            <Card className="w-full max-w-2xl shadow-lg border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive">Error</CardTitle>
                    <CardDescription>No authorization code provided</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="w-full max-w-2xl shadow-lg border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive">Exchange Failed</CardTitle>
                    <CardDescription>Unable to exchange authorization code</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-destructive/10 rounded-md">
                        <p className="text-sm text-destructive font-medium">{String(error)}</p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    // Success/Loading state
    return (
        <Card className="w-full max-w-2xl shadow-lg border-border">
            <CardHeader>
                <CardTitle className="text-foreground">Authenticating</CardTitle>
                <CardDescription>Completing your sign in...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center p-8 space-y-4">
                    <div
                        className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <span className="text-sm text-muted-foreground">Redirecting to dashboard...</span>
                </div>
            </CardContent>
        </Card>
    )
}

export default function ExchangePage() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
            <Suspense fallback={
                <Card className="w-full max-w-2xl shadow-lg border-border">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-center">
                            <div
                                className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        </div>
                    </CardContent>
                </Card>
            }>
                <ExchangeProcessor/>
            </Suspense>
        </div>
    )
}
