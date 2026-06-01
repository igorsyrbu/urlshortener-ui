import usersData from "../data/users.json";
import sessionsData from "../data/sessions.json";

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
  private userMap: Map<string, User> = new Map();
  private sessionsMap: Map<string, Session[]> = new Map();

  private getUserForUser(uuid: string): User {
    if (!this.userMap.has(uuid)) {
      const baseUser = usersData.users[0];
      const uuid_slice = `${uuid.slice(0, 8)}`;
      this.userMap.set(uuid, {
        ...baseUser,
        name: `John Doe`,
        email: `john.doe@${uuid_slice}.dev`,
        accountId: `acc-${uuid_slice}`,
      });
    }
    return this.userMap.get(uuid)!;
  }

  private getSessionsForUser(uuid: string): Session[] {
    if (!this.sessionsMap.has(uuid)) {
      this.sessionsMap.set(uuid, [...sessionsData.sessions]);
    }
    return this.sessionsMap.get(uuid)!;
  }

  getUser(uuid: string) {
    return this.getUserForUser(uuid);
  }

  updateUserName(uuid: string, name: string) {
    const user = this.getUserForUser(uuid);
    user.name = name;
    return user;
  }

  getSessions(uuid: string) {
    return this.getSessionsForUser(uuid);
  }

  deleteCurrentSession(uuid: string) {
    const sessions = this.getSessionsForUser(uuid);
    const filtered = sessions.filter((s) => !s.current);
    this.sessionsMap.set(uuid, filtered);
  }

  deleteOtherSessions(uuid: string) {
    const sessions = this.getSessionsForUser(uuid);
    const filtered = sessions.filter((s) => s.current);
    this.sessionsMap.set(uuid, filtered);
  }

  deleteSession(uuid: string, id: string): boolean {
    const sessions = this.getSessionsForUser(uuid);
    const exists = sessions.some((s) => s.id === id);
    if (!exists) {
      return false;
    }
    const filtered = sessions.filter((s) => s.id !== id);
    this.sessionsMap.set(uuid, filtered);
    return true;
  }
}

export const usersService = new UsersService();
