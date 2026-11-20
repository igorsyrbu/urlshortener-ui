"use client";

import {useState} from "react";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";
import type {LinkItem} from "@/lib/types";

const NO_SELECTION: ReadonlySet<string> = new Set();

interface LinkSelection {
    /** The selected links of the page on screen, in list order; a link that left the page drops out. */
    selectedLinks: LinkItem[];
    isSelected: (linkId: string) => boolean;
    toggle: (link: LinkItem) => void;
    clear: () => void;
}

/** Selection of links on one page; it starts over whenever `pageKey` (page, filter, search) changes. */
export function useLinkSelection(links: readonly LinkItem[], pageKey: string): LinkSelection {
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(NO_SELECTION);

    useOnValueChange(pageKey, () => setSelectedIds(NO_SELECTION));

    const toggle = (link: LinkItem): void => {
        setSelectedIds((previous) => {
            const next = new Set(previous);
            if (!next.delete(link.id)) next.add(link.id);
            return next;
        });
    };

    return {
        selectedLinks: links.filter((link) => selectedIds.has(link.id)),
        isSelected: (linkId) => selectedIds.has(linkId),
        toggle,
        clear: () => setSelectedIds(NO_SELECTION),
    };
}
