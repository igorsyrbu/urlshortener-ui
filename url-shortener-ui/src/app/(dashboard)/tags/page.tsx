"use client";

import {useEffect, useState} from "react";
import {EditTagModal} from "@/components/tags/EditTagModal";
import {DeleteTagModal} from "@/components/tags/DeleteTagModal";
import {TagCard} from "@/components/tags/TagCard";
import {EmptyTagsState} from "@/components/tags/EmptyTagsState";
import {TagCardSkeletonList} from "@/components/tags/TagCardSkeleton";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {Button} from "@/components/ui/button";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {TagItem} from "@/lib/types";

export default function TagsPage() {
    const {tags, loading, error, fetchTags, clearError} = useTagStoreWithCount();
    const {deleteTag} = useTagMutations();
    const [editingTag, setEditingTag] = useState<TagItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    const handleDeleteClick = (tag: TagItem) => {
        setTagToDelete(tag);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!tagToDelete?.id) return;
        setIsDeleting(true);
        try {
            await deleteTag(tagToDelete.id);
            setDeleteModalOpen(false);
            setTagToDelete(null);
        } catch {
            // error handled by store
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEdit = (tag: TagItem) => {
        setEditingTag(tag);
        setIsEditModalOpen(true);
    };

    if (loading && tags.length === 0) {
        return (
            <PageContainer>
                <PageToolbar className="-mb-2" />
                <TagCardSkeletonList count={5} />
            </PageContainer>
        );
    }

    if (error) {
        return (
            <PageContainer>
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
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageToolbar className="-mb-2" />

            {!loading && tags.length === 0 ? (
                <EmptyTagsState/>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {tags.map((tag) => (
                        <TagCard
                            key={tag.id}
                            tag={tag}
                            onEdit={handleEdit}
                            onDelete={handleDeleteClick}
                        />
                    ))}
                </div>
            )}

            <EditTagModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                tag={editingTag}
            />

            <DeleteTagModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={confirmDelete}
                loading={isDeleting}
                tagName={tagToDelete?.name}
                tagColor={tagToDelete?.color}
            />
        </PageContainer>
    );
}
