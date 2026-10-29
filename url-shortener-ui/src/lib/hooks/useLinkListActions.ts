"use client";

import {useQueryClient} from "@tanstack/react-query";
import {DEFAULT_LINK_TITLE} from "@/lib/constants";
import {deleteShortLink, saveArchiveStatus, type LinksPage, type LinksPageParams} from "@/lib/links-api";
import {logger} from "@/lib/logger";
import {queryKeys} from "@/lib/query/query-keys";
import type {LinkItem} from "@/lib/types";

interface LinkListActions {
    /** Updates the page at once, then saves; restores the page and resolves `false` when the server refuses. */
    setLinkArchived: (link: LinkItem, archived: boolean) => Promise<boolean>;
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

/** Optimistic edits of the page on screen; every action ends by refetching the links, as the server has the last word. */
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

    const finishEdit = (isSaved: boolean, previousPage: LinksPage | undefined): void => {
        if (!isSaved && previousPage) queryClient.setQueryData<LinksPage>(pageKey, previousPage);
        void queryClient.invalidateQueries({queryKey: queryKeys.links.all});
    };

    const setLinkArchived = async (link: LinkItem, archived: boolean): Promise<boolean> => {
        if (!link.key) {
            logger.error("Cannot update archive status of an unknown link", undefined, {linkId: link.id});
            return false;
        }
        // Without "show archived" an archived link leaves the list; with it the link stays and changes state.
        const leavesList = archived && !params.showArchived;
        const previousPage = await editPage((page) => (leavesList ? withoutLink(page, link.id) : withLinkChanged(page, link.id, {isActive: !archived})));
        const isSaved = await saveArchiveStatus(link, archived);
        finishEdit(isSaved, previousPage);
        return isSaved;
    };

    const deleteLink = async (linkId: string): Promise<boolean> => {
        const previousPage = await editPage((page) => withoutLink(page, linkId));
        const isDeleted = await deleteShortLink(linkId);
        finishEdit(isDeleted, previousPage);
        return isDeleted;
    };

    const applySavedLink = (savedLink: LinkItem): void => {
        const title = savedLink.title.trim() ? savedLink.title : DEFAULT_LINK_TITLE;
        queryClient.setQueryData<LinksPage>(pageKey, (page) => page && withLinkChanged(page, savedLink.id, {...savedLink, title}));
        void queryClient.invalidateQueries({queryKey: queryKeys.links.all});
    };

    return {setLinkArchived, deleteLink, applySavedLink};
}
