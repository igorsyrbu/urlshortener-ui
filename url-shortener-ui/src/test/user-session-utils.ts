import type {UserSession} from "@/lib/session-utils";

export function createUserSession(overrides: Partial<UserSession> = {}): UserSession {
    return {
        id: "session-1", city: "Montreal", region: "Quebec", country: "Canada",
        device: "MacBook", os: "macOS", current: false,
        ...overrides,
    };
}
