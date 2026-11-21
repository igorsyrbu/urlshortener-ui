"use client";

import {ChevronLeft, ChevronRight, CircleCheck} from "lucide-react";
import {Button} from "@/components/ui/button";
import {FLOATING_BAR_SURFACE_CLASS, FloatingBottomBar} from "@/components/layout/FloatingBottomBar";
import {LINK_SELECTION_COPY} from "@/lib/constants";
import {cn} from "@/lib/utils";
import {formatLinksRangeLabel, getPaginationRange} from "@/lib/pagination";

interface LinksPaginationProps {
    page: number;
    pageSize: number;
    totalElements: number;
    isLoading: boolean;
    onPrevious: () => void;
    onNext: () => void;
    /** Starts select mode; phones get a round button for it beside the bar, since they have no hover. Phones show the
     * page arrows without their words, so the range label keeps its room. */
    onStartSelecting?: () => void;
}

export function LinksPagination({
                                    page,
                                    pageSize,
                                    totalElements,
                                    isLoading,
                                    onPrevious,
                                    onNext,
                                    onStartSelecting,
                                }: LinksPaginationProps) {
    const {start, end} = getPaginationRange(page, pageSize, totalElements);
    const label = formatLinksRangeLabel(start, end, totalElements);
    const hasPrevious = page > 0;
    const hasNext = end < totalElements;

    return (
        <FloatingBottomBar
            ariaLabel="Links pagination"
            aside={onStartSelecting && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onStartSelecting}
                    aria-label={LINK_SELECTION_COPY.START}
                    className={cn("pointer-events-auto size-10.5 shrink-0 self-center rounded-full sm:hidden",
                        FLOATING_BAR_SURFACE_CLASS)}
                >
                    <CircleCheck className="size-5"/>
                </Button>
            )}
        >
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
                className="min-w-0 flex-1 truncate px-1 text-center text-sm tabular-nums text-muted-foreground sm:max-w-[40vw] sm:flex-none"
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
        </FloatingBottomBar>
    );
}
