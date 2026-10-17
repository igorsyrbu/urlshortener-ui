import {logger} from "@/lib/logger";

/**
 * Remembers that this browser had a signed-in session, so the dashboard can render its shell before the session is
 * confirmed. It is only a rendering hint, never a credential: the httpOnly refresh cookie still decides.
 */
export const SESSION_HINT_STORAGE_KEY = "urlshortener:session-hint";
const SESSION_HINT_VALUE = "1";

export function hasSessionHint(): boolean {
    try {
        return localStorage.getItem(SESSION_HINT_STORAGE_KEY) === SESSION_HINT_VALUE;
    } catch (error) {
        logger.error("Failed to read the session hint", error);
        return false;
    }
}

export function setSessionHint(): void {
    try {
        localStorage.setItem(SESSION_HINT_STORAGE_KEY, SESSION_HINT_VALUE);
    } catch (error) {
        logger.error("Failed to store the session hint", error);
    }
}

export function clearSessionHint(): void {
    try {
        localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
    } catch (error) {
        logger.error("Failed to clear the session hint", error);
    }
}
