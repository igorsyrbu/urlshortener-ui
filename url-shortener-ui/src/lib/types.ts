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
    shortUrl: string;
    longUrl: string;
    isActive: boolean;
    tagIds?: string[];
}
