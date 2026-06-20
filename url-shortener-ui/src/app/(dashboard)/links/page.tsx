"use client";

import {useEffect, useState} from "react";
import {fetchWithAuth} from "@/lib/api";
import {EditLinkModal} from "@/components/links/EditLinkModal";
import {DeleteLinkModal} from "@/components/links/DeleteLinkModal";
import {ArchiveLinkModal} from "@/components/links/ArchiveLinkModal";
import {QrCodeModal} from "@/components/links/QrCodeModal";
import {LinkCard} from "@/components/links/LinkCard";
import {EmptyLinksState} from "@/components/links/EmptyLinksState";
import {TooltipProvider} from "@/components/ui/tooltip";
import {Button} from "@/components/ui/button";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {LinkItem} from "@/lib/types";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {API_ENDPOINTS} from "@/lib/constants";

export default function LinksPage() {
    const {links, loading, error, fetchLinks, clearError, showArchived, setShowArchived, toggleLinkActive} = useLinkStore();
    const {fetchTags} = useTagStoreWithoutCount();
    const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<LinkItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
    const [linkForQrCode, setLinkForQrCode] = useState<LinkItem | null>(null);
    const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
    const [archiveModalLink, setArchiveModalLink] = useState<LinkItem | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);

    useEffect(() => {
        fetchLinks();
        fetchTags();
    }, [fetchLinks, fetchTags]);

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

            e.preventDefault();
            e.stopPropagation();

            const hoveredCard = document.querySelector("[data-link-id]:hover") as HTMLElement | null;
            const hoveredId = hoveredLinkId ?? hoveredCard?.dataset.linkId ?? null;

            if (hoveredId) {
                const hoveredLink = useLinkStore.getState().links.find((l) => l.id === hoveredId);
                if (hoveredLink) {
                    setArchiveModalLink(hoveredLink);
                }
            } else {
                setShowArchived(!showArchived);
                fetchLinks(0);
            }
        };

        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [hoveredLinkId, showArchived, fetchLinks, setShowArchived, archiveModalLink]);

    const handleShowArchivedChange = (value: boolean) => {
        setShowArchived(value);
        fetchLinks(0);
    };

    const handleArchiveToggle = (link: LinkItem) => {
        toggleLinkActive(link.id, !link.isActive);
    };

    const handleArchiveConfirm = async () => {
        if (!archiveModalLink) return;
        setIsArchiving(true);
        try {
            await toggleLinkActive(archiveModalLink.id, !archiveModalLink.isActive);
            setArchiveModalLink(null);
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDeleteClick = (link: LinkItem) => {
        setLinkToDelete(link);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!linkToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetchWithAuth(`${API_ENDPOINTS.SHORTLINKS}/${linkToDelete.id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                fetchLinks();
                setDeleteModalOpen(false);
                setLinkToDelete(null);
            } else {
                console.error("Failed to delete link");
            }
        } catch (e) {
            console.error("Error deleting link", e);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (link: LinkItem) => {
        setEditingLink(link);
        setIsEditModalOpen(true);
    };

    const handleQrCode = (link: LinkItem) => {
        setLinkForQrCode(link);
        setIsQrCodeModalOpen(true);
    };

    if (loading && links.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Loading links...</div>;
    }

    return (
        <TooltipProvider>
            <PageContainer>
                <PageToolbar showOptions showArchived={showArchived} onShowArchivedChange={handleShowArchivedChange} className="mb-[-8px]" />

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
                    <EmptyLinksState/>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {links.map((link) => (
                                <LinkCard
                                    key={link.id}
                                    link={link}
                                    onEdit={handleEdit}
                                    onDelete={handleDeleteClick}
                                    onQrCode={handleQrCode}
                                    onArchiveToggle={handleArchiveToggle}
                                    onArchiveRequest={(link) => setArchiveModalLink(link)}
                                    onMouseEnter={() => setHoveredLinkId(link.id)}
                                    onMouseLeave={() => setHoveredLinkId(null)}
                                />
                        ))}
                    </div>
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
                    loading={isDeleting}
                    linkTitle={linkToDelete?.title}
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
                    loading={isArchiving}
                />
            </PageContainer>
        </TooltipProvider>
    );
}

