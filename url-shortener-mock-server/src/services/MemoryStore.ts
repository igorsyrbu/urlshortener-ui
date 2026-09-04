import linksData from "../data/shortlinks.json";
import tagsData from "../data/tags.json";
import usersData from "../data/users.json";
import sessionsData from "../data/sessions.json";
import { ShortLink } from "./ShortLinksService";
import { Tag } from "./TagsService";
import { User, Session, UserPreferences, DEFAULT_URL_CLEANER_MODE } from "./UsersService";

export interface UserState {
  links: ShortLink[];
  tags: Tag[];
  tagAssociations: Map<string, string[]>; // linkId -> tagIds
  user: User;
  sessions: Session[];
  preferences: UserPreferences;
}

export class MemoryStore {
  private userStates = new Map<string, UserState>();

  public getAllUserStates(): UserState[] {
    return Array.from(this.userStates.values());
  }

  public hasUserState(uuid: string): boolean {
    return this.userStates.has(uuid);
  }

  public registerUserSession(uuid: string): UserState {
    let state = this.userStates.get(uuid);
    if (!state) {
      state = this.initializeUserState(uuid);
      this.userStates.set(uuid, state);
    }
    return state;
  }

  public getUserState(uuid: string): UserState {
    const state = this.userStates.get(uuid);
    if (!state) {
      throw new Error(`User state not initialized for UUID: ${uuid}`);
    }
    return state;
  }

  private initializeUserState(uuid: string): UserState {
    // 1. Initialize tags
    const tags: Tag[] = tagsData.tags.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
    }));

    const validTagIds = new Set(tags.map((t) => t.id));

    // 2. Initialize tag associations and filter links
    const tagAssociations = new Map<string, string[]>();
    const links: ShortLink[] = linksData.links.map((link: any) => {
      const { tagIds, ...rest } = link;
      if (tagIds && tagIds.length > 0) {
        const validIds = tagIds.filter((id: string) => validTagIds.has(id));
        if (validIds.length > 0) {
          tagAssociations.set(link.id, validIds);
        }
      }
      const shortUrl: string = rest.shortUrl;
      return {
        id: rest.id,
        title: rest.title,
        key: rest.key ?? shortUrl.split("/").pop() ?? "",
        shortUrl,
        longUrl: rest.longUrl,
        isActive: link.isActive ?? true,
      };
    });

    // 3. Initialize user
    const baseUser = usersData.users[0];
    const uuid_slice = `${uuid.slice(0, 8)}`;
    const user: User = {
      ...baseUser,
      name: `John Doe`,
      email: `john.doe@${uuid_slice}.dev`,
      accountId: `acc-${uuid_slice}`,
    };

    // 4. Initialize sessions
    const sessions: Session[] = sessionsData.sessions.map((session: any) => ({
      id: session.id,
      city: session.city,
      country: session.country,
      region: session.region,
      device: session.device,
      os: session.os,
      current: session.current,
    }));

    return {
      links,
      tags,
      tagAssociations,
      user,
      sessions,
      preferences: { urlCleanerMode: DEFAULT_URL_CLEANER_MODE },
    };
  }
}

export const memoryStore = new MemoryStore();
