import usersData from "../data/users.json" with { type: "json" };
import sessionsData from "../data/sessions.json" with { type: "json" };

export interface User {
  email: string;
  name: string;
  pictureUrl: string;
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
  private sessions: Session[] = [...sessionsData.sessions];
  private user: User = usersData.users[0];

  getUser() {
    return this.user;
  }

  updateUserName(name: string) {
    this.user.name = name;
    return this.user;
  }

  getSessions() {
    return this.sessions;
  }

  deleteCurrentSession() {
    this.sessions = this.sessions.filter((s) => !s.current);
  }

  deleteOtherSessions() {
    this.sessions = this.sessions.filter((s) => s.current);
  }

  deleteSession(id: string): boolean {
    const exists = this.sessions.some((s) => s.id === id);
    if (!exists) {
      return false;
    }
    this.sessions = this.sessions.filter((s) => s.id !== id);
    return true;
  }
}

export const usersService = new UsersService();
