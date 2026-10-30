import {fetchWithAuth} from "@/lib/api";
import {requestJson} from "@/lib/api-request";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {UserProfile} from "@/lib/types";

export type NameSaveOutcome = "saved" | "rejected" | "failed";

export function fetchCurrentUser(signal?: AbortSignal): Promise<UserProfile> {
    return requestJson<UserProfile>(API_ENDPOINTS.USERS_ME, {signal});
}

export async function saveProfileName(name: string): Promise<NameSaveOutcome> {
    try {
        const res = await fetchWithAuth(API_ENDPOINTS.USERS_ME_NAME, {method: "PUT", body: JSON.stringify({name})});
        return res.ok ? "saved" : "rejected";
    } catch (error) {
        logger.error("Error updating name", error);
        return "failed";
    }
}
