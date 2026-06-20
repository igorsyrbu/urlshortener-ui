export type GlowState = "idle" | "loading" | "filled";

export interface ShortLinkData {
    id: string;
    title: string;
    longUrl: string;
    shortUrl: string;
    isActive?: boolean;
    tagIds?: string[];
}
