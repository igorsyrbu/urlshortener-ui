"use client";

import {useEffect, useState} from "react";
import dynamic from "next/dynamic";
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
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";
import {preloadOnIdle} from "@/lib/preload-on-idle";
import {logger} from "@/lib/logger";
import {attempt, withPending} from "@/lib/async-utils";
import {TAG_DELETE_FAILED_MESSAGE} from "@/lib/tag-constants";
import {toast} from "sonner";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {CARD_LIST_CLASS, LINKS_LOAD_COPY, LIST_LOAD_ERROR_CLASS, SEARCH_DEBOUNCE_MS, TAGS_LOAD_COPY} from "@/lib/constants";

function loadEditTagModal() {
    return import("@/components/tags/EditTagModal").then((modalModule) => modalModule.EditTagModal);
}

function loadDeleteTagModal() {
    return import("@/components/tags/DeleteTagModal").then((modalModule) => modalModule.DeleteTagModal);
}

const EditTagModal = dynamic(loadEditTagModal, {ssr: false});
const DeleteTagModal = dynamic(loadDeleteTagModal, {ssr: false});

function commitTagSearch(text: string): void {
    const trimmed = text.trim();
    const store = useTagStoreWithCount.getState();
    if (store.searchQuery === trimmed) return;
    store.setSearchQuery(trimmed);
    store.fetchTags();
}

export default function TagsPage() {
    const {tags, loading, error, fetchTags, clearError, searchQuery} = useTagStoreWithCount();
    const {deleteTag} = useTagMutations();
    const [editingTag, setEditingTag] = useState<TagItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
    const hasOpenedEdit = useHasBeenOpened(isEditModalOpen);
    const hasOpenedDelete = useHasBeenOpened(deleteModalOpen);

    useEffect(() => {
        fetchTags();
    }, [fetchTags]);

    useEffect(() => {
        preloadOnIdle([loadEditTagModal, loadDeleteTagModal]);
    }, []);

    useEffect(() => {
        commitTagSearch(debouncedSearch);
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
            onSearchSubmit={commitTagSearch}
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
            <div className={CARD_LIST_CLASS}>
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

            {hasOpenedEdit && (
                <EditTagModal
                    open={isEditModalOpen}
                    onOpenChange={setIsEditModalOpen}
                    tag={editingTag}
                />
            )}

            {hasOpenedDelete && (
                <DeleteTagModal
                    open={deleteModalOpen}
                    onOpenChange={setDeleteModalOpen}
                    onConfirm={confirmDelete}
                    loading={isDeleting}
                    tagName={tagToDelete?.name}
                    tagColor={tagToDelete?.color}
                />
            )}
        </PageContainer>
    );
}
