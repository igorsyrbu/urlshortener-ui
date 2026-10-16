"use client";

import {usePathname} from "next/navigation";
import {SegmentedControl} from "@/components/ui/segmented-control";
import {SETTINGS_LABELS, SETTINGS_SECTIONS} from "@/lib/settings-constants";

export function SettingsTabs() {
    const pathname = usePathname();
    return (
        <SegmentedControl
            ariaLabel={SETTINGS_LABELS.NAVIGATION}
            value={pathname}
            options={SETTINGS_SECTIONS.map((section) => ({value: section.href, label: section.label, href: section.href}))}
        />
    );
}
