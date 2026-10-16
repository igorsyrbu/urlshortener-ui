"use client";

import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";

export function ProfileCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading profile">
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4" aria-hidden="true">
                <div className="space-y-2 max-w-sm">
                    <div className="h-3.5 w-12 rounded bg-muted animate-pulse"/>
                    <div className="h-10 rounded-md bg-muted animate-pulse"/>
                </div>
                <div className="space-y-2 max-w-sm">
                    <div className="h-3.5 w-12 rounded bg-muted animate-pulse"/>
                    <div className="h-10 rounded-md bg-muted animate-pulse"/>
                </div>
            </CardContent>
            <CardFooter className="px-6" aria-hidden="true">
                <div className="h-10 w-32 rounded-md bg-muted animate-pulse"/>
            </CardFooter>
        </Card>
    );
}
