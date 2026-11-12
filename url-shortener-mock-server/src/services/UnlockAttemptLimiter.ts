export const UNLOCK_MAX_FAILURES = 5;
export const UNLOCK_FAILURE_WINDOW_MS = 15 * 60 * 1000;

interface FailureWindow {
  failures: number;
  expiresAtMs: number;
}

/**
 * Wrong-password lockout per link and client address: a fixed window that starts with the first failure.
 * The real backend keeps the same counter in Redis.
 */
export class UnlockAttemptLimiter {
  private readonly windows = new Map<string, FailureWindow>();

  constructor(private readonly now: () => number = Date.now) {}

  isLocked(linkId: string, clientAddress: string): boolean {
    const window = this.readLiveWindow(buildKey(linkId, clientAddress));
    return window !== null && window.failures >= UNLOCK_MAX_FAILURES;
  }

  recordFailure(linkId: string, clientAddress: string): void {
    const key = buildKey(linkId, clientAddress);
    const window = this.readLiveWindow(key) ?? { failures: 0, expiresAtMs: this.now() + UNLOCK_FAILURE_WINDOW_MS };
    window.failures += 1;
    this.windows.set(key, window);
  }

  private readLiveWindow(key: string): FailureWindow | null {
    const window = this.windows.get(key);
    if (!window) return null;
    if (window.expiresAtMs > this.now()) return window;
    this.windows.delete(key);
    return null;
  }
}

function buildKey(linkId: string, clientAddress: string): string {
  return `${linkId}:${clientAddress}`;
}
