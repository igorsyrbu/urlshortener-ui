"use client";

import {useQueryClient} from "@tanstack/react-query";
import {DEFAULT_LINK_TITLE, type BulkLinkAction} from "@/lib/constants";
import {deleteShortLink, saveArchiveStatus, saveBulkAction, saveSuspensionStatus, type LinksPage, type LinksPageParams} from "@/lib/links-api";
import type {BulkActionResultDTO} from "@/lib/api-types";
import {queryKeys} from "@/lib/query/query-keys";
import {refreshAfter, type ServerStateChange} from "@/lib/query/invalidation";
import type {LinkItem} from "@/lib/types";

interface LinkListActions {
    /** Updates the page at once, then saves; restores the page and resolves `false` when the server refuses. */
    setLinkArchived: (link: LinkItem, archived: boolean) => Promise<boolean>;
    /** Like `setLinkArchived`; a suspended link always stays in the list. */
    setLinkSuspended: (link: LinkItem, suspended: boolean) => Promise<boolean>;
    /** Changes or removes the links on the page at once, then saves; restores the page and resolves `null` on failure. */
    applyBulkAction: (action: BulkLinkAction, linkIds: readonly string[]) => Promise<BulkActionResultDTO | null>;
    /** Removes the link from the page at once, then deletes it; restores the page and resolves `false` on failure. */
    deleteLink: (linkId: string) => Promise<boolean>;
    /** Shows a link the server has just saved, then refetches to pick up any server-side changes. */
    applySavedLink: (savedLink: LinkItem) => void;
}

function withoutLink(page: LinksPage, linkId: string): LinksPage {
    return {...page, links: page.links.filter((link) => link.id !== linkId), totalElements: page.totalElements - 1};
}

function withLinkChanged(page: LinksPage, linkId: string, change: Partial<LinkItem>): LinksPage {
    return {...page, links: page.links.map((link) => (link.id === linkId ? {...link, ...change} : link))};
}

const BULK_ACTION_CHANGE = {
    archive: "linkArchived",
    unarchive: "linkArchived",
    suspend: "linkSuspended",
    resume: "linkSuspended",
    delete: "linkDeleted",
} as const satisfies Record<BulkLinkAction, ServerStateChange>;

const BULK_FLAG_CHANGE = {
    archive: {isActive: false},
    unarchive: {isActive: true},
    suspend: {isSuspended: true},
    resume: {isSuspended: false},
} as const satisfies Record<Exclude<BulkLinkAction, "delete">, Partial<LinkItem>>;

function withBulkAction(page: LinksPage, action: BulkLinkAction, linkIds: ReadonlySet<string>, showArchived: boolean): LinksPage {
    // Like the single actions: deleted links, and archived ones while archived links are hidden, leave the list.
    if (action === "delete" || (action === "archive" && !showArchived)) {
        const links = page.links.filter((link) => !linkIds.has(link.id));
        return {...page, links, totalElements: page.totalElements - (page.links.length - links.length)};
    }
    const change = BULK_FLAG_CHANGE[action];
    return {...page, links: page.links.map((link) => (linkIds.has(link.id) ? {...link, ...change} : link))};
}

/** Optimistic edits of the page on screen; every action ends with `refreshAfter` its change, as the server has the last word. */
export function useLinkListActions(params: LinksPageParams): LinkListActions {
    const queryClient = useQueryClient();
    const pageKey = queryKeys.links.page(params);

    const editPage = async (edit: (page: LinksPage) => LinksPage): Promise<LinksPage | undefined> => {
        // A refetch still running would overwrite the edit with the list from before it.
        await queryClient.cancelQueries({queryKey: pageKey});
        const previousPage = queryClient.getQueryData<LinksPage>(pageKey);
        if (previousPage) queryClient.setQueryData<LinksPage>(pageKey, edit(previousPage));
        return previousPage;
    };

    const finishEdit = (change: ServerStateChange, isSaved: boolean, previousPage: LinksPage | undefined): void => {
        if (!isSaved && previousPage) queryClient.setQueryData<LinksPage>(pageKey, previousPage);
        void refreshAfter(queryClient, change);
    };

    const setLinkArchived = async (link: LinkItem, archived: boolean): Promise<boolean> => {
        // Without "show archived" an archived link leaves the list; with it the link stays and changes state.
        const leavesList = archived && !params.showArchived;
        const previousPage = await editPage((page) => (leavesList ? withoutLink(page, link.id) : withLinkChanged(page, link.id, {isActive: !archived})));
        const isSaved = await saveArchiveStatus(link.id, archived);
        finishEdit("linkArchived", isSaved, previousPage);
        return isSaved;
    };

    const setLinkSuspended = async (link: LinkItem, suspended: boolean): Promise<boolean> => {
        const previousPage = await editPage((page) => withLinkChanged(page, link.id, {isSuspended: suspended}));
        const isSaved = await saveSuspensionStatus(link.id, suspended);
        finishEdit("linkSuspended", isSaved, previousPage);
        return isSaved;
    };

    const applyBulkAction = async (action: BulkLinkAction, linkIds: readonly string[]): Promise<BulkActionResultDTO | null> => {
        const ids = new Set(linkIds);
        const previousPage = await editPage((page) => withBulkAction(page, action, ids, params.showArchived));
        const result = await saveBulkAction(action, linkIds);
        finishEdit(BULK_ACTION_CHANGE[action], result !== null, previousPage);
        return result;
    };

    const deleteLink = async (linkId: string): Promise<boolean> => {
        const previousPage = await editPage((page) => withoutLink(page, linkId));
        const isDeleted = await deleteShortLink(linkId);
        finishEdit("linkDeleted", isDeleted, previousPage);
        return isDeleted;
    };

    const applySavedLink = (savedLink: LinkItem): void => {
        const title = savedLink.title.trim() ? savedLink.title : DEFAULT_LINK_TITLE;
        // Every cached page, so going back to another page or filter that holds the link does not show the old version.
        queryClient.setQueriesData<LinksPage>({queryKey: queryKeys.links.all}, (page) => page && withLinkChanged(page, savedLink.id, {...savedLink, title}));
        void refreshAfter(queryClient, "linkSaved");
    };

    return {setLinkArchived, setLinkSuspended, applyBulkAction, deleteLink, applySavedLink};
}
