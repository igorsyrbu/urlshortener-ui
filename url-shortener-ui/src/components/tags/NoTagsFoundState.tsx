import {Tag as TagIcon} from "lucide-react";
import {NoResultsState} from "@/components/layout/NoResultsState";

export function NoTagsFoundState() {
    return (
        <NoResultsState
            icon={TagIcon}
            title="No tags found"
            subtitle="Try adjusting your search to find what you&apos;re looking for."
            itemHeightClass="h-10"
            pillWidthClass="w-16"
        />
    );
}
