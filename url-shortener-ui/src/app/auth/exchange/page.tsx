"use client";

import {useEffect, useState} from "react";
import {useSearchParams, useRouter} from "next/navigation";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Suspense} from "react";
import {API_BASE_URL} from "@/lib/api";
import {useAuthStore} from "@/lib/store/auth";
import {API_ENDPOINTS, ROUTES, AUTH_REDIRECT_DELAY_MS} from "@/lib/constants";

interface AccessTokenContainer {
    accessToken: string
}

function ExchangeProcessor() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const code = searchParams.get("code")
    const [error, setError] = useState<string | null>(null)
    const {setAccessToken} = useAuthStore()

    useEffect(() => {
        if (!code) {
            setError("No authorization code provided")
            return
        }

        const exchangeCode = async () => {
            try {
                const response = await fetch(
                    `${API_BASE_URL}${API_ENDPOINTS.AUTH_CODE_EXCHANGE}?code=${encodeURIComponent(code)}`,
                    {credentials: "include"},
                );

                if (!response.ok) {
                    throw new Error(`Exchange failed: ${response.status} ${response.statusText}`);
                }

                const data: AccessTokenContainer = await response.json();

                setAccessToken(data.accessToken);

                setTimeout(() => {
                    router.push(ROUTES.LINKS);
                }, AUTH_REDIRECT_DELAY_MS);

                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to exchange code");
            }
        }

        exchangeCode()
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
