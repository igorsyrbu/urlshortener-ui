const IDLE_FALLBACK_DELAY_MS = 200;

/** Starts the given downloads once the browser is idle, so they never compete with the page's own first requests. */
export function preloadOnIdle(loaders: ReadonlyArray<() => Promise<unknown>>): void {
    const runLoaders = () => loaders.forEach((load) => void load());
    // Safari shipped requestIdleCallback only recently; older versions get a short timer instead.
    if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(runLoaders);
        return;
    }
    window.setTimeout(runLoaders, IDLE_FALLBACK_DELAY_MS);
}
