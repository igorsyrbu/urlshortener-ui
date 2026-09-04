import { memoryStore } from "./MemoryStore";

export interface User {
  email: string;
  name: string;
  pictureUrl: string;
  accountId: string;
}

export interface Session {
  id: string;
  city: string;
  country: string;
  region: string;
  device: string;
  os: string;
  current: boolean;
}

export type UrlCleanerMode = "DISABLE" | "SUGGEST" | "AUTO_CLEAN";

export interface UserPreferences {
  urlCleanerMode: UrlCleanerMode;
}

export const URL_CLEANER_MODES: readonly UrlCleanerMode[] = ["DISABLE", "SUGGEST", "AUTO_CLEAN"] as const;

export const DEFAULT_URL_CLEANER_MODE: UrlCleanerMode = "SUGGEST";

class UsersService {
  getUser(uuid: string) {
    return memoryStore.getUserState(uuid).user;
  }

  updateUserName(uuid: string, name: string) {
    const user = memoryStore.getUserState(uuid).user;
    user.name = name;
    return user;
  }

  getSessions(uuid: string) {
    return memoryStore.getUserState(uuid).sessions;
  }

  deleteCurrentSession(uuid: string) {
    const userState = memoryStore.getUserState(uuid);
    userState.sessions = userState.sessions.filter((s) => !s.current);
  }

  deleteOtherSessions(uuid: string) {
    const userState = memoryStore.getUserState(uuid);
    userState.sessions = userState.sessions.filter((s) => s.current);
  }

  getPreferences(uuid: string): UserPreferences {
    return memoryStore.getUserState(uuid).preferences;
  }

  updatePreferences(uuid: string, mode: unknown): UserPreferences | null {
    if (typeof mode !== "string" || !(URL_CLEANER_MODES as readonly string[]).includes(mode)) {
      return null;
    }
    const preferences = memoryStore.getUserState(uuid).preferences;
    preferences.urlCleanerMode = mode as UrlCleanerMode;
    return preferences;
  }

  deleteSession(uuid: string, id: string): boolean {
    const userState = memoryStore.getUserState(uuid);
    const exists = userState.sessions.some((s) => s.id === id);
    if (!exists) {
      return false;
    }
    userState.sessions = userState.sessions.filter((s) => s.id !== id);
    return true;
  }
}

export const usersService = new UsersService();

