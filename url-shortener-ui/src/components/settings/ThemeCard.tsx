"use client";

import {useEffect, useRef, useState} from "react";
import dynamic from "next/dynamic";
import {useHasMounted} from "@/lib/hooks/useHasMounted";
import {Card, CardContent} from "@/components/ui/card";
import {SegmentedControl} from "@/components/ui/segmented-control";
import {PresetPaletteGrid} from "@/components/settings/PresetPaletteGrid";
import {ThemeCardHeading} from "@/components/settings/ThemeCardHeading";
import {ThemeCardSkeleton} from "@/components/settings/ThemeCardSkeleton";
import {usePalette} from "@/providers/palette-provider";

const BUILT_IN_TAB = "built-in";
const CUSTOM_TAB = "custom";

function loadCustomThemeBuilder() {
    return import("@/components/settings/CustomThemeBuilder").then((builderModule) => builderModule.CustomThemeBuilder);
}

function preloadCustomThemeBuilder(): void {
    void loadCustomThemeBuilder();
}

const CustomThemeBuilder = dynamic(loadCustomThemeBuilder, {
    ssr: false,
    loading: () => <div className="min-h-87 sm:min-h-54" aria-hidden="true"/>,
});

const THEME_TAB_OPTIONS = [
    {value: BUILT_IN_TAB, label: "Built-in"},
    {value: CUSTOM_TAB, label: "Custom", onIntent: preloadCustomThemeBuilder},
] as const;

export function ThemeCard() {
    const {selection} = usePalette();
    const [activeTab, setActiveTab] = useState(BUILT_IN_TAB);
    const hasUserSwitchedTab = useRef(false);
    const mounted = useHasMounted();

    useEffect(() => {
        if (!hasUserSwitchedTab.current && selection.kind === "custom") {
            setActiveTab(CUSTOM_TAB);
        }
    }, [selection.kind]);

    const handleTabChange = (tab: string) => {
        hasUserSwitchedTab.current = true;
        setActiveTab(tab);
    };

    if (!mounted) {
        return <ThemeCardSkeleton/>;
    }

    return (
        <Card>
            <CardContent className="@container flex flex-col gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <ThemeCardHeading/>
                    <SegmentedControl ariaLabel="Color theme options" value={activeTab} onValueChange={handleTabChange} options={THEME_TAB_OPTIONS}/>
                </div>
                {activeTab === BUILT_IN_TAB ? <PresetPaletteGrid/> : <CustomThemeBuilder/>}
            </CardContent>
        </Card>
    );
}
