export interface LatestRequest {
    signal: AbortSignal;
    /** `false` once a newer request has started: the answer of this one must then be dropped. */
    isLatest: () => boolean;
}

export interface LatestRequestTracker {
    begin: () => LatestRequest;
}

/**
 * Latest-wins bookkeeping for one kind of request (a list, a search): starting a request aborts the previous one, and
 * only the newest may write state. Dropping a new request while an old one is in flight lost searches and filters.
 */
export function createLatestRequestTracker(): LatestRequestTracker {
    let current: AbortController | null = null;
    return {
        begin() {
            current?.abort();
            const controller = new AbortController();
            current = controller;
            return {signal: controller.signal, isLatest: () => current === controller};
        },
    };
}
