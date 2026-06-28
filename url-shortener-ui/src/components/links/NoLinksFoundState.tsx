import {Link as LinkIcon} from "lucide-react";
import {NoResultsState} from "@/components/layout/NoResultsState";

export function NoLinksFoundState() {
    return (
        <NoResultsState
            icon={LinkIcon}
            title="No links found"
            subtitle="Try adjusting your search to find what you&apos;re looking for."
            itemHeightClass="h-12"
            pillWidthClass="w-24"
        />
    );
}
