import type {ReactNode} from "react";
import {CircleAlert, Info, type LucideIcon} from "lucide-react";
import {cn} from "@/lib/utils";

type SettingsCalloutTone = "info" | "destructive";

interface SettingsCalloutProps {
    tone: SettingsCalloutTone;
    children: ReactNode;
    isAlert?: boolean;
    className?: string;
}

const TONE_ICONS: Record<SettingsCalloutTone, LucideIcon> = {
    info: Info,
    destructive: CircleAlert,
};

const TONE_CLASS_NAMES: Record<SettingsCalloutTone, string> = {
    info: "border-border bg-muted/50 text-foreground [&>svg]:text-primary",
    destructive: "border-destructive/20 bg-destructive/10 text-destructive",
};

/** A short message inside a settings card; server reasons can be long unbroken strings, so they wrap anywhere. */
export function SettingsCallout({tone, children, isAlert = false, className}: SettingsCalloutProps) {
    const Icon = TONE_ICONS[tone];
    return (
        <div role={isAlert ? "alert" : undefined}
             className={cn("flex min-w-0 items-start gap-2 rounded-lg border-[0.5px] px-3 py-2.5 text-sm", TONE_CLASS_NAMES[tone], className)}>
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true"/>
            <div className="min-w-0 break-all">{children}</div>
        </div>
    );
}
