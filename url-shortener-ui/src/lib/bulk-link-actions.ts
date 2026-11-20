import {BULK_LINK_ACTION_COPY, type BulkLinkAction} from "@/lib/constants";
import type {LinkItem} from "@/lib/types";

export function formatLinkCount(count: number): string {
    return count === 1 ? "1 link" : `${count} links`;
}

/** Unarchive only when every selected link is archived; a mixed selection is archived as a whole. */
export function getArchiveBulkAction(links: readonly LinkItem[]): "archive" | "unarchive" {
    return links.length > 0 && links.every((link) => !link.isActive) ? "unarchive" : "archive";
}

/** Resume only when every selected link is suspended; a mixed selection is suspended as a whole. */
export function getSuspendBulkAction(links: readonly LinkItem[]): "suspend" | "resume" {
    return links.length > 0 && links.every((link) => link.isSuspended) ? "resume" : "suspend";
}

export function formatBulkActionTitle(action: BulkLinkAction, count: number): string {
    return `${BULK_LINK_ACTION_COPY[action].VERB} ${formatLinkCount(count)}?`;
}

export function formatBulkActionConfirmLabel(action: BulkLinkAction, count: number): string {
    return `${BULK_LINK_ACTION_COPY[action].VERB} ${count === 1 ? "link" : "links"}`;
}

/** "4 links archived", for the success toast. */
export function formatBulkActionDone(action: BulkLinkAction, count: number): string {
    const label = formatLinkCount(count);
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} ${BULK_LINK_ACTION_COPY[action].DONE}`;
}

/** The phrase a bulk delete must be confirmed with, e.g. "delete 4 links". */
export function formatBulkDeletePhrase(count: number): string {
    return `delete ${formatLinkCount(count)}`;
}
