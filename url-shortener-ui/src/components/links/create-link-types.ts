import {SHORT_KEY_TAKEN_MESSAGE} from "@/lib/constants";

export type GlowState = "idle" | "loading" | "filled";

export interface ShortLinkData {
    id: string;
    title: string;
    longUrl: string;
    shortUrl: string;
    isActive?: boolean;
    tagIds?: string[];
}

export class ShortKeyConflictError extends Error {
    constructor() {
        super(SHORT_KEY_TAKEN_MESSAGE);
        this.name = "ShortKeyConflictError";
    }
}
