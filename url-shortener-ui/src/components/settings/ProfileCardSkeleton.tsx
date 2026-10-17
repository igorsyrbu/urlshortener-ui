"use client";

import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {PROFILE_FIELD_LABELS} from "@/lib/settings-constants";

export const PROFILE_LABEL_CLASS = "text-sm font-medium leading-none";

const FIELD_PLACEHOLDER_CLASS = "h-9 rounded-md bg-muted animate-pulse";

export function ProfileCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading profile">
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4" aria-hidden="true">
                <div className="space-y-2 max-w-sm">
                    <span className={PROFILE_LABEL_CLASS}>{PROFILE_FIELD_LABELS.EMAIL}</span>
                    <div className={FIELD_PLACEHOLDER_CLASS}/>
                </div>
                <div className="space-y-2 max-w-sm">
                    <span className={PROFILE_LABEL_CLASS}>{PROFILE_FIELD_LABELS.NAME}</span>
                    <div className={FIELD_PLACEHOLDER_CLASS}/>
                </div>
            </CardContent>
            <CardFooter className="px-6" aria-hidden="true">
                <div className="h-9 w-32 rounded-md bg-muted animate-pulse"/>
            </CardFooter>
        </Card>
    );
}
