"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePreferencesStore, type TrackerMode } from "@/lib/store/preferences";
import { TRACKER_MODE, TRACKER_MODE_DESCRIPTIONS, TRACKER_MODE_LABELS } from "@/lib/constants";
import { ShieldAlert, ShieldCheck, ShieldOff, type LucideIcon } from "lucide-react";

interface TrackerOption {
    value: TrackerMode;
    label: string;
    description: string;
    icon: LucideIcon;
}

const TRACKER_OPTIONS: TrackerOption[] = [
    {
        value: TRACKER_MODE.DISABLED,
        label: TRACKER_MODE_LABELS[TRACKER_MODE.DISABLED],
        description: TRACKER_MODE_DESCRIPTIONS[TRACKER_MODE.DISABLED],
        icon: ShieldOff,
    },
    {
        value: TRACKER_MODE.SUGGEST,
        label: TRACKER_MODE_LABELS[TRACKER_MODE.SUGGEST],
        description: TRACKER_MODE_DESCRIPTIONS[TRACKER_MODE.SUGGEST],
        icon: ShieldAlert,
    },
    {
        value: TRACKER_MODE.AUTO_CLEAN,
        label: TRACKER_MODE_LABELS[TRACKER_MODE.AUTO_CLEAN],
        description: TRACKER_MODE_DESCRIPTIONS[TRACKER_MODE.AUTO_CLEAN],
        icon: ShieldCheck,
    },
];

export function PreferencesCard() {
    const trackerMode = usePreferencesStore((state) => state.trackerMode);
    const setTrackerMode = usePreferencesStore((state) => state.setTrackerMode);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Manage how tracking parameters are handled when you create or edit links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <h3 className="text-sm font-medium leading-none">Tracker detection</h3>
                    <p className="text-xs text-muted-foreground">
                        Choose what happens when trackers like UTMs or click IDs are detected in a destination URL.
                    </p>
                </div>
                <div
                    role="radiogroup"
                    aria-label="Tracker detection mode"
                    className="flex flex-col gap-3 sm:flex-row sm:gap-4"
                >
                    {TRACKER_OPTIONS.map((option) => {
                        const isActive = trackerMode === option.value;
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="radio"
                                aria-checked={isActive}
                                aria-label={`${option.label}: ${option.description}`}
                                onClick={() => setTrackerMode(option.value)}
                                className={`flex flex-1 flex-col items-start gap-2 rounded-xl border-[0.5px] p-4 text-left transition-colors outline-hidden focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] hover:bg-muted/50 ${
                                    isActive ? "border-primary ring-1 ring-primary bg-muted/30" : "border-border"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                                    <span className="text-sm font-semibold leading-none">{option.label}</span>
                                </span>
                                <span className="text-xs leading-snug text-muted-foreground">{option.description}</span>
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
