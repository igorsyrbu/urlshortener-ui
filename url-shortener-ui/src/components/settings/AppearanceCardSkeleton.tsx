"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

export function AppearanceCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading appearance settings">
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the application looks on your device.</CardDescription>
            </CardHeader>
            <CardContent aria-hidden="true">
                <div className="flex gap-4">
                    {[0, 1, 2].map((index) => (
                        <div key={index}
                             className="flex flex-col items-center justify-center p-3 border-[0.5px] border-border rounded-xl w-24 sm:w-28">
                            <div className="size-6 mb-1.5 rounded-full bg-muted animate-pulse"/>
                            <div className="h-3.5 w-12 rounded bg-muted animate-pulse"/>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
