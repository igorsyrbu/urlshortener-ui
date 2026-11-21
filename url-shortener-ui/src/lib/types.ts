import {BadgeVariant} from "@/components/ui/badge";

export interface TagItem {
    id: string;
    name: string;
    color: BadgeVariant;
    linkCount?: number;
}

export interface LinkItem {
    id: string;
    title: string;
    /** `null` (or absent in older test data) when the link has none. */
    description?: string | null;
    key?: string;
    shortUrl: string;
    longUrl: string;
    isActive: boolean;
    isPasswordProtected: boolean;
    isSuspended: boolean;
    tagIds?: string[];
}

/** A link loaded for the edit form: the only shape that carries the password (`null` when unprotected). */
export interface EditableLink extends LinkItem {
    key: string;
    password: string | null;
}

export interface UserProfile {
    email: string;
    name: string;
    pictureUrl?: string;
}
