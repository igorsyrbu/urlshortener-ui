"use client";

import {useEffect, useRef, useState, useSyncExternalStore} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {SegmentedControl} from "@/components/ui/segmented-control";
import {PresetPaletteGrid} from "@/components/settings/PresetPaletteGrid";
import {CustomThemeBuilder} from "@/components/settings/CustomThemeBuilder";
import {ThemeCardSkeleton} from "@/components/settings/ThemeCardSkeleton";
import {usePalette} from "@/providers/palette-provider";

const BUILT_IN_TAB = "built-in";
const CUSTOM_TAB = "custom";

const THEME_TAB_OPTIONS = [
    {value: BUILT_IN_TAB, label: "Built-in"},
    {value: CUSTOM_TAB, label: "Custom"},
] as const;

export function ThemeCard() {
    const {selection} = usePalette();
    const [activeTab, setActiveTab] = useState(BUILT_IN_TAB);
    const hasUserSwitchedTab = useRef(false);
    const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);

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
            <CardHeader>
                <CardTitle>Color theme</CardTitle>
                <CardDescription>Pick a built-in palette or build your own from four colors.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <SegmentedControl ariaLabel="Color theme options" value={activeTab} onValueChange={handleTabChange} options={THEME_TAB_OPTIONS}/>
                    {activeTab === BUILT_IN_TAB ? <PresetPaletteGrid/> : <CustomThemeBuilder/>}
                </div>
            </CardContent>
        </Card>
    );
}
