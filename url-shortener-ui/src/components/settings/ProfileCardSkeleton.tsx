"use client";

import {Card, CardContent} from "@/components/ui/card";
import {PROFILE_FIELD_LABELS} from "@/lib/settings-constants";
import {SETTINGS_CARD_WITH_FOOTER_CLASS, SettingsCardFooter} from "@/components/settings/SettingsCardFooter";
import {Skeleton} from "@/components/ui/skeleton";
import {SkeletonText} from "@/components/ui/skeleton-text";

export const PROFILE_LABEL_CLASS = "text-sm font-medium leading-none";
export const PROFILE_FIELD_CLASS = "flex flex-col gap-2";


/** The profile card's real layout with placeholders where the user's data goes, so its arrival moves nothing. */
export function ProfileCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading profile" className={SETTINGS_CARD_WITH_FOOTER_CLASS}>
            <CardContent className="flex flex-col gap-4" aria-hidden="true">
                <div className="flex min-w-0 items-center gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-full"/>
                    <div className="min-w-0">
                        <p className="text-sm">
                            <SkeletonText className="w-24"/>
                        </p>
                        <p className="text-xs">
                            <SkeletonText className="w-40"/>
                        </p>
                    </div>
                </div>
                <div className={PROFILE_FIELD_CLASS}>
                    <span className={PROFILE_LABEL_CLASS}>{PROFILE_FIELD_LABELS.EMAIL}</span>
                    <Skeleton className="h-9 rounded-md"/>
                </div>
                <div className={PROFILE_FIELD_CLASS}>
                    <span className={PROFILE_LABEL_CLASS}>{PROFILE_FIELD_LABELS.NAME}</span>
                    <Skeleton className="h-9 rounded-md"/>
                </div>
            </CardContent>
            <SettingsCardFooter>
                <Skeleton className="h-9 w-32 rounded-md"/>
            </SettingsCardFooter>
        </Card>
    );
}
