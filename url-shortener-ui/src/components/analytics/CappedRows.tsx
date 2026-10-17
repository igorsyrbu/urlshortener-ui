import React from "react";
import {Button} from "@/components/ui/button";
import {ANALYTICS_COPY, ANALYTICS_VISIBLE_ROWS, buildShowAllRowsLabel} from "@/lib/constants";
import {useVisibleRows} from "@/lib/hooks/useVisibleRows";

interface CappedRowsProps<T> {
    rows: T[];
    children: (visibleRows: T[]) => React.ReactNode;
}

/** Renders the first `ANALYTICS_VISIBLE_ROWS` rows of a breakdown, with a button to show the rest. */
export function CappedRows<T>({rows, children}: CappedRowsProps<T>) {
    const {visibleRows, isCapped, isExpanded, handleToggle} = useVisibleRows(rows, ANALYTICS_VISIBLE_ROWS);
    return (
        <>
            {children(visibleRows)}
            {isCapped && (
                <Button variant="ghost" size="sm" className="self-center text-muted-foreground"
                        aria-expanded={isExpanded} onClick={handleToggle}>
                    {isExpanded ? ANALYTICS_COPY.SHOW_FEWER : buildShowAllRowsLabel(rows.length)}
                </Button>
            )}
        </>
    );
}
