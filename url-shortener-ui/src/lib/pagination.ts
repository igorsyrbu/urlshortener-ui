import {ROUTES} from "@/lib/constants";

const PAGE_STARTING_NUMBER = 1;

const SINGULAR_LINK_COUNT = 1;

export interface PaginationRange {
    start: number;
    end: number;
}

export function getPaginationRange(page: number, pageSize: number, totalElements: number): PaginationRange {
    if (totalElements <= 0) {
        return {start: 0, end: 0};
    }
    const safePage = Math.max(0, page);
    return {
        start: safePage * pageSize + 1,
        end: Math.min((safePage + 1) * pageSize, totalElements),
    };
}

export function formatLinksRangeLabel(start: number, end: number, totalElements: number): string {
    if (totalElements === SINGULAR_LINK_COUNT) {
        return "1 of 1 link";
    }
    return `${start}-${end} of ${totalElements} links`;
}

export function parseLinksPageParam(value: string | null): number {
    if (!value) {
        return 0;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < PAGE_STARTING_NUMBER) {
        return 0;
    }
    return parsed - PAGE_STARTING_NUMBER;
}

export function buildLinksPageUrl(page: number): string {
    if (page <= 0) {
        return ROUTES.LINKS;
    }
    return `${ROUTES.LINKS}?page=${page + PAGE_STARTING_NUMBER}`;
}
