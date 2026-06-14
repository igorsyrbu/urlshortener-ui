import { describe, it, expect, beforeEach, vi } from "vitest";
import { shortLinksService } from "./ShortLinksService";
import { memoryStore } from "./MemoryStore";
import { tagsService } from "./TagsService";

// Mocking memoryStore to control the state
vi.mock("./MemoryStore", () => {
  return {
    memoryStore: {
      getUserState: vi.fn(),
    },
  };
});

vi.mock("./TagsService", () => {
  return {
    tagsService: {
      getTagIdsForLink: vi.fn().mockReturnValue([]),
      validateAndFilterTagIds: vi.fn((uuid, ids) => ids),
      associateTagsWithLink: vi.fn(),
    },
  };
});

describe("ShortLinksService", () => {
  const uuid = "test-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPaginatedLinks", () => {
    it("should return paginated links", () => {
      const mockLinks = [
        { id: "1", title: "Link 1", shortUrl: "s1", longUrl: "l1" },
        { id: "2", title: "Link 2", shortUrl: "s2", longUrl: "l2" },
      ];
      (memoryStore.getUserState as any).mockReturnValue({ links: mockLinks });

      const result = shortLinksService.getPaginatedLinks(uuid, 0, 1);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].id).toBe("1");
      expect(result.totalElements).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it("should filter by search query (title)", () => {
      const mockLinks = [
        { id: "1", title: "Apple", shortUrl: "s1", longUrl: "l1" },
        { id: "2", title: "Banana", shortUrl: "s2", longUrl: "l2" },
      ];
      (memoryStore.getUserState as any).mockReturnValue({ links: mockLinks });

      const result = shortLinksService.getPaginatedLinks(uuid, 0, 10, "app");
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].title).toBe("Apple");
      expect(result.totalElements).toBe(1);
    });

    it("should filter by search query (longUrl)", () => {
      const mockLinks = [
        { id: "1", title: "T1", shortUrl: "s1", longUrl: "google.com" },
        { id: "2", title: "T2", shortUrl: "s2", longUrl: "apple.com" },
      ];
      (memoryStore.getUserState as any).mockReturnValue({ links: mockLinks });

      const result = shortLinksService.getPaginatedLinks(uuid, 0, 10, "goog");
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].longUrl).toBe("google.com");
    });

    it("should filter by tagIds", () => {
      const mockLinks = [
        { id: "1", title: "L1", shortUrl: "s1", longUrl: "u1" },
        { id: "2", title: "L2", shortUrl: "s2", longUrl: "u2" },
      ];
      (memoryStore.getUserState as any).mockReturnValue({ links: mockLinks });
      
      (tagsService.getTagIdsForLink as any).mockImplementation((u: string, id: string) => {
        if (id === "1") return ["tag1", "tag2"];
        if (id === "2") return ["tag2"];
        return [];
      });

      const result = shortLinksService.getPaginatedLinks(uuid, 0, 10, undefined, ["tag1"]);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].id).toBe("1");
    });

    it("should filter by multiple tagIds (AND logic)", () => {
      const mockLinks = [
        { id: "1", title: "L1", shortUrl: "s1", longUrl: "u1" },
        { id: "2", title: "L2", shortUrl: "s2", longUrl: "u2" },
      ];
      (memoryStore.getUserState as any).mockReturnValue({ links: mockLinks });
      
      (tagsService.getTagIdsForLink as any).mockImplementation((u: string, id: string) => {
        if (id === "1") return ["tag1", "tag2"];
        if (id === "2") return ["tag2"];
        return [];
      });

      const result = shortLinksService.getPaginatedLinks(uuid, 0, 10, undefined, ["tag1", "tag2"]);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0].id).toBe("1");

      const resultNone = shortLinksService.getPaginatedLinks(uuid, 0, 10, undefined, ["tag1", "tag3"]);
      expect(resultNone.content).toHaveLength(0);
    });
  });
});
