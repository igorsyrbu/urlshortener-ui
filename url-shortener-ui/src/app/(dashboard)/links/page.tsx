"use client";

import {Suspense, useCallback, useEffect, useEffectEvent, useState} from "react";
import {useShallow} from "zustand/react/shallow";
import {useRouter, useSearchParams} from "next/navigation";
import {LinkCard} from "@/components/links/LinkCard";
import {LinkCardSkeletonList} from "@/components/links/LinkCardSkeleton";
import {LinksBottomBar} from "@/components/links/LinksBottomBar";
import {LINKS_PAGINATION_LABEL, LinksPagination} from "@/components/links/LinksPagination";
import {LinksSelectionBar} from "@/components/links/LinksSelectionBar";
import {LinksSelectModeButton} from "@/components/links/LinksSelectModeButton";
import {EmptyLinksState} from "@/components/links/EmptyLinksState";
import {NoLinksFoundState} from "@/components/links/NoLinksFoundState";
import {TooltipProvider} from "@/components/ui/tooltip";
import {Button} from "@/components/ui/button";
import {useLinkStore} from "@/lib/store/links";
import {useLinksPage} from "@/lib/hooks/useLinksPage";
import {useLinkListActions} from "@/lib/hooks/useLinkListActions";
import {useLinkSelection} from "@/lib/hooks/useLinkSelection";
import {formatBulkActionDone, getArchiveBulkAction, getSuspendBulkAction} from "@/lib/bulk-link-actions";
import {IMPORT_TRACKING_STATUS, useImportTracker} from "@/lib/store/import";
import {LinkItem} from "@/lib/types";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {ARCHIVED_FILTER_COPY, BULK_LINK_ACTION_COPY, CARD_LIST_CLASS, DEFAULT_PAGE_SIZE, LINK_SELECTION_COPY, MIN_LINK_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS, LINK_ACTION_COPY, LINKS_LOAD_COPY, LIST_LOAD_ERROR_CLASS, ROUTES, type BulkLinkAction} from "@/lib/constants";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {toast} from "sonner";
import {buildLinksPageUrl, parseLinksPageParam} from "@/lib/pagination";
import {useDebounce} from "@/lib/hooks/useDebounce";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";
import {LazyQrCodeModal} from "@/components/links/lazy-qr-code-modal";
import {preloadOnIdle} from "@/lib/preload-on-idle";
import {canRunShortcut, isEditableTarget, isShortcutKey, SHORTCUTS} from "@/lib/keyboard-shortcuts";
import {isModalOpen} from "@/lib/utils";
import {lazyDialog} from "@/lib/lazy-dialog";

const LINKS_LIST_TOP_ID = "links-list-top";
const ESCAPE_KEY = "Escape";

interface BulkRequest {
    action: BulkLinkAction;
    links: LinkItem[];
}

/** The bulk action a key asks for while links are selected, or `null` for any other key. */
function readBulkShortcut(event: KeyboardEvent, selectedLinks: readonly LinkItem[]): BulkLinkAction | null {
    if (isShortcutKey(event, SHORTCUTS.ARCHIVE)) return getArchiveBulkAction(selectedLinks);
    if (isShortcutKey(event, SHORTCUTS.SUSPEND)) return getSuspendBulkAction(selectedLinks);
    if (isShortcutKey(event, SHORTCUTS.DELETE)) return "delete";
    return null;
}
const ARCHIVED_FILTER_TOAST_ID = "archived-filter";
const NO_LINKS: LinkItem[] = [];

function loadEditLinkModal() {
    return import("@/components/links/EditLinkModal").then((modalModule) => modalModule.EditLinkModal);
}

function loadDeleteLinkModal() {
    return import("@/components/links/DeleteLinkModal").then((modalModule) => modalModule.DeleteLinkModal);
}

function loadArchiveLinkModal() {
    return import("@/components/links/ArchiveLinkModal").then((modalModule) => modalModule.ArchiveLinkModal);
}

const EditLinkModal = lazyDialog(loadEditLinkModal);
const DeleteLinkModal = lazyDialog(loadDeleteLinkModal);
const ArchiveLinkModal = lazyDialog(loadArchiveLinkModal);
const BulkLinksModal = lazyDialog(() => import("@/components/links/BulkLinksModal").then((modalModule) => modalModule.BulkLinksModal));
const SuspendLinkModal = lazyDialog(() => import("@/components/links/SuspendLinkModal").then((modalModule) => modalModule.SuspendLinkModal));
const ImportCsvModal = lazyDialog(() => import("@/components/links/ImportCsvModal").then((modalModule) => modalModule.ImportCsvModal));
const ExportCsvModal = lazyDialog(() => import("@/components/links/ExportCsvModal").then((modalModule) => modalModule.ExportCsvModal));

function scrollLinksToTop(): void {
    const scroller = document.querySelector("main");
    if (scroller) {
        scroller.scrollTo({top: 0, behavior: "smooth"});
        return;
    }
    document.getElementById(LINKS_LIST_TOP_ID)?.scrollIntoView({behavior: "smooth", block: "start"});
}

function LinksPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlPage = parseLinksPageParam(searchParams.get("page"));
    const {showArchived, isShowArchivedHydrated, setShowArchived, hydrateShowArchived, searchQuery} = useLinkStore(useShallow((s) => ({
        showArchived: s.showArchived, isShowArchivedHydrated: s.isShowArchivedHydrated, setShowArchived: s.setShowArchived,
        hydrateShowArchived: s.hydrateShowArchived, searchQuery: s.searchQuery,
    })));
    const pageParams = {page: urlPage, showArchived, search: searchQuery};
    // Destructured so render closures depend on these values, not on the query result object, which is new on every
    // render: otherwise the compiler rebuilds every card on each keystroke in the search box.
    const {data: linksPage, isPending, isFetching, isError, isPlaceholderData, errorUpdatedAt, refetch} = useLinksPage(pageParams, isShowArchivedHydrated);
    const {setLinkArchived, setLinkSuspended, applyBulkAction, deleteLink, applySavedLink} = useLinkListActions(pageParams);
    const links = linksPage?.links ?? NO_LINKS;
    const selection = useLinkSelection(links, `${urlPage}|${showArchived}|${searchQuery}`);
    const {selectedLinks, isSelecting} = selection;
    const hasSelection = selectedLinks.length > 0;
    const [bulkRequest, setBulkRequest] = useState<BulkRequest | null>(null);
    const totalElements = linksPage?.totalElements ?? 0;
    const [dismissedErrorAt, setDismissedErrorAt] = useState(0);
    const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<LinkItem | null>(null);
    const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
    const [linkForQrCode, setLinkForQrCode] = useState<LinkItem | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [archiveModalLink, setArchiveModalLink] = useState<LinkItem | null>(null);
    const [suspendModalLink, setSuspendModalLink] = useState<LinkItem | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
    const hasOpenedEdit = useHasBeenOpened(isEditModalOpen);
    const hasOpenedDelete = useHasBeenOpened(deleteModalOpen);
    const hasOpenedQrCode = useHasBeenOpened(isQrCodeModalOpen);
    const hasOpenedArchive = useHasBeenOpened(archiveModalLink !== null);
    const hasOpenedBulk = useHasBeenOpened(bulkRequest !== null);
    const hasOpenedSuspend = useHasBeenOpened(suspendModalLink !== null);
    const hasOpenedImport = useHasBeenOpened(isImportModalOpen);
    const hasOpenedExport = useHasBeenOpened(isExportModalOpen);

    useEffect(() => {
        hydrateShowArchived();
    }, [hydrateShowArchived]);

    useEffect(() => {
        preloadOnIdle([EditLinkModal.preload, DeleteLinkModal.preload, ArchiveLinkModal.preload]);
    }, []);

    useEffect(() => {
        useImportTracker.getState().discoverOnLinksVisit();
        return () => { useImportTracker.getState().reset(); };
    }, []);

    const resetUrlToFirstPage = useCallback((): void => {
        if (urlPage > 0) {
            router.push(ROUTES.LINKS, {scroll: false});
        }
    }, [router, urlPage]);

    // A removal can empty the last page; then the previous page is the one that still has links.
    const syncPageAfterRemoval = (): void => {
        const page = linksPage;
        if (page && page.links.length === 0 && page.totalElements > 0 && urlPage > 0) {
            router.push(buildLinksPageUrl(urlPage - 1), {scroll: false});
        }
    };

    const commitSearch = (text: string): void => {
        const trimmed = text.trim();
        const query = trimmed.length >= MIN_LINK_SEARCH_LENGTH ? trimmed : "";
        const store = useLinkStore.getState();
        if (store.searchQuery === query) return;
        store.setSearchQuery(query);
        resetUrlToFirstPage();
    };
    const commitDebouncedSearch = useEffectEvent(commitSearch);

    useEffect(() => {
        commitDebouncedSearch(debouncedSearch);
    }, [debouncedSearch]);

    // The search box starts empty on every visit. A query left in the store would filter the next visit's first load,
    // and clearing it then would also drop the `?page=` of a back navigation.
    useEffect(() => () => useLinkStore.getState().setSearchQuery(""), []);

    // Without an active card, A switches the archived filter. A card with its menu open or under the pointer takes A
    // first (its listener is on document and calls preventDefault); this one is on window, so it always runs after.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || !isShortcutKey(e, SHORTCUTS.TOGGLE_ARCHIVED) || !canRunShortcut(e)) return;
            if (e.target instanceof Element && e.target.closest('[role="menu"]')) return;
            if (archiveModalLink || isSelecting) return;

            e.preventDefault();
            const isShowingArchived = !showArchived;
            setShowArchived(isShowingArchived);
            toast.info(isShowingArchived ? ARCHIVED_FILTER_COPY.SHOWING : ARCHIVED_FILTER_COPY.HIDING, {id: ARCHIVED_FILTER_TOAST_ID});
            resetUrlToFirstPage();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showArchived, setShowArchived, archiveModalLink, isSelecting, resetUrlToFirstPage]);

    const requestBulkAction = (action: BulkLinkAction): void => {
        if (selectedLinks.length === 0) return;
        setBulkRequest({action, links: selectedLinks});
    };

    // While links are selected, A, S and D act on them and Escape clears them; the cards' own shortcuts are off then.
    const handleSelectionKey = useEffectEvent((event: KeyboardEvent) => {
        if (!isSelecting || event.defaultPrevented || isModalOpen()) return;
        if (event.target instanceof Element && event.target.closest('[role="menu"]')) return;
        if (event.key === ESCAPE_KEY) {
            if (!isEditableTarget(event.target)) selection.clear();
            return;
        }
        const action = canRunShortcut(event) ? readBulkShortcut(event, selectedLinks) : null;
        if (action === null) return;
        event.preventDefault();
        requestBulkAction(action);
    });

    useEffect(() => {
        const listener = (event: KeyboardEvent) => handleSelectionKey(event);
        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
    }, []);

    const handleShowArchivedChange = (value: boolean) => {
        setShowArchived(value);
        resetUrlToFirstPage();
    };

    const goToPage = (page: number): void => {
        router.push(buildLinksPageUrl(page), {scroll: false});
        scrollLinksToTop();
    };

    const handlePreviousPage = (): void => {
        if (urlPage <= 0 || isPlaceholderData) return;
        goToPage(urlPage - 1);
    };

    const handleNextPage = (): void => {
        if (isPlaceholderData || (urlPage + 1) * DEFAULT_PAGE_SIZE >= totalElements) return;
        goToPage(urlPage + 1);
    };

    const archiveLink = async (link: LinkItem): Promise<void> => {
        const isArchiving = link.isActive;
        const isSaved = await setLinkArchived(link, isArchiving);
        if (!isSaved) {
            toast.error(isArchiving ? LINK_ACTION_COPY.ARCHIVE_FAILED : LINK_ACTION_COPY.UNARCHIVE_FAILED, {
                action: {label: LINK_ACTION_COPY.RETRY, onClick: () => void archiveLink(link)},
            });
            return;
        }
        syncPageAfterRemoval();
        toast.success(isArchiving ? LINK_ACTION_COPY.ARCHIVED : LINK_ACTION_COPY.UNARCHIVED);
    };

    const handleArchiveConfirm = () => {
        if (!archiveModalLink) return;
        const link = archiveModalLink;
        setArchiveModalLink(null);
        void archiveLink(link);
    };

    const suspendLink = async (link: LinkItem): Promise<void> => {
        const isSuspending = !link.isSuspended;
        const isSaved = await setLinkSuspended(link, isSuspending);
        if (!isSaved) {
            toast.error(isSuspending ? LINK_ACTION_COPY.SUSPEND_FAILED : LINK_ACTION_COPY.RESUME_FAILED, {
                action: {label: LINK_ACTION_COPY.RETRY, onClick: () => void suspendLink(link)},
            });
            return;
        }
        toast.success(isSuspending ? LINK_ACTION_COPY.SUSPENDED : LINK_ACTION_COPY.RESUMED);
    };

    const handleSuspendConfirm = () => {
        if (!suspendModalLink) return;
        const link = suspendModalLink;
        setSuspendModalLink(null);
        void suspendLink(link);
    };

    const runBulkAction = async ({action, links: bulkLinks}: BulkRequest): Promise<void> => {
        const result = await applyBulkAction(action, bulkLinks.map((link) => link.id));
        if (!result) {
            toast.error(BULK_LINK_ACTION_COPY[action].FAILED, {
                action: {label: LINK_ACTION_COPY.RETRY, onClick: () => void runBulkAction({action, links: bulkLinks})},
            });
            return;
        }
        syncPageAfterRemoval();
        const missingCount = result.notFoundIds.length;
        toast.success(formatBulkActionDone(action, result.processedIds.length),
            missingCount > 0 ? {description: LINK_SELECTION_COPY.ALREADY_GONE(missingCount)} : undefined);
    };

    const handleBulkConfirm = () => {
        if (!bulkRequest) return;
        const request = bulkRequest;
        setBulkRequest(null);
        selection.clear();
        void runBulkAction(request);
    };

    const handleDeleteClick = (link: LinkItem) => {
        setLinkToDelete(link);
        setDeleteModalOpen(true);
    };

    const removeLink = async (link: LinkItem): Promise<void> => {
        if (await deleteLink(link.id)) {
            syncPageAfterRemoval();
            toast.success(LINK_ACTION_COPY.DELETED);
            return;
        }
        toast.error(LINK_ACTION_COPY.DELETE_FAILED, {
            action: {label: LINK_ACTION_COPY.RETRY, onClick: () => void removeLink(link)},
        });
    };

    const confirmDelete = () => {
        if (!linkToDelete) return;
        const link = linkToDelete;
        setDeleteModalOpen(false);
        setLinkToDelete(null);
        void removeLink(link);
    };

    const handleEdit = (link: LinkItem) => {
        setEditingLink(link);
        setIsEditModalOpen(true);
    };

    const handleLinkSaved = (savedLink: LinkItem) => {
        applySavedLink(savedLink);
        toast.success(LINK_ACTION_COPY.SAVED);
    };

    const handleQrCode = (link: LinkItem) => {
        setLinkForQrCode(link);
        setIsQrCodeModalOpen(true);
    };

    const handleImportCsvClick = (): void => {
        if (useImportTracker.getState().status === IMPORT_TRACKING_STATUS.COMPLETED) {
            useImportTracker.getState().reset();
        }
        setIsImportModalOpen(true);
    };

    const handleExportCsvClick = (): void => {
        setIsExportModalOpen(true);
    };

    const toolbar = (
        <PageToolbar
            showOptions
            showArchived={showArchived}
            onShowArchivedChange={handleShowArchivedChange}
            showImportExport
            onImportCsvClick={handleImportCsvClick}
            onExportCsvClick={handleExportCsvClick}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onSearchSubmit={commitSearch}
            placeholder="Search by URL or title"
        />
    );

    const handleRetryLoad = () => {
        void refetch();
    };

    const isRefreshErrorShown = isError && links.length > 0 && errorUpdatedAt !== dismissedErrorAt;

    const renderListBody = (): React.ReactNode => {
        if (links.length === 0 && (isPending || isFetching)) return <LinkCardSkeletonList count={5}/>;
        // A failed first load is an error, never the "create your first link" empty state.
        if (links.length === 0 && isError) {
            return <ErrorWithRetry message={LINKS_LOAD_COPY.LOAD_FAILED} onRetry={handleRetryLoad} className={LIST_LOAD_ERROR_CLASS}/>;
        }
        if (links.length === 0) return searchQuery !== "" ? <NoLinksFoundState/> : <EmptyLinksState/>;
        return (
            <>
                <div id={LINKS_LIST_TOP_ID} className={CARD_LIST_CLASS}>
                    {links.map((link) => (
                        <LinkCard
                            key={link.id}
                            link={link}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                            onQrCode={handleQrCode}
                            onArchiveRequest={(link) => setArchiveModalLink(link)}
                            onSuspendRequest={(link) => setSuspendModalLink(link)}
                            isSelected={selection.isSelected(link.id)}
                            isSelectMode={selection.isSelectMode}
                            onSelectToggle={selection.toggle}
                            areShortcutsEnabled={!isSelecting}
                        />
                    ))}
                </div>
                {totalElements > 0 && (
                    <>
                        <LinksBottomBar
                            ariaLabel={hasSelection ? LINK_SELECTION_COPY.BAR_LABEL : LINKS_PAGINATION_LABEL}
                            contentKey={hasSelection ? "selection" : "pagination"}
                            aside={!hasSelection && (
                                <LinksSelectModeButton
                                    isSelectMode={selection.isSelectMode}
                                    onStart={selection.startSelecting}
                                    onCancel={selection.clear}
                                />
                            )}
                        >
                            {hasSelection ? (
                                <LinksSelectionBar selectedLinks={selectedLinks} onClear={selection.clear} onAction={requestBulkAction}/>
                            ) : (
                                <LinksPagination
                                    page={urlPage}
                                    pageSize={DEFAULT_PAGE_SIZE}
                                    totalElements={totalElements}
                                    isLoading={isPlaceholderData}
                                    onPrevious={handlePreviousPage}
                                    onNext={handleNextPage}
                                />
                            )}
                        </LinksBottomBar>
                        <div aria-hidden="true" className="-mt-4 h-[calc(env(safe-area-inset-bottom,0px)+5rem)] sm:h-14 md:h-10 lg:h-8"/>
                    </>
                )}
            </>
        );
    };

    return (
        <TooltipProvider>
            <PageContainer className={totalElements > 0 && links.length > 0 ? "pb-0" : undefined}>
                {toolbar}

                {isRefreshErrorShown && (
                    <div
                        role="alert"
                        className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between gap-3">
                        <span className="min-w-0">{LINKS_LOAD_COPY.REFRESH_FAILED}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDismissedErrorAt(errorUpdatedAt)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/20"
                        >
                            {LINKS_LOAD_COPY.DISMISS}
                        </Button>
                    </div>
                )}

                {renderListBody()}

                {hasOpenedEdit && (
                    <EditLinkModal
                        open={isEditModalOpen}
                        onOpenChange={setIsEditModalOpen}
                        link={editingLink}
                        onSuccess={handleLinkSaved}
                    />
                )}

                {hasOpenedDelete && (
                    <DeleteLinkModal
                        open={deleteModalOpen}
                        onOpenChange={setDeleteModalOpen}
                        onConfirm={confirmDelete}
                        shortUrl={linkToDelete?.shortUrl}
                        longUrl={linkToDelete?.longUrl}
                    />
                )}

                {hasOpenedQrCode && (
                    <LazyQrCodeModal
                        open={isQrCodeModalOpen}
                        onOpenChange={setIsQrCodeModalOpen}
                        link={linkForQrCode}
                    />
                )}

                {hasOpenedArchive && (
                    <ArchiveLinkModal
                        open={!!archiveModalLink}
                        onOpenChange={(open) => !open && setArchiveModalLink(null)}
                        link={archiveModalLink}
                        onConfirm={handleArchiveConfirm}
                    />
                )}

                {hasOpenedBulk && (
                    <BulkLinksModal
                        open={!!bulkRequest}
                        onOpenChange={(open) => !open && setBulkRequest(null)}
                        action={bulkRequest?.action ?? null}
                        links={bulkRequest?.links ?? NO_LINKS}
                        onConfirm={handleBulkConfirm}
                    />
                )}

                {hasOpenedSuspend && (
                    <SuspendLinkModal
                        open={!!suspendModalLink}
                        onOpenChange={(open) => !open && setSuspendModalLink(null)}
                        link={suspendModalLink}
                        onConfirm={handleSuspendConfirm}
                    />
                )}

                {hasOpenedImport && (
                    <ImportCsvModal
                        open={isImportModalOpen}
                        onOpenChange={setIsImportModalOpen}
                    />
                )}

                {hasOpenedExport && (
                    <ExportCsvModal
                        open={isExportModalOpen}
                        onOpenChange={setIsExportModalOpen}
                    />
                )}
            </PageContainer>
        </TooltipProvider>
    );
}

export default function LinksPage() {
    return (
        <Suspense fallback={
            <PageContainer>
                <LinkCardSkeletonList count={5}/>
            </PageContainer>
        }>
            <LinksPageContent/>
        </Suspense>
    );
}
