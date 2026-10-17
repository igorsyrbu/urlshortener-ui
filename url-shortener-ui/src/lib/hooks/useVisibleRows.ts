"use client";

import {useState} from "react";

export interface VisibleRows<T> {
    visibleRows: T[];
    isCapped: boolean;
    isExpanded: boolean;
    handleToggle: () => void;
}

/** Shows the first `limit` rows until the user expands the list. */
export function useVisibleRows<T>(rows: T[], limit: number): VisibleRows<T> {
    const [isExpanded, setIsExpanded] = useState(false);
    const isCapped = rows.length > limit;
    return {
        visibleRows: isCapped && !isExpanded ? rows.slice(0, limit) : rows,
        isCapped,
        isExpanded,
        handleToggle: () => setIsExpanded((expanded) => !expanded),
    };
}
