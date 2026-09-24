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
            <div
                aria-hidden="true"
                className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-20 bg-linear-to-t from-sidebar via-sidebar/60 to-transparent backdrop-blur-md mask-[linear-gradient(to_top,black,transparent)] lg:hidden"
            />
            <div
                className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-30 flex justify-center px-4 lg:left-60">
            <nav
                aria-label="Links pagination"
                className="pointer-events-auto inline-flex max-w-full items-center gap-1 rounded-xl border-[0.5px] border-border bg-background/90 px-2 py-1 shadow-sm backdrop-blur-md"
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
                    <span>Previous</span>
                </Button>
                <span aria-hidden="true" className="h-4 w-px shrink-0 bg-border"/>
                <span
                    aria-live="polite"
                    title={label}
                    className="min-w-0 max-w-[40vw] truncate px-1 text-center text-sm tabular-nums text-muted-foreground"
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
                    <span>Next</span>
                    <ChevronRight className="size-4"/>
                </Button>
            </nav>
            </div>
        </>
    );
}
