/**
 * Sets a pending flag while `task` runs and always clears it, also when the task fails (the failure propagates).
 * A plain function on purpose: the React Compiler cannot compile `try/finally` inside a component or hook, and one such
 * handler leaves the whole component uncompiled.
 */
export async function withPending(setPending: (isPending: boolean) => void, task: () => Promise<void>): Promise<void> {
    setPending(true);
    try {
        await task();
    } finally {
        setPending(false);
    }
}

export type AttemptResult<T> = {isSuccess: true; value: T} | {isSuccess: false; error: unknown};

/** Runs `task` and returns its outcome instead of throwing, so callers inside components need no `try/catch`. */
export async function attempt<T>(task: () => Promise<T>): Promise<AttemptResult<T>> {
    try {
        return {isSuccess: true, value: await task()};
    } catch (error) {
        return {isSuccess: false, error};
    }
}
