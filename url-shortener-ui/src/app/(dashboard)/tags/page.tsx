"use client";

import {useEffect, useState} from "react";
import {TagCard} from "@/components/tags/TagCard";
import {EmptyTagsState} from "@/components/tags/EmptyTagsState";
import {NoTagsFoundState} from "@/components/tags/NoTagsFoundState";
import {TagCardSkeletonList} from "@/components/tags/TagCardSkeleton";
import {PageContainer} from "@/components/layout/PageContainer";
import {PageToolbar} from "@/components/layout/PageToolbar";
import {Button} from "@/components/ui/button";
import {useTagsWithCount} from "@/lib/hooks/useTagsWithCount";
import {useTagMutations} from "@/lib/hooks/useTagMutations";
import {TagItem} from "@/lib/types";
import {useDebounce} from "@/lib/hooks/useDebounce";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";
import {preloadOnIdle} from "@/lib/preload-on-idle";
import {logger} from "@/lib/logger";
import {attempt} from "@/lib/async-utils";
import {TAG_DELETE_FAILED_MESSAGE} from "@/lib/tag-constants";
import {toast} from "sonner";
import {ErrorWithRetry} from "@/components/layout/ErrorWithRetry";
import {CARD_LIST_CLASS, LINK_ACTION_COPY, LINKS_LOAD_COPY, LIST_LOAD_ERROR_CLASS, SEARCH_DEBOUNCE_MS, TAGS_LOAD_COPY} from "@/lib/constants";
import {lazyDialog} from "@/lib/lazy-dialog";

function loadEditTagModal() {
    return import("@/components/tags/EditTagModal").then((modalModule) => modalModule.EditTagModal);
}

function loadDeleteTagModal() {
    return import("@/components/tags/DeleteTagModal").then((modalModule) => modalModule.DeleteTagModal);
}

const EditTagModal = lazyDialog(loadEditTagModal);
const DeleteTagModal = lazyDialog(loadDeleteTagModal);

const NO_TAGS: TagItem[] = [];

export default function TagsPage() {
    const [dismissedErrorAt, setDismissedErrorAt] = useState(0);
    const {deleteTag} = useTagMutations();
    const [editingTag, setEditingTag] = useState<TagItem | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState<TagItem | null>(null);
    const [searchInput, setSearchInput] = useState("");
    const debouncedSearch = useDebounce(searchInput, SEARCH_DEBOUNCE_MS);
    // Enter, Clear and Escape apply the box's text at once; typing applies it after the debounce. Local state, so the
    // box and the list start unfiltered on every visit.
    const [submittedInput, setSubmittedInput] = useState<string | null>(null);
    const searchQuery = (submittedInput === searchInput ? searchInput : debouncedSearch).trim();
    // Destructured so render code does not close over the query result object, which is new on every render.
    const {data, isPending, isFetching, isError, errorUpdatedAt, refetch} = useTagsWithCount(searchQuery);
    const tags = data ?? NO_TAGS;
    const hasOpenedEdit = useHasBeenOpened(isEditModalOpen);
    const hasOpenedDelete = useHasBeenOpened(deleteModalOpen);

    useEffect(() => {
        preloadOnIdle([EditTagModal.preload, DeleteTagModal.preload]);
    }, []);


    const handleDeleteClick = (tag: TagItem) => {
        setTagToDelete(tag);
        setDeleteModalOpen(true);
    };

    // The tag leaves the list at once (useTagMutations); a refused delete puts it back and offers a retry.
    const removeTag = async (tagId: string): Promise<void> => {
        const result = await attempt(() => deleteTag(tagId));
        if (result.isSuccess) return;
        logger.error("Failed to delete tag", result.error, {tagId});
        toast.error(TAG_DELETE_FAILED_MESSAGE, {
            action: {label: LINK_ACTION_COPY.RETRY, onClick: () => void removeTag(tagId)},
        });
    };

    const confirmDelete = () => {
        if (!tagToDelete?.id) return;
        const tagId = tagToDelete.id;
        setDeleteModalOpen(false);
        setTagToDelete(null);
        void removeTag(tagId);
    };

    const handleEdit = (tag: TagItem) => {
        setEditingTag(tag);
        setIsEditModalOpen(true);
    };

    const toolbar = (
        <PageToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            onSearchSubmit={setSubmittedInput}
            placeholder="Search..."
        />
    );

    const handleRetryLoad = () => {
        void refetch();
    };

    const isRefreshErrorShown = isError && tags.length > 0 && errorUpdatedAt !== dismissedErrorAt;

    const renderTagList = (): React.ReactNode => {
        if (tags.length === 0 && (isPending || isFetching)) return <TagCardSkeletonList count={5}/>;
        if (tags.length === 0 && isError) {
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

            {isRefreshErrorShown && (
                <div
                    role="alert"
                    className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center justify-between gap-3">
                    <span className="min-w-0">{TAGS_LOAD_COPY.REFRESH_FAILED}</span>
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
                    tagName={tagToDelete?.name}
                    tagColor={tagToDelete?.color}
                />
            )}
        </PageContainer>
    );
}
