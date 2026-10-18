"use client";

import {Suspense, useCallback, useEffect, useEffectEvent, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import dynamic from "next/dynamic";
import {LinkCard} from "@/components/links/LinkCard";
import {LinkCardSkeletonList} from "@/components/links/LinkCardSkeleton";
import {LinksPagination} from "@/components/links/LinksPagination";
import {EmptyLinksState} from "@/components/links/EmptyLinksState";
import {NoLinksFoundState} from "@/components/links/NoLinksFoundState";
import {TooltipProvider} from "@/components/ui/tooltip";
import {Button} from "@/components/ui/button";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {IMPORT_TRACKING_STATUS, useImportTracker} from "@/lib/store/import";
import {LinkItem} from "@/lib/types";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {CARD_LIST_CLASS, DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS, LINK_ACTION_COPY, LINKS_LOAD_COPY, LIST_LOAD_ERROR_CLASS, ROUTES} from "@/lib/constants";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {toast} from "sonner";
import {buildLinksPageUrl, parseLinksPageParam} from "@/lib/pagination";
import {isModalOpen} from "@/lib/utils";
import {useDebounce} from "@/lib/hooks/useDebounce";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";
import {LazyQrCodeModal} from "@/components/links/lazy-qr-code-modal";
import {preloadOnIdle} from "@/lib/preload-on-idle";

const LINKS_LIST_TOP_ID = "links-list-top";

function loadEditLinkModal() {
    return import("@/components/links/EditLinkModal").then((modalModule) => modalModule.EditLinkModal);
}

function loadDeleteLinkModal() {
    return import("@/components/links/DeleteLinkModal").then((modalModule) => modalModule.DeleteLinkModal);
}

function loadArchiveLinkModal() {
    return import("@/components/links/ArchiveLinkModal").then((modalModule) => modalModule.ArchiveLinkModal);
}

const EditLinkModal = dynamic(loadEditLinkModal, {ssr: false});
const DeleteLinkModal = dynamic(loadDeleteLinkModal, {ssr: false});
const ArchiveLinkModal = dynamic(loadArchiveLinkModal, {ssr: false});
const ImportCsvModal = dynamic(() => import("@/components/links/ImportCsvModal").then((modalModule) => modalModule.ImportCsvModal), {ssr: false});
const ExportCsvModal = dynamic(() => import("@/components/links/ExportCsvModal").then((modalModule) => modalModule.ExportCsvModal), {ssr: false});

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
    const {
        links,
        loading,
        error,
        currentPage,
        totalElements,
        fetchLinks,
        clearError,
        showArchived,
        setShowArchived,
        setLinkArchived,
        deleteLink,
        applySavedLink,
        hydrateShowArchived,
        searchQuery
    } = useLinkStore();
    const {fetchTags} = useTagStoreWithoutCount();
    const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<LinkItem | null>(null);
    const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
    const [linkForQrCode, setLinkForQrCode] = useState<LinkItem | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [archiveModalLink, setArchiveModalLink] = useState<LinkItem | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
    const hasOpenedEdit = useHasBeenOpened(isEditModalOpen);
    const hasOpenedDelete = useHasBeenOpened(deleteModalOpen);
    const hasOpenedQrCode = useHasBeenOpened(isQrCodeModalOpen);
    const hasOpenedArchive = useHasBeenOpened(archiveModalLink !== null);
    const hasOpenedImport = useHasBeenOpened(isImportModalOpen);
    const hasOpenedExport = useHasBeenOpened(isExportModalOpen);

    useEffect(() => {
        hydrateShowArchived();
    }, [hydrateShowArchived]);

    useEffect(() => {
        preloadOnIdle([loadEditLinkModal, loadDeleteLinkModal, loadArchiveLinkModal]);
    }, []);

    useEffect(() => {
        useImportTracker.getState().ensureDiscovery();
        return () => { useImportTracker.getState().stopTracking(); };
    }, []);

    const resetUrlToFirstPage = useCallback((): void => {
        if (useLinkStore.getState().currentPage > 0) {
            router.push(ROUTES.LINKS, {scroll: false});
        }
    }, [router]);

    const syncPageAfterRemoval = async (): Promise<void> => {
        const store = useLinkStore.getState();
        if (store.links.length === 0 && store.totalElements > 0 && store.currentPage > 0) {
            const previousPage = store.currentPage - 1;
            router.push(buildLinksPageUrl(previousPage), {scroll: false});
            await store.fetchLinks(previousPage);
        }
    };

    const commitSearch = (text: string): void => {
        const trimmed = text.trim();
        const store = useLinkStore.getState();
        if (store.searchQuery === trimmed) return;
        store.setSearchQuery(trimmed);
        resetUrlToFirstPage();
        store.fetchLinks(0);
    };
    const commitDebouncedSearch = useEffectEvent(commitSearch);

    useEffect(() => {
        commitDebouncedSearch(debouncedSearch);
    }, [debouncedSearch]);

    useEffect(() => {
        fetchLinks(urlPage);
    }, [urlPage, fetchLinks]);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key.toLowerCase() !== "a" ||
                e.metaKey ||
                e.ctrlKey ||
                e.altKey
            ) {
                return;
            }

            const target = e.target as HTMLElement;
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
            if (target.closest('[role="dialog"], [role="menu"]')) return;
            if (archiveModalLink) return;
            if (isModalOpen()) return;

            e.preventDefault();
            e.stopPropagation();

            const hoveredCard = document.querySelector<HTMLElement>("[data-link-id]:hover");
            const hoveredId = hoveredCard?.dataset.linkId ?? null;

            if (hoveredId) {
                const hoveredLink = useLinkStore.getState().links.find((l) => l.id === hoveredId);
                if (hoveredLink) {
                    setArchiveModalLink(hoveredLink);
                }
            } else {
                setShowArchived(!showArchived);
                resetUrlToFirstPage();
                fetchLinks(0);
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [showArchived, fetchLinks, setShowArchived, archiveModalLink, resetUrlToFirstPage]);

    const handleShowArchivedChange = (value: boolean) => {
        setShowArchived(value);
        resetUrlToFirstPage();
        fetchLinks(0);
    };

    const handlePreviousPage = (): void => {
        if (currentPage <= 0 || loading) {
            return;
        }
        const previousPage = currentPage - 1;
        router.push(buildLinksPageUrl(previousPage), {scroll: false});
        scrollLinksToTop();
        fetchLinks(previousPage);
    };

    const handleNextPage = (): void => {
        if (loading || (currentPage + 1) * DEFAULT_PAGE_SIZE >= totalElements) {
            return;
        }
        const nextPage = currentPage + 1;
        router.push(buildLinksPageUrl(nextPage), {scroll: false});
        scrollLinksToTop();
        fetchLinks(nextPage);
    };

    const archiveLink = async (link: LinkItem): Promise<void> => {
        const isSaved = await setLinkArchived(link.id, link.isActive);
        if (isSaved) {
            await syncPageAfterRemoval();
            return;
        }
        toast.error(link.isActive ? LINK_ACTION_COPY.ARCHIVE_FAILED : LINK_ACTION_COPY.UNARCHIVE_FAILED, {
            action: {label: LINK_ACTION_COPY.RETRY, onClick: () => void archiveLink(link)},
        });
    };

    const handleArchiveConfirm = () => {
        if (!archiveModalLink) return;
        const link = archiveModalLink;
        setArchiveModalLink(null);
        void archiveLink(link);
    };

    const handleDeleteClick = (link: LinkItem) => {
        setLinkToDelete(link);
        setDeleteModalOpen(true);
    };

    const removeLink = async (link: LinkItem): Promise<void> => {
        if (await deleteLink(link.id)) {
            await syncPageAfterRemoval();
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
        clearError();
        void fetchLinks(currentPage);
    };

    const renderListBody = (): React.ReactNode => {
        if (links.length === 0 && loading) return <LinkCardSkeletonList count={5}/>;
        // A failed first load is an error, never the "create your first link" empty state.
        if (links.length === 0 && error) {
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
                        />
                    ))}
                </div>
                {totalElements > 0 && (
                    <>
                        <LinksPagination
                            page={currentPage}
                            pageSize={DEFAULT_PAGE_SIZE}
                            totalElements={totalElements}
                            isLoading={loading}
                            onPrevious={handlePreviousPage}
                            onNext={handleNextPage}
                        />
                        <div aria-hidden="true" className="-mt-4 h-14 md:h-10 lg:h-8"/>
                    </>
                )}
            </>
        );
    };

    return (
        <TooltipProvider>
            <PageContainer className={totalElements > 0 && links.length > 0 ? "pb-0" : undefined}>
                {toolbar}

                {error && links.length > 0 && (
                    <div
                        role="alert"
                        className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between gap-3">
                        <span className="min-w-0">{LINKS_LOAD_COPY.REFRESH_FAILED}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearError()}
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
                        onSuccess={applySavedLink}
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
