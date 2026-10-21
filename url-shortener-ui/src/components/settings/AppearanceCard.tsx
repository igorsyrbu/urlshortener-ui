"use client";

import {useTheme} from "next-themes";
import {Card, CardContent} from "@/components/ui/card";
import {SegmentedControl} from "@/components/ui/segmented-control";
import {useHasMounted} from "@/lib/hooks/useHasMounted";

const MODE_OPTIONS = [
    {value: "light", label: "Light"},
    {value: "dark", label: "Dark"},
    {value: "system", label: "System"},
] as const;

const NO_MODE_SELECTED = "";

export function AppearanceCard() {
    const {theme, setTheme} = useTheme();
    // The stored mode is only known after hydration; until then the same control renders with nothing selected.
    const hasMounted = useHasMounted();

    return (
        <Card>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">Mode</p>
                    <p className="text-xs text-muted-foreground">Light, dark, or follow your system.</p>
                </div>
                <SegmentedControl
                    ariaLabel="Color mode"
                    value={hasMounted ? theme ?? "system" : NO_MODE_SELECTED}
                    isDisabled={!hasMounted}
                    onValueChange={setTheme}
                    options={MODE_OPTIONS}
                />
            </CardContent>
        </Card>
    );
}
