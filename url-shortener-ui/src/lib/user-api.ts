import {fetchWithAuth} from "@/lib/api";
import {requestJson, requestNoContent} from "@/lib/api-request";
import type {UserPreferences} from "@/lib/api-types";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {UserSession} from "@/lib/session-utils";
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

export function fetchUserSessions(signal?: AbortSignal): Promise<UserSession[]> {
    return requestJson<UserSession[]>(API_ENDPOINTS.USERS_SESSIONS, {signal});
}

/** Ends the session of this browser on the server (sign-out). */
export function terminateCurrentSession(): Promise<void> {
    return requestNoContent(API_ENDPOINTS.USERS_SESSIONS_CURRENT, {method: "DELETE"});
}

export function terminateSession(sessionId: string): Promise<void> {
    return requestNoContent(API_ENDPOINTS.USERS_SESSION(sessionId), {method: "DELETE"});
}

export function terminateOtherSessions(): Promise<void> {
    return requestNoContent(API_ENDPOINTS.USERS_SESSIONS_OTHER, {method: "DELETE"});
}

/** The stored preferences as sent, for the caller to check (`parsePreferences` in the preferences store). */
export function fetchUserPreferences(signal?: AbortSignal): Promise<unknown> {
    return requestJson<unknown>(API_ENDPOINTS.USERS_ME_PREFERENCES, {signal});
}

/** Saves the preferences and returns what the server stored, unchecked like `fetchUserPreferences`. */
export function saveUserPreferences(preferences: UserPreferences): Promise<unknown> {
    return requestJson<unknown>(API_ENDPOINTS.USERS_ME_PREFERENCES, {method: "PUT", body: JSON.stringify(preferences)});
}
