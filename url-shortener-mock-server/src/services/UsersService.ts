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

