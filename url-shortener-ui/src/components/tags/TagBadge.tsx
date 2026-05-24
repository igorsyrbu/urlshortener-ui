"use client";

import {Tag} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {TagItem} from "@/lib/types";
import {cn} from "@/lib/utils";
import React from "react";

interface TagBadgeProps {
    tag: TagItem;
    className?: string;
    children?: React.ReactNode;
    showIcon?: boolean;
}

const TAG_BASE_CLASS =
    "inline-flex items-center rounded-md text-xs font-medium px-2.5 py-0.5 leading-relaxed whitespace-nowrap shrink-0 transition-all select-none";

export function TagBadge({
                             tag,
                             className,
                             children,
                             showIcon = true,
                         }: TagBadgeProps) {
    return (
        <Badge variant={tag.color as never} className={cn(TAG_BASE_CLASS, className)}>
            {showIcon && <Tag className="size-3 mr-1.5 shrink-0"/>}
            <span className="shrink-0 -mt-px truncate max-w-36" title={tag.name}>
                {tag.name}
            </span>
            {children}
        </Badge>
    );
}
