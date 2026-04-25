"use client";

import {Suspense, useEffect, useRef} from "react"
import {useSearchParams} from "next/navigation"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {API_BASE_URL} from "@/lib/api"

function OttProcessor() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const formRef = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (token && formRef.current) {
            formRef.current.submit()
        }
    }, [token])

    if (!token) {
        return (
            <Card className="w-87.5 shadow-lg">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>No token provided</CardDescription>
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

                    {/* Hidden form for auto-submission */}
                    <form
                        action={`${API_BASE_URL}/ott/login`}
                        method="POST"
                        ref={formRef}
                        className="hidden"
                    >
                        <input type="hidden" name="token" value={token}/>
                    </form>
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
