import type {ReactNode} from "react";
import {CardFooter} from "@/components/ui/card";

/** Add to the `Card` that ends in a `SettingsCardFooter`, so the bar reaches the card's bottom edge. */
export const SETTINGS_CARD_WITH_FOOTER_CLASS = "pb-0";

interface SettingsCardFooterProps {
    children: ReactNode;
}

/** The action bar at the bottom of a settings card, below a hairline; actions sit on the right. */
export function SettingsCardFooter({children}: SettingsCardFooterProps) {
    return (
        <CardFooter className="flex-wrap justify-end gap-2 border-t-[0.5px] border-border py-3">
            {children}
        </CardFooter>
    );
}
