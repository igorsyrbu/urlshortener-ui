"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {BILLING_COPY} from "@/lib/billing-constants";

function BillingPlanSkeleton() {
    return (
        <div aria-hidden="true" className="flex min-w-0 flex-col gap-6 rounded-xl border-[0.5px] border-border p-6">
            <div className="space-y-2">
                <div className="h-5 w-16 rounded bg-muted animate-pulse"/>
                <div className="h-8 w-24 rounded bg-muted animate-pulse"/>
                <div className="h-3.5 w-28 rounded bg-muted animate-pulse"/>
            </div>
            <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="flex items-start gap-3">
                        <div className="mt-0.5 size-4 shrink-0 rounded-full bg-muted animate-pulse"/>
                        <div className="h-3.5 flex-1 rounded bg-muted animate-pulse"/>
                    </div>
                ))}
            </div>
            <div className="h-10 w-full rounded-md bg-muted animate-pulse"/>
        </div>
    );
}

export function BillingSettingsSkeleton() {
    return (
        <Card className="min-w-0" role="status" aria-label={BILLING_COPY.SUBSCRIPTION_LOADING}>
            <CardHeader className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <CardTitle><h2>{BILLING_COPY.TITLE}</h2></CardTitle>
                    <CardDescription>{BILLING_COPY.DESCRIPTION}</CardDescription>
                </div>
                <div aria-hidden="true" className="h-10 w-44 rounded-lg bg-muted animate-pulse"/>
            </CardHeader>
            <CardContent className="@container min-w-0 space-y-6" aria-hidden="true">
                <div className="grid min-w-0 gap-4 @xl:grid-cols-2">
                    <BillingPlanSkeleton/>
                    <BillingPlanSkeleton/>
                </div>
            </CardContent>
        </Card>
    );
}
