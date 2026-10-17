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
import {logger} from "@/lib/logger";
import {attempt, withPending} from "@/lib/async-utils";
import {TAG_DELETE_FAILED_MESSAGE} from "@/lib/tag-constants";
import {toast} from "sonner";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {LINKS_LOAD_COPY, LIST_LOAD_ERROR_CLASS, TAGS_LOAD_COPY} from "@/lib/constants";

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
        const tagId = tagToDelete.id;
        await withPending(setIsDeleting, async () => {
            const result = await attempt(() => deleteTag(tagId));
            if (!result.isSuccess) {
                logger.error("Failed to delete tag", result.error, {tagId});
                toast.error(TAG_DELETE_FAILED_MESSAGE);
                return;
            }
            setDeleteModalOpen(false);
            setTagToDelete(null);
        });
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

    const handleRetryLoad = () => {
        clearError();
        void fetchTags();
    };

    const renderTagList = (): React.ReactNode => {
        if (tags.length === 0 && loading) return <TagCardSkeletonList count={5}/>;
        if (tags.length === 0 && error) {
            return <ErrorWithRetry message={TAGS_LOAD_COPY.LOAD_FAILED} onRetry={handleRetryLoad} className={LIST_LOAD_ERROR_CLASS}/>;
        }
        if (tags.length === 0) return searchQuery !== "" ? <NoTagsFoundState/> : <EmptyTagsState/>;
        return (
            <div className="grid grid-cols-1 gap-3">
                {tags.map((tag) => (
                    <TagCard key={tag.id} tag={tag} onEdit={handleEdit} onDelete={handleDeleteClick}/>
                ))}
            </div>
        );
    };

    return (
        <PageContainer>
            {toolbar}

            {error && tags.length > 0 && (
                <div
                    role="alert"
                    className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between gap-3">
                    <span className="min-w-0">{TAGS_LOAD_COPY.REFRESH_FAILED}</span>
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

            {renderTagList()}

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
