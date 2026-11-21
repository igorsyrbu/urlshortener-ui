"use client";

import {useState} from "react";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";
import type {LinkItem} from "@/lib/types";

const NO_SELECTION: ReadonlySet<string> = new Set();

interface LinkSelection {
    /** The selected links of the page on screen, in list order; a link that left the page drops out. */
    selectedLinks: LinkItem[];
    /** True while links are selected or select mode is on, even with nothing picked yet. */
    isSelecting: boolean;
    /** Select mode shows every card's selection circle, for screens without hover. */
    isSelectMode: boolean;
    isSelected: (linkId: string) => boolean;
    toggle: (link: LinkItem) => void;
    startSelecting: () => void;
    /** Clears the selection and leaves select mode. */
    clear: () => void;
}

/** Selection of links on one page; it and select mode start over whenever `pageKey` (page, filter, search) changes. */
export function useLinkSelection(links: readonly LinkItem[], pageKey: string): LinkSelection {
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(NO_SELECTION);
    const [isSelectMode, setIsSelectMode] = useState(false);

    const clear = (): void => {
        setSelectedIds(NO_SELECTION);
        setIsSelectMode(false);
    };

    useOnValueChange(pageKey, clear);

    const toggle = (link: LinkItem): void => {
        setSelectedIds((previous) => {
            const next = new Set(previous);
            if (!next.delete(link.id)) next.add(link.id);
            return next;
        });
    };

    const selectedLinks = links.filter((link) => selectedIds.has(link.id));

    return {
        selectedLinks,
        isSelecting: isSelectMode || selectedLinks.length > 0,
        isSelectMode,
        isSelected: (linkId) => selectedIds.has(linkId),
        toggle,
        startSelecting: () => setIsSelectMode(true),
        clear,
    };
}
