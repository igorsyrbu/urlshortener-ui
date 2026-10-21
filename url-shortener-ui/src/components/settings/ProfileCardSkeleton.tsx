"use client";

import {Card, CardContent} from "@/components/ui/card";
import {PROFILE_FIELD_LABELS} from "@/lib/settings-constants";
import {SETTINGS_CARD_WITH_FOOTER_CLASS, SettingsCardFooter} from "@/components/settings/SettingsCardFooter";

export const PROFILE_LABEL_CLASS = "text-sm font-medium leading-none";
export const PROFILE_FIELD_CLASS = "flex flex-col gap-2";

const PULSE_CLASS = "rounded bg-muted animate-pulse";

/** The profile card's real layout with placeholders where the user's data goes, so its arrival moves nothing. */
export function ProfileCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading profile" className={SETTINGS_CARD_WITH_FOOTER_CLASS}>
            <CardContent className="flex flex-col gap-4" aria-hidden="true">
                <div className="flex min-w-0 items-center gap-3">
                    <div className="size-8 shrink-0 rounded-full bg-muted animate-pulse"/>
                    <div className="min-w-0">
                        <p className="text-sm">
                            <span className={`inline-block w-24 ${PULSE_CLASS}`}>&nbsp;</span>
                        </p>
                        <p className="text-xs">
                            <span className={`inline-block w-40 ${PULSE_CLASS}`}>&nbsp;</span>
                        </p>
                    </div>
                </div>
                <div className={PROFILE_FIELD_CLASS}>
                    <span className={PROFILE_LABEL_CLASS}>{PROFILE_FIELD_LABELS.EMAIL}</span>
                    <div className="h-9 rounded-md bg-muted animate-pulse"/>
                </div>
                <div className={PROFILE_FIELD_CLASS}>
                    <span className={PROFILE_LABEL_CLASS}>{PROFILE_FIELD_LABELS.NAME}</span>
                    <div className="h-9 rounded-md bg-muted animate-pulse"/>
                </div>
            </CardContent>
            <SettingsCardFooter>
                <div aria-hidden="true" className="h-9 w-32 rounded-md bg-muted animate-pulse"/>
            </SettingsCardFooter>
        </Card>
    );
}
