"use client";

import {Suspense, useCallback, useEffect, useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {EditLinkModal} from "@/components/links/EditLinkModal";
import {DeleteLinkModal} from "@/components/links/DeleteLinkModal";
import {ArchiveLinkModal} from "@/components/links/ArchiveLinkModal";
import {QrCodeModal} from "@/components/links/QrCodeModal";
import {ImportCsvModal} from "@/components/links/ImportCsvModal";
import {ExportCsvModal} from "@/components/links/ExportCsvModal";
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
import {DEFAULT_PAGE_SIZE, LINK_ACTION_COPY, ROUTES} from "@/lib/constants";
import {toast} from "sonner";
import {buildLinksPageUrl, parseLinksPageParam} from "@/lib/pagination";
import {isModalOpen} from "@/lib/utils";
import {useDebounce} from "@/lib/hooks/useDebounce";

const LINKS_LIST_TOP_ID = "links-list-top";

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
    const debouncedSearch = useDebounce(searchInput, 500);

    useEffect(() => {
        hydrateShowArchived();
    }, [hydrateShowArchived]);

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

    useEffect(() => {
        const trimmed = debouncedSearch.trim();
        const store = useLinkStore.getState();
        if (store.searchQuery !== trimmed) {
            store.setSearchQuery(trimmed);
            resetUrlToFirstPage();
            store.fetchLinks(0);
        }
    }, [debouncedSearch, resetUrlToFirstPage]);

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
            placeholder="Search by URL or title"
        />
    );

    if (loading && links.length === 0) {
        return (
            <TooltipProvider>
                <PageContainer>
                    {toolbar}
                    <LinkCardSkeletonList count={5}/>
                </PageContainer>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <PageContainer className={totalElements > 0 ? "pb-0" : undefined}>
                {toolbar}

                {error && (
                    <div
                        className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between">
                        <span>{error}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearError()}
                            className="text-destructive hover:text-destructive hover:bg-destructive/20"
                        >
                            Dismiss
                        </Button>
                    </div>
                )}

                {!loading && links.length === 0 ? (
                    searchQuery !== "" ? <NoLinksFoundState/> : <EmptyLinksState/>
                ) : (
                    <>
                        <div id={LINKS_LIST_TOP_ID} className="grid grid-cols-1 gap-3">
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
                )}

                <EditLinkModal
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    link={editingLink}
                    onSuccess={() => fetchLinks()}
                />

                <DeleteLinkModal
                    open={deleteModalOpen}
                    onOpenChange={setDeleteModalOpen}
                    onConfirm={confirmDelete}
                    loading={false}
                    shortUrl={linkToDelete?.shortUrl}
                    longUrl={linkToDelete?.longUrl}
                />

                <QrCodeModal
                    open={isQrCodeModalOpen}
                    onOpenChange={setIsQrCodeModalOpen}
                    link={linkForQrCode}
                />

                <ArchiveLinkModal
                    open={!!archiveModalLink}
                    onOpenChange={(open) => !open && setArchiveModalLink(null)}
                    link={archiveModalLink}
                    onConfirm={handleArchiveConfirm}
                />

                <ImportCsvModal
                    open={isImportModalOpen}
                    onOpenChange={setIsImportModalOpen}
                />

                <ExportCsvModal
                    open={isExportModalOpen}
                    onOpenChange={setIsExportModalOpen}
                />
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
