"use client";

import {useId} from "react";
import {Keyboard} from "lucide-react";
import {Card, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {SettingsCardFooter, SETTINGS_CARD_WITH_FOOTER_CLASS} from "@/components/settings/SettingsCardFooter";
import {useShortcutsStore} from "@/lib/store/shortcuts";
import {useUIStore} from "@/lib/store/ui";

export function ShortcutsCard() {
    const isEnabled = useShortcutsStore((state) => state.isEnabled);
    const setEnabled = useShortcutsStore((state) => state.setEnabled);
    const setShortcutsDialogOpen = useUIStore((state) => state.setShortcutsDialogOpen);
    const switchId = useId();
    const descriptionId = useId();

    return (
        <Card className={SETTINGS_CARD_WITH_FOOTER_CLASS}>
            <CardContent className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <label htmlFor={switchId} className="text-sm font-medium text-foreground">Keyboard shortcuts</label>
                    <p id={descriptionId} className="text-xs text-muted-foreground">
                        Single keys such as C to create a link. Turn them off if they get in the way of a screen reader,
                        voice control or your own key bindings.
                    </p>
                </div>
                <Switch id={switchId} aria-describedby={descriptionId} checked={isEnabled} onCheckedChange={setEnabled}/>
            </CardContent>
            <SettingsCardFooter>
                <Button variant="outline" size="sm" onClick={() => setShortcutsDialogOpen(true)}>
                    <Keyboard aria-hidden="true"/>
                    View shortcuts
                </Button>
            </SettingsCardFooter>
        </Card>
    );
}
