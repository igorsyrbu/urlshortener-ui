const PROBLEM_DETAIL_MAX_INLINE_LENGTH = 200;
/** RFC 9457 `detail` first; `message` and `error` for older error bodies; the generic `title` ("Bad Request") last. */
const DETAIL_FIELDS = ["detail", "message", "error", "title"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

/** The human-readable reason in a parsed error body, or `null` when it has none. */
export function readProblemDetail(body: unknown): string | null {
    if (!isRecord(body)) return null;
    for (const key of DETAIL_FIELDS) {
        const value = body[key];
        if (typeof value === "string" && value.trim()) {
            return value.trim();
        }
    }
    return null;
}

/** The reason in an error body read as text (JSON or a short plain-text message), else `Request failed: <status>`. */
export function parseProblemDetail(bodyText: string, status: number): string {
    const fallback = `Request failed: ${status}`;
    const trimmed = bodyText.trim();
    if (!trimmed) {
        return fallback;
    }
    try {
        return readProblemDetail(JSON.parse(trimmed)) ?? fallback;
    } catch {
        return trimmed.length <= PROBLEM_DETAIL_MAX_INLINE_LENGTH ? trimmed : fallback;
    }
}
