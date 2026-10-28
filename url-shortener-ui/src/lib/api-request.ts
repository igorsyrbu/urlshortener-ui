import {fetchWithAuth} from "@/lib/api";
import {parseProblemDetail} from "@/lib/problem-details";

/** A response outside 2xx: `status` drives retries and per-status handling, `message` is safe to show the user. */
export class ApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

/** An authenticated JSON request for a query or mutation: the parsed body, or an `ApiError` carrying the problem detail. */
export async function requestJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetchWithAuth(endpoint, options);
    if (!response.ok) {
        throw new ApiError(response.status, parseProblemDetail(await response.text(), response.status));
    }
    // DTOs are trusted as typed until the API modules validate them at runtime.
    return (await response.json()) as T;
}
