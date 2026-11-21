"use client";

import {ChevronLeft, ChevronRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {formatLinksRangeLabel, getPaginationRange} from "@/lib/pagination";

interface LinksPaginationProps {
    page: number;
    pageSize: number;
    totalElements: number;
    isLoading: boolean;
    onPrevious: () => void;
    onNext: () => void;
}

export const LINKS_PAGINATION_LABEL = "Links pagination";

/** The links bottom bar's pagination; phones show the page arrows without their words, so the range label keeps its room. */
export function LinksPagination({
                                    page,
                                    pageSize,
                                    totalElements,
                                    isLoading,
                                    onPrevious,
                                    onNext,
                                }: LinksPaginationProps) {
    const {start, end} = getPaginationRange(page, pageSize, totalElements);
    const label = formatLinksRangeLabel(start, end, totalElements);
    const hasPrevious = page > 0;
    const hasNext = end < totalElements;

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!hasPrevious || isLoading}
                aria-label="Go to previous page"
                className="shrink-0 whitespace-nowrap"
            >
                <ChevronLeft className="size-4"/>
                <span className="max-sm:sr-only">Previous</span>
            </Button>
            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border"/>
            <span
                aria-live="polite"
                title={label}
                className="min-w-0 flex-1 truncate px-1 text-center text-sm font-medium tabular-nums text-foreground sm:max-w-[40vw] sm:flex-none"
            >
                {label}
            </span>
            <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border"/>
            <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!hasNext || isLoading}
                aria-label="Go to next page"
                className="shrink-0 whitespace-nowrap"
            >
                <span className="max-sm:sr-only">Next</span>
                <ChevronRight className="size-4"/>
            </Button>
        </>
    );
}
