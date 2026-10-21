import {useId, type ReactNode} from "react";
import {cn} from "@/lib/utils";

/**
 * Wraps a column of `SettingsSection`s: rows separated by a hairline. A container, because the two-column row depends on
 * the width next to the sidebar, not on the viewport.
 */
export const SETTINGS_SECTION_LIST_CLASS = "@container flex min-w-0 flex-col divide-y-[0.5px] divide-border";

interface SettingsSectionProps {
    title: string;
    description: string;
    children: ReactNode;
    isDestructive?: boolean;
}

/** One settings row: title and description on the left once the list is 48rem wide, the cards on the right; stacked below. */
export function SettingsSection({title, description, children, isDestructive = false}: SettingsSectionProps) {
    const headingId = useId();
    return (
        <section aria-labelledby={headingId}
                 className="grid min-w-0 gap-4 py-8 first:pt-0 last:pb-0 @3xl:grid-cols-[16rem_minmax(0,1fr)] @3xl:gap-8">
            <div className="min-w-0 space-y-1">
                <h2 id={headingId} className={cn("text-sm font-semibold text-foreground", isDestructive && "text-destructive")}>
                    {title}
                </h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex min-w-0 flex-col gap-4">{children}</div>
        </section>
    );
}
