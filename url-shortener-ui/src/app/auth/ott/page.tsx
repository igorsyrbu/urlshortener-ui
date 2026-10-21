"use client";

import {Suspense, useEffect, useState} from "react"
import {useSearchParams} from "next/navigation"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {OttLoginForm} from "@/components/auth/OttLoginForm"
import {clearQueryString} from "@/lib/url-utils"

function OttProcessor() {
    const searchParams = useSearchParams()
    // Read once: clearing the address bar updates the search params, and the form must keep the values it was opened with.
    const [{token, email}] = useState(() => ({token: searchParams.get("token"), email: searchParams.get("email")}))

    useEffect(() => {
        clearQueryString()
    }, [])

    if (!token || !email) {
        return (
            <Card className="w-87.5 shadow-lg">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>Invalid or incomplete magic link</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card className="w-87.5 shadow-lg">
            <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>Redirecting to login...</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                        <div
                            className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <span>Verifying...</span>
                    </div>

                    <OttLoginForm loginType="token" token={token} email={email}/>
                </div>
            </CardContent>
        </Card>
    )
}

export default function OttPage() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
            <Suspense fallback={<div>Loading authentication...</div>}>
                <OttProcessor/>
            </Suspense>
        </div>
    )
}
