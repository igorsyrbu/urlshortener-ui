"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

export function ThemeCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading color theme">
            <CardHeader>
                <CardTitle>Color theme</CardTitle>
                <CardDescription>Pick a built-in palette or build your own from four colors.</CardDescription>
            </CardHeader>
            <CardContent aria-hidden="true">
                <div className="flex flex-col gap-4">
                    <div className="h-10 rounded-lg bg-muted animate-pulse"/>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[0, 1, 2, 3].map((index) => (
                            <div key={index}
                                 className="flex flex-col items-center justify-center rounded-xl border-[0.5px] border-border p-3">
                                <div className="mb-2 flex gap-1.5">
                                    {[0, 1, 2, 3].map((dot) => (
                                        <span key={dot} className="size-4 rounded-full bg-muted animate-pulse"/>
                                    ))}
                                </div>
                                <div className="h-3.5 w-16 rounded bg-muted animate-pulse"/>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
