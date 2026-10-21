"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SettingsCallout } from "@/components/settings/SettingsCallout";
import { FOCUS_RING_CLASS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePreferencesStore, type TrackerMode } from "@/lib/store/preferences";
import { TRACKER_MODE, TRACKER_MODE_DESCRIPTIONS, TRACKER_MODE_LABELS } from "@/lib/constants";
import { Check, ShieldAlert, ShieldCheck, ShieldOff, type LucideIcon } from "lucide-react";
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

interface TrackerOptionRowProps {
    option: TrackerOption;
    isActive: boolean;
    isDisabled: boolean;
    onSelect: (mode: TrackerMode) => void;
}

function TrackerOptionRow({option, isActive, isDisabled, onSelect}: TrackerOptionRowProps) {
    const Icon = option.icon;
    return (
        <button
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`${option.label}: ${option.description}`}
            disabled={isDisabled}
            onClick={() => onSelect(option.value)}
            className={cn(
                "flex min-h-14 w-full items-center gap-3 px-6 py-3 text-left outline-none transition-colors last:rounded-b-xl hover:bg-muted/50 disabled:cursor-wait disabled:opacity-70",
                FOCUS_RING_CLASS,
            )}
        >
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
            </span>
            <span aria-hidden="true"
                  className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isActive ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                {isActive && <Check className="size-3"/>}
            </span>
        </button>
    );
}

export function PreferencesCard() {
    const trackerMode = usePreferencesStore((state) => state.trackerMode);
    const isLoading = usePreferencesStore((state) => state.isLoading);
    const isSaving = usePreferencesStore((state) => state.isSaving);
    const [loadFailed, setLoadFailed] = useState(false);
    const fetched = useRef(false);

    async function loadPreferences(): Promise<void> {
        const ok = await usePreferencesStore.getState().fetchPreferences();
        setLoadFailed(!ok);
    }

    useEffect(() => {
        if (fetched.current) return;
        fetched.current = true;
        void loadPreferences();
    }, []);

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

    const hasLoadedMode = trackerMode !== null;

    return (
        <Card className="pb-0">
            <CardHeader>
                <CardTitle className="text-sm font-medium">Tracker detection</CardTitle>
                <CardDescription className="text-xs">
                    Choose what happens when trackers like UTMs or click IDs are detected in a destination URL.
                </CardDescription>
            </CardHeader>
            {loadFailed && trackerMode === null ? (
                <CardContent className="flex flex-col items-start gap-3 pb-6">
                    <SettingsCallout tone="destructive" isAlert className="w-full">
                        Couldn&apos;t load your preferences. Please check your connection and try again.
                    </SettingsCallout>
                    <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
                        Retry
                    </Button>
                </CardContent>
            ) : (
                <CardContent
                    role="radiogroup"
                    aria-label="Tracker detection mode"
                    aria-busy={isLoading || !hasLoadedMode}
                    className="divide-y-[0.5px] divide-border border-t-[0.5px] border-border px-0"
                >
                    {TRACKER_OPTIONS.map((option) => (
                        <TrackerOptionRow
                            key={option.value}
                            option={option}
                            isActive={trackerMode === option.value}
                            isDisabled={!hasLoadedMode || isLoading || isSaving}
                            onSelect={(mode) => void handleSelect(mode)}
                        />
                    ))}
                </CardContent>
            )}
        </Card>
    );
}
