"use client";

import {useEffect, useRef, useState} from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {PresetPaletteGrid} from "@/components/settings/PresetPaletteGrid";
import {CustomThemeBuilder} from "@/components/settings/CustomThemeBuilder";
import {usePalette} from "@/providers/palette-provider";

const BUILT_IN_TAB = "built-in";
const CUSTOM_TAB = "custom";

export function ThemeCard() {
    const {selection} = usePalette();
    const [activeTab, setActiveTab] = useState(BUILT_IN_TAB);
    const hasUserSwitchedTab = useRef(false);

    useEffect(() => {
        if (!hasUserSwitchedTab.current && selection.kind === "custom") {
            setActiveTab(CUSTOM_TAB);
        }
    }, [selection.kind]);

    const handleTabChange = (tab: string) => {
        hasUserSwitchedTab.current = true;
        setActiveTab(tab);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Color theme</CardTitle>
                <CardDescription>Pick a built-in palette or build your own from four colors.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList>
                        <TabsTrigger value={BUILT_IN_TAB}>Built-in</TabsTrigger>
                        <TabsTrigger value={CUSTOM_TAB}>Custom</TabsTrigger>
                    </TabsList>
                    <TabsContent value={BUILT_IN_TAB}>
                        <PresetPaletteGrid/>
                    </TabsContent>
                    <TabsContent value={CUSTOM_TAB}>
                        <CustomThemeBuilder/>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
