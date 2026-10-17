"use client";

import {Card, CardContent} from "@/components/ui/card";

export function SessionRowSkeleton() {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4" aria-hidden="true">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0"/>
                <div>
                    <div className="h-5 w-32 rounded bg-muted animate-pulse"/>
                    <div className="mt-1 h-4 w-40 rounded bg-muted animate-pulse"/>
                </div>
            </div>
            <div className="h-8 w-20 rounded-md bg-muted animate-pulse"/>
        </div>
    );
}

export function SessionCardSkeleton() {
    return (
        <div role="status" aria-label="Loading sessions">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                This Device
            </h3>
            <Card className="overflow-hidden border-border">
                <CardContent className="p-0 -mt-6">
                    <SessionRowSkeleton/>
                </CardContent>
            </Card>
        </div>
    );
}
