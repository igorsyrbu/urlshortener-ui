"use client";

import {useEffect, useState} from "react";
import {EditTagModal} from "@/components/tags/EditTagModal";
import {DeleteTagModal} from "@/components/tags/DeleteTagModal";
import {TagCard} from "@/components/tags/TagCard";
import {EmptyTagsState} from "@/components/tags/EmptyTagsState";
import {NoTagsFoundState} from "@/components/tags/NoTagsFoundState";
import {TagCardSkeletonList} from "@/components/tags/TagCardSkeleton";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {Button} from "@/components/ui/button";
import {useTagStoreWithCount} from "@/lib/store/tags-with-count";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {TagItem} from "@/lib/types";
import {useDebounce} from "@/lib/hooks/useDebounce";

export default function TagsPage() {
    const {tags, loading, error, fetchTags, clearError, searchQuery} = useTagStoreWithCount();
    const {deleteTag} = useTagMutations();
    const [editingTag, setEditingTag] = useState<TagItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, 500);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    useEffect(() => {
        const trimmed = debouncedSearch.trim();
        const store = useTagStoreWithCount.getState();
        if (store.searchQuery !== trimmed) {
            store.setSearchQuery(trimmed);
            store.fetchTags();
        }
    }, [debouncedSearch]);

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

    const toolbar = (
        <PageToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            placeholder="Search..."
        />
    );

    if (loading && tags.length === 0) {
        return (
            <PageContainer>
                {toolbar}
                <TagCardSkeletonList count={5}/>
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
            {toolbar}

            {!loading && tags.length === 0 ? (
                searchQuery !== "" ? <NoTagsFoundState/> : <EmptyTagsState/>
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
