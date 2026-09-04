"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePreferencesStore, type TrackerMode } from "@/lib/store/preferences";
import { TRACKER_MODE, TRACKER_MODE_DESCRIPTIONS, TRACKER_MODE_LABELS } from "@/lib/constants";
import { ShieldAlert, ShieldCheck, ShieldOff, type LucideIcon } from "lucide-react";
import { logger } from "@/lib/logger";

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

function TrackerOptionSkeleton() {
    return (
        <div
            aria-hidden="true"
            className="flex flex-1 flex-col items-start gap-2 rounded-xl border-[0.5px] border-border p-4"
        >
            <div className="flex items-center gap-2 w-full">
                <div className="size-4 shrink-0 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-full rounded bg-muted animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
        </div>
    );
}

export function PreferencesCard() {
    const trackerMode = usePreferencesStore((state) => state.trackerMode);
    const isLoading = usePreferencesStore((state) => state.isLoading);
    const isSaving = usePreferencesStore((state) => state.isSaving);
    const [loadFailed, setLoadFailed] = useState(false);
    const fetched = useRef(false);

    useEffect(() => {
        if (fetched.current) return;
        fetched.current = true;
        void loadPreferences();
    }, []);

    async function loadPreferences(): Promise<void> {
        const ok = await usePreferencesStore.getState().fetchPreferences();
        setLoadFailed(!ok);
    }

    const handleSelect = async (mode: TrackerMode) => {
        if (isLoading || isSaving || trackerMode === mode) return;
        try {
            await usePreferencesStore.getState().updatePreferences(mode);
        } catch (error) {
            logger.error("Failed to save tracker preference", error);
            toast.error("Couldn't save preference. Please try again.");
        }
    };

    const handleRetry = () => {
        setLoadFailed(false);
        void loadPreferences();
    };

    const showOptions = trackerMode !== null && !loadFailed;
    const showSkeletons = !showOptions && !loadFailed;

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
                {loadFailed && trackerMode === null ? (
                    <div className="flex flex-col items-start gap-3 rounded-xl border-[0.5px] border-border p-4">
                        <p className="text-sm text-muted-foreground">
                            Couldn&apos;t load your preferences. Please check your connection and try again.
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                            Retry
                        </Button>
                    </div>
                ) : (
                    <div
                        role="radiogroup"
                        aria-label="Tracker detection mode"
                        aria-busy={isLoading}
                        className="flex flex-col gap-3 sm:flex-row sm:gap-4"
                    >
                        {showSkeletons ? (
                            <>
                                <TrackerOptionSkeleton />
                                <TrackerOptionSkeleton />
                                <TrackerOptionSkeleton />
                            </>
                        ) : (
                            TRACKER_OPTIONS.map((option) => {
                                const isActive = trackerMode === option.value;
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={isActive}
                                        aria-label={`${option.label}: ${option.description}`}
                                        disabled={isLoading || isSaving}
                                        onClick={() => void handleSelect(option.value)}
                                        className={`flex flex-1 flex-col items-start gap-2 rounded-xl border-[0.5px] p-4 text-left transition-colors outline-hidden focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70 ${
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
                            })
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
