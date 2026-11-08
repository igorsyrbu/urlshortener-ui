import {ChartNoAxesColumn, FileSpreadsheet, type LucideIcon, Sparkles, Tags} from "lucide-react";
import {LANDING_COPY, LANDING_FEATURES, type LandingFeatureKey} from "@/components/landing/landing-copy";
import {DASHBOARD_CONTENT_SHELL_CLASS} from "@/lib/constants";
import {cn} from "@/lib/utils";

const FEATURE_ICONS: Record<LandingFeatureKey, LucideIcon> = {
    tags: Tags,
    analytics: ChartNoAxesColumn,
    clean: Sparkles,
    transfer: FileSpreadsheet,
};

export function LandingFeatures() {
    return (
        <section aria-label={LANDING_COPY.FEATURES_LABEL} className="border-y border-border bg-sidebar">
            <ul className={cn(DASHBOARD_CONTENT_SHELL_CLASS, "grid grid-cols-1 gap-6 py-10 sm:grid-cols-2 lg:grid-cols-4")}>
                {LANDING_FEATURES.map(({key, title, description}) => {
                    const Icon = FEATURE_ICONS[key];
                    return (
                        <li key={key} className="flex min-w-0 items-start gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-soft">
                                <Icon className="size-4" aria-hidden="true"/>
                            </span>
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="text-sm font-semibold text-foreground">{title}</span>
                                <span className="text-sm text-muted-foreground">{description}</span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
