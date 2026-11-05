import {requestJson} from "@/lib/api-request";
import type {UrlCleanerResponse} from "@/lib/api-types";
import {API_ENDPOINTS} from "@/lib/constants";

/** The backend's tracker cleanup of `url`; rejects with an `ApiError` or a network error. */
export function requestUrlCleanup(url: string, signal: AbortSignal): Promise<UrlCleanerResponse> {
    return requestJson<UrlCleanerResponse>(API_ENDPOINTS.URL_CLEANER, {method: "POST", body: JSON.stringify({url}), signal});
}
