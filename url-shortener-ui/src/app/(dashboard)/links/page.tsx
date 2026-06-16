"use client";

import {useEffect, useState} from "react";
import {fetchWithAuth} from "@/lib/api";
import {EditLinkModal} from "@/components/links/EditLinkModal";
import {DeleteLinkModal} from "@/components/links/DeleteLinkModal";
import {QrCodeModal} from "@/components/links/QrCodeModal";
import {LinkCard} from "@/components/links/LinkCard";
import {LinkCardSkeletonList} from "@/components/links/LinkCardSkeleton";
import {EmptyLinksState} from "@/components/links/EmptyLinksState";
import {TooltipProvider} from "@/components/ui/tooltip";
import {Button} from "@/components/ui/button";
import {useLinkStore} from "@/lib/store/links";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import {LinkItem} from "@/lib/types";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageHeading} from "@/components/layout/PageHeading";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";

export default function LinksPage() {
    const {links, loading, error, fetchLinks, clearError} = useLinkStore();
    const {fetchTags} = useTagStoreWithoutCount();
    const [editingLink, setEditingLink] = useState<LinkItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState<LinkItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isQrCodeModalOpen, setIsQrCodeModalOpen] = useState(false);
    const [linkForQrCode, setLinkForQrCode] = useState<LinkItem | null>(null);

    useEffect(() => {
        fetchLinks();
        fetchTags();
    }, [fetchLinks, fetchTags]);

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
                logger.error("Failed to delete link", undefined, { status: res.status, linkId: linkToDelete.id });
            }
        } catch (e) {
            logger.error("Error deleting link", e, { linkId: linkToDelete.id });
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
        return (
            <TooltipProvider>
                <PageContainer>
                    <div className="flex items-center justify-between">
                        <PageHeading>Links</PageHeading>
                    </div>
                    <LinkCardSkeletonList count={5} />
                </PageContainer>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <PageContainer>
                <div className="flex items-center justify-between">
                    <PageHeading>Links</PageHeading>
                </div>

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
            </PageContainer>
        </TooltipProvider>
    );
}

